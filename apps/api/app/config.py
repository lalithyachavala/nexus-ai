from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration. Everything has a safe default so the API boots
    with zero setup; point DATABASE_URL at Supabase/Postgres for production."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # SQLite fallback keeps the demo runnable anywhere. For Supabase use e.g.
    # postgresql+psycopg2://postgres:<pw>@db.<ref>.supabase.co:5432/postgres
    database_url: str = "sqlite:///./nexus.db"

    # AI adapter: "mock" (default, no key needed), "openai", or "claude".
    llm_provider: str = "mock"
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    anthropic_model: str = "claude-sonnet-5"

    # CORS — the Next.js dev server.
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
