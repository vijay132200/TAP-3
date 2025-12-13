"use client";

import { Message, AgentStatusType } from "@/types/agent";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  Settings,
  Clock,
  Brain,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatInterfaceProps {
  messages: Message[];
  agentStatus: AgentStatusType;
  onApproval: (decision: "approve" | "reject" | "modify") => void;
  isProcessingApproval: boolean;
}

export default function ChatInterface({
  messages,
  agentStatus,
  onApproval,
  isProcessingApproval,
}: ChatInterfaceProps) {
  const formatTime = (date: Date | null) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(date));
  };

  const renderStatusIndicator = () => {
    if (agentStatus === "reasoning") {
      return (
        <div className="animate-slideIn">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="flex-1">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  <p
                    className="text-sm font-medium text-primary"
                    data-testid="reasoning-status"
                  >
                    Autonomous Reasoning Engine Active
                  </p>
                </div>
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="reasoning-description"
                >
                  Analyzing query parameters and determining optimal tool
                  selection...
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (agentStatus === "consulting_knowledge") {
      return (
        <div className="animate-slideIn">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1">
              <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
                  <p
                    className="text-sm font-medium text-accent"
                    data-testid="knowledge-status"
                  >
                    Consulting Proprietary Knowledge Module
                  </p>
                </div>
                <p
                  className="text-sm text-muted-foreground mb-3"
                  data-testid="knowledge-description"
                >
                  Retrieving expert-defined heuristics for assessment...
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderApprovalPrompt = (message: Message) => {
    if (!message.metadata?.requiresApproval) return null;

    return (
      <div className="animate-slideIn">
        <div
          className="bg-warning/10 border-2 border-warning rounded-lg p-5 shadow-lg"
          data-testid="approval-prompt"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-warning flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3
                className="text-base font-semibold text-warning mb-2"
                data-testid="approval-title"
              >
                Human-in-the-Loop: Expert Confirmation Required
              </h3>
              <p
                className="text-sm text-foreground mb-3"
                data-testid="approval-description"
              >
                The agent has detected a{" "}
                <strong>high-risk scenario</strong> based on your proprietary
                knowledge rules.
              </p>
              {message.metadata.reasoning && (
                <div className="bg-card rounded-lg p-4 mb-4 space-y-2 text-sm">
                  <p className="text-foreground" data-testid="approval-reasoning">
                    <strong>Rationale:</strong> {message.metadata.reasoning}
                  </p>
                  {message.metadata.knowledgeUsed &&
                    message.metadata.knowledgeUsed.length > 0 && (
                      <p
                        className="text-accent"
                        data-testid="approval-knowledge"
                      >
                        <strong>Knowledge Used:</strong>{" "}
                        {message.metadata.knowledgeUsed.join(", ")}
                      </p>
                    )}
                </div>
              )}
              <p
                className="text-sm text-muted-foreground mb-4"
                data-testid="approval-waiting"
              >
                The agent is paused and awaiting your explicit approval before
                proceeding.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => onApproval("approve")}
                  disabled={isProcessingApproval}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  data-testid="approve-button"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {isProcessingApproval ? "Processing..." : "Approve & Proceed"}
                </Button>
                <Button
                  onClick={() => onApproval("reject")}
                  disabled={isProcessingApproval}
                  variant="destructive"
                  data-testid="reject-button"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject & Revise
                </Button>
                <Button
                  onClick={() => onApproval("modify")}
                  disabled={isProcessingApproval}
                  variant="outline"
                  data-testid="modify-button"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Modify Rules
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-hidden" data-testid="chat-interface">
      <ScrollArea className="h-full px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="animate-slideIn">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                  <p
                    className="text-sm font-medium text-primary mb-2"
                    data-testid="system-intro-title"
                  >
                    System Initialized - AI Backend Active
                  </p>
                  <p
                    className="text-sm text-foreground"
                    data-testid="system-intro-content"
                  >
                    Welcome to the Tacit Agent Platform. I&apos;m your AI
                    assistant configured with your expert knowledge and ready to
                    help. All my decisions will prioritize your proprietary
                    rules over general information.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span data-testid="system-intro-time">
                      {formatTime(new Date())}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {messages.map((message, index) => (
            <div key={message.id} className="animate-slideIn">
              {message.role === "user" ? (
                <div className="flex gap-3 justify-end">
                  <div className="flex-1 max-w-2xl">
                    <div className="bg-primary text-primary-foreground rounded-lg p-4 shadow-sm">
                      <p
                        className="text-sm"
                        data-testid={`user-message-${index}`}
                      >
                        {message.content}
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-primary-foreground/70 justify-end">
                        <span data-testid={`user-message-time-${index}`}>
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-secondary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      ></path>
                    </svg>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Brain className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
                        {message.metadata?.approvalDecision && (
                          <div className="flex items-center gap-2 mb-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent/10 text-accent">
                              Expert{" "}
                              {message.metadata.approvalDecision === "approve"
                                ? "Approved"
                                : message.metadata.approvalDecision === "reject"
                                ? "Rejected"
                                : "Modified"}
                            </span>
                          </div>
                        )}
                        <div
                          className="text-sm text-foreground whitespace-pre-wrap"
                          data-testid={`assistant-message-${index}`}
                        >
                          {message.content}
                        </div>

                        {message.metadata?.knowledgeUsed &&
                          message.metadata.knowledgeUsed.length > 0 && (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                Sources:
                              </span>
                              {message.metadata.knowledgeUsed.map(
                                (source: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                      source.includes("PDF") ||
                                      source.includes("Page")
                                        ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                        : "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                    }`}
                                    data-testid={`knowledge-source-${index}-${idx}`}
                                  >
                                    {source}
                                  </span>
                                )
                              )}
                            </div>
                          )}

                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span data-testid={`assistant-message-time-${index}`}>
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {renderApprovalPrompt(message)}
                </div>
              )}
            </div>
          ))}

          {renderStatusIndicator()}
        </div>
      </ScrollArea>
    </div>
  );
}
