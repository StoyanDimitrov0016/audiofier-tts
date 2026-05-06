from __future__ import annotations

from tts_models.kokoro_model import KokoroModel
from tts_models.qwen_model import QWEN_0_6B_MODEL, QWEN_1_7B_MODEL


class TtsModelRegistry:
    def __init__(self) -> None:
        models = [KokoroModel(), QWEN_0_6B_MODEL, QWEN_1_7B_MODEL]
        self._models = {model.descriptor.id: model for model in models}

    def get(self, model_id: str):
        try:
            return self._models[model_id]
        except KeyError as error:
            raise ValueError(f"Unsupported TTS model: {model_id}.") from error

    def list(self):
        return list(self._models.values())


MODEL_REGISTRY = TtsModelRegistry()
