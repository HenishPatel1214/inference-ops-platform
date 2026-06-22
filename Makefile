.PHONY: help up down logs backend-dev backend-local frontend-dev seed benchmark test lint format

help:
	@echo "Common commands:"
	@echo "  make up            Start PostgreSQL, Redis, backend, frontend, Prometheus, Grafana"
	@echo "  make down          Stop local stack"
	@echo "  make backend-local Run backend with SQLite and in-memory event fanout"
	@echo "  make frontend-dev  Run frontend dev server"
	@echo "  make seed          Insert demo traffic"
	@echo "  make benchmark     Run local benchmark against the API"
	@echo "  make test          Run backend tests"
	@echo "  make lint          Run backend lint"

up:
	docker compose up --build

down:
	docker compose down -v

logs:
	docker compose logs -f backend frontend

backend-dev:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

backend-local:
	cd backend && DATABASE_URL=sqlite:///./local_dev.db REDIS_URL=redis://localhost:1/0 API_TOKEN=dev-token AUTH_ENABLED=true AUTO_CREATE_TABLES=true ENABLE_SIMULATOR=true SIMULATOR_INTERVAL_SECONDS=1.5 uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

frontend-dev:
	cd frontend && npm run dev

seed:
	cd backend && python scripts/seed_demo.py

benchmark:
	cd backend && python scripts/benchmark.py --url http://localhost:8000 --requests 250

test:
	cd backend && pytest

lint:
	cd backend && ruff check app tests scripts

format:
	cd backend && ruff format app tests scripts
