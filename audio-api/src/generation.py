from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re

from text_processing import make_chunks, prepare_text_for_tts

DEFAULT_REPO_ID = "hexgrad/Kokoro-82M"
DEFAULT_VOICE = "af_heart"
DEFAULT_LANG_CODE = "a"


@dataclass(frozen=True)
class GenerationOptions:
    output_dir: Path = Path("output")
    voice: str = DEFAULT_VOICE
    speed: float = 1.0
    lang_code: str = DEFAULT_LANG_CODE
    repo_id: str = DEFAULT_REPO_ID
    max_chars: int = 1200
    pause_ms: int = 300
    keep_chunks: bool = False
    wav_only: bool = False
    ffmpeg_path: str | None = None
    mp3_bitrate: str = "96k"


@dataclass(frozen=True)
class GenerationResult:
    lesson_output_dir: Path
    wav_path: Path
    mp3_path: Path | None
    chunk_count: int
    cleaned_character_count: int
    duration_seconds: float

    @property
    def formatted_duration(self) -> str:
        from audio_generation import format_duration

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
    if options.speed <= 0:
        raise ValueError("speed must be greater than 0.")
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
) -> GenerationResult:
    from audio_generation import (
        convert_wav_to_mp3,
        resolve_ffmpeg,
        save_chunk_wavs,
        save_final_wav,
        suppress_known_runtime_noise,
        synthesize_chunks,
    )

    suppress_known_runtime_noise()
    validate_generation_options(options)

    if not cleaned:
        raise ValueError("The input text is empty after cleaning.")

    chunks = make_chunks(cleaned, max_chars=options.max_chars)
    if not chunks:
        raise ValueError("No chunks were created from the input text.")

    output_stem = sanitize_stem(stem)
    lesson_output_dir = options.output_dir / output_stem

    wavs = synthesize_chunks(
        chunks=chunks,
        voice=options.voice,
        speed=options.speed,
        repo_id=options.repo_id,
        lang_code=options.lang_code,
    )

    if options.keep_chunks:
        save_chunk_wavs(wavs, lesson_output_dir / "chunks", output_stem)

    final_wav, duration_seconds = save_final_wav(
        wavs=wavs,
        output_dir=lesson_output_dir,
        stem=output_stem,
        pause_ms=options.pause_ms,
    )

    final_mp3: Path | None = None
    if not options.wav_only:
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
    )


def generate_audio_from_text(
    text: str,
    stem: str,
    suffix: str,
    options: GenerationOptions,
) -> GenerationResult:
    normalized_suffix = validate_text_suffix(suffix)
    cleaned = prepare_text_for_tts(text.lstrip("\ufeff"), normalized_suffix)
    return generate_audio_from_cleaned_text(cleaned, stem, options)


def generate_audio(input_path: Path, options: GenerationOptions) -> GenerationResult:
    validate_generation_options(options)
    validate_input_file(input_path)

    raw = read_text(input_path)
    cleaned = prepare_text_for_tts(raw, input_path.suffix)
    return generate_audio_from_cleaned_text(cleaned, input_path.stem, options)
