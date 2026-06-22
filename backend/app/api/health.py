from fastapi import APIRouter
from sqlalchemy import text

from app.db.session import SessionLocal

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready")
def ready() -> dict[str, str]:
    db = SessionLocal()
    try:
        db.execute(text("select 1"))
        return {"status": "ready"}
    finally:
        db.close()
