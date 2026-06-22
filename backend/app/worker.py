import asyncio

from app.core.config import get_settings
from app.services.simulator import run_forever


def main() -> None:
    settings = get_settings()
    asyncio.run(run_forever(settings.simulator_interval_seconds))


if __name__ == "__main__":
    main()
