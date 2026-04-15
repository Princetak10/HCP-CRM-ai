from fastapi import APIRouter, HTTPException
from app.schemas import ChatRequest, ChatResponse
from app.agent.graph import run_agent

router = APIRouter(tags=["Chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        result = run_agent(request.message)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
