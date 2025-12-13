import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { tacitAgent } from '@/lib/agent';
import { z } from 'zod';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { decision } = z.object({ 
      decision: z.enum(['approve', 'reject', 'modify'])
    }).parse(body);
    
    const session = await storage.getSession(id);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const agentResponse = await tacitAgent.handleHumanApproval(
      decision,
      session.systemPrompt,
      session.tacitKnowledge
    );

    const savedMessage = await storage.createMessage({
      sessionId: id,
      role: 'assistant',
      content: agentResponse.content,
      metadata: {
        status: agentResponse.status,
        approvalDecision: decision
      }
    });

    return NextResponse.json({ message: savedMessage, agentStatus: agentResponse.status });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to process approval: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
