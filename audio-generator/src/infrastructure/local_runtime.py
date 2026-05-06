from __future__ import annotations

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
LOCAL_TTS_AI_DIR = PROJECT_ROOT / ".local-tts-ai"
LOCAL_TOOLS_DIR = LOCAL_TTS_AI_DIR / "tools"
LOCAL_SOX_DIR = LOCAL_TOOLS_DIR / "sox"
DEFAULT_HF_HOME = LOCAL_TTS_AI_DIR / "cache" / "huggingface"
DEFAULT_TORCH_HOME = LOCAL_TTS_AI_DIR / "cache" / "torch"


def prepend_path(path: Path) -> None:
    value = str(path)
    current = os.environ.get("PATH", "")
    entries = [entry for entry in current.split(os.pathsep) if entry]
    normalized = {os.path.normcase(os.path.normpath(entry)) for entry in entries}
    if os.path.normcase(os.path.normpath(value)) not in normalized:
        os.environ["PATH"] = os.pathsep.join([value, *entries])


def configure_local_runtime() -> None:
    os.environ.setdefault("HF_HOME", str(DEFAULT_HF_HOME))
    os.environ.setdefault("TORCH_HOME", str(DEFAULT_TORCH_HOME))
    DEFAULT_HF_HOME.mkdir(parents=True, exist_ok=True)
    DEFAULT_TORCH_HOME.mkdir(parents=True, exist_ok=True)
    prepend_path(LOCAL_TOOLS_DIR)
    prepend_path(LOCAL_SOX_DIR)
