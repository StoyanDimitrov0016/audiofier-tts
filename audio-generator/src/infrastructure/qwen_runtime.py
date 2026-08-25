from __future__ import annotations

import os
import threading
from collections.abc import Iterable
from importlib import import_module
from importlib.util import find_spec
from pathlib import Path
from typing import Any, cast

import numpy as np

from domain.models import ProgressCallback
from infrastructure.audio_files import SAMPLE_RATE, audio_array
from infrastructure.local_runtime import LOCAL_TTS_AI_DIR, PROJECT_ROOT, configure_local_runtime

QWEN_CUSTOM_MODEL_ID = "qwen-0.6b-custom"
QWEN_CUSTOM_1_7B_MODEL_ID = "qwen-1.7b-custom"
QWEN_CUSTOM_HF_MODEL_IDS = {
    QWEN_CUSTOM_MODEL_ID: "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice",
    QWEN_CUSTOM_1_7B_MODEL_ID: "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
}
QWEN_CUSTOM_MODEL_PATHS = {
    QWEN_CUSTOM_MODEL_ID: LOCAL_TTS_AI_DIR / "models" / "qwen3-tts-0-6b-custom",
    QWEN_CUSTOM_1_7B_MODEL_ID: LOCAL_TTS_AI_DIR / "models" / "qwen3-tts-1-7b-custom",
}
QWEN_CUSTOM_MODEL_ENV_VARS = {
    QWEN_CUSTOM_MODEL_ID: ("QWEN_TTS_0_6B_MODEL_PATH", "QWEN_TTS_MODEL_PATH"),
    QWEN_CUSTOM_1_7B_MODEL_ID: ("QWEN_TTS_1_7B_MODEL_PATH",),
}
QWEN_CUSTOM_MODEL_IDS = frozenset(QWEN_CUSTOM_HF_MODEL_IDS)
QWEN_CUSTOM_DEFAULT_SPEAKER = "Ryan"
QWEN_CUSTOM_SPEAKERS = frozenset({"Ryan", "Aiden"})
QWEN_BATCH_SIZE_ENV = "QWEN_TTS_BATCH_SIZE"
DEFAULT_QWEN_BATCH_SIZE = 1
_MODELS: dict[str, Any] = {}
_MODEL_LOCK = threading.Lock()

configure_local_runtime()


def _project_path(value: str | Path) -> Path:
    path = Path(value)
    return path if path.is_absolute() else PROJECT_ROOT / path


def resolve_qwen_custom_model_source(model_id: str) -> str:
    if model_id not in QWEN_CUSTOM_HF_MODEL_IDS:
        raise ValueError(f"Unsupported Qwen model: {model_id}.")
    for env_var in QWEN_CUSTOM_MODEL_ENV_VARS[model_id]:
        if configured := os.environ.get(env_var):
            return str(_project_path(configured))
    default_path = QWEN_CUSTOM_MODEL_PATHS[model_id]
    return str(default_path) if default_path.is_dir() else QWEN_CUSTOM_HF_MODEL_IDS[model_id]


def resolve_qwen_language(lang_code: str | None) -> str:
    normalized = (lang_code or "en").strip().casefold()
    if normalized in {"auto", "automatic"}:
        return "Auto"
    return "English" if normalized in {"a", "b", "en", "english"} else (lang_code or "English").strip()


def resolve_qwen_batch_size(configured: int | None = None) -> int:
    raw = configured if configured is not None else os.environ.get(QWEN_BATCH_SIZE_ENV, str(DEFAULT_QWEN_BATCH_SIZE))
    try:
        value = int(raw)
    except ValueError as error:
        raise ValueError(f"{QWEN_BATCH_SIZE_ENV} must be a positive integer.") from error
    if value < 1:
        raise ValueError(f"{QWEN_BATCH_SIZE_ENV} must be a positive integer.")
    return value


