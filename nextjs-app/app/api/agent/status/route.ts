import { NextResponse } from 'next/server';
import { tacitAgent } from '@/lib/agent';

export async function GET() {
  return NextResponse.json({ status: tacitAgent.getStatus() });
}
