export interface Session {
  id: string;
  systemPrompt: string;
  tacitKnowledge: string;
  hilEnabled: boolean;
  createdAt: Date;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    status?: AgentStatusType;
    requiresApproval?: boolean;
    reasoning?: string;
    knowledgeUsed?: string[];
    approvalDecision?: 'approve' | 'reject' | 'modify';
  };
  timestamp: Date;
}

export type AgentStatusType = 'idle' | 'reasoning' | 'consulting_knowledge' | 'awaiting_approval';

export type ProcessStepType = 'codify' | 'govern' | 'test';
