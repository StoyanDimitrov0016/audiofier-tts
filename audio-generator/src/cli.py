from __future__ import annotations

import argparse

from infrastructure.paths import resolve_cli_input_path, resolve_output_dir
from services.generation import (
    DEFAULT_LANG_CODE,
    DEFAULT_MODEL_ID,
    DEFAULT_REPO_ID,
    DEFAULT_VOICE,
    GenerationOptions,
    build_output_dir,
    generate_audio,
    read_text,
    validate_generation_options,
    validate_input_file,
)


def options_from_args(args: argparse.Namespace) -> GenerationOptions:
    return GenerationOptions(
        output_dir=resolve_output_dir(args.output_dir),
        model_id=args.model_id,
        voice=args.voice,
        speed=args.speed,
        lang_code=args.lang_code,
        repo_id=args.repo_id,
        max_chars=args.max_chars,
        pause_ms=args.pause_ms,
        keep_chunks=args.keep_chunks,
        wav_only=args.wav_only,
        ffmpeg_path=args.ffmpeg_path,
        mp3_bitrate=args.mp3_bitrate,
        instruct=args.instruct,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Turn a .md or .txt lesson into speech with a local TTS model.")
    parser.add_argument("input", help="Path to a .md or .txt file")
    parser.add_argument("--output-dir", default="output", help="Base folder for generated lesson folders")
    parser.add_argument("--model-id", default=DEFAULT_MODEL_ID, help="TTS model id, e.g. kokoro or qwen-1.7b-custom")
    parser.add_argument("--voice", default=DEFAULT_VOICE, help="Voice or speaker id, e.g. af_heart or Ryan")
    parser.add_argument("--speed", type=float, default=1.0, help="Speech speed, e.g. 0.95 or 1.05")
    parser.add_argument("--lang-code", default=DEFAULT_LANG_CODE, help="Language code used by models that need it")
    parser.add_argument("--repo-id", default=DEFAULT_REPO_ID, help="Kokoro model repo id")
    parser.add_argument("--max-chars", type=int, default=1200, help="Max chars per chunk before extra splitting")
    parser.add_argument("--pause-ms", type=int, default=300, help="Silence between chunks in milliseconds")
    parser.add_argument("--keep-chunks", action="store_true", help="Save individual chunk wav files")
    parser.add_argument("--wav-only", action="store_true", help="Skip MP3 conversion and save only the WAV file")
    parser.add_argument("--ffmpeg-path", help="Full path to ffmpeg.exe if it is not in PATH or Downloads")
    parser.add_argument("--mp3-bitrate", default="96k", help="MP3 bitrate, e.g. 96k or 128k")
    parser.add_argument("--instruct", help="Optional model instruction for TTS models that support it")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    options = options_from_args(args)
    validate_generation_options(options)

    input_path = resolve_cli_input_path(args.input)
    validate_input_file(input_path)

    raw = read_text(input_path)
    from services.text_processing import make_chunks, prepare_text_for_tts

    cleaned = prepare_text_for_tts(raw, input_path.suffix)
    chunks = make_chunks(cleaned, max_chars=options.max_chars) if cleaned else []
    lesson_output_dir = build_output_dir(options.output_dir, input_path)

    print(f"Input: {input_path}")
    print(f"Lesson output directory: {lesson_output_dir}")
    print(f"Chunks to synthesize: {len(chunks)}")
    print(f"Characters after cleaning: {len(cleaned):,}")
    print(f"Model: {options.model_id}")
    print(f"Voice: {options.voice}")
    print(f"Speed: {options.speed}")
    print("Loading Kokoro and model dependencies...")

    result = generate_audio(input_path, options)

    if options.keep_chunks:
        print(f"Saved chunk files to: {result.lesson_output_dir / 'chunks'}")

    print(f"Saved merged wav to: {result.wav_path}")
    print(f"Approximate duration: {result.formatted_duration}")
    if result.mp3_path:
        print(f"Saved mp3 to: {result.mp3_path}")
