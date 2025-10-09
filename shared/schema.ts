import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  systemPrompt: text("system_prompt").notNull(),
  tacitKnowledge: text("tacit_knowledge").notNull(),
  hilEnabled: boolean("hil_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => sessions.id).notNull(),
  role: text("role").notNull(), // 'user', 'assistant', 'system'
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // For storing agent status, reasoning steps, etc.
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Agent-specific types
export const AgentStatus = z.enum(['idle', 'reasoning', 'consulting_knowledge', 'awaiting_approval']);
export type AgentStatusType = z.infer<typeof AgentStatus>;

export const ProcessStep = z.enum(['codify', 'govern', 'test']);
export type ProcessStepType = z.infer<typeof ProcessStep>;

export interface AgentResponse {
  content: string;
  status: AgentStatusType;
  requiresApproval?: boolean;
  reasoning?: string;
  knowledgeUsed?: string[];
}
