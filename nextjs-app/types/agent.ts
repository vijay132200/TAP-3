import { z } from "zod";

export const AgentStatus = z.enum(['idle', 'reasoning', 'consulting_knowledge', 'awaiting_approval']);
export type AgentStatusType = z.infer<typeof AgentStatus>;

export const ProcessStep = z.enum(['codify', 'govern', 'test']);
export type ProcessStepType = z.infer<typeof ProcessStep>;

export interface Session {
  id: string;
  systemPrompt: string;
  tacitKnowledge: string;
  hilEnabled: boolean;
  createdAt: Date | null;
}

export interface Message {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  metadata: Record<string, any> | null;
  timestamp: Date | null;
}

export interface InsertSession {
  systemPrompt: string;
  tacitKnowledge: string;
  hilEnabled?: boolean;
}

export interface InsertMessage {
  sessionId: string;
  role: string;
  content: string;
  metadata?: Record<string, any> | null;
}

export interface AgentResponse {
  content: string;
  status: AgentStatusType;
  requiresApproval?: boolean;
  reasoning?: string;
  knowledgeUsed?: string[];
}

export const insertSessionSchema = z.object({
  systemPrompt: z.string(),
  tacitKnowledge: z.string(),
  hilEnabled: z.boolean().optional().default(true),
});

export const insertMessageSchema = z.object({
  sessionId: z.string(),
  role: z.string(),
  content: z.string(),
  metadata: z.record(z.any()).nullable().optional(),
});
