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
from typing import Any, cast

import numpy as np
import soundfile as sf

from infrastructure.local_runtime import LOCAL_TTS_AI_DIR, PROJECT_ROOT, configure_local_runtime

SAMPLE_RATE = 24000
KOKORO_MODEL_ID = "hexgrad/Kokoro-82M"
DEFAULT_KOKORO_MODEL_PATH = LOCAL_TTS_AI_DIR / "models" / "kokoro-82m"
QWEN_CUSTOM_MODEL_ID = "qwen-0.6b-custom"
QWEN_CUSTOM_1_7B_MODEL_ID = "qwen-1.7b-custom"
QWEN_CUSTOM_HF_MODEL_IDS = {
    QWEN_CUSTOM_MODEL_ID: "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice",
    QWEN_CUSTOM_1_7B_MODEL_ID: "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
}
QWEN_CUSTOM_MODEL_PATHS = {
    QWEN_CUSTOM_MODEL_ID: LOCAL_TTS_AI_DIR / "models" / "qwen3-tts-0-6b-custom",
    QWEN_CUSTOM_1_7B_MODEL_ID: LOCAL_TTS_AI_DIR / "models" / "qwen3-tts-1-7b-custom",
}
QWEN_CUSTOM_MODEL_ENV_VARS = {
    QWEN_CUSTOM_MODEL_ID: ("QWEN_TTS_0_6B_MODEL_PATH", "QWEN_TTS_MODEL_PATH"),
    QWEN_CUSTOM_1_7B_MODEL_ID: ("QWEN_TTS_1_7B_MODEL_PATH",),
}
QWEN_CUSTOM_MODEL_IDS = frozenset(QWEN_CUSTOM_HF_MODEL_IDS)
QWEN_CUSTOM_DEFAULT_SPEAKER = "Ryan"
QWEN_CUSTOM_SPEAKERS = frozenset({"Ryan", "Aiden"})
QWEN_BATCH_SIZE_ENV = "QWEN_TTS_BATCH_SIZE"
DEFAULT_QWEN_BATCH_SIZE = 1
ProgressCallback = Callable[[dict[str, Any]], None]

_QWEN_MODELS: dict[str, Any] = {}
_QWEN_MODEL_LOCK = threading.Lock()
_KOKORO_PIPELINES: dict[tuple[str, str, str], Any] = {}
_KOKORO_PIPELINE_LOCK = threading.Lock()

QWEN_LANGUAGE_BY_CODE = {
    "a": "English",
    "b": "English",
    "en": "English",
    "english": "English",
    "z": "Chinese",
    "zh": "Chinese",
    "chinese": "Chinese",
    "e": "Spanish",
    "es": "Spanish",
    "spanish": "Spanish",
    "f": "French",
    "fr": "French",
    "french": "French",
    "h": "Hindi",
    "hi": "Hindi",
    "hindi": "Hindi",
    "i": "Italian",
    "it": "Italian",
    "italian": "Italian",
    "j": "Japanese",
    "ja": "Japanese",
    "japanese": "Japanese",
    "p": "Portuguese",
    "pt": "Portuguese",
    "portuguese": "Portuguese",
    "de": "German",
    "german": "German",
    "ko": "Korean",
    "korean": "Korean",
    "ru": "Russian",
    "russian": "Russian",
}

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


def resolve_qwen_custom_model_source(model_id: str) -> str:
    if model_id not in QWEN_CUSTOM_HF_MODEL_IDS:
        raise ValueError(f"Unsupported Qwen model: {model_id}.")

    for env_var in QWEN_CUSTOM_MODEL_ENV_VARS[model_id]:
        configured = os.environ.get(env_var)
        if configured:
            return str(resolve_project_path(configured))

    default_path = QWEN_CUSTOM_MODEL_PATHS[model_id]
    if default_path.exists():
        return str(default_path)
    return QWEN_CUSTOM_HF_MODEL_IDS[model_id]


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


