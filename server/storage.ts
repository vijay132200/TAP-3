import { type Session, type InsertSession, type Message, type InsertMessage } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Session management
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  updateSession(id: string, updates: Partial<InsertSession>): Promise<Session | undefined>;
  deleteSession(id: string): Promise<void>;
  
  // Message management
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(sessionId: string): Promise<Message[]>;
  clearMessages(sessionId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private sessions: Map<string, Session>;
  private messages: Map<string, Message>;

  constructor() {
    this.sessions = new Map();
    this.messages = new Map();
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = randomUUID();
    const session: Session = { 
      ...insertSession,
      hilEnabled: insertSession.hilEnabled ?? true,
      id,
      createdAt: new Date()
    };
    this.sessions.set(id, session);
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async updateSession(id: string, updates: Partial<InsertSession>): Promise<Session | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
    // Also delete associated messages
    Array.from(this.messages.entries()).forEach(([messageId, message]) => {
      if (message.sessionId === id) {
        this.messages.delete(messageId);
      }
    });
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = { 
      ...insertMessage,
      metadata: insertMessage.metadata ?? null,
      id,
      timestamp: new Date()
    };
    this.messages.set(id, message);
    return message;
  }

  async getMessages(sessionId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.sessionId === sessionId)
      .sort((a, b) => a.timestamp!.getTime() - b.timestamp!.getTime());
  }

  async clearMessages(sessionId: string): Promise<void> {
    Array.from(this.messages.entries()).forEach(([messageId, message]) => {
      if (message.sessionId === sessionId) {
        this.messages.delete(messageId);
      }
    });
  }
}

export const storage = new MemStorage();
