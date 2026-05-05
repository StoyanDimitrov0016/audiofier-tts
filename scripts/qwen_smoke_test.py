from __future__ import annotations

import argparse
import os
import shutil
from pathlib import Path

import soundfile as sf
import torch


MODEL_ID = "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice"
PROJECT_ROOT = Path(__file__).resolve().parents[1]
LOCAL_TTS_AI_DIR = PROJECT_ROOT / ".local-tts-ai"
DEFAULT_MODEL_PATH = LOCAL_TTS_AI_DIR / "models" / "qwen3-tts-0-6b-custom"
DEFAULT_HF_HOME = LOCAL_TTS_AI_DIR / "cache" / "huggingface"
DEFAULT_TORCH_HOME = LOCAL_TTS_AI_DIR / "cache" / "torch"
DEFAULT_TEXT = "This is a short Qwen TTS smoke test running locally on CUDA."
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "storage" / "audio"

os.environ.setdefault("HF_HOME", str(DEFAULT_HF_HOME))
os.environ.setdefault("TORCH_HOME", str(DEFAULT_TORCH_HOME))


def resolve_project_path(value: str | Path) -> Path:
    path = Path(value)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def resolve_model_source() -> str:
    configured = os.environ.get("QWEN_TTS_MODEL_PATH")
    if configured:
        return str(resolve_project_path(configured))
    if DEFAULT_MODEL_PATH.exists():
        return str(DEFAULT_MODEL_PATH)
    return MODEL_ID


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a minimal Qwen CustomVoice TTS smoke test.")
    parser.add_argument("--speaker", default="Ryan", help="Built-in speaker name, for example Ryan or Aiden.")
    parser.add_argument("--text", default=DEFAULT_TEXT, help="Text to synthesize.")
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Output WAV path. Defaults to storage/audio/qwen_<speaker>_smoke_test.wav.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    from qwen_tts import Qwen3TTSModel

    if not torch.cuda.is_available():
        raise RuntimeError("CUDA is not available from torch. Check the venv and NVIDIA driver setup.")

    sox_path = shutil.which("sox")
    if sox_path is None:
        print("Warning: sox is not on PATH for this process. qwen_tts may warn or fail if it needs SoX.")
    else:
        print(f"SoX: {sox_path}")

    speaker_slug = args.speaker.strip().lower()
    output_path = args.output or DEFAULT_OUTPUT_DIR / f"qwen_{speaker_slug}_smoke_test.wav"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    model_source = resolve_model_source()
    print(f"Loading {model_source}")
    if model_source == MODEL_ID:
        print(
            "Warning: local Qwen model folder was not found. "
            "This may download from Hugging Face into .local-tts-ai/cache/huggingface."
        )
    print(f"CUDA device: {torch.cuda.get_device_name(0)}")
    model = Qwen3TTSModel.from_pretrained(
        model_source,
        device_map="cuda:0",
        dtype=torch.bfloat16,
    )

    print(f"Generating speaker={args.speaker!r}")
    wavs, sample_rate = model.generate_custom_voice(
        text=args.text,
        speaker=args.speaker,
        language="English",
    )

    sf.write(output_path, wavs[0], sample_rate)
    print(f"Wrote {output_path} ({sample_rate} Hz)")


if __name__ == "__main__":
    main()