def resolve_qwen_language(lang_code: str | None) -> str:
    normalized = (lang_code or "en").strip().casefold()
    if normalized in {"auto", "automatic"}:
        return "Auto"
    return QWEN_LANGUAGE_BY_CODE.get(normalized, lang_code.strip() if lang_code else "English")


def resolve_qwen_batch_size(configured: int | None = None) -> int:
    value = configured
    if value is None:
        raw = os.environ.get(QWEN_BATCH_SIZE_ENV, str(DEFAULT_QWEN_BATCH_SIZE))
        try:
            value = int(raw)
        except ValueError as error:
            raise ValueError(f"{QWEN_BATCH_SIZE_ENV} must be a positive integer.") from error
    if value < 1:
        raise ValueError(f"{QWEN_BATCH_SIZE_ENV} must be a positive integer.")
    return value


def _audio_array(audio: Any, *, label: str) -> np.ndarray:
    array = np.asarray(audio, dtype=np.float32).reshape(-1)
    if array.size == 0:
        raise RuntimeError(f"{label} produced empty audio.")
    if not np.isfinite(array).all():
        raise RuntimeError(f"{label} produced NaN or infinite samples.")
    return np.clip(array, -1.0, 1.0)


def _kokoro_pipeline(repo_id: str, lang_code: str, model_path: Path | None) -> tuple[Any, str]:
    import torch
    from kokoro import KPipeline

    device = "cuda" if torch.cuda.is_available() else "cpu"
    source = str(model_path) if model_path is not None else repo_id
    key = (source, lang_code, device)
    with _KOKORO_PIPELINE_LOCK:
        if key in _KOKORO_PIPELINES:
            return _KOKORO_PIPELINES[key], device

        if model_path is not None:
            from kokoro import KModel

            model = (
                KModel(
                    repo_id=KOKORO_MODEL_ID,
                    config=str(model_path / "config.json"),
                    model=str(model_path / "kokoro-v1_0.pth"),
                )
                .to(device)
                .eval()
            )
            pipeline = KPipeline(repo_id=KOKORO_MODEL_ID, lang_code=lang_code, model=model, device=device)
        else:
            pipeline = KPipeline(repo_id=repo_id, lang_code=lang_code, device=device)

        _KOKORO_PIPELINES[key] = pipeline
        return pipeline, device


def synthesize_chunks(
    chunks: Iterable[str],
    voice: str,
    speed: float,
    repo_id: str,
    lang_code: str,
    progress_callback: ProgressCallback | None = None,
) -> list[np.ndarray]:
    patch_phonemizer_cleanup_bug()
    import torch

    model_path = resolve_kokoro_model_path(repo_id)
    pipeline, device = _kokoro_pipeline(repo_id, lang_code, model_path)
    print(f"Kokoro device: {device}")

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

        chunk_wavs: list[np.ndarray] = []
        with torch.inference_mode():
            generator = pipeline(chunk, voice=resolved_voice, speed=speed, split_pattern=r"\n{2,}")
            for _, _, audio in generator:
                chunk_wavs.append(_audio_array(audio, label=f"Kokoro chunk {index}"))

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


def get_qwen_custom_model(model_id: str) -> Any:
    with _QWEN_MODEL_LOCK:
        if model_id in _QWEN_MODELS:
            return _QWEN_MODELS[model_id]

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
            torch_runtime = cast(Any, torch)
            kwargs = {
                "device_map": "cuda:0",
                "dtype": torch_runtime.bfloat16,
            }
            kwargs["attn_implementation"] = "flash_attention_2" if find_spec("flash_attn") else "sdpa"
            print(f"Loading Qwen CustomVoice on CUDA: {torch.cuda.get_device_name(0)}")
        else:
            kwargs = {}
            print(
                f"Warning: CUDA is not available. Loading {QWEN_CUSTOM_HF_MODEL_IDS[model_id]} on CPU; "
                "Qwen TTS generation will be very slow."
            )

        model_source = resolve_qwen_custom_model_source(model_id)
        print(f"Qwen model source: {model_source}")
        model = qwen_model_class.from_pretrained(model_source, **kwargs)
        _QWEN_MODELS[model_id] = model
        return model


