#!/usr/bin/env python3
"""
RAG Service for PDF Document Processing
Handles PDF upload, indexing, and semantic search using TF-IDF
"""

import os
import sys
import json
import pickle
from pathlib import Path
from typing import List, Dict, Optional
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

VECTOR_STORE_PATH = Path("vector_store")
VECTOR_STORE_FILE = VECTOR_STORE_PATH / "tfidf_index.pkl"

def process_pdf(pdf_path: str) -> Dict:
    """Process a PDF and add to vector store"""
    try:
        # Load PDF
        loader = PyPDFLoader(pdf_path)
        documents = loader.load()
        
        # Split into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        splits = text_splitter.split_documents(documents)
        
        # Extract text and metadata
        texts = [doc.page_content for doc in splits]
        metadata = [doc.metadata for doc in splits]
        
        # Create or update vector store
        VECTOR_STORE_PATH.mkdir(exist_ok=True)
        
        if VECTOR_STORE_FILE.exists():
            # Load existing and append
            with open(VECTOR_STORE_FILE, 'rb') as f:
                store_data = pickle.load(f)
            
            store_data['texts'].extend(texts)
            store_data['metadata'].extend(metadata)
            
            # Refit vectorizer with all texts
            vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
            tfidf_matrix = vectorizer.fit_transform(store_data['texts'])
            
            store_data['vectorizer'] = vectorizer
            store_data['tfidf_matrix'] = tfidf_matrix
        else:
            # Create new
            vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
            tfidf_matrix = vectorizer.fit_transform(texts)
            
            store_data = {
                'texts': texts,
                'metadata': metadata,
                'vectorizer': vectorizer,
                'tfidf_matrix': tfidf_matrix
            }
        
        # Save
        with open(VECTOR_STORE_FILE, 'wb') as f:
            pickle.dump(store_data, f)
        
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
        
        # Load vector store
        with open(VECTOR_STORE_FILE, 'rb') as f:
            store_data = pickle.load(f)
        
        vectorizer = store_data['vectorizer']
        tfidf_matrix = store_data['tfidf_matrix']
        texts = store_data['texts']
        metadata = store_data['metadata']
        
        # Transform query
        query_vector = vectorizer.transform([query])
        
        # Calculate similarity
        similarities = cosine_similarity(query_vector, tfidf_matrix).flatten()
        
        # Get top k results
        top_indices = np.argsort(similarities)[-k:][::-1]
        
        results = []
        for idx in top_indices:
            if similarities[idx] > 0:  # Only include if there's some similarity
                results.append({
                    "content": texts[idx],
                    "metadata": metadata[idx]
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
