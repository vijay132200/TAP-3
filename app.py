import streamlit as st
import json
import os
from pathlib import Path
from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_community.tools.tavily_search import TavilySearchResults
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from typing_extensions import TypedDict
import tempfile

RULES_FILE = "tacit_rules.json"

class DetectedKnowledge(BaseModel):
    """Schema for detected tacit knowledge"""
    has_new_knowledge: bool = Field(description="Whether new tacit knowledge was detected")
    extracted_rule: Optional[str] = Field(description="The extracted rule or heuristic if detected")
    confidence: str = Field(description="Confidence level: high, medium, or low")

class AgentState(TypedDict):
    """State for the agent graph"""
    messages: List[Dict[str, str]]
    user_input: str
    detected_knowledge: Optional[DetectedKnowledge]
    response: str
    source_used: str

def load_rules() -> str:
    """Load tacit rules from JSON file"""
    if Path(RULES_FILE).exists():
        with open(RULES_FILE, 'r') as f:
            data = json.load(f)
            return data.get('rules', '')
    return ""

def save_rules(rules: str):
    """Save tacit rules to JSON file"""
    with open(RULES_FILE, 'w') as f:
        json.dump({'rules': rules}, f, indent=2)

@st.cache_resource
def initialize_llm():
    """Initialize the Gemini LLM"""
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables")
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash-exp",
        google_api_key=api_key,
        temperature=0.7
    )

@st.cache_resource
def initialize_embeddings():
    """Initialize Google embeddings"""
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables")
    return GoogleGenerativeAIEmbeddings(
        model="models/embedding-001",
        google_api_key=api_key
    )

def create_knowledge_scanner(llm):
    """Create knowledge scanner chain with structured output"""
    parser = PydanticOutputParser(pydantic_object=DetectedKnowledge)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a knowledge extraction specialist. Your job is to detect if the user's input contains new tacit knowledge, rules, or heuristics that should be saved.

Look for phrases like:
- "From now on, always..."
- "I prioritize X when Y..."
- "Never do X in situation Y..."
- "My rule for X is..."
- Any pattern that sounds like a personal rule or heuristic

{format_instructions}"""),
        ("user", "{input}")
    ])
    
    return prompt | llm | parser

@st.cache_data
def process_pdf(_uploaded_file, _embeddings) -> FAISS:
    """Process uploaded PDF and create vector store"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        tmp_file.write(_uploaded_file.getvalue())
        tmp_path = tmp_file.name
    
    try:
        loader = PyPDFLoader(tmp_path)
        documents = loader.load()
        
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        splits = text_splitter.split_documents(documents)
        
        vectorstore = FAISS.from_documents(splits, _embeddings)
        return vectorstore
    finally:
        os.unlink(tmp_path)

def scan_for_knowledge(user_input: str, scanner_chain) -> Optional[DetectedKnowledge]:
    """Scan user input for new knowledge"""
    try:
        result = scanner_chain.invoke({
            "input": user_input,
            "format_instructions": PydanticOutputParser(pydantic_object=DetectedKnowledge).get_format_instructions()
        })
        if result.has_new_knowledge and result.confidence in ["high", "medium"]:
            return result
    except Exception as e:
        st.error(f"Knowledge scanner error: {e}")
    return None

def create_agent_graph(llm, rules_vault: str, vectorstore: Optional[FAISS], tavily_tool):
    """Create LangGraph agent with multi-source reasoning"""
    
    def knowledge_scanner_node(state: AgentState) -> AgentState:
        """Scan for new knowledge"""
        scanner = create_knowledge_scanner(llm)
        detected = scan_for_knowledge(state["user_input"], scanner)
        state["detected_knowledge"] = detected
        return state
    
    def reasoning_node(state: AgentState) -> AgentState:
        """Main reasoning node that consults multiple sources"""
        user_input = state["user_input"]
        sources_used = []
        context_parts = []
        
        if rules_vault and rules_vault.strip():
            context_parts.append(f"TACIT RULES VAULT:\n{rules_vault}")
            sources_used.append("Tacit Rule Vault")
        
        if vectorstore:
            docs = vectorstore.similarity_search(user_input, k=3)
            if docs:
                pdf_context = "\n\n".join([f"PDF Source (Page {doc.metadata.get('page', '?')}): {doc.page_content}" for doc in docs])
                context_parts.append(f"PDF DOCUMENTS:\n{pdf_context}")
                sources_used.append(f"PDF Documents (Pages: {', '.join([str(doc.metadata.get('page', '?')) for doc in docs])})")
        
        if tavily_tool and os.getenv('TAVILY_API_KEY'):
            try:
                search_results = tavily_tool.invoke({"query": user_input})
                if search_results:
                    external_context = "\n\n".join([f"External Source: {r.get('content', '')}" for r in search_results])
                    context_parts.append(f"EXTERNAL SEARCH RESULTS:\n{external_context}")
                    sources_used.append("External Search (Tavily)")
            except Exception as e:
                st.warning(f"External search unavailable: {e}")
        
        full_context = "\n\n---\n\n".join(context_parts) if context_parts else "No specialized knowledge available"
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a specialized expert assistant. You have access to multiple knowledge sources.

AVAILABLE KNOWLEDGE:
{context}

