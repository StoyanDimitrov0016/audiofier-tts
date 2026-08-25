from __future__ import annotations

from collections.abc import Iterable

from tts_models.base import TtsModel
from tts_models.kokoro_model import KokoroModel
from tts_models.qwen_model import QWEN_0_6B_MODEL, QWEN_1_7B_MODEL


class TtsModelRegistry:
    def __init__(self, models: Iterable[TtsModel] | None = None) -> None:
        registered = list(models) if models is not None else [KokoroModel(), QWEN_0_6B_MODEL, QWEN_1_7B_MODEL]
        self._models = {model.descriptor.id: model for model in registered}
        if not self._models:
            raise ValueError("At least one TTS model must be registered.")
        if len(self._models) != len(registered):
            raise ValueError("TTS model IDs must be unique.")

    def get(self, model_id: str):
        try:
            return self._models[model_id]
        except KeyError as error:
            raise ValueError(f"Unsupported TTS model: {model_id}.") from error

    def list(self):
        return list(self._models.values())


MODEL_REGISTRY = TtsModelRegistry()
