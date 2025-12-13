import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { insertSessionSchema } from '@/types/agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = insertSessionSchema.parse(body);
    const session = await storage.createSession(validatedData);
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid session data' }, { status: 400 });
  }
}
