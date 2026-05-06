from __future__ import annotations

from pathlib import Path

from domain.models import ProgressCallback
from infrastructure.audio_runtime import suppress_known_runtime_noise
from repositories.audio_repository import AudioRepository
from services.audio_transform_service import AudioTransformService
from services.generation import (
    DEFAULT_LANG_CODE,
    DEFAULT_MAX_CHARS,
    DEFAULT_MODEL_ID,
    DEFAULT_REPO_ID,
    GenerationOptions,
    GenerationResult,
    max_chunk_chars_for_model,
    min_chunk_chars_for_model,
    pack_chunks_for_model,
    validate_generation_options,
    validate_text_suffix,
)
from services.text_preparation_service import TextPreparationService
from tts_models.registry import MODEL_REGISTRY, TtsModelRegistry


class AudioService:
    def __init__(
        self,
        registry: TtsModelRegistry = MODEL_REGISTRY,
        text_preparation_service: TextPreparationService | None = None,
        audio_transform_service: AudioTransformService | None = None,
        audio_repository: AudioRepository | None = None,
    ) -> None:
        self._registry = registry
        self._text_preparation_service = text_preparation_service or TextPreparationService()
        self._audio_transform_service = audio_transform_service or AudioTransformService()
        self._audio_repository = audio_repository or AudioRepository()

    def generate(
        self,
        *,
        text: str,
        stem: str,
        suffix: str,
        output_dir: Path,
        model_id: str = DEFAULT_MODEL_ID,
        voice: str | None = None,
        lang_code: str | None = None,
        speed: float = 1.0,
        instruct: str | None = None,
        wav_only: bool = False,
        progress_callback: ProgressCallback | None = None,
    ) -> GenerationResult:
        suppress_known_runtime_noise()
        model = self._registry.get(model_id)
        options = GenerationOptions(
            output_dir=output_dir,
            model_id=model_id,
            voice=voice or model.descriptor.default_voice,
            speed=speed,
            lang_code=lang_code or DEFAULT_LANG_CODE,
            repo_id=DEFAULT_REPO_ID,
            max_chars=DEFAULT_MAX_CHARS,
            wav_only=wav_only,
            instruct=instruct if model.descriptor.supports_instruct else None,
        )
        validate_generation_options(options)

        normalized_suffix = validate_text_suffix(suffix)
        cleaned = self._text_preparation_service.prepare(text, normalized_suffix)
        if not cleaned:
            raise ValueError("The input text is empty after cleaning.")

        chunks = self._text_preparation_service.chunk(
            cleaned,
            max_chars=max_chunk_chars_for_model(model_id, options.max_chars),
            min_chunk_chars=min_chunk_chars_for_model(model_id),
            pack_to_max=pack_chunks_for_model(model_id),
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

        synthesis = model.synthesize(chunks, options, progress_callback=progress_callback)
        output_dir_for_stem, output_stem = self._audio_repository.output_dir_for(output_dir, stem)

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
            self._audio_repository.save_chunk_wavs(
                synthesis.wavs,
                output_dir_for_stem / "chunks",
                output_stem,
                synthesis.sample_rate,
            )

        merged_wav = self._audio_transform_service.merge_wavs(
            synthesis.wavs,
            pause_ms=options.pause_ms,
            sample_rate=synthesis.sample_rate,
        )
        final_wav, duration_seconds = self._audio_repository.save_final_wav(
            merged_wav,
            output_dir_for_stem,
            output_stem,
            synthesis.sample_rate,
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
            final_mp3 = output_dir_for_stem / f"{output_stem}.mp3"
            self._audio_transform_service.convert_wav_to_mp3(
                wav_path=final_wav,
                mp3_path=final_mp3,
                ffmpeg_path=options.ffmpeg_path,
                bitrate=options.mp3_bitrate,
            )

        return GenerationResult(
            lesson_output_dir=output_dir_for_stem,
            wav_path=final_wav,
            mp3_path=final_mp3,
            chunk_count=len(chunks),
            cleaned_character_count=len(cleaned),
            duration_seconds=duration_seconds,
            model_id=model_id,
            voice=options.voice,
            model_source=synthesis.model_source,
            instruct=options.instruct,
        )