Instructions:
1. ALWAYS prioritize information from the Tacit Rules Vault if relevant
2. Use PDF Documents for detailed policy information
3. Use External Search for current, up-to-date information
4. Clearly state which source(s) you're using in your response
5. If using rules from the vault, reference them explicitly"""),
            ("user", "{input}")
        ])
        
        response = llm.invoke(prompt.format(context=full_context, input=user_input))
        
        state["response"] = response.content
        state["source_used"] = ", ".join(sources_used) if sources_used else "General knowledge only"
        return state
    
    workflow = StateGraph(AgentState)
    workflow.add_node("scanner", knowledge_scanner_node)
    workflow.add_node("reasoning", reasoning_node)
    
    workflow.set_entry_point("scanner")
    workflow.add_edge("scanner", "reasoning")
    workflow.add_edge("reasoning", END)
    
    memory = MemorySaver()
    return workflow.compile(checkpointer=memory)

def main():
    st.set_page_config(page_title="Living Tacit Agent Platform", layout="wide")
    
    st.title("🧠 Living Tacit Agent Platform")
    st.caption("Powered by Google Gemini 2.0 Flash • Zero Running Costs")
    
    if 'messages' not in st.session_state:
        st.session_state.messages = []
    if 'vectorstore' not in st.session_state:
        st.session_state.vectorstore = None
    if 'pdf_count' not in st.session_state:
        st.session_state.pdf_count = 0
    if 'pending_knowledge' not in st.session_state:
        st.session_state.pending_knowledge = None
    
    llm = initialize_llm()
    embeddings = initialize_embeddings()
    tavily_tool = TavilySearchResults(max_results=3) if os.getenv('TAVILY_API_KEY') else None
    
    with st.sidebar:
        st.header("📚 Expert Control & Knowledge Management")
        
        st.subheader("🔐 Tacit Rule Vault")
        rules = load_rules()
        rules_text = st.text_area(
            "My Core Tacit Rules (Editable)",
            value=rules,
            height=200,
            help="Enter your expert rules and heuristics here. These will be prioritized by the agent."
        )
        
        if st.button("💾 Save and Update Agent Rules", type="primary"):
            save_rules(rules_text)
            st.success("✅ Rules saved successfully!")
            st.rerun()
        
        st.divider()
        
        st.subheader("📄 PDF Document Upload (RAG Source)")
        uploaded_files = st.file_uploader(
            "Upload Tacit Policy Documents (PDFs)",
            type=['pdf'],
            accept_multiple_files=True
        )
        
        if uploaded_files:
            if st.button("🔄 Process and Index PDFs"):
                with st.spinner("Processing PDFs..."):
                    all_docs = []
                    for uploaded_file in uploaded_files:
                        vectorstore = process_pdf(uploaded_file, embeddings)
                        if st.session_state.vectorstore is None:
                            st.session_state.vectorstore = vectorstore
                        else:
                            st.session_state.vectorstore.merge_from(vectorstore)
                    st.session_state.pdf_count = len(uploaded_files)
                    st.success(f"✅ Processed {len(uploaded_files)} document(s)")
                    st.rerun()
        
        if st.session_state.pdf_count > 0:
            st.info(f"📊 Status: {st.session_state.pdf_count} Document(s) Indexed")
        
        st.divider()
        
        st.subheader("⚙️ Governance & Reset")
        hil_enabled = st.toggle("Enable Human-in-the-Loop (HIL) Veto", value=True)
        
        if st.button("🔄 Reset Chat Session"):
            st.session_state.messages = []
            st.session_state.pending_knowledge = None
            st.success("✅ Chat session reset")
            st.rerun()
    
    if st.session_state.pending_knowledge:
        st.warning("🔔 New Tacit Knowledge Detected!")
        st.info(f"**Detected Rule:** {st.session_state.pending_knowledge.extracted_rule}")
        st.caption(f"Confidence: {st.session_state.pending_knowledge.confidence}")
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("✅ Approve and Add to Rules Vault"):
                current_rules = load_rules()
                new_rules = f"{current_rules}\n\n{st.session_state.pending_knowledge.extracted_rule}" if current_rules else st.session_state.pending_knowledge.extracted_rule
                save_rules(new_rules)
                st.success("✅ Rule added to vault!")
                st.session_state.pending_knowledge = None
                st.rerun()
        with col2:
            if st.button("❌ Reject"):
                st.session_state.pending_knowledge = None
                st.rerun()
    
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
            if "source" in message:
                st.caption(f"📍 Source: {message['source']}")
    
    if prompt := st.chat_input("Ask me anything..."):
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)
        
        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                agent = create_agent_graph(
                    llm, 
                    load_rules(), 
                    st.session_state.vectorstore,
                    tavily_tool
                )
                
                initial_state: AgentState = {
                    "messages": st.session_state.messages,
                    "user_input": prompt,
                    "detected_knowledge": None,
                    "response": "",
                    "source_used": ""
                }
                
                result = agent.invoke(initial_state, config={"configurable": {"thread_id": "main"}})
                
                if result["detected_knowledge"] and not st.session_state.pending_knowledge:
                    st.session_state.pending_knowledge = result["detected_knowledge"]
                
                response = result["response"]
                source = result["source_used"]
                
                st.markdown(response)
                st.caption(f"📍 Source: {source}")
                
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": response,
                    "source": source
                })

if __name__ == "__main__":
    main()
