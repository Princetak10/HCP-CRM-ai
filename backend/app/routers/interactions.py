from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import InteractionCreate, InteractionUpdate, InteractionOut
from app import crud
from typing import List

router = APIRouter(tags=["Interactions"])


@router.post("/log-interaction", response_model=InteractionOut)
def log_interaction(data: InteractionCreate, db: Session = Depends(get_db)):
    return crud.create_interaction(db, data)


@router.post("/edit-interaction", response_model=InteractionOut)
def edit_interaction(data: InteractionUpdate, db: Session = Depends(get_db)):
    result = crud.update_interaction(db, data)
    if not result:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return result


@router.get("/interactions", response_model=List[InteractionOut])
def get_interactions(db: Session = Depends(get_db)):
    return crud.get_all_interactions(db)
