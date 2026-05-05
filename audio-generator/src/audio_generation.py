from __future__ import annotations

import os
import shutil
import subprocess
import sys
import threading
import warnings
from collections.abc import Callable, Iterable
from importlib import import_module
from importlib.util import find_spec
from pathlib import Path
from typing import Any

import numpy as np
import soundfile as sf

from local_runtime import LOCAL_TTS_AI_DIR, PROJECT_ROOT, configure_local_runtime

SAMPLE_RATE = 24000
FFMPEG_EXECUTABLE_NAME = "ffmpeg.exe" if sys.platform == "win32" else "ffmpeg"
DEFAULT_FFMPEG_PATH = LOCAL_TTS_AI_DIR / "tools" / FFMPEG_EXECUTABLE_NAME
KOKORO_MODEL_ID = "hexgrad/Kokoro-82M"
DEFAULT_KOKORO_MODEL_PATH = LOCAL_TTS_AI_DIR / "models" / "kokoro-82m"
QWEN_CUSTOM_BACKEND_ID = "qwen-0.6b-custom"
QWEN_CUSTOM_1_7B_BACKEND_ID = "qwen-1.7b-custom"
QWEN_CUSTOM_MODEL_IDS = {
    QWEN_CUSTOM_BACKEND_ID: "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice",
    QWEN_CUSTOM_1_7B_BACKEND_ID: "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
}
QWEN_CUSTOM_MODEL_PATHS = {
    QWEN_CUSTOM_BACKEND_ID: LOCAL_TTS_AI_DIR / "models" / "qwen3-tts-0-6b-custom",
    QWEN_CUSTOM_1_7B_BACKEND_ID: LOCAL_TTS_AI_DIR / "models" / "qwen3-tts-1-7b-custom",
}
QWEN_CUSTOM_MODEL_ENV_VARS = {
    QWEN_CUSTOM_BACKEND_ID: ("QWEN_TTS_0_6B_MODEL_PATH", "QWEN_TTS_MODEL_PATH"),
    QWEN_CUSTOM_1_7B_BACKEND_ID: ("QWEN_TTS_1_7B_MODEL_PATH",),
}
QWEN_CUSTOM_BACKEND_IDS = frozenset(QWEN_CUSTOM_MODEL_IDS)
DEFAULT_QWEN_TOKENIZER_PATH = LOCAL_TTS_AI_DIR / "models" / "qwen3-tts-tokenizer-12hz"
QWEN_CUSTOM_DEFAULT_SPEAKER = "Ryan"
QWEN_CUSTOM_SPEAKERS = frozenset({"Ryan", "Aiden"})
ProgressCallback = Callable[[dict[str, Any]], None]

_QWEN_MODELS: dict[str, Any] = {}
_QWEN_MODEL_LOCK = threading.Lock()

configure_local_runtime()


def resolve_project_path(value: str | Path) -> Path:
    path = Path(value)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def resolve_kokoro_model_source(repo_id: str) -> str:
    configured = os.environ.get("KOKORO_MODEL_PATH")
    if configured:
        return str(resolve_project_path(configured))
    if repo_id == KOKORO_MODEL_ID and DEFAULT_KOKORO_MODEL_PATH.exists():
        return str(DEFAULT_KOKORO_MODEL_PATH)
    return repo_id


def resolve_kokoro_model_path(repo_id: str) -> Path | None:
    source = resolve_kokoro_model_source(repo_id)
    path = Path(source)
    if path.exists() and path.is_dir():
        return path
    return None


def resolve_kokoro_voice(voice: str, model_path: Path | None) -> str:
    if model_path is None:
        return voice
    voice_path = model_path / "voices" / f"{voice}.pt"
    if voice_path.exists():
        return str(voice_path)
    return voice


def resolve_qwen_custom_model_source(backend: str) -> str:
    if backend not in QWEN_CUSTOM_MODEL_IDS:
        raise ValueError(f"Unsupported Qwen backend: {backend}.")

    for env_var in QWEN_CUSTOM_MODEL_ENV_VARS[backend]:
        configured = os.environ.get(env_var)
        if configured:
            return str(resolve_project_path(configured))

    default_path = QWEN_CUSTOM_MODEL_PATHS[backend]
    if default_path.exists():
        return str(default_path)
    return QWEN_CUSTOM_MODEL_IDS[backend]


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
    progress_callback: ProgressCallback | None = None,
) -> list[np.ndarray]:
    patch_phonemizer_cleanup_bug()
    from kokoro import KPipeline

    model_path = resolve_kokoro_model_path(repo_id)
    if model_path is not None:
        import torch
        from kokoro import KModel

        device = "cuda" if torch.cuda.is_available() else "cpu"
        model = KModel(
            repo_id=KOKORO_MODEL_ID,
            config=str(model_path / "config.json"),
            model=str(model_path / "kokoro-v1_0.pth"),
        ).to(device).eval()
        pipeline = KPipeline(repo_id=KOKORO_MODEL_ID, lang_code=lang_code, model=model)
    else:
        pipeline = KPipeline(repo_id=repo_id, lang_code=lang_code)

    resolved_voice = resolve_kokoro_voice(voice, model_path)
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

        generator = pipeline(chunk, voice=resolved_voice, speed=speed, split_pattern=r"\n{2,}")

        chunk_wavs: list[np.ndarray] = []
        for _, _, audio in generator:
            chunk_wavs.append(np.asarray(audio, dtype=np.float32))

        if not chunk_wavs:
            raise RuntimeError(f"No audio produced for chunk {index}.")

        wavs.append(np.concatenate(chunk_wavs))
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


