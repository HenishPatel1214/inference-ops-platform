from fastapi import APIRouter

from app.api import (
    analytics,
    auth,
    deployments,
    events,
    health,
    nodes,
    requests,
    traffic,
    websocket,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(nodes.router)
api_router.include_router(deployments.router)
api_router.include_router(events.router)
api_router.include_router(requests.router)
api_router.include_router(analytics.router)
api_router.include_router(traffic.router)
api_router.include_router(websocket.router)
