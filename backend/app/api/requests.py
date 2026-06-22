from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_api_token
from app.db.session import get_db
from app.models import InferenceRequest, RequestStatus
from app.schemas import InferenceRequestRead

router = APIRouter(
    prefix="/api/requests",
    tags=["requests"],
    dependencies=[Depends(require_api_token)],
)


@router.get("", response_model=list[InferenceRequestRead])
def list_requests(
    limit: int = 100,
    failures_only: bool = False,
    db: Session = Depends(get_db),
) -> list[InferenceRequest]:
    stmt = select(InferenceRequest).order_by(InferenceRequest.created_at.desc()).limit(limit)
    if failures_only:
        stmt = (
            select(InferenceRequest)
            .where(InferenceRequest.status != RequestStatus.success)
            .order_by(InferenceRequest.created_at.desc())
            .limit(limit)
        )
    return list(db.scalars(stmt).all())
