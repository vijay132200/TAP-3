import { NextRequest, NextResponse } from 'next/server';
import { processPdf } from '@/lib/rag';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No PDF file uploaded' }, { status: 400 });
    }
    
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const result = await processPdf(buffer, file.name);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