def get_qwen_custom_model(backend: str) -> Any:
    with _QWEN_MODEL_LOCK:
        if backend in _QWEN_MODELS:
            return _QWEN_MODELS[backend]

        import torch

        try:
            qwen_tts = import_module("qwen_tts")
        except ModuleNotFoundError as error:
            raise RuntimeError(
                "qwen-tts is not installed in the active Python environment. "
                "Install audio-generator requirements and run the API with audio-generator/.venv."
            ) from error

        qwen_model_class = qwen_tts.Qwen3TTSModel

        kwargs: dict[str, Any]
        if torch.cuda.is_available():
            kwargs = {
                "device_map": "cuda:0",
                "dtype": torch.bfloat16,
            }
            if find_spec("flash_attn") is not None:
                kwargs["attn_implementation"] = "flash_attention_2"
            print(f"Loading Qwen CustomVoice on CUDA: {torch.cuda.get_device_name(0)}")
        else:
            kwargs = {}
            print(
                f"Warning: CUDA is not available. Loading {QWEN_CUSTOM_MODEL_IDS[backend]} on CPU; "
                "Qwen TTS generation will be very slow."
            )

        model_source = resolve_qwen_custom_model_source(backend)
        print(f"Qwen model source: {model_source}")
        model = qwen_model_class.from_pretrained(model_source, **kwargs)
        _QWEN_MODELS[backend] = model
        return model


def synthesize_qwen_custom_chunks(
    chunks: Iterable[str],
    speaker: str,
    backend: str = QWEN_CUSTOM_BACKEND_ID,
    progress_callback: ProgressCallback | None = None,
) -> tuple[list[np.ndarray], int]:
    if backend not in QWEN_CUSTOM_BACKEND_IDS:
        raise ValueError(f"Unsupported Qwen backend: {backend}.")
    if speaker not in QWEN_CUSTOM_SPEAKERS:
        supported = ", ".join(sorted(QWEN_CUSTOM_SPEAKERS))
        raise ValueError(f"Unsupported Qwen speaker: {speaker}. Supported speakers: {supported}.")

    model = get_qwen_custom_model(backend)
    chunk_list = list(chunks)
    wavs: list[np.ndarray] = []
    sample_rate = SAMPLE_RATE

    for index, chunk in enumerate(chunk_list, start=1):
        print(f"[{index}/{len(chunk_list)}] Synthesizing {len(chunk)} characters with Qwen speaker {speaker}...")
        if progress_callback is not None:
            progress_callback(
                {
                    "stage": "synthesizing",
                    "current": index,
                    "total": len(chunk_list),
                    "message": f"Synthesizing Qwen chunk {index} of {len(chunk_list)}.",
                }
            )

        generated_wavs, generated_sample_rate = model.generate_custom_voice(
            text=chunk,
            speaker=speaker,
            language="English",
        )

        if not generated_wavs:
            raise RuntimeError(f"No audio produced for Qwen chunk {index}.")

        sample_rate = int(generated_sample_rate)
        wavs.append(np.asarray(generated_wavs[0], dtype=np.float32))
        if progress_callback is not None:
            progress_callback(
                {
                    "stage": "synthesized",
                    "current": index,
                    "total": len(chunk_list),
                    "message": f"Finished Qwen chunk {index} of {len(chunk_list)}.",
                }
            )

    return wavs, sample_rate


def merge_wavs(wavs: list[np.ndarray], pause_ms: int = 300, sample_rate: int = SAMPLE_RATE) -> np.ndarray:
    if not wavs:
        raise ValueError("No audio was generated.")

    pause = np.zeros(int(sample_rate * (pause_ms / 1000.0)), dtype=np.float32)
    parts: list[np.ndarray] = []

    for index, wav in enumerate(wavs):
        parts.append(wav)
        if index < len(wavs) - 1 and pause_ms > 0:
            parts.append(pause)

    return np.concatenate(parts)


def save_chunk_wavs(wavs: list[np.ndarray], chunk_dir: Path, stem: str, sample_rate: int = SAMPLE_RATE) -> None:
    chunk_dir.mkdir(parents=True, exist_ok=True)
    for index, wav in enumerate(wavs, start=1):
        chunk_path = chunk_dir / f"{stem}_part_{index:03d}.wav"
        sf.write(chunk_path, wav, sample_rate)


def save_final_wav(
    wavs: list[np.ndarray],
    output_dir: Path,
    stem: str,
    pause_ms: int,
    sample_rate: int = SAMPLE_RATE,
) -> tuple[Path, float]:
    output_dir.mkdir(parents=True, exist_ok=True)
    merged = merge_wavs(wavs, pause_ms=pause_ms, sample_rate=sample_rate)
    final_path = output_dir / f"{stem}.wav"
    sf.write(final_path, merged, sample_rate)
    duration_seconds = len(merged) / sample_rate
    return final_path, duration_seconds


def resolve_ffmpeg(ffmpeg_path: str | None) -> str:
    if ffmpeg_path:
        candidate = resolve_project_path(ffmpeg_path)
        if not candidate.exists():
            raise FileNotFoundError(f"FFmpeg not found: {candidate}")
        return str(candidate)

    configured = os.environ.get("FFMPEG_PATH")
    if configured:
        candidate = resolve_project_path(configured)
        if not candidate.exists():
            raise FileNotFoundError(f"FFmpeg not found from FFMPEG_PATH: {candidate}")
        return str(candidate)

    if DEFAULT_FFMPEG_PATH.exists():
        return str(DEFAULT_FFMPEG_PATH)

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
        "FFmpeg was not found. Install it, add it to PATH, set FFMPEG_PATH, "
        "place it at .local-tts-ai/tools/ffmpeg.exe, or pass --ffmpeg-path."
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
