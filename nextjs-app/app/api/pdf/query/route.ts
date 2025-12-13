import { NextRequest, NextResponse } from 'next/server';
import { queryRag } from '@/lib/rag';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, k = 3 } = z.object({
      query: z.string(),
      k: z.number().optional().default(3)
    }).parse(body);

    const result = await queryRag(query, k);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to query RAG: ${error instanceof Error ? error.message : 'Unknown error'}`, results: [] },
      { status: 500 }
    );
  }
}
