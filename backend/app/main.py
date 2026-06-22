import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

from app.api import api_router
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import engine
from app.observability.logging import configure_logging, get_logger
from app.services.event_bus import event_bus
from app.services.simulator import run_forever

configure_logging()
settings = get_settings()
logger = get_logger(__name__)

REQUEST_COUNT = Counter(
    "inference_ops_http_requests_total",
    "HTTP requests",
    ["method", "path", "status"],
)
REQUEST_LATENCY = Histogram("inference_ops_http_request_seconds", "HTTP request latency")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    if settings.auto_create_tables:
        Base.metadata.create_all(bind=engine)
    await event_bus.connect()
    simulator_task: asyncio.Task | None = None
    if settings.enable_simulator:
        simulator_task = asyncio.create_task(run_forever(settings.simulator_interval_seconds))
    logger.info("app_started", environment=settings.environment)
    try:
        yield
    finally:
        if simulator_task:
            simulator_task.cancel()
        await event_bus.close()
        logger.info("app_stopped")


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    with REQUEST_LATENCY.time():
        response = await call_next(request)
    REQUEST_COUNT.labels(request.method, request.url.path, response.status_code).inc()
    return response


@app.get("/metrics")
def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


app.include_router(api_router)
