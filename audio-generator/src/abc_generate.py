from __future__ import annotations

import argparse
import json
import time
from dataclasses import asdict, dataclass
from pathlib import Path

from infrastructure.local_runtime import PROJECT_ROOT
from infrastructure.paths import resolve_cli_input_path
from services.generation import GenerationOptions, generate_audio_from_cleaned_text
from services.text_processing import prepare_text_for_tts

DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "storage" / "generated" / "abc-tests"
DEFAULT_TEXT = "\n\n".join(
    [
        "Mara kept one lantern by the window.",
        (
            "She lit it every evening before the forest turned dark, not because she expected visitors, "
            "but because the old road was easy to miss after rain."
        ),
        (
            "One night, a boy knocked on her door with mud on his shoes and a broken umbrella in his hand. "
            "He told Mara that he had lost the road and could not see the stones beneath the leaves."
        ),
        "Mara gave him a blanket, warmed tea by the fire, and pointed to the small light beside the glass.",
        "She explained that a lantern could not move the forest, but it could help someone choose the next step.",
        (
            "Years later, Mara looked down into the valley and saw lights in every window. Some were lamps, "
            "some were candles, and some were paper lanterns made by children."
        ),
        (
            "She never knew which house belonged to the boy from the rainy night, "
            "but she knew the lesson had traveled farther than he had."
        ),
    ]
)


QWEN_STYLES = {
    "neutral": (
        "Read in one consistent narrator voice. Use a calm, neutral audiobook narration style. "
        "Do not act out characters or change voices for reported speech. Keep emotion restrained, "
        "avoid dramatic emphasis, and keep intonation steady between paragraphs."
    ),
    "plain": (
        "Read in one consistent narrator voice, clearly and evenly like a lecture recording. "
        "Do not perform characters. Use minimal emotion, keep steady pacing, and avoid expressive "
        "rises at the beginning of each section."
    ),
    "warm": (
        "Read in one consistent narrator voice with a warm audiobook tone. Do not act out characters "
        "or shift into dialogue performance. Keep the delivery intimate, restrained, and natural "
        "without becoming theatrical or overly emotional."
    ),
}


@dataclass(frozen=True)
class AbcCase:
    id: str
    model_id: str
    voice: str
    style: str | None = None
    instruct: str | None = None
    speed: float = 1.0
    lang_code: str = "a"


def default_cases(styles: list[str]) -> list[AbcCase]:
    cases = [
        AbcCase(id="kokoro-af-heart", model_id="kokoro", voice="af_heart"),
        AbcCase(id="kokoro-af-bella", model_id="kokoro", voice="af_bella"),
        AbcCase(id="kokoro-am-michael", model_id="kokoro", voice="am_michael"),
    ]

    for model_id in ["qwen-0.6b-custom", "qwen-1.7b-custom"]:
        for voice in ["Aiden", "Ryan"]:
            for style in styles:
                cases.append(
                    AbcCase(
                        id=f"{model_id}-{voice.lower()}-{style}",
                        model_id=model_id,
                        voice=voice,
                        style=style,
                        instruct=QWEN_STYLES[style],
                        lang_code="en",
                    )
                )

    return cases


def quick_cases(style: str = "warm") -> list[AbcCase]:
    return [
        AbcCase(id="kokoro-af-heart", model_id="kokoro", voice="af_heart"),
        AbcCase(
            id=f"qwen-0.6b-custom-aiden-{style}",
            model_id="qwen-0.6b-custom",
            voice="Aiden",
            style=style,
            instruct=QWEN_STYLES[style],
            lang_code="en",
        ),
        AbcCase(
            id=f"qwen-1.7b-custom-aiden-{style}",
            model_id="qwen-1.7b-custom",
            voice="Aiden",
            style=style,
            instruct=QWEN_STYLES[style],
            lang_code="en",
        ),
    ]


def read_cleaned_text(input_path: Path | None) -> tuple[str, str]:
    if input_path is None:
        return DEFAULT_TEXT.strip(), "built-in abc excerpt"

    raw = input_path.read_text(encoding="utf-8")
    return prepare_text_for_tts(raw, input_path.suffix), str(input_path)


def write_manifest(output_dir: Path, payload: dict[str, object]) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "manifest.json").write_text(f"{json.dumps(payload, indent=2)}\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate sequential TTS ABC comparison runs.")
    parser.add_argument("--input", help="Optional .md or .txt path. Defaults to a short built-in narration excerpt.")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Output directory for ABC run folders.")
    parser.add_argument("--styles", nargs="+", choices=sorted(QWEN_STYLES), default=["neutral", "plain", "warm"])
    parser.add_argument("--quick", action="store_true", help="Run one representative voice per model.")
    parser.add_argument("--quick-style", choices=sorted(QWEN_STYLES), default="warm", help="Qwen style for --quick.")
    parser.add_argument("--wav-only", action="store_true", help="Skip MP3 conversion.")
    parser.add_argument("--dry-run", action="store_true", help="Print planned runs without generating audio.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_path = resolve_cli_input_path(args.input) if args.input else None
    cleaned, source = read_cleaned_text(input_path)
    run_id = time.strftime("abc-%Y%m%dT%H%M%S")
    base_output_dir = Path(args.output_dir) if Path(args.output_dir).is_absolute() else PROJECT_ROOT / args.output_dir
    output_dir = base_output_dir / run_id
    output_dir = output_dir.resolve()
    cases = quick_cases(args.quick_style) if args.quick else default_cases(args.styles)

    print(f"ABC source: {source}")
    print(f"Characters: {len(cleaned):,}")
    print(f"Cases: {len(cases)}")
    print(f"Output: {output_dir}")

    manifest: dict[str, object] = {
        "source": source,
        "characters": len(cleaned),
        "outputDir": str(output_dir),
        "mode": "quick" if args.quick else "full",
        "cases": [],
    }

    if args.dry_run:
        for case in cases:
            print(f"- {case.id}: model={case.model_id}, voice={case.voice}, style={case.style or 'none'}")
        return

    results = []
    for index, case in enumerate(cases, start=1):
        print(f"\n[{index}/{len(cases)}] {case.id}")
        started = time.monotonic()
        result = generate_audio_from_cleaned_text(
            cleaned=cleaned,
            stem=case.id,
            options=GenerationOptions(
                output_dir=output_dir,
                model_id=case.model_id,
                voice=case.voice,
                lang_code=case.lang_code,
                speed=case.speed,
                wav_only=args.wav_only,
                instruct=case.instruct,
            ),
        )
        elapsed_seconds = time.monotonic() - started
        row = {
            **asdict(case),
            "elapsedSeconds": elapsed_seconds,
            "durationSeconds": result.duration_seconds,
            "formattedDuration": result.formatted_duration,
            "chunkCount": result.chunk_count,
            "wavPath": str(result.wav_path),
            "mp3Path": str(result.mp3_path) if result.mp3_path else None,
        }
        results.append(row)
        manifest["cases"] = results
        write_manifest(output_dir, manifest)
        print(f"Saved: {result.wav_path}")
        print(f"Duration: {result.formatted_duration}; elapsed: {elapsed_seconds:.1f}s")

    print(f"\nManifest: {output_dir / 'manifest.json'}")


if __name__ == "__main__":
    main()
