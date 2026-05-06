from __future__ import annotations

from pathlib import Path

import numpy as np
import soundfile as sf

from services.generation import sanitize_stem


class AudioRepository:
    def save_chunk_wavs(self, wavs: list[np.ndarray], chunk_dir: Path, stem: str, sample_rate: int) -> None:
        chunk_dir.mkdir(parents=True, exist_ok=True)
        for index, wav in enumerate(wavs, start=1):
            chunk_path = chunk_dir / f"{stem}_part_{index:03d}.wav"
            sf.write(chunk_path, wav, sample_rate)

    def save_final_wav(self, wav: np.ndarray, output_dir: Path, stem: str, sample_rate: int) -> tuple[Path, float]:
        output_dir.mkdir(parents=True, exist_ok=True)
        final_path = output_dir / f"{stem}.wav"
        sf.write(final_path, wav, sample_rate)
        return final_path, len(wav) / sample_rate

    def output_dir_for(self, base_output_dir: Path, stem: str) -> tuple[Path, str]:
        output_stem = sanitize_stem(stem)
        return base_output_dir / output_stem, output_stem
