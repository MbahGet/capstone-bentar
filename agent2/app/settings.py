from __future__ import annotations

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


import os
from pathlib import Path

try:
    root_env = str(Path(__file__).resolve().parents[3] / ".env")
    parent_env = str(Path(__file__).resolve().parents[2] / ".env")
    env_files = (root_env, parent_env, ".env")
except IndexError:
    env_files = ".env"

class Settings(BaseSettings):
    # Ollama Cloud Configuration (Primary LLM provider)
    ollama_api_key: str = "ollama"
    ollama_base_url: str = "http://host.docker.internal:11434"
    ollama_model: str = "gpt-oss:120b"

    model_config = SettingsConfigDict(
        env_file=env_files,
        env_file_encoding="utf-8",
        env_prefix="",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