def get_qwen_custom_model(model_id: str) -> Any:
    with _MODEL_LOCK:
        if model_id in _MODELS:
            return _MODELS[model_id]
        import torch

        try:
            model_class = import_module("qwen_tts").Qwen3TTSModel
        except ModuleNotFoundError as error:
            raise RuntimeError("qwen-tts is not installed in the active Python environment.") from error
        kwargs: dict[str, Any] = {}
        if torch.cuda.is_available():
            torch_runtime = cast(Any, torch)
            kwargs = {
                "device_map": "cuda:0",
                "dtype": torch_runtime.bfloat16,
                "attn_implementation": "flash_attention_2" if find_spec("flash_attn") else "sdpa",
            }
            print(f"Loading Qwen CustomVoice on CUDA: {torch.cuda.get_device_name(0)}")
        else:
            print(f"Warning: CUDA unavailable; {QWEN_CUSTOM_HF_MODEL_IDS[model_id]} will be very slow.")
        source = resolve_qwen_custom_model_source(model_id)
        print(f"Qwen model source: {source}")
        _MODELS[model_id] = model_class.from_pretrained(source, **kwargs)
        return _MODELS[model_id]


def synthesize_qwen_custom(
    chunks: Iterable[str],
    speaker: str,
    model_id: str = QWEN_CUSTOM_MODEL_ID,
    instruct: str | None = None,
    language: str = "English",
    batch_size: int | None = None,
    progress_callback: ProgressCallback | None = None,
) -> tuple[list[np.ndarray], int]:
    if model_id not in QWEN_CUSTOM_MODEL_IDS:
        raise ValueError(f"Unsupported Qwen model: {model_id}.")
    if speaker not in QWEN_CUSTOM_SPEAKERS:
        supported = ", ".join(sorted(QWEN_CUSTOM_SPEAKERS))
        raise ValueError(f"Unsupported Qwen speaker: {speaker}. Supported speakers: {supported}.")
    model = get_qwen_custom_model(model_id)
    chunk_list = list(chunks)
    resolved_batch_size = resolve_qwen_batch_size(batch_size)
    wavs: list[np.ndarray] = []
    sample_rate: int | None = None
    for start in range(0, len(chunk_list), resolved_batch_size):
        batch = chunk_list[start : start + resolved_batch_size]
        first, last = start + 1, start + len(batch)
        print(f"[{first}-{last}/{len(chunk_list)}] Synthesizing {len(batch)} Qwen chunk(s) with speaker {speaker}.")
        if progress_callback is not None:
            for index in range(first, last + 1):
                progress_callback(
                    {
                        "stage": "synthesizing",
                        "current": index,
                        "total": len(chunk_list),
                        "message": f"Synthesizing Qwen chunk {index} of {len(chunk_list)}.",
                    }
                )
        generated, generated_rate = model.generate_custom_voice(
            text=batch if len(batch) > 1 else batch[0],
            speaker=[speaker] * len(batch) if len(batch) > 1 else speaker,
            language=[language] * len(batch) if len(batch) > 1 else language,
            instruct=[instruct] * len(batch) if len(batch) > 1 else instruct,
        )
        if len(generated) != len(batch):
            raise RuntimeError(f"Qwen returned {len(generated)} outputs for {len(batch)} chunks.")
        current_rate = int(generated_rate)
        if sample_rate is not None and current_rate != sample_rate:
            raise RuntimeError(f"Qwen sample rate changed from {sample_rate} to {current_rate}.")
        sample_rate = current_rate
        for offset, audio in enumerate(generated):
            index = start + offset + 1
            if progress_callback is not None:
                progress_callback(
                    {
                        "stage": "synthesized",
                        "current": index,
                        "total": len(chunk_list),
                        "message": f"Finished Qwen chunk {index} of {len(chunk_list)}.",
                    }
                )
            wavs.append(audio_array(audio, label=f"Qwen chunk {index}"))
    return wavs, sample_rate or SAMPLE_RATE
