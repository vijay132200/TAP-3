import { NextResponse } from 'next/server';
import { clearRag } from '@/lib/rag';

export async function DELETE() {
  try {
    const result = await clearRag();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to clear RAG: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
