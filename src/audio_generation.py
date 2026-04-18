from __future__ import annotations

import shutil
import subprocess
import sys
import warnings
from pathlib import Path
from typing import Iterable

import numpy as np
import soundfile as sf

SAMPLE_RATE = 24000


def suppress_known_runtime_noise() -> None:
    warnings.filterwarnings(
        "ignore",
        message="dropout option adds dropout after all but last recurrent layer.*",
        category=UserWarning,
    )
    warnings.filterwarnings(
        "ignore",
        message="`torch.nn.utils.weight_norm` is deprecated.*",
        category=FutureWarning,
    )


def patch_phonemizer_cleanup_bug() -> None:
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


def synthesize_chunks(
    chunks: Iterable[str],
    voice: str,
    speed: float,
    repo_id: str,
    lang_code: str,
) -> list[np.ndarray]:
    patch_phonemizer_cleanup_bug()
    from kokoro import KPipeline

    pipeline = KPipeline(repo_id=repo_id, lang_code=lang_code)
    chunk_list = list(chunks)
    wavs: list[np.ndarray] = []

    for index, chunk in enumerate(chunk_list, start=1):
        print(f"[{index}/{len(chunk_list)}] Synthesizing {len(chunk)} characters...")
        generator = pipeline(chunk, voice=voice, speed=speed, split_pattern=r"\n{2,}")

        chunk_wavs: list[np.ndarray] = []
        for _, _, audio in generator:
            chunk_wavs.append(np.asarray(audio, dtype=np.float32))

        if not chunk_wavs:
            raise RuntimeError(f"No audio produced for chunk {index}.")

        wavs.append(np.concatenate(chunk_wavs))

    return wavs


def merge_wavs(wavs: list[np.ndarray], pause_ms: int = 300) -> np.ndarray:
    if not wavs:
        raise ValueError("No audio was generated.")

    pause = np.zeros(int(SAMPLE_RATE * (pause_ms / 1000.0)), dtype=np.float32)
    parts: list[np.ndarray] = []

    for index, wav in enumerate(wavs):
        parts.append(wav)
        if index < len(wavs) - 1 and pause_ms > 0:
            parts.append(pause)

    return np.concatenate(parts)


def save_chunk_wavs(wavs: list[np.ndarray], chunk_dir: Path, stem: str) -> None:
    chunk_dir.mkdir(parents=True, exist_ok=True)
    for index, wav in enumerate(wavs, start=1):
        chunk_path = chunk_dir / f"{stem}_part_{index:03d}.wav"
        sf.write(chunk_path, wav, SAMPLE_RATE)


def save_final_wav(wavs: list[np.ndarray], output_dir: Path, stem: str, pause_ms: int) -> tuple[Path, float]:
    output_dir.mkdir(parents=True, exist_ok=True)
    merged = merge_wavs(wavs, pause_ms=pause_ms)
    final_path = output_dir / f"{stem}.wav"
    sf.write(final_path, merged, SAMPLE_RATE)
    duration_seconds = len(merged) / SAMPLE_RATE
    return final_path, duration_seconds


def resolve_ffmpeg(ffmpeg_path: str | None) -> str:
    if ffmpeg_path:
        candidate = Path(ffmpeg_path)
        if not candidate.exists():
            raise FileNotFoundError(f"FFmpeg not found: {candidate}")
        return str(candidate)

    detected = shutil.which("ffmpeg")
    if detected:
        return detected

    common_candidates = [
        Path.home() / "Downloads" / "ffmpeg" / "bin" / "ffmpeg.exe",
        Path.home() / "Downloads" / "ffmpeg.exe",
        Path("C:/ffmpeg/bin/ffmpeg.exe"),
        Path("C:/ffmpeg/ffmpeg.exe"),
    ]

    for candidate in common_candidates:
        if candidate.exists():
            return str(candidate)

    downloads_dir = Path.home() / "Downloads"
    if downloads_dir.exists():
        for candidate in downloads_dir.glob("**/ffmpeg.exe"):
            if "bin" in candidate.parts or candidate.parent == downloads_dir:
                return str(candidate)

    raise FileNotFoundError(
        "FFmpeg was not found. Install it, add it to PATH, or pass --ffmpeg-path with the full path to ffmpeg.exe."
    )


def convert_wav_to_mp3(wav_path: Path, mp3_path: Path, ffmpeg_executable: str, bitrate: str) -> None:
    cmd = [
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
    ]
    subprocess.run(cmd, check=True)


def format_duration(seconds: float) -> str:
    rounded = max(1, int(round(seconds)))
    minutes, secs = divmod(rounded, 60)
    hours, minutes = divmod(minutes, 60)

    if hours:
        return f"{hours}h {minutes}m {secs}s"
    if minutes:
        return f"{minutes}m {secs}s"
    return f"{secs}s"
