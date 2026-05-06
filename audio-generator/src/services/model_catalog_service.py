from __future__ import annotations

from repositories.voice_repository import VoiceRepository
from tts_models.registry import MODEL_REGISTRY, TtsModelRegistry


class ModelCatalogService:
    def __init__(
        self,
        registry: TtsModelRegistry = MODEL_REGISTRY,
        voice_repository: VoiceRepository | None = None,
    ) -> None:
        self._registry = registry
        self._voice_repository = voice_repository or VoiceRepository()

    def list_models(self) -> dict[str, object]:
        return {
            "defaultModel": "kokoro",
            "models": [
                {
                    "id": model.descriptor.id,
                    "name": model.descriptor.name,
                    "defaultVoice": model.descriptor.default_voice,
                    "supportsInstruct": model.descriptor.supports_instruct,
                    "languages": self._voice_repository.languages_by_model(model.descriptor.id),
                }
                for model in self._registry.list()
            ],
        }

    def list_voices(self, model_id: str, language: str | None = None) -> dict[str, object]:
        self._registry.get(model_id)
        return {
            "modelId": model_id,
            "defaultVoice": self._voice_repository.default_voice_for_model(model_id),
            "voices": self._voice_repository.list_by_model(model_id, language=language),
        }
