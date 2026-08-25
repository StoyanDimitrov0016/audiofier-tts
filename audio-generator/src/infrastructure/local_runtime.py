from __future__ import annotations

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
LOCAL_TTS_AI_DIR = PROJECT_ROOT / ".local-tts-ai"
DEFAULT_HF_HOME = LOCAL_TTS_AI_DIR / "cache" / "huggingface"
DEFAULT_TORCH_HOME = LOCAL_TTS_AI_DIR / "cache" / "torch"


def configure_local_runtime() -> None:
    os.environ.setdefault("HF_HOME", str(DEFAULT_HF_HOME))
    os.environ.setdefault("TORCH_HOME", str(DEFAULT_TORCH_HOME))
    DEFAULT_HF_HOME.mkdir(parents=True, exist_ok=True)
    DEFAULT_TORCH_HOME.mkdir(parents=True, exist_ok=True)
