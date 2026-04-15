from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    hcp_name = Column(String(255), nullable=False)
    interaction_type = Column(String(100), nullable=False)  # Meeting, Call, Email, Conference
    datetime = Column(DateTime, nullable=False)
    notes = Column(Text, nullable=True)
    followup = Column(Text, nullable=True)
    sentiment = Column(String(50), nullable=True)  # Positive, Neutral, Negative
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
