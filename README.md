# HCP CRM AI Application

A full-stack AI-first CRM for Healthcare Professional (HCP) interaction management, featuring a React frontend with Redux, a FastAPI backend, PostgreSQL database, and a LangGraph AI agent powered by Groq's `gemma2-9b-it`.

---

## 📁 Folder Structure

```
CRM-ai-project/
├── backend/
│   ├── app/
│   │   ├── agent/
│   │   │   ├── graph.py          # LangGraph StateGraph agent
│   │   │   └── tools.py          # 5 LangGraph tools
│   │   ├── routers/
│   │   │   ├── interactions.py   # CRUD endpoints
│   │   │   └── chat.py           # /chat endpoint
│   │   ├── config.py             # Pydantic settings (.env)
│   │   ├── crud.py               # DB helper functions
│   │   ├── database.py           # SQLAlchemy engine & session
│   │   ├── main.py               # FastAPI app entry point
│   │   ├── models.py             # ORM models
│   │   └── schemas.py            # Pydantic schemas
│   ├── .env.example
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── api/
        │   ├── axiosClient.js    # Axios instance
        │   └── interactionApi.js # API functions
        ├── components/
        │   ├── ChatPanel.jsx     # AI chat right panel
        │   └── InteractionForm.jsx # Form left panel
        ├── pages/
        │   └── LogInteractionPage.jsx # Split layout page
        ├── store/
        │   ├── chatSlice.js
        │   ├── index.js
        │   └── interactionSlice.js
        ├── App.jsx
        ├── index.css
        └── main.jsx
```

---

## ⚙️ Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL running locally
- Groq API Key → [https://console.groq.com](https://console.groq.com)

---

## 🗄️ Database Setup

```sql
-- In psql or pgAdmin:
CREATE DATABASE hcp_crm;
```

---

## 🚀 Running the Backend

```bash
cd backend

# 1. Create virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env and fill in DATABASE_URL and GROQ_API_KEY

# 4. Run server (tables auto-created on startup)
uvicorn app.main:app --reload --port 8000
```

API docs available at: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 💻 Running the Frontend

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Run dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🤖 How the AI Agent Works (Step-by-Step)

The agent uses **LangGraph** as its orchestration framework with Groq's `gemma2-9b-it` as the LLM.

```
User Message
     │
     ▼
[agent_node] ──── LLM classifies intent ────► action = "log_interaction" / "search_history" / ...
     │
     ▼
[tool_executor_node] ──── calls the appropriate tool:
     │
     ├── log_interaction_tool   → LLM extracts structured JSON → saves to DB
     ├── edit_interaction_tool  → updates existing record by ID
     ├── search_history_tool    → queries DB for past interactions
     ├── suggest_followup_tool  → LLM generates next-step recommendations
     └── sentiment_analysis_tool → LLM detects Positive / Neutral / Negative
     │
     ▼
ChatResponse { reply, structured_data, action }
     │
     ▼
Frontend: displays reply, optionally fills form with structured_data
```

### Example

**Input:** `"Met Dr. Smith, discussed Product X, he seemed interested, follow up next week"`

**Agent flow:**
1. `agent_node` → LLM returns `action = "log_interaction"`
2. `tool_executor_node` → calls `log_interaction_tool(text)`
3. Tool sends structured-extraction prompt to Groq
4. LLM returns:
```json
{
  "hcp_name": "Dr. Smith",
  "interaction_type": "Meeting",
  "datetime": "2026-04-14T20:00:00",
  "notes": "Discussed Product X; doctor seemed interested",
  "followup": "Follow up next week",
  "sentiment": "Positive"
}
```
5. Record saved to PostgreSQL; structured data returned to frontend
6. Frontend auto-fills the form fields

---

## 🔌 API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| POST | `/log-interaction` | Create a new interaction |
| POST | `/edit-interaction` | Update an existing interaction |
| GET | `/interactions` | List all interactions |
| POST | `/chat` | Send message to AI agent |

---

## 🌿 Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GROQ_API_KEY` | Your Groq API key |
