from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_api_token
from app.db.session import get_db
from app.schemas import LatencyPoint, OverviewStats
from app.services.analytics import latency_by_model, overview_stats

router = APIRouter(
    prefix="/api/analytics",
    tags=["analytics"],
    dependencies=[Depends(require_api_token)],
)


@router.get("/overview", response_model=OverviewStats)
def overview(db: Session = Depends(get_db)) -> OverviewStats:
    return overview_stats(db)


@router.get("/latency", response_model=list[LatencyPoint])
def latency(db: Session = Depends(get_db)) -> list[LatencyPoint]:
    return latency_by_model(db)
