import json
from datetime import datetime
from typing import Any

import redis.asyncio as redis

from app.core.config import get_settings
from app.observability.logging import get_logger
from app.services.websocket_manager import manager

logger = get_logger(__name__)


def serialize_event(event: dict[str, Any]) -> dict[str, str]:
    return {
        "data": json.dumps(event, default=str),
        "event_type": str(event.get("event_type", "unknown")),
        "severity": str(event.get("severity", "info")),
    }


class EventBus:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.redis_client: redis.Redis | None = None

    async def connect(self) -> None:
        try:
            self.redis_client = redis.from_url(self.settings.redis_url, decode_responses=True)
            await self.redis_client.ping()
            logger.info("redis_connected", redis_url=self.settings.redis_url)
        except Exception as exc:
            self.redis_client = None
            logger.warning("redis_unavailable_using_in_memory_fanout", error=str(exc))

    async def close(self) -> None:
        if self.redis_client is not None:
            await self.redis_client.aclose()

    async def publish(self, event: dict[str, Any]) -> None:
        event.setdefault("published_at", datetime.utcnow().isoformat())
        if self.redis_client is not None:
            try:
                await self.redis_client.xadd(
                    self.settings.redis_stream,
                    serialize_event(event),
                    maxlen=5000,
                    approximate=True,
                )
            except Exception as exc:
                logger.warning("redis_publish_failed", error=str(exc))
        await manager.broadcast(event)

    async def replay_recent(self, count: int = 50) -> list[dict[str, Any]]:
        if self.redis_client is None:
            return []
        rows = await self.redis_client.xrevrange(self.settings.redis_stream, count=count)
        events: list[dict[str, Any]] = []
        for _, fields in reversed(rows):
            raw = fields.get("data")
            if raw:
                events.append(json.loads(raw))
        return events


event_bus = EventBus()
