import { Session, AgentStatusType } from '@/types/agent';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RotateCcw, Settings, Brain, Shield, Zap, Upload, FileText, X } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SidebarProps {
  session: Session;
  onUpdateSession: (updates: Partial<Session>) => void;
  onResetSession: () => void;
  agentStatus: AgentStatusType;
  isLoading: boolean;
}

export default function Sidebar({
  session,
  onUpdateSession,
  onResetSession,
  agentStatus,
  isLoading
}: SidebarProps) {
  const { toast } = useToast();
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const handleSystemPromptChange = (value: string) => {
    onUpdateSession({ systemPrompt: value });
  };

  const handleTacitKnowledgeChange = (value: string) => {
    onUpdateSession({ tacitKnowledge: value });
  };

  const handleHILToggle = (enabled: boolean) => {
    onUpdateSession({ hilEnabled: enabled });
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('pdf', file);

        const response = await fetch('/api/pdf/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const result = await response.json();
        setUploadedDocs(prev => [...prev, result.filename || file.name]);
        
        toast({
          title: "PDF Uploaded",
          description: `${file.name} has been processed and indexed successfully.`,
        });
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload PDF",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleClearDocs = async () => {
    try {
      await apiRequest('DELETE', '/api/pdf/clear');
      setUploadedDocs([]);
      toast({
        title: "Documents Cleared",
        description: "All uploaded PDFs have been removed from the knowledge base.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear documents",
        variant: "destructive",
      });
    }
  };

  return (
    <aside className="w-80 bg-card border-r border-border flex flex-col shadow-sm" data-testid="sidebar">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-semibold text-foreground mb-1" data-testid="sidebar-title">Agent Governance</h2>
        <p className="text-sm text-muted-foreground" data-testid="sidebar-subtitle">Expert Control Panel</p>
      </div>
      
      {/* Scrollable Control Section */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* System Prompt Editor */}
        <div className="space-y-3">
          <label className="block">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground" data-testid="system-prompt-label">System Prompt</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                Core Instructions
              </span>
            </div>
            <Textarea
              value={session.systemPrompt}
              onChange={(e) => handleSystemPromptChange(e.target.value)}
              className="w-full h-48 text-sm font-mono resize-none"
              placeholder="Define the agent's personality, tone, and rule-following priority..."
              disabled={isLoading}
              data-testid="system-prompt-input"
            />
          </label>
          <p className="text-xs text-muted-foreground" data-testid="system-prompt-help">
            This prompt controls the agent's behavior and decision-making priority.
          </p>
        </div>

        {/* Tacit Knowledge Input */}
        <div className="space-y-3">
          <label className="block">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground" data-testid="tacit-knowledge-label">Tacit Knowledge Rules</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent/10 text-accent">
                Step 1
              </span>
            </div>
            <Textarea
              value={session.tacitKnowledge}
              onChange={(e) => handleTacitKnowledgeChange(e.target.value)}
              className="w-full h-40 text-sm resize-none"
              placeholder="Enter your expert rules and heuristics..."
              disabled={isLoading}
              data-testid="tacit-knowledge-input"
            />
          </label>
          <p className="text-xs text-muted-foreground" data-testid="tacit-knowledge-help">
            Define your specialized heuristics and unwritten best practices.
          </p>
        </div>

        {/* PDF Document Upload */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground" data-testid="pdf-upload-label">PDF Document Knowledge</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
              RAG Source
            </span>
          </div>
          
          <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
            <label className="cursor-pointer block" data-testid="pdf-upload-area">
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={handlePdfUpload}
                disabled={isUploading}
                className="hidden"
                data-testid="pdf-upload-input"
              />
              <div className="flex flex-col items-center gap-2 text-center">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  {isUploading ? 'Uploading...' : 'Upload PDF Documents'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Click to select policy documents
                </p>
              </div>
            </label>
          </div>

          {uploadedDocs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground" data-testid="pdf-count">
                  {uploadedDocs.length} document(s) indexed
                </p>
                <Button
                  onClick={handleClearDocs}
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  data-testid="clear-docs-button"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear All
                </Button>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {uploadedDocs.map((doc, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-muted/30 rounded text-xs" data-testid={`uploaded-doc-${idx}`}>
                    <FileText className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate text-foreground">{doc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground" data-testid="pdf-upload-help">
            Upload PDFs containing policies, procedures, or specialized knowledge for the agent to reference.
          </p>
        </div>

        {/* Human-in-the-Loop Toggle */}
        <div className="space-y-3 p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-foreground" data-testid="hil-label">Human-in-the-Loop (HIL)</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warning/10 text-warning">
                  Step 3
                </span>
              </div>
              <p className="text-xs text-muted-foreground" data-testid="hil-description">
                Require confirmation for high-risk actions
              </p>
            </div>
            <Switch
              checked={session.hilEnabled}
              onCheckedChange={handleHILToggle}
              disabled={isLoading}
              data-testid="hil-toggle"
            />
          </div>
          <div className="flex items-start gap-2 p-2 bg-accent/5 rounded border border-accent/20">
            <Shield className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
            <p className="text-xs text-accent" data-testid="hil-status">
              {session.hilEnabled 
                ? "Currently enabled - Agent will pause for expert approval on critical decisions"
                : "Currently disabled - Agent will proceed without confirmation"
              }
            </p>
          </div>
        </div>

        {/* Session Management */}
        <div className="space-y-3 pt-4 border-t border-border">
          <h3 className="text-sm font-medium text-foreground" data-testid="session-management-title">Session Management</h3>
          <Button
            onClick={onResetSession}
            variant="outline"
            className="w-full"
            disabled={isLoading}
            data-testid="reset-session-button"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {isLoading ? 'Resetting...' : 'Reset Session'}
          </Button>
          <p className="text-xs text-muted-foreground" data-testid="reset-help">
            Clear conversation history and agent memory
          </p>
        </div>

        {/* Agent Status Summary */}
        <div className="space-y-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2" data-testid="agent-status-title">
            <div className={`w-2 h-2 rounded-full ${
              agentStatus === 'idle' ? 'bg-accent' : 'bg-primary animate-pulse'
            }`}></div>
            Agent Status
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mode:</span>
              <span className="font-medium text-foreground capitalize" data-testid="agent-mode">
                {agentStatus === 'idle' ? 'Active' : agentStatus.replace('_', ' ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Knowledge Base:</span>
              <span className="font-medium text-accent" data-testid="knowledge-status">
                {session.tacitKnowledge.trim() ? 'Loaded' : 'Empty'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Safety Mode:</span>
              <span className="font-medium text-accent" data-testid="safety-mode">
                {session.hilEnabled ? 'HIL Enabled' : 'HIL Disabled'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </aside>
  );
}
