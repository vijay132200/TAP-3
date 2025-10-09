import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSessionSchema, insertMessageSchema } from "@shared/schema";
import { tacitAgent } from "./services/agent";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {

  // Create new session
  app.post('/api/sessions', async (req, res) => {
    try {
      const validatedData = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(validatedData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: 'Invalid session data' });
    }
  });

  // Get session
  app.get('/api/sessions/:id', async (req, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve session' });
    }
  });

  // Update session
  app.patch('/api/sessions/:id', async (req, res) => {
    try {
      const updates = insertSessionSchema.partial().parse(req.body);
      const session = await storage.updateSession(req.params.id, updates);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: 'Invalid update data' });
    }
  });

  // Delete session (reset)
  app.delete('/api/sessions/:id', async (req, res) => {
    try {
      await storage.deleteSession(req.params.id);
      tacitAgent.reset();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete session' });
    }
  });

  // Get messages for session
  app.get('/api/sessions/:id/messages', async (req, res) => {
    try {
      const messages = await storage.getMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve messages' });
    }
  });

  // Send message to agent
  app.post('/api/sessions/:id/messages', async (req, res) => {
    try {
      const { content } = z.object({ content: z.string() }).parse(req.body);
      const session = await storage.getSession(req.params.id);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Save user message
      await storage.createMessage({
        sessionId: req.params.id,
        role: 'user',
        content,
        metadata: null
      });

      // Get conversation history
      const messages = await storage.getMessages(req.params.id);
      const conversationHistory = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));

      // Process with agent
      const agentResponse = await tacitAgent.processMessage(
        content,
        session.systemPrompt,
        session.tacitKnowledge,
        conversationHistory,
        session.hilEnabled
      );

      // Save agent response
      const savedMessage = await storage.createMessage({
        sessionId: req.params.id,
        role: 'assistant',
        content: agentResponse.content,
        metadata: {
          status: agentResponse.status,
          requiresApproval: agentResponse.requiresApproval,
          reasoning: agentResponse.reasoning,
          knowledgeUsed: agentResponse.knowledgeUsed
        }
      });

      res.json({ message: savedMessage, agentStatus: agentResponse.status });
    } catch (error) {
      res.status(500).json({ error: `Failed to process message: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });

  // Handle human approval
  app.post('/api/sessions/:id/approval', async (req, res) => {
    try {
      const { decision } = z.object({ 
        decision: z.enum(['approve', 'reject', 'modify'])
      }).parse(req.body);
      
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const agentResponse = await tacitAgent.handleHumanApproval(
        decision,
        session.systemPrompt,
        session.tacitKnowledge
      );

      // Save the approved/rejected response
      const savedMessage = await storage.createMessage({
        sessionId: req.params.id,
        role: 'assistant',
        content: agentResponse.content,
        metadata: {
          status: agentResponse.status,
          approvalDecision: decision
        }
      });

      res.json({ message: savedMessage, agentStatus: agentResponse.status });
    } catch (error) {
      res.status(500).json({ error: `Failed to process approval: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });

  // Get agent status
  app.get('/api/agent/status', (req, res) => {
    res.json({ status: tacitAgent.getStatus() });
  });

  // Clear messages (reset conversation)
  app.delete('/api/sessions/:id/messages', async (req, res) => {
    try {
      await storage.clearMessages(req.params.id);
      tacitAgent.reset();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear messages' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
