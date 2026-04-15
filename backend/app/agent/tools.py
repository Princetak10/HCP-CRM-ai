import json
import re
from datetime import datetime, timedelta
from typing import Optional, List
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from app.config import settings
from app.database import SessionLocal
from app import crud
from app.schemas import InteractionCreate, InteractionUpdate


def get_llm():
    return ChatGroq(
        api_key=settings.GROQ_API_KEY,
        model="llama-3.3-70b-versatile",
        temperature=0.1,
    )


def _normalize_date(date_str: str) -> str:
    """Helper to convert relative dates (e.g. 'next week') into ISO format."""
    now = datetime.now()
    prompt = f"""You are a date normalizer. Today is {now.isoformat()}.
Convert the relative date "{date_str}" (like "next week" or "tomorrow") into an exact ISO 8601 datetime string. Do not include time if it is a whole day. 
Reply with ONLY the raw ISO string (e.g. {now.isoformat()})."""
    try:
        iso_str = get_llm().invoke(prompt).content.strip()
        parsed = datetime.fromisoformat(iso_str)
        return parsed.isoformat()
    except Exception:
        return now.isoformat()


@tool
def log_interaction_tool(
    hcp_name: str,
    interaction_type: str,
    notes: str,
    followup: str = "None mentioned",
    sentiment: str = "Neutral",
    datetime_str: Optional[str] = None
) -> str:
    """Use this tool to log an interaction with a Healthcare Professional (HCP) into the CRM database.
    WARNING: You must know the doctor's name (hcp_name). If it's missing from the user's message, DO NOT call this tool — instead ask the user which doctor they met.
    
    Args:
        hcp_name: Name of the doctor/professional.
        interaction_type: Should be "Meeting", "Call", "Email", or "Conference".
        notes: Complete summary of what was discussed.
        followup: Specific follow-up actions mentioned.
        sentiment: Observed sentiment. STRICT RULES: If user expresses interest, enthusiasm, or positive reaction, classify as Positive. If user expresses disinterest or rejection, classify as Negative.
        datetime_str: When it happened. Use natural language like "today" or "next week".
    """
    
    # 1. Normalize date format
    iso_date = _normalize_date(datetime_str) if datetime_str else datetime.now().isoformat()
    
    # 2. Persist to DB
    db = SessionLocal()
    try:
        schema = InteractionCreate(
            hcp_name=hcp_name,
            interaction_type=interaction_type,
            datetime=datetime.fromisoformat(iso_date),
            notes=notes,
            followup=followup,
            sentiment=sentiment,
        )
        interaction = crud.create_interaction(db, schema)
        
        # 3. Return structured JSON specifically for frontend hook
        structured_data = {
            "id": interaction.id,
            "hcp_name": interaction.hcp_name,
            "interaction_type": interaction.interaction_type,
            "datetime": interaction.datetime.isoformat(),
            "notes": interaction.notes,
            "followup": interaction.followup,
            "sentiment": interaction.sentiment,
            "saved": True
        }
        # Dump as a string prefixed with a special marker so the Agent captures it
        return f"[LOG_SUCCESS] {json.dumps(structured_data)}"
    except Exception as e:
        return f"[LOG_ERROR] Could not save to database: {str(e)}"
    finally:
        db.close()


@tool
def edit_interaction_tool(interaction_id: int, updates_json_string: str) -> str:
    """Update an existing interaction record by its ID. 
    Pass the updates as a JSON string containing the keys to update (e.g. '{"sentiment": "Positive"}').
    """
    db = SessionLocal()
    try:
        updates = json.loads(updates_json_string)
        schema = InteractionUpdate(id=interaction_id, **updates)
        interaction = crud.update_interaction(db, schema)
        if interaction:
            return f"Successfully updated interaction #{interaction.id} for {interaction.hcp_name}"
        return f"Interaction #{interaction_id} not found."
    except Exception as e:
        return f"Error updating interaction: {str(e)}"
    finally:
        db.close()


@tool
def search_history_tool(hcp_name: Optional[str] = None) -> str:
    """Search and retrieve past interactions. Optionally filter by exactly matching or partially matching HCP name."""
    db = SessionLocal()
    try:
        interactions = crud.search_interactions(db, hcp_name=hcp_name)
        if not interactions:
            return "No previous interactions found."
            
        result = []
        for i in interactions[:5]:  # Return top 5
            date_str = i.datetime.strftime("%Y-%m-%d") if i.datetime else "N/A"
            result.append(
                f"[{i.id}] {date_str} - {i.hcp_name} ({i.interaction_type})\n"
                f"Notes: {i.notes}\n"
                f"Follow-up: {i.followup}\n"
                f"Sentiment: {i.sentiment}"
            )
        return "Found recent interactions:\n\n" + "\n---\n".join(result)
    finally:
        db.close()


@tool
def suggest_followup_tool(hcp_name: str, context: Optional[str] = None) -> str:
    """Generate strategic, context-aware follow-up suggestions for an HCP.
    
    Args:
        hcp_name: Name of the doctor.
        context: Optional recent context provided by the user (if any).
    """
    db = SessionLocal()
    try:
        # Fetch real historical data for context!
        interactions = crud.search_interactions(db, hcp_name=hcp_name)
        history_text = ""
        if interactions:
            for i in interactions[:3]:
                history_text += f"\n- On {i.datetime.strftime('%Y-%m-%d')}, discussed: {i.notes}. Previous follow-up plan: {i.followup}"
        else:
            history_text = "No previous history found in database."
            
        prompt = f"""You are a senior pharmaceutical sales strategist advising a representative.
Provide 3 concrete, personalized follow-up actions for {hcp_name}.

--- DATABASE CONTEXT OF RECENT INTERACTIONS ---
{history_text}
--- CURRENT USER CONTEXT ---
{context or "None"}

Base your recommendations STRICTLY on the actual discussion topics and history above. 
Output a numbered list."""

        res = get_llm().invoke(prompt)
        return res.content.strip()
    finally:
        db.close()


@tool
def sentiment_analysis_tool(text: str) -> str:
    """Analyze the sentiment of a given text if explicitly requested by the user. Do not use this just for logging notes."""
    prompt = f"""Analyze the sentiment of the following interaction notes.
STRICT RULES:
- If user expresses interest, enthusiasm, or positive reaction -> classify sentiment as Positive.
- If user expresses disinterest or rejection -> classify sentiment as Negative.

Reply with JSON: {{"sentiment": "Positive/Neutral/Negative", "confidence": float, "reasoning": "brief string"}}

Text: "{text}"
"""
    res = get_llm().invoke(prompt)
    return res.content.strip()


# We export standard list of tools for LangGraph to bind
TOOLS = [
    log_interaction_tool,
    edit_interaction_tool,
    search_history_tool,
    suggest_followup_tool,
    sentiment_analysis_tool
]
