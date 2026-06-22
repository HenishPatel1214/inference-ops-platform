from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_api_token
from app.db.session import get_db
from app.schemas import BenchmarkResult
from app.services.simulator import simulate_batch

router = APIRouter(
    prefix="/api/traffic",
    tags=["traffic"],
    dependencies=[Depends(require_api_token)],
)


@router.post("/simulate", response_model=BenchmarkResult)
async def simulate(
    count: int = Query(default=10, ge=1, le=1000),
    db: Session = Depends(get_db),
) -> BenchmarkResult:
    return await simulate_batch(db, count)
