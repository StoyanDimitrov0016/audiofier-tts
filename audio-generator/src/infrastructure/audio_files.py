from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path
from typing import Any

import numpy as np
import soundfile as sf

from infrastructure.local_runtime import PROJECT_ROOT

SAMPLE_RATE = 24000


def audio_array(audio: Any, *, label: str) -> np.ndarray:
    array = np.asarray(audio, dtype=np.float32).reshape(-1)
    if array.size == 0:
        raise RuntimeError(f"{label} produced empty audio.")
    if not np.isfinite(array).all():
        raise RuntimeError(f"{label} produced NaN or infinite samples.")
    return np.clip(array, -1.0, 1.0)


def merge_wavs(wavs: list[np.ndarray], pause_ms: int = 300, sample_rate: int = SAMPLE_RATE) -> np.ndarray:
    if not wavs:
        raise ValueError("No audio was generated.")
    prepared = []
    fade_samples = max(1, int(sample_rate * 0.008))
    for wav in wavs:
        array = audio_array(wav, label="Audio chunk").copy()
        fade = min(fade_samples, array.size // 2)
        if fade:
            array[:fade] *= np.linspace(0.0, 1.0, fade, dtype=np.float32)
            array[-fade:] *= np.linspace(1.0, 0.0, fade, dtype=np.float32)
        prepared.append(array)
    pause = np.zeros(int(sample_rate * (pause_ms / 1000.0)), dtype=np.float32)
    parts: list[np.ndarray] = []
    for index, wav in enumerate(prepared):
        parts.append(wav)
        if index < len(prepared) - 1 and pause_ms > 0:
            parts.append(pause)
    return np.concatenate(parts)


def save_chunk_wavs(wavs: list[np.ndarray], chunk_dir: Path, stem: str, sample_rate: int = SAMPLE_RATE) -> None:
    chunk_dir.mkdir(parents=True, exist_ok=True)
    for index, wav in enumerate(wavs, start=1):
        sf.write(chunk_dir / f"{stem}_part_{index:03d}.wav", wav, sample_rate)


def save_final_wav(
    wavs: list[np.ndarray], output_dir: Path, stem: str, pause_ms: int, sample_rate: int = SAMPLE_RATE
) -> tuple[Path, float]:
    output_dir.mkdir(parents=True, exist_ok=True)
    merged = merge_wavs(wavs, pause_ms=pause_ms, sample_rate=sample_rate)
    final_path = output_dir / f"{stem}.wav"
    sf.write(final_path, merged, sample_rate)
    return final_path, len(merged) / sample_rate


def _project_path(value: str | Path) -> Path:
    path = Path(value)
    return path if path.is_absolute() else PROJECT_ROOT / path


def resolve_ffmpeg(ffmpeg_path: str | None) -> str:
    configured = ffmpeg_path or os.environ.get("FFMPEG_PATH")
    if configured:
        candidate = _project_path(configured)
        if not candidate.exists():
            source = "explicit path" if ffmpeg_path else "FFMPEG_PATH"
            raise FileNotFoundError(f"FFmpeg not found from {source}: {candidate}")
        return str(candidate)
    if detected := shutil.which("ffmpeg"):
        return detected
    raise FileNotFoundError("FFmpeg was not found. Install it with Winget, refresh PATH, or set FFMPEG_PATH.")


def convert_wav_to_mp3(wav_path: Path, mp3_path: Path, ffmpeg_executable: str, bitrate: str) -> None:
    subprocess.run(
        [
            ffmpeg_executable,
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(wav_path),
            "-codec:a",
            "libmp3lame",
            "-b:a",
            bitrate,
            str(mp3_path),
        ],
        check=True,
    )


def format_duration(seconds: float) -> str:
    rounded = max(1, round(seconds))
    minutes, secs = divmod(rounded, 60)
    hours, minutes = divmod(minutes, 60)
    if hours:
        return f"{hours}h {minutes}m {secs}s"
    if minutes:
        return f"{minutes}m {secs}s"
    return f"{secs}s"
