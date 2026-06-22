from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.config import get_settings
from app.services.event_bus import event_bus
from app.services.websocket_manager import manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/events")
async def websocket_events(websocket: WebSocket, token: str | None = Query(default=None)) -> None:
    settings = get_settings()
    if settings.auth_enabled and token != settings.api_token:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket)
    try:
        for event in await event_bus.replay_recent(count=25):
            await websocket.send_json(event)
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
