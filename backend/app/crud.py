from sqlalchemy.orm import Session
from app.models import Interaction
from app.schemas import InteractionCreate, InteractionUpdate
from typing import List, Optional


def create_interaction(db: Session, data: InteractionCreate) -> Interaction:
    interaction = Interaction(
        hcp_name=data.hcp_name,
        interaction_type=data.interaction_type,
        datetime=data.datetime,
        notes=data.notes,
        followup=data.followup,
        sentiment=data.sentiment,
    )
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction


def update_interaction(db: Session, data: InteractionUpdate) -> Optional[Interaction]:
    interaction = db.query(Interaction).filter(Interaction.id == data.id).first()
    if not interaction:
        return None
    update_data = data.model_dump(exclude_unset=True, exclude={"id"})
    for key, value in update_data.items():
        setattr(interaction, key, value)
    db.commit()
    db.refresh(interaction)
    return interaction


def get_all_interactions(db: Session) -> List[Interaction]:
    return db.query(Interaction).order_by(Interaction.id.desc()).all()


def get_interaction_by_id(db: Session, interaction_id: int) -> Optional[Interaction]:
    return db.query(Interaction).filter(Interaction.id == interaction_id).first()


def search_interactions(db: Session, hcp_name: Optional[str] = None) -> List[Interaction]:
    query = db.query(Interaction)
    if hcp_name:
        query = query.filter(Interaction.hcp_name.ilike(f"%{hcp_name}%"))
    return query.order_by(Interaction.id.desc()).all()
