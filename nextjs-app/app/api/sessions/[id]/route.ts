import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { tacitAgent } from '@/lib/agent';
import { insertSessionSchema } from '@/types/agent';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await storage.getSession(params.id);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve session' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updates = insertSessionSchema.partial().parse(body);
    const session = await storage.updateSession(params.id, updates);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid update data' }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await storage.deleteSession(params.id);
    tacitAgent.reset();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
