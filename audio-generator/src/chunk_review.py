from __future__ import annotations

import argparse
from pathlib import Path

from paths import resolve_cli_input_path
from text_processing import make_chunks, prepare_text_for_tts


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Preview cleaned text chunks before TTS generation.")
    parser.add_argument("input", help="Path to a .md or .txt file")
    parser.add_argument("--max-chars", type=int, default=1200, help="Max chars per chunk before extra splitting")
    parser.add_argument("--min-chars", type=int, default=140, help="Minimum chunk size used when merging small chunks")
    parser.add_argument("--show-text", action="store_true", help="Print full chunk text")
    return parser.parse_args()


def preview_chunks(input_path: Path, max_chars: int, min_chars: int) -> tuple[str, list[str]]:
    raw = input_path.read_text(encoding="utf-8").lstrip("\ufeff")
    cleaned = prepare_text_for_tts(raw, input_path.suffix)
    return cleaned, make_chunks(cleaned, max_chars=max_chars, min_chunk_chars=min_chars) if cleaned else []


def main() -> None:
    args = parse_args()
    input_path = resolve_cli_input_path(args.input)
    cleaned, chunks = preview_chunks(input_path, max_chars=args.max_chars, min_chars=args.min_chars)

    print(f"Input: {input_path}")
    print(f"Characters after cleaning: {len(cleaned):,}")
    print(f"Chunks: {len(chunks)}")
    print(f"Chunk settings: min_chars={args.min_chars}, max_chars={args.max_chars}")

    for index, chunk in enumerate(chunks, start=1):
        words = chunk.split()
        print(f"\n[{index}/{len(chunks)}] {len(chunk):,} chars, {len(words):,} words")
        if args.show_text:
            print(chunk)


if __name__ == "__main__":
    main()
