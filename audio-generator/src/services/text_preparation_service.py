from __future__ import annotations

from services.text_processing import make_chunks, prepare_text_for_tts


class TextPreparationService:
    def prepare(self, text: str, suffix: str) -> str:
        return prepare_text_for_tts(text.lstrip("\ufeff"), suffix)

    def chunk(self, text: str, *, max_chars: int, min_chunk_chars: int, pack_to_max: bool) -> list[str]:
        return make_chunks(
            text,
            max_chars=max_chars,
            min_chunk_chars=min_chunk_chars,
            pack_to_max=pack_to_max,
        )
