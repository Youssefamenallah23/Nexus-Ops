from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://nexus:nexus@localhost:5432/nexus"
    nvidia_api_key: str = ""
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_model: str = "mistralai/mistral-large-4-1t-a52b"
    google_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash-lite"
    agent_review_threshold: float = 0.80
    upload_dir: str = "uploads"
    n8n_webhook_url: str = ""  # e.g. http://localhost:5678/webhook/nexus-ops; empty = mock mode
    n8n_webhook_secret: str = "nexus-dev-secret"


@lru_cache
def get_settings() -> Settings:
    return Settings()
