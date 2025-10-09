# Living Tacit Agent Platform - Setup Instructions

## Overview

Your platform has been successfully upgraded to a Living Knowledge Platform using Streamlit, LangChain, and LangGraph. The new system includes:

✅ **Persistent Rules Vault** - Save and edit tacit knowledge rules in real-time
✅ **PDF Document RAG** - Upload PDFs as knowledge sources with FAISS vector search
✅ **Knowledge Scanner** - Automatic detection of new rules from conversations
✅ **Multi-Source Agent** - Intelligent reasoning across rules, documents, and web search
✅ **Zero-Cost AI** - Powered by Google Gemini 2.0 Flash

## Current Status

The Streamlit application is fully built and tested. However, the Replit workflow is still configured to run the old Express/React app.

## How to Switch to the Streamlit App

### Option 1: Manual Workflow Update (Recommended)

1. Open the `.replit` file in your project
2. Find the `[[workflows.workflow]]` section named "Start application"
3. Change the args line from:
   ```
   args = "npm run dev"
   ```
   to:
   ```
   args = "./run_streamlit.sh"
   ```
   Or alternatively:
   ```
   args = "streamlit run app.py --server.port 5000 --server.address 0.0.0.0"
   ```

4. Save the file and restart the workflow

### Option 2: Quick Test

To test the app immediately without changing the workflow:

```bash
streamlit run app.py --server.port 8501 --server.address 0.0.0.0
```

Then open your browser to port 8501.

## Files Created

- **app.py** - Main Streamlit application
- **tacit_rules.json** - Persistent storage for tacit knowledge rules
- **run_streamlit.sh** - Shell script to launch the app on port 5000
- **STREAMLIT_SETUP.md** - This setup guide

## Features Guide

### 1. Persistent Rules Vault (Sidebar)
- Edit rules directly in the text area
- Click "Save and Update Agent Rules" to persist changes
- Rules are stored in `tacit_rules.json` and automatically loaded

### 2. PDF Document Upload (Sidebar)
- Upload one or more PDF files
- Click "Process and Index PDFs" to create searchable knowledge base
- Status shows number of documents indexed

### 3. Knowledge Scanner (Automatic)
- Automatically detects when you mention new rules in chat
- Shows banner: "New Tacit Knowledge Detected!"
- Click "Approve" to add to Rules Vault or "Reject" to ignore

### 4. Chat Interface (Main Area)
- Ask questions and the agent will:
  1. Check tacit rules vault first (highest priority)
  2. Search PDF documents for relevant information
  3. Use external search (Tavily) for current information
- Each response shows which source was used

### 5. Agent Governance (Sidebar)
- Toggle "Human-in-the-Loop" for safety controls
- Click "Reset Chat Session" to clear conversation

## API Keys Required

✅ **GEMINI_API_KEY** - Already configured
✅ **TAVILY_API_KEY** - Already configured

## Example Usage

1. **Add a rule manually:**
   - Go to sidebar → "My Core Tacit Rules"
   - Add: "For transactions over $100k, always require dual approval"
   - Click "Save and Update Agent Rules"

2. **Upload policy documents:**
   - Go to sidebar → "Upload Tacit Policy Documents"
   - Upload your PDF files
   - Click "Process and Index PDFs"

3. **Chat with detection:**
   - Type: "From now on, I always prioritize European markets on Mondays"
   - Agent detects this as a new rule
   - Approve to add to vault

4. **Query the agent:**
   - Ask: "What's my policy for large transactions?"
   - Agent consults vault and responds with source citation

## Performance Optimizations

The app includes Streamlit caching for:
- LLM initialization (prevents repeated API setup)
- Embeddings model (shared across operations)
- PDF processing (faster reindexing)

## Troubleshooting

**Port conflict:** If port 5000 is busy, use port 8501 or another available port

**Missing API keys:** Check Replit Secrets for GEMINI_API_KEY and TAVILY_API_KEY

**PDF upload fails:** Ensure file is a valid PDF and not corrupted

**Rules not persisting:** Check that `tacit_rules.json` has write permissions

## Architecture Notes

- **LangGraph** orchestrates the agent workflow with memory
- **FAISS** provides vector similarity search for PDFs
- **Pydantic** enables structured output for knowledge extraction
- **Streamlit** delivers interactive UI with session state management

---

**Ready to go!** Once you update the workflow, your Living Knowledge Platform will be fully operational.
