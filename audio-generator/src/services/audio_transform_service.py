from __future__ import annotations

from pathlib import Path

import numpy as np

from infrastructure.audio_runtime import SAMPLE_RATE, convert_wav_to_mp3, resolve_ffmpeg


class AudioTransformService:
    def merge_wavs(self, wavs: list[np.ndarray], pause_ms: int = 300, sample_rate: int = SAMPLE_RATE) -> np.ndarray:
        if not wavs:
            raise ValueError("No audio was generated.")

        pause = np.zeros(int(sample_rate * (pause_ms / 1000.0)), dtype=np.float32)
        parts: list[np.ndarray] = []

        for index, wav in enumerate(wavs):
            parts.append(wav)
            if index < len(wavs) - 1 and pause_ms > 0:
                parts.append(pause)

        return np.concatenate(parts)

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
