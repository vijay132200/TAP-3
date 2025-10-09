import { spawn } from 'child_process';
import path from 'path';

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

/**
 * Call Python RAG service
 */
async function callPythonRag(command: string, ...args: string[]): Promise<RagResult> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(process.cwd(), 'rag_service.py');
    const python = spawn('python3', [pythonScript, command, ...args]);
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}: ${stderr}`));
        return;
      }
      
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse Python output: ${stdout}`));
      }
    });
    
    python.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Process and index a PDF file
 */
export async function processPdf(pdfPath: string): Promise<RagResult> {
  try {
    const result = await callPythonRag('process', pdfPath);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error processing PDF'
    };
  }
}

/**
 * Query the vector store for relevant context
 */
export async function queryRag(query: string, k: number = 3): Promise<RagResult> {
  try {
    const result = await callPythonRag('query', query, k.toString());
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error querying RAG',
      results: []
    };
  }
}

/**
 * Clear all indexed documents
 */
export async function clearRag(): Promise<RagResult> {
  try {
    const result = await callPythonRag('clear');
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error clearing RAG'
    };
  }
}
