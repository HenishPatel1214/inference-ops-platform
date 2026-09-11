from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Inference Ops Platform"
    environment: str = "development"
    database_url: str = Field(
        default="postgresql+psycopg://inference:inference@localhost:5432/inference_ops"
    )
    redis_url: str = "redis://localhost:6379/0"
    redis_stream: str = "inference.events"
    api_token: str = "dev-token"
    auth_enabled: bool = True
    auto_create_tables: bool = True
    enable_simulator: bool = False
    simulator_interval_seconds: float = 1.0
    inference_upstream_url: str = "http://localhost:11434/v1"
    inference_upstream_api_key: str = "ollama"
    inference_upstream_timeout_seconds: float = 120.0
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
