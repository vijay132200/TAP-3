#!/usr/bin/env python3
"""
RAG Service for PDF Document Processing
Handles PDF upload, indexing, and semantic search
"""

import os
import sys
import json
import pickle
from pathlib import Path
from typing import List, Dict, Optional
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter

VECTOR_STORE_PATH = Path("vector_store")
VECTOR_STORE_FILE = VECTOR_STORE_PATH / "faiss_index"

def initialize_embeddings():
    """Initialize Google embeddings"""
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables")
    return GoogleGenerativeAIEmbeddings(
        model="models/embedding-001",
        google_api_key=api_key
    )

def process_pdf(pdf_path: str) -> Dict:
    """Process a PDF and add to vector store"""
    try:
        embeddings = initialize_embeddings()
        
        # Load PDF
        loader = PyPDFLoader(pdf_path)
        documents = loader.load()
        
        # Split into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        splits = text_splitter.split_documents(documents)
        
        # Create or update vector store
        VECTOR_STORE_PATH.mkdir(exist_ok=True)
        
        if VECTOR_STORE_FILE.exists():
            # Load existing and merge
            vectorstore = FAISS.load_local(
                str(VECTOR_STORE_FILE), 
                embeddings,
                allow_dangerous_deserialization=True
            )
            new_vectorstore = FAISS.from_documents(splits, embeddings)
            vectorstore.merge_from(new_vectorstore)
        else:
            # Create new
            vectorstore = FAISS.from_documents(splits, embeddings)
        
        # Save
        vectorstore.save_local(str(VECTOR_STORE_FILE))
        
        return {
            "success": True,
            "chunks_processed": len(splits),
            "filename": Path(pdf_path).name
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def query_vector_store(query: str, k: int = 3) -> Dict:
    """Query the vector store for relevant context"""
    try:
        if not VECTOR_STORE_FILE.exists():
            return {
                "success": True,
                "results": [],
                "message": "No documents indexed yet"
            }
        
        embeddings = initialize_embeddings()
        vectorstore = FAISS.load_local(
            str(VECTOR_STORE_FILE), 
            embeddings,
            allow_dangerous_deserialization=True
        )
        
        # Perform similarity search
        docs = vectorstore.similarity_search(query, k=k)
        
        results = []
        for doc in docs:
            results.append({
                "content": doc.page_content,
                "metadata": doc.metadata
            })
        
        return {
            "success": True,
            "results": results
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "results": []
        }

def clear_vector_store() -> Dict:
    """Clear all indexed documents"""
    try:
        if VECTOR_STORE_FILE.exists():
            import shutil
            shutil.rmtree(VECTOR_STORE_PATH)
        return {"success": True, "message": "Vector store cleared"}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command provided"}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "process":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "No PDF path provided"}))
            sys.exit(1)
        pdf_path = sys.argv[2]
        result = process_pdf(pdf_path)
        print(json.dumps(result))
    
    elif command == "query":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "No query provided"}))
            sys.exit(1)
        query = sys.argv[2]
        k = int(sys.argv[3]) if len(sys.argv) > 3 else 3
        result = query_vector_store(query, k)
        print(json.dumps(result))
    
    elif command == "clear":
        result = clear_vector_store()
        print(json.dumps(result))
    
    else:
        print(json.dumps({"error": f"Unknown command: {command}"}))
        sys.exit(1)
