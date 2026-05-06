from __future__ import annotations

from domain.models import ProgressCallback, SynthesisOutput, TtsModelDescriptor
from infrastructure.audio_runtime import (
    QWEN_CUSTOM_1_7B_MODEL_ID,
    QWEN_CUSTOM_DEFAULT_SPEAKER,
    QWEN_CUSTOM_MODEL_ID,
    resolve_qwen_custom_model_source,
    synthesize_qwen_custom_chunks,
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
        )

    def synthesize(
        self,
        chunks: list[str],
        options: GenerationOptions,
        progress_callback: ProgressCallback | None = None,
    ) -> SynthesisOutput:
        instruct = options.instruct if self.descriptor.supports_instruct else None
        wavs, sample_rate = synthesize_qwen_custom_chunks(
            chunks=chunks,
            speaker=options.voice,
            model_id=self.descriptor.id,
            instruct=instruct,
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
