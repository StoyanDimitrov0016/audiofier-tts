from __future__ import annotations

from domain.models import ProgressCallback, SynthesisOutput, TtsModelDescriptor
from infrastructure.audio_runtime import SAMPLE_RATE, resolve_kokoro_model_source, synthesize_chunks
from services.generation import DEFAULT_REPO_ID, DEFAULT_VOICE, GenerationOptions
from tts_models.base import TtsModel


class KokoroModel(TtsModel):
    descriptor = TtsModelDescriptor(
        id="kokoro",
        name="Kokoro",
        default_voice=DEFAULT_VOICE,
        supports_instruct=False,
    )

    def synthesize(
        self,
        chunks: list[str],
        options: GenerationOptions,
        progress_callback: ProgressCallback | None = None,
    ) -> SynthesisOutput:
        wavs = synthesize_chunks(
            chunks=chunks,
            voice=options.voice,
            speed=options.speed,
            repo_id=options.repo_id,
            lang_code=options.lang_code,
            progress_callback=progress_callback,
        )
        return SynthesisOutput(
            wavs=wavs,
            sample_rate=SAMPLE_RATE,
            model_source=resolve_kokoro_model_source(options.repo_id or DEFAULT_REPO_ID),
        )
