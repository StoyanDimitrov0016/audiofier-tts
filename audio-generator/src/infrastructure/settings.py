from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from infrastructure.paths import resolve_output_dir


class AudioApiSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="AUDIO_GENERATOR_", extra="ignore")

    host: str = "127.0.0.1"
    port: int = 8765
    output_dir: str = "output"
    max_queued_jobs: int = Field(default=8, ge=1)
    max_request_bytes: int = Field(default=2_000_000, ge=1)

    @property
    def resolved_output_dir(self) -> Path:
        return resolve_output_dir(self.output_dir)


def get_settings() -> AudioApiSettings:
    return AudioApiSettings()
