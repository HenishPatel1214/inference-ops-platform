import json

from sqlalchemy.orm import Session

from app.models import SystemEvent
from app.schemas import EventCreate, EventRead
from app.services.event_bus import event_bus


def event_to_schema(event: SystemEvent) -> EventRead:
    return EventRead(
        id=event.id,
        event_type=event.event_type,
        severity=event.severity,
        message=event.message,
        node_id=event.node_id,
        deployment_id=event.deployment_id,
        payload=json.loads(event.payload_json or "{}"),
        created_at=event.created_at,
    )


async def create_and_publish_event(db: Session, payload: EventCreate) -> EventRead:
    event = SystemEvent(
        event_type=payload.event_type,
        severity=payload.severity,
        message=payload.message,
        node_id=payload.node_id,
        deployment_id=payload.deployment_id,
        payload_json=json.dumps(payload.payload),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    event_read = event_to_schema(event)
    await event_bus.publish(event_read.model_dump(mode="json"))
    return event_read
