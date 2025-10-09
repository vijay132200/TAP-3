import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSessionSchema, insertMessageSchema } from "@shared/schema";
import { tacitAgent } from "./services/agent";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { processPdf, queryRag, clearRag } from "./services/rag";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for PDF uploads
  const upload = multer({
    storage: multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads');
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'));
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    }
  });

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

  // Upload and process PDF
  app.post('/api/pdf/upload', upload.single('pdf'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      const result = await processPdf(req.file.path);
      
      // Clean up uploaded file after processing
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError);
      }

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        error: `Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  });

  // Query RAG for context
  app.post('/api/pdf/query', async (req, res) => {
    try {
      const { query, k = 3 } = z.object({
        query: z.string(),
        k: z.number().optional().default(3)
      }).parse(req.body);

      const result = await queryRag(query, k);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: `Failed to query RAG: ${error instanceof Error ? error.message : 'Unknown error'}`,
        results: []
      });
    }
  });

  // Clear all indexed PDFs
  app.delete('/api/pdf/clear', async (req, res) => {
    try {
      const result = await clearRag();
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        error: `Failed to clear RAG: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
