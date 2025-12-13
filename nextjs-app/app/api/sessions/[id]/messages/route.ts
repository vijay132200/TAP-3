import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { tacitAgent } from '@/lib/agent';
import { z } from 'zod';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const messages = await storage.getMessages(params.id);
    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve messages' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { content } = z.object({ content: z.string() }).parse(body);
    const session = await storage.getSession(params.id);
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await storage.createMessage({
      sessionId: params.id,
      role: 'user',
      content,
      metadata: null
    });

    const messages = await storage.getMessages(params.id);
    const conversationHistory = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    const agentResponse = await tacitAgent.processMessage(
      content,
      session.systemPrompt,
      session.tacitKnowledge,
      conversationHistory,
      session.hilEnabled
    );

    const savedMessage = await storage.createMessage({
      sessionId: params.id,
      role: 'assistant',
      content: agentResponse.content,
      metadata: {
        status: agentResponse.status,
        requiresApproval: agentResponse.requiresApproval,
        reasoning: agentResponse.reasoning,
        knowledgeUsed: agentResponse.knowledgeUsed
      }
    });

    return NextResponse.json({ message: savedMessage, agentStatus: agentResponse.status });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to process message: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await storage.clearMessages(params.id);
    tacitAgent.reset();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to clear messages' }, { status: 500 });
  }
}
