import asyncio

from app.db.session import SessionLocal
from app.services.simulator import simulate_batch


async def main() -> None:
    db = SessionLocal()
    try:
        result = await simulate_batch(db, 100)
        print(result.model_dump_json(indent=2))
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
