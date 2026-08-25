from __future__ import annotations

from abc import ABC, abstractmethod

from domain.models import ProgressCallback, SynthesisOutput, TtsModelDescriptor
from services.generation import GenerationOptions


class TtsModel(ABC):
    descriptor: TtsModelDescriptor

    def validate_options(self, options: GenerationOptions) -> None:
        if options.speed <= 0:
            raise ValueError("speed must be greater than 0.")

    @abstractmethod
    def synthesize(
        self,
        chunks: list[str],
        options: GenerationOptions,
        progress_callback: ProgressCallback | None = None,
    ) -> SynthesisOutput:
        raise NotImplementedError
