from __future__ import annotations

from domain.models import ProgressCallback, SynthesisOutput, TtsModelDescriptor
from infrastructure.qwen_runtime import (
    QWEN_CUSTOM_1_7B_MODEL_ID,
    QWEN_CUSTOM_DEFAULT_SPEAKER,
    QWEN_CUSTOM_MODEL_ID,
    resolve_qwen_custom_model_source,
    resolve_qwen_language,
    synthesize_qwen_custom,
)
from services.generation import GenerationOptions
from tts_models.base import TtsModel


class QwenCustomModel(TtsModel):
    def __init__(self, model_id: str, name: str, supports_instruct: bool) -> None:
        self.descriptor = TtsModelDescriptor(
            id=model_id,
            name=name,
            default_voice=QWEN_CUSTOM_DEFAULT_SPEAKER,
            supports_instruct=supports_instruct,
            max_chunk_chars=1200,
            min_chunk_chars=220,
            pack_chunks=True,
        )

    def validate_options(self, options: GenerationOptions) -> None:
        super().validate_options(options)
        if options.voice not in {"Aiden", "Ryan"}:
            raise ValueError("Unsupported Qwen speaker: " + options.voice + ". Supported speakers: Aiden, Ryan.")

    def synthesize(
        self,
        chunks: list[str],
        options: GenerationOptions,
        progress_callback: ProgressCallback | None = None,
    ) -> SynthesisOutput:
        instruct = options.instruct if self.descriptor.supports_instruct else None
        wavs, sample_rate = synthesize_qwen_custom(
            chunks=chunks,
            speaker=options.voice,
            model_id=self.descriptor.id,
            instruct=instruct,
            language=resolve_qwen_language(options.lang_code),
            progress_callback=progress_callback,
        )
        return SynthesisOutput(
            wavs=wavs,
            sample_rate=sample_rate,
            model_source=resolve_qwen_custom_model_source(self.descriptor.id),
        )


QWEN_0_6B_MODEL = QwenCustomModel(
    model_id=QWEN_CUSTOM_MODEL_ID,
    name="Qwen 0.6B CustomVoice",
    supports_instruct=False,
)
QWEN_1_7B_MODEL = QwenCustomModel(
    model_id=QWEN_CUSTOM_1_7B_MODEL_ID,
    name="Qwen 1.7B CustomVoice",
    supports_instruct=True,
)
