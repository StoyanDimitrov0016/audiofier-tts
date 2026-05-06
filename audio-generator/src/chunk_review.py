from __future__ import annotations

import argparse
from pathlib import Path

from infrastructure.paths import resolve_cli_input_path
from services.generation import (
    DEFAULT_MODEL_ID,
    max_chunk_chars_for_model,
    min_chunk_chars_for_model,
    pack_chunks_for_model,
)
from services.text_processing import make_chunks, prepare_text_for_tts


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Preview cleaned text chunks before TTS generation.")
    parser.add_argument("input", help="Path to a .md or .txt file")
    parser.add_argument("--model-id", default=DEFAULT_MODEL_ID, help="Model id used to choose default chunk settings")
    parser.add_argument("--max-chars", type=int, default=1200, help="Max chars per chunk before extra splitting")
    parser.add_argument("--min-chars", type=int, help="Minimum chunk size used when merging small chunks")
    parser.add_argument("--show-text", action="store_true", help="Print full chunk text")
    return parser.parse_args()


def preview_chunks(
    input_path: Path,
    max_chars: int,
    min_chars: int,
    pack_to_max: bool = False,
) -> tuple[str, list[str]]:
    raw = input_path.read_text(encoding="utf-8").lstrip("\ufeff")
    cleaned = prepare_text_for_tts(raw, input_path.suffix)
    return (
        cleaned,
        make_chunks(cleaned, max_chars=max_chars, min_chunk_chars=min_chars, pack_to_max=pack_to_max)
        if cleaned
        else [],
    )


def main() -> None:
    args = parse_args()
    input_path = resolve_cli_input_path(args.input)
    min_chars = args.min_chars if args.min_chars is not None else min_chunk_chars_for_model(args.model_id)
    max_chars = max_chunk_chars_for_model(args.model_id, args.max_chars)
    pack_to_max = pack_chunks_for_model(args.model_id)
    cleaned, chunks = preview_chunks(input_path, max_chars=max_chars, min_chars=min_chars, pack_to_max=pack_to_max)

    print(f"Input: {input_path}")
    print(f"Characters after cleaning: {len(cleaned):,}")
    print(f"Chunks: {len(chunks)}")
    print(f"Model: {args.model_id}")
    print(f"Chunk settings: min_chars={min_chars}, max_chars={max_chars}, pack_to_max={pack_to_max}")

    for index, chunk in enumerate(chunks, start=1):
        words = chunk.split()
        print(f"\n[{index}/{len(chunks)}] {len(chunk):,} chars, {len(words):,} words")
        if args.show_text:
            print(chunk)


if __name__ == "__main__":
    main()
