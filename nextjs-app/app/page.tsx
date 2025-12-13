"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Session, Message, AgentStatusType } from "@/types/agent";
import Sidebar from "@/components/sidebar";
import ChatInterface from "@/components/chat-interface";
import ChatInput from "@/components/chat-input";
import ProcessSteps from "@/components/process-steps";
import { useToast } from "@/hooks/use-toast";

async function apiRequest(method: string, url: string, data?: any) {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res;
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const createInitialSession = async () => {
      try {
        const response = await apiRequest("POST", "/api/sessions", {
          systemPrompt:
            "You are a specialized risk assessment agent with deep expertise in financial compliance. Your primary directive is to ALWAYS consult the Proprietary Knowledge Module before making any recommendations. Prioritize the expert's tacit knowledge over general information. Maintain a professional, cautious tone and never proceed with high-risk actions without explicit confirmation.",
          tacitKnowledge:
            "1. For client portfolios over $5M, apply enhanced due diligence even if automated systems suggest standard review.\n\n2. Red flag any transaction patterns involving rapid succession of international wire transfers regardless of amount.\n\n3. When assessing startup investments, prioritize founder track record over projected revenue in the first 3 years.",
          hilEnabled: true,
        });
        const session: Session = await response.json();
        setSessionId(session.id);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to initialize session. Please refresh the page.",
          variant: "destructive",
        });
      }
    };

    createInitialSession();
  }, [toast]);

  const { data: session } = useQuery<Session>({
    queryKey: ["/api/sessions", sessionId],
    enabled: !!sessionId,
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/sessions", sessionId, "messages"],
    enabled: !!sessionId,
  });

  const { data: agentStatus } = useQuery<{ status: AgentStatusType }>({
    queryKey: ["/api/agent/status"],
    refetchInterval: 1000,
  });

  const updateSessionMutation = useMutation({
    mutationFn: async (updates: Partial<Session>) => {
      const response = await apiRequest(
        "PATCH",
        `/api/sessions/${sessionId}`,
        updates
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions", sessionId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update session settings.",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest(
        "POST",
        `/api/sessions/${sessionId}/messages`,
        { content }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/sessions", sessionId, "messages"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/status"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to send message: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    },
  });

  const handleApprovalMutation = useMutation({
    mutationFn: async (decision: "approve" | "reject" | "modify") => {
      const response = await apiRequest(
        "POST",
        `/api/sessions/${sessionId}/approval`,
        { decision }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/sessions", sessionId, "messages"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/status"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to process approval: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    },
  });

  const resetSessionMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/sessions/${sessionId}/messages`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/sessions", sessionId, "messages"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/status"] });
      toast({
        title: "Session Reset",
        description: "Conversation history cleared and agent memory reset.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reset session.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (content: string) => {
    if (!sessionId || !content.trim()) return;
    sendMessageMutation.mutate(content);
  };

  const handleUpdateSession = (updates: Partial<Session>) => {
    updateSessionMutation.mutate(updates);
  };

  const handleApproval = (decision: "approve" | "reject" | "modify") => {
    handleApprovalMutation.mutate(decision);
  };

  const handleResetSession = () => {
    resetSessionMutation.mutate();
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground" data-testid="loading-text">
            Initializing Tacit Agent Platform...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" data-testid="app-layout">
      <Sidebar
        session={session}
        onUpdateSession={handleUpdateSession}
        onResetSession={handleResetSession}
        agentStatus={agentStatus?.status || "idle"}
        isLoading={
          updateSessionMutation.isPending || resetSessionMutation.isPending
        }
      />

      <main className="flex-1 flex flex-col bg-background">
        <header
          className="bg-card border-b border-border px-6 py-4 shadow-sm"
          data-testid="header"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-2xl font-bold text-foreground"
                data-testid="title"
              >
                Tacit Agent Platform
              </h1>
              <p
                className="text-sm text-muted-foreground mt-1"
                data-testid="subtitle"
              >
                Expert-Driven AI Agent with Human-in-the-Loop Safety Controls
              </p>
            </div>
          </div>
        </header>

        <ProcessSteps />

        <ChatInterface
          messages={messages}
          agentStatus={agentStatus?.status || "idle"}
          onApproval={handleApproval}
          isProcessingApproval={handleApprovalMutation.isPending}
        />

        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={sendMessageMutation.isPending}
          agentStatus={agentStatus?.status || "idle"}
          hilEnabled={session.hilEnabled}
        />
      </main>
    </div>
  );
}
