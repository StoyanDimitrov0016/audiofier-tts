from __future__ import annotations

from pathlib import Path

import numpy as np

from infrastructure.audio_files import SAMPLE_RATE, convert_wav_to_mp3, resolve_ffmpeg
from infrastructure.audio_files import merge_wavs as merge_audio_wavs


class AudioTransformService:
    def merge_wavs(self, wavs: list[np.ndarray], pause_ms: int = 300, sample_rate: int = SAMPLE_RATE) -> np.ndarray:
        return merge_audio_wavs(wavs, pause_ms=pause_ms, sample_rate=sample_rate)

    def convert_wav_to_mp3(
        self,
        wav_path: Path,
        mp3_path: Path,
        ffmpeg_path: str | None,
        bitrate: str,
    ) -> None:
        convert_wav_to_mp3(
            wav_path=wav_path,
            mp3_path=mp3_path,
            ffmpeg_executable=resolve_ffmpeg(ffmpeg_path),
            bitrate=bitrate,
        )
