from __future__ import annotations

import os
import shutil
import sys
import threading
from collections.abc import Iterable
from pathlib import Path
from typing import Any

import numpy as np

from infrastructure.audio_files import audio_array
from infrastructure.local_runtime import LOCAL_TTS_AI_DIR, PROJECT_ROOT, configure_local_runtime

KOKORO_MODEL_ID = "hexgrad/Kokoro-82M"
DEFAULT_KOKORO_MODEL_PATH = LOCAL_TTS_AI_DIR / "models" / "kokoro-82m"
_PIPELINES: dict[tuple[str, str, str], Any] = {}
_PIPELINE_LOCK = threading.Lock()

configure_local_runtime()


def _project_path(value: str | Path) -> Path:
    path = Path(value)
    return path if path.is_absolute() else PROJECT_ROOT / path


def resolve_kokoro_model_source(repo_id: str) -> str:
    if configured := os.environ.get("KOKORO_MODEL_PATH"):
        return str(_project_path(configured))
    if repo_id == KOKORO_MODEL_ID and DEFAULT_KOKORO_MODEL_PATH.exists():
        return str(DEFAULT_KOKORO_MODEL_PATH)
    return repo_id


def _model_path(repo_id: str) -> Path | None:
    path = Path(resolve_kokoro_model_source(repo_id))
    return path if path.is_dir() else None


def _voice(voice: str, model_path: Path | None) -> str:
    if model_path is not None and (voice_path := model_path / "voices" / f"{voice}.pt").exists():
        return str(voice_path)
    return voice


def _patch_phonemizer_cleanup_bug() -> None:
    if sys.platform != "win32":
        return
    try:
        from phonemizer.backend.espeak.api import EspeakAPI
    except Exception:
        return
    original_delete = EspeakAPI._delete

    @staticmethod
    def safe_delete(library, tempdir):
        if library is None:
            shutil.rmtree(tempdir, ignore_errors=True)
            return
        try:
            original_delete(library, tempdir)
        except AttributeError as error:
            if "_handle" not in str(error):
                raise
            shutil.rmtree(tempdir, ignore_errors=True)

    EspeakAPI._delete = safe_delete


def _pipeline(repo_id: str, lang_code: str, model_path: Path | None) -> tuple[Any, str]:
    import torch
    from kokoro import KPipeline

    device = "cuda" if torch.cuda.is_available() else "cpu"
    source = str(model_path) if model_path is not None else repo_id
    key = (source, lang_code, device)
    with _PIPELINE_LOCK:
        if key in _PIPELINES:
            return _PIPELINES[key], device
        if model_path is not None:
            from kokoro import KModel

            model = (
                KModel(
                    repo_id=KOKORO_MODEL_ID,
                    config=str(model_path / "config.json"),
                    model=str(model_path / "kokoro-v1_0.pth"),
                )
                .to(device)
                .eval()
            )
            pipeline = KPipeline(repo_id=KOKORO_MODEL_ID, lang_code=lang_code, model=model, device=device)
        else:
            pipeline = KPipeline(repo_id=repo_id, lang_code=lang_code, device=device)
        _PIPELINES[key] = pipeline
        return pipeline, device


def synthesize_kokoro(
    chunks: Iterable[str],
    voice: str,
    speed: float,
    repo_id: str,
    lang_code: str,
    progress_callback=None,
) -> list[np.ndarray]:
    _patch_phonemizer_cleanup_bug()
    import torch

    model_path = _model_path(repo_id)
    pipeline, device = _pipeline(repo_id, lang_code, model_path)
    print(f"Kokoro device: {device}")
    chunk_list = list(chunks)
    wavs: list[np.ndarray] = []
    for index, chunk in enumerate(chunk_list, start=1):
        print(f"[{index}/{len(chunk_list)}] Synthesizing {len(chunk)} characters...")
        if progress_callback is not None:
            progress_callback(
                {
                    "stage": "synthesizing",
                    "current": index,
                    "total": len(chunk_list),
                    "message": f"Synthesizing chunk {index} of {len(chunk_list)}.",
                }
            )
        fragments: list[np.ndarray] = []
        with torch.inference_mode():
            for _, _, audio in pipeline(chunk, voice=_voice(voice, model_path), speed=speed, split_pattern=r"\n{2,}"):
                fragments.append(audio_array(audio, label=f"Kokoro chunk {index}"))
        if not fragments:
            raise RuntimeError(f"No audio produced for chunk {index}.")
        wavs.append(np.concatenate(fragments))
        if progress_callback is not None:
            progress_callback(
                {
                    "stage": "synthesized",
                    "current": index,
                    "total": len(chunk_list),
                    "message": f"Finished chunk {index} of {len(chunk_list)}.",
                }
            )
    return wavs
