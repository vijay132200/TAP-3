# Living Tacit Agent Platform

## Overview

The Living Tacit Agent Platform is an interactive web application built with Streamlit that enables non-technical experts to create, manage, and evolve AI agents powered by their specialized tacit knowledge. The platform features persistent rule storage, PDF document integration via RAG, automatic knowledge detection from conversations, and multi-source intelligent reasoning. The system operates at zero cost using Google Gemini 2.0 Flash and provides real-time knowledge management without requiring any coding.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Framework

**Runtime**: Python 3.11 with Streamlit for interactive web UI

**UI Framework**: Streamlit provides the complete user interface with:
- Sidebar for expert controls and knowledge management
- Main chat interface with message history
- Real-time session state management
- File upload capabilities for PDF documents

**Layout Pattern**: Sidebar-main content layout where the sidebar contains:
1. Persistent Rules Vault (editable text area)
2. PDF Document Upload (RAG integration)
3. Governance controls (HIL toggle, reset)

Main area displays:
1. Knowledge detection banners (when new rules are found)
2. Chat interface with message history
3. Source attribution for each response

### AI Agent Architecture

**LangGraph Orchestration**: State-based agent workflow with two main nodes:
1. **Knowledge Scanner Node**: Detects new tacit knowledge in user input using structured output
2. **Reasoning Node**: Multi-source consultation and response generation

**Multi-Source Knowledge System**:
1. **Tacit Rules Vault** (Priority 1): Expert-defined rules stored in JSON, always consulted first
2. **PDF Document RAG** (Priority 2): FAISS vector store for similarity search across uploaded PDFs
3. **External Search** (Priority 3): Tavily API for current, up-to-date web information

**Knowledge Scanner**: Uses Pydantic structured output to extract potential rules from conversation with confidence levels (high/medium/low). Detected rules are presented to the user for approval before being added to the vault.

**Memory Management**: LangGraph MemorySaver provides conversational memory across chat turns, maintaining context throughout the session.

### Data Storage Solutions

**Persistent Rules Storage**: JSON file (`tacit_rules.json`) stores expert tacit knowledge rules. Rules can be edited directly in the UI and are immediately persisted to disk.

**Vector Storage**: FAISS (Facebook AI Similarity Search) provides in-memory vector storage for PDF documents. Documents are:
- Loaded using PyPDFLoader
- Split into chunks with RecursiveCharacterTextSplitter (1000 chars, 200 overlap)
- Embedded using Google Generative AI Embeddings
- Indexed for fast similarity search

**Session State**: Streamlit session state manages:
- Chat message history
- PDF vector store
- Document count
- Pending knowledge detections

### External Dependencies

**AI Provider**: Google Gemini 2.0 Flash (experimental) via LangChain integration for:
- Primary LLM reasoning and response generation
- Knowledge scanner chain with structured output
- Embedding generation for PDF vectorization
- Zero-cost operation within free tier limits

**Search Provider**: Tavily Search API for real-time external knowledge retrieval when rules vault and PDFs don't contain relevant information.

**LangChain Ecosystem**:
- `langchain-google-genai`: Gemini integration
- `langchain-community`: Document loaders, vector stores, tools
- `langgraph`: State-based agent orchestration with memory
- `langchain-core`: Core abstractions and output parsers

**Vector Search**: FAISS (Facebook AI Similarity Search) for efficient similarity search over PDF document embeddings.

**Document Processing**: PyPDF for PDF loading and text extraction.

**Environment Variables**:
- `GEMINI_API_KEY`: Required for AI agent and embeddings (configured)
- `TAVILY_API_KEY`: Required for external search capabilities (configured)

**Performance Optimizations**:
- Streamlit `@st.cache_resource` for LLM and embeddings initialization
- Streamlit `@st.cache_data` for PDF processing to avoid reprocessing
- Session state persistence for vector stores across reruns

**Key Design Decision**: Zero-cost operation achieved through:
1. Google Gemini free tier (no API costs)
2. Tavily free tier for search
3. Local FAISS vector storage (no database costs)
4. JSON file persistence (no external storage costs)

## Recent Changes (January 2025)

**Platform Upgrade**: Transformed from Express/React architecture to Streamlit-based Living Knowledge Platform

**New Capabilities Added**:
1. Persistent JSON-based rules vault with UI editing
2. PDF document upload and RAG integration with FAISS
3. Automatic knowledge detection using structured output
4. Multi-source agent reasoning (vault → PDFs → web search)
5. Real-time rule approval workflow
6. Performance optimizations with Streamlit caching

**Migration Notes**: The original Express/React application is preserved in the codebase. To activate the new Streamlit platform, update the workflow configuration to run `./run_streamlit.sh` or `streamlit run app.py --server.port 5000 --server.address 0.0.0.0`. See `STREAMLIT_SETUP.md` for detailed instructions.