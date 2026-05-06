from __future__ import annotations

from abc import ABC, abstractmethod

from domain.models import ProgressCallback, SynthesisOutput, TtsModelDescriptor
from services.generation import GenerationOptions


class TtsModel(ABC):
    descriptor: TtsModelDescriptor

    @abstractmethod
    def synthesize(
        self,
        chunks: list[str],
        options: GenerationOptions,
        progress_callback: ProgressCallback | None = None,
    ) -> SynthesisOutput:
        raise NotImplementedError
