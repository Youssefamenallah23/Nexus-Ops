from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://nexus:nexus@localhost:5432/nexus"
    google_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash-lite"
    agent_review_threshold: float = 0.80
    upload_dir: str = "uploads"


@lru_cache
def get_settings() -> Settings:
    return Settings()
