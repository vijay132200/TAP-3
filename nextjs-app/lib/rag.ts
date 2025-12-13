interface RagResult {
  success: boolean;
  results?: Array<{
    content: string;
    metadata: Record<string, any>;
  }>;
  error?: string;
  message?: string;
  chunks_processed?: number;
  filename?: string;
}

interface DocumentChunk {
  content: string;
  metadata: {
    page: number;
    filename: string;
  };
  vector?: number[];
}

declare global {
  var ragStore: DocumentChunk[] | undefined;
}

let documentStore: DocumentChunk[] = globalThis.ragStore || [];
if (process.env.NODE_ENV !== 'production') {
  globalThis.ragStore = documentStore;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
}

function computeTfIdf(query: string, documents: DocumentChunk[]): Map<number, number> {
  const queryTokens = tokenize(query);
  const scores = new Map<number, number>();
  
  if (documents.length === 0) return scores;
  
  const docFrequency = new Map<string, number>();
  documents.forEach(doc => {
    const tokens = new Set(tokenize(doc.content));
    tokens.forEach(token => {
      docFrequency.set(token, (docFrequency.get(token) || 0) + 1);
    });
  });
  
  documents.forEach((doc, idx) => {
    const docTokens = tokenize(doc.content);
    const termFreq = new Map<string, number>();
    docTokens.forEach(token => {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    });
    
    let score = 0;
    queryTokens.forEach(queryToken => {
      const tf = (termFreq.get(queryToken) || 0) / Math.max(docTokens.length, 1);
      const df = docFrequency.get(queryToken) || 0;
      const idf = df > 0 ? Math.log(documents.length / df) : 0;
      score += tf * idf;
    });
    
    scores.set(idx, score);
  });
  
  return scores;
}

export async function processPdf(pdfBuffer: Buffer, filename: string): Promise<RagResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(pdfBuffer);
    
    const text: string = data.text;
    const pages: string[] = text.split(/\f/).filter((p: string) => p.trim());
    
    const chunks: DocumentChunk[] = [];
    pages.forEach((pageContent: string, pageIndex: number) => {
      const paragraphs: string[] = pageContent.split(/\n\n+/).filter((p: string) => p.trim().length > 50);
      
      if (paragraphs.length === 0 && pageContent.trim().length > 50) {
        chunks.push({
          content: pageContent.trim(),
          metadata: {
            page: pageIndex + 1,
            filename
          }
        });
      } else {
        paragraphs.forEach((paragraph: string) => {
          chunks.push({
            content: paragraph.trim(),
            metadata: {
              page: pageIndex + 1,
              filename
            }
          });
        });
      }
    });
    
    documentStore.push(...chunks);
    if (process.env.NODE_ENV !== 'production') {
      globalThis.ragStore = documentStore;
    }
    
    return {
      success: true,
      message: `Successfully processed ${filename}`,
      chunks_processed: chunks.length,
      filename
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error processing PDF'
    };
  }
}

export async function queryRag(query: string, k: number = 3): Promise<RagResult> {
  try {
    if (documentStore.length === 0) {
      return {
        success: true,
        results: [],
        message: 'No documents indexed'
      };
    }
    
    const scores = computeTfIdf(query, documentStore);
    
    const sortedIndices = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, k)
      .filter(([_, score]) => score > 0)
      .map(([idx, _]) => idx);
    
    const results = sortedIndices.map(idx => ({
      content: documentStore[idx].content,
      metadata: documentStore[idx].metadata
    }));
    
    return {
      success: true,
      results
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error querying RAG',
      results: []
    };
  }
}

export async function clearRag(): Promise<RagResult> {
  try {
    documentStore = [];
    if (process.env.NODE_ENV !== 'production') {
      globalThis.ragStore = documentStore;
    }
    return {
      success: true,
      message: 'All documents cleared'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error clearing RAG'
    };
  }
}