def synthesize_qwen_custom_chunks(
    chunks: Iterable[str],
    speaker: str,
    model_id: str = QWEN_CUSTOM_MODEL_ID,
    instruct: str | None = None,
    language: str = "English",
    batch_size: int | None = None,
    progress_callback: ProgressCallback | None = None,
) -> tuple[list[np.ndarray], int]:
    if model_id not in QWEN_CUSTOM_MODEL_IDS:
        raise ValueError(f"Unsupported Qwen model: {model_id}.")
    if speaker not in QWEN_CUSTOM_SPEAKERS:
        supported = ", ".join(sorted(QWEN_CUSTOM_SPEAKERS))
        raise ValueError(f"Unsupported Qwen speaker: {speaker}. Supported speakers: {supported}.")

    model = get_qwen_custom_model(model_id)
    chunk_list = list(chunks)
    batch_size = resolve_qwen_batch_size(batch_size)
    wavs: list[np.ndarray] = []
    sample_rate: int | None = None

    for start in range(0, len(chunk_list), batch_size):
        batch = chunk_list[start : start + batch_size]
        first_index = start + 1
        last_index = start + len(batch)
        print(
            f"[{first_index}-{last_index}/{len(chunk_list)}] Synthesizing {len(batch)} Qwen chunk(s) "
            f"with speaker {speaker} on {getattr(model, 'device', 'cuda')}..."
        )
        if progress_callback is not None:
            for index in range(first_index, last_index + 1):
                progress_callback(
                    {
                        "stage": "synthesizing",
                        "current": index,
                        "total": len(chunk_list),
                        "message": f"Synthesizing Qwen chunk {index} of {len(chunk_list)}.",
                    }
                )
        generated_wavs, generated_sample_rate = model.generate_custom_voice(
            text=batch if len(batch) > 1 else batch[0],
            speaker=[speaker] * len(batch) if len(batch) > 1 else speaker,
            language=[language] * len(batch) if len(batch) > 1 else language,
            instruct=[instruct] * len(batch) if len(batch) > 1 else instruct,
        )

        if len(generated_wavs) != len(batch):
            raise RuntimeError(f"Qwen returned {len(generated_wavs)} outputs for {len(batch)} chunks.")
        current_rate = int(generated_sample_rate)
        if sample_rate is not None and current_rate != sample_rate:
            raise RuntimeError(f"Qwen sample rate changed from {sample_rate} to {current_rate}.")
        sample_rate = current_rate
        for offset, generated in enumerate(generated_wavs):
            index = start + offset + 1
            wavs.append(_audio_array(generated, label=f"Qwen chunk {index}"))
            if progress_callback is not None:
                progress_callback(
                    {
                        "stage": "synthesized",
                        "current": index,
                        "total": len(chunk_list),
                        "message": f"Finished Qwen chunk {index} of {len(chunk_list)}.",
                    }
                )

    return wavs, sample_rate or SAMPLE_RATE


def merge_wavs(wavs: list[np.ndarray], pause_ms: int = 300, sample_rate: int = SAMPLE_RATE) -> np.ndarray:
    if not wavs:
        raise ValueError("No audio was generated.")

    prepared = []
    fade_samples = max(1, int(sample_rate * 0.008))
    for wav in wavs:
        array = _audio_array(wav, label="Audio chunk").copy()
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

    detected = shutil.which("ffmpeg")
    if detected:
        return detected

    raise FileNotFoundError(
        "FFmpeg was not found. Install it with Winget, add it to PATH, set FFMPEG_PATH, or pass --ffmpeg-path."
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
    rounded = max(1, round(seconds))
    minutes, secs = divmod(rounded, 60)
    hours, minutes = divmod(minutes, 60)

    if hours:
        return f"{hours}h {minutes}m {secs}s"
    if minutes:
        return f"{minutes}m {secs}s"
    return f"{secs}s"
