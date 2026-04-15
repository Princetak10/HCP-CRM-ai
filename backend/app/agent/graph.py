import json
import re
from typing import TypedDict, Annotated, Sequence, Optional
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver

from app.config import settings
from app.agent.tools import TOOLS

# In-memory checkpointer for multi-turn conversational memory
memory = MemorySaver()

# Global LLM instance explicitly set to the 70b model
llm = ChatGroq(
    api_key=settings.GROQ_API_KEY,
    model="llama-3.3-70b-versatile",
    temperature=0.1,
)

# Robust system instruction specifically handling missing data and routing preferences.
SYSTEM_MESSAGE = """You are a highly intelligent pharmaceutical CRM Assistant powered by LangGraph.
You have access to a set of specific tools. 

CRITICAL ROUTING RULES:
1. If the user mentions ANY interaction, meeting, or activity log, you MUST attempt to call `log_interaction_tool`.
2. MISSING DATA HANDLING: If the user wants to log an interaction but DOES NOT identify the doctor or HCP name, DO NOT guess it. You MUST ask the user "Which doctor/HCP are you referring to?" and wait for their response before calling the tool.
3. MULTI-INTENT: If the user asks for two different things (e.g., "Show my history and log a new call"), you must loop and execute the tools sequentially.
4. If asked for follow-up suggestions, prefer calling `suggest_followup_tool` feeding it the HCP name so it can pull actual context from the history database instead of inventing generic actions.
5. SENTIMENT: If the user expresses interest, enthusiasm, or positive reaction, MUST classify sentiment as Positive. If disinterest or rejection, MUST classify sentiment as Negative.
6. DATES: Convert relative time expressions like "next week", "tomorrow" into exact dates if possible using your internal tools logic.
7. EFFICIENCY: If enough information is available to call a tool, DO NOT ask unnecessary questions. Auto-fill exactly as many optional fields as possible. ONLY ask for clarification if CRITICAL data (like HCP Name) is entirely missing.

Keep your natural language responses completely professional, brief, and clean. Do NOT output raw JSON blocks. Process tool responses and summarize gracefully.
"""

# Create the standard ReAct Agent Graph orchestrating our Tools + Memory
_compiled_graph = create_react_agent(
    llm,
    tools=TOOLS,
    prompt=SYSTEM_MESSAGE,
    checkpointer=memory,
)

def run_agent(user_message: str, thread_id: str = "default_thread") -> dict:
    """Entry point for the backend API to invoke the LangGraph agent."""
    config = {"configurable": {"thread_id": thread_id}}
    
    # Run the graph
    result = _compiled_graph.invoke(
        {"messages": [HumanMessage(content=user_message)]}, 
        config=config
    )
    
    # Extract the final LLM response
    final_message = result["messages"][-1].content
    
    # ── Check if the agent successfully logged a structured interaction in this turn ──
    # We parse the raw string outputs of the tools dynamically to detect [LOG_SUCCESS]
    # This allows the frontend to auto-populate the UI form cleanly!
    structured_data = {}
    action = "general"
    
    # Reverse iterate through the message history to check if the tool ran recently
    for msg in reversed(result["messages"]):
        if msg.type == "tool" and getattr(msg, "name", "") == "log_interaction_tool":
            if "[LOG_SUCCESS]" in msg.content:
                action = "log_interaction"
                try:
                    # Extract the JSON we slipped in after the tag
                    json_str = msg.content.split("[LOG_SUCCESS] ")[1]
                    structured_data = json.loads(json_str)
                except Exception:
                    pass
            break
            
    return {
        "reply": final_message,
        "structured_data": structured_data,
        "action": action,
    }
