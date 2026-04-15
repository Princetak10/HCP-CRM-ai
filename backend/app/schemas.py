from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class InteractionCreate(BaseModel):
    hcp_name: str
    interaction_type: str
    datetime: datetime
    notes: Optional[str] = None
    followup: Optional[str] = None
    sentiment: Optional[str] = None


class InteractionUpdate(BaseModel):
    id: int
    hcp_name: Optional[str] = None
    interaction_type: Optional[str] = None
    datetime: Optional[datetime] = None
    notes: Optional[str] = None
    followup: Optional[str] = None
    sentiment: Optional[str] = None


class InteractionOut(BaseModel):
    id: int
    hcp_name: str
    interaction_type: str
    datetime: datetime
    notes: Optional[str] = None
    followup: Optional[str] = None
    sentiment: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    structured_data: Optional[dict] = None
    action: Optional[str] = None
