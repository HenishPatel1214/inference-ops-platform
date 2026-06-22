from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_api_token
from app.db.session import get_db
from app.models import SystemEvent
from app.schemas import EventCreate, EventRead
from app.services.events import create_and_publish_event, event_to_schema

router = APIRouter(prefix="/api/events", tags=["events"], dependencies=[Depends(require_api_token)])


@router.get("", response_model=list[EventRead])
def list_events(limit: int = 100, db: Session = Depends(get_db)) -> list[EventRead]:
    rows = db.scalars(
        select(SystemEvent).order_by(SystemEvent.created_at.desc()).limit(limit)
    ).all()
    return [event_to_schema(row) for row in rows]


@router.post("", response_model=EventRead, status_code=201)
async def create_event(payload: EventCreate, db: Session = Depends(get_db)) -> EventRead:
    return await create_and_publish_event(db, payload)
