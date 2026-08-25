from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from services.text_processing import make_chunks, prepare_text_for_tts

DEFAULT_REPO_ID = "hexgrad/Kokoro-82M"
DEFAULT_MODEL_ID = "kokoro"
DEFAULT_VOICE = "af_heart"
DEFAULT_LANG_CODE = "a"
DEFAULT_MAX_CHARS = 1200
ProgressCallback = Callable[[dict[str, Any]], None]


@dataclass(frozen=True)
class GenerationOptions:
    output_dir: Path = Path("output")
    model_id: str = DEFAULT_MODEL_ID
    voice: str = DEFAULT_VOICE
    speed: float = 1.0
    lang_code: str = DEFAULT_LANG_CODE
    repo_id: str = DEFAULT_REPO_ID
    max_chars: int = DEFAULT_MAX_CHARS
    pause_ms: int = 300
    keep_chunks: bool = False
    wav_only: bool = False
    ffmpeg_path: str | None = None
    mp3_bitrate: str = "96k"
    instruct: str | None = None


def min_chunk_chars_for_model(model_id: str) -> int:
    from tts_models.registry import MODEL_REGISTRY

    return MODEL_REGISTRY.get(model_id).descriptor.min_chunk_chars


def max_chunk_chars_for_model(model_id: str, requested_max_chars: int) -> int:
    from tts_models.registry import MODEL_REGISTRY

    descriptor = MODEL_REGISTRY.get(model_id).descriptor
    return descriptor.max_chunk_chars if requested_max_chars == DEFAULT_MAX_CHARS else requested_max_chars


def pack_chunks_for_model(model_id: str) -> bool:
    # Pack adjacent short semantic units only up to the model-specific ceiling.
    # pack_chunks retains paragraph separators, avoiding the old oversized
    # 2,000-character requests while eliminating needless per-call overhead.
    from tts_models.registry import MODEL_REGISTRY

    return MODEL_REGISTRY.get(model_id).descriptor.pack_chunks


@dataclass(frozen=True)
class GenerationResult:
    lesson_output_dir: Path
    wav_path: Path
    mp3_path: Path | None
    chunk_count: int
    cleaned_character_count: int
    duration_seconds: float
    model_id: str
    voice: str
    model_source: str | None = None
    instruct: str | None = None

    @property
    def formatted_duration(self) -> str:
        from infrastructure.audio_files import format_duration

        return format_duration(self.duration_seconds)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8").lstrip("\ufeff")


def validate_input_file(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(f"Input file not found: {path}")
    if not path.is_file():
        raise ValueError(f"Input path is not a file: {path}")
    if path.suffix.lower() not in {".md", ".txt"}:
        raise ValueError("Input file must be .md or .txt")


def validate_text_suffix(suffix: str) -> str:
    normalized = suffix.lower()
    if not normalized.startswith("."):
        normalized = f".{normalized}"
    if normalized not in {".md", ".txt"}:
        raise ValueError("Text suffix must be .md or .txt")
    return normalized


def validate_generation_options(options: GenerationOptions) -> None:
    from tts_models.registry import MODEL_REGISTRY

    MODEL_REGISTRY.get(options.model_id).validate_options(options)
    if options.max_chars < 200:
        raise ValueError("max_chars must be at least 200.")
    if options.pause_ms < 0:
        raise ValueError("pause_ms cannot be negative.")


def build_output_dir(base_output_dir: Path, input_path: Path) -> Path:
    return base_output_dir / input_path.stem


def sanitize_stem(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip())
    cleaned = cleaned.strip(".-_")
    return cleaned[:80] or "lesson"


def generate_audio_from_cleaned_text(
    cleaned: str,
    stem: str,
    options: GenerationOptions,
    progress_callback: ProgressCallback | None = None,
) -> GenerationResult:
    from infrastructure.audio_files import (
        convert_wav_to_mp3,
        resolve_ffmpeg,
        save_chunk_wavs,
        save_final_wav,
    )
    from infrastructure.runtime_support import suppress_known_runtime_noise
    from tts_models.registry import MODEL_REGISTRY

    suppress_known_runtime_noise()
    validate_generation_options(options)

    if not cleaned:
        raise ValueError("The input text is empty after cleaning.")

    chunks = make_chunks(
        cleaned,
        max_chars=max_chunk_chars_for_model(options.model_id, options.max_chars),
        min_chunk_chars=min_chunk_chars_for_model(options.model_id),
        pack_to_max=pack_chunks_for_model(options.model_id),
    )
    if not chunks:
        raise ValueError("No chunks were created from the input text.")

    if progress_callback is not None:
        progress_callback(
            {
                "stage": "chunking",
                "current": 0,
                "total": len(chunks),
                "message": f"Prepared {len(chunks)} chunks.",
            }
        )

    output_stem = sanitize_stem(stem)
    lesson_output_dir = options.output_dir / output_stem

    model = MODEL_REGISTRY.get(options.model_id)
    synthesis = model.synthesize(chunks, options, progress_callback=progress_callback)
    wavs = synthesis.wavs
    sample_rate = synthesis.sample_rate

    if progress_callback is not None:
        progress_callback(
            {
                "stage": "saving",
                "current": len(chunks),
                "total": len(chunks),
                "message": "Saving final WAV.",
            }
        )

    if options.keep_chunks:
        save_chunk_wavs(wavs, lesson_output_dir / "chunks", output_stem, sample_rate=sample_rate)

    final_wav, duration_seconds = save_final_wav(
        wavs=wavs,
        output_dir=lesson_output_dir,
        stem=output_stem,
        pause_ms=options.pause_ms,
        sample_rate=sample_rate,
    )

    final_mp3: Path | None = None
    if not options.wav_only:
        if progress_callback is not None:
            progress_callback(
                {
                    "stage": "converting",
                    "current": len(chunks),
                    "total": len(chunks),
                    "message": "Converting WAV to MP3.",
                }
            )

        ffmpeg_executable = resolve_ffmpeg(options.ffmpeg_path)
        final_mp3 = lesson_output_dir / f"{output_stem}.mp3"
        convert_wav_to_mp3(
            wav_path=final_wav,
            mp3_path=final_mp3,
            ffmpeg_executable=ffmpeg_executable,
            bitrate=options.mp3_bitrate,
        )

    return GenerationResult(
        lesson_output_dir=lesson_output_dir,
        wav_path=final_wav,
        mp3_path=final_mp3,
        chunk_count=len(chunks),
        cleaned_character_count=len(cleaned),
        duration_seconds=duration_seconds,
        model_id=options.model_id,
        voice=options.voice,
        model_source=synthesis.model_source,
        instruct=options.instruct if model.descriptor.supports_instruct else None,
    )


def generate_audio_from_text(
    text: str,
    stem: str,
    suffix: str,
    options: GenerationOptions,
    progress_callback: ProgressCallback | None = None,
) -> GenerationResult:
    normalized_suffix = validate_text_suffix(suffix)
    cleaned = prepare_text_for_tts(text.lstrip("\ufeff"), normalized_suffix)
    return generate_audio_from_cleaned_text(cleaned, stem, options, progress_callback=progress_callback)


def generate_audio(
    input_path: Path, options: GenerationOptions, progress_callback: ProgressCallback | None = None
) -> GenerationResult:
    validate_generation_options(options)
    validate_input_file(input_path)

    raw = read_text(input_path)
    cleaned = prepare_text_for_tts(raw, input_path.suffix)
    return generate_audio_from_cleaned_text(cleaned, input_path.stem, options, progress_callback=progress_callback)
