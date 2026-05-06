from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import numpy as np

ProgressCallback = Callable[[dict[str, Any]], None]


@dataclass(frozen=True)
class TtsModelDescriptor:
    id: str
    name: str
    default_voice: str
    supports_instruct: bool


@dataclass(frozen=True)
class SynthesisOutput:
    wavs: list[np.ndarray]
    sample_rate: int
    model_source: str | None
