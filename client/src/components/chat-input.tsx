import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { AgentStatusType } from '@/types/agent';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  agentStatus: AgentStatusType;
  hilEnabled: boolean;
}

export default function ChatInput({
  onSendMessage,
  isLoading,
  agentStatus,
  hilEnabled
}: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isDisabled = isLoading || agentStatus !== 'idle';

  return (
    <div className="border-t border-border bg-card px-6 py-4 shadow-sm" data-testid="chat-input">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full resize-none"
                rows={3}
                placeholder={isDisabled ? "Agent is processing..." : "Ask your AI agent a question..."}
                disabled={isDisabled}
                maxLength={500}
                data-testid="message-input"
              />
            </div>
            <Button
              type="submit"
              disabled={isDisabled || !input.trim()}
              className="h-[76px] px-6"
              data-testid="send-button"
            >
              <div className="flex items-center gap-2">
                <span>{isLoading ? 'Sending...' : 'Send'}</span>
                <Send className="w-4 h-4" />
              </div>
            </Button>
          </div>
        </form>
        
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent"></div>
              <span data-testid="knowledge-status-indicator">Tacit Knowledge: Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${hilEnabled ? 'bg-accent' : 'bg-muted-foreground'}`}></div>
              <span data-testid="hil-status-indicator">HIL Mode: {hilEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
          <span className="font-mono" data-testid="character-counter">
            {input.length} / 500 characters
          </span>
        </div>
      </div>
    </div>
  );
}
