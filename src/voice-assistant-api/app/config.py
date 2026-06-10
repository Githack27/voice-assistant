from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from pathlib import Path

class Settings(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 8000
    database_url: str = "postgresql://postgres@localhost:5434/voice_assistant"

    # Vapi settings
    vapi_api_key: Optional[str] = None
    vapi_secret_token: Optional[str] = None
    vapi_phone_number_id: Optional[str] = None
    vapi_assistant_id: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent / ".env",
        extra="ignore"
    )

settings = Settings()
