from __future__ import annotations

import re


def collapse_hard_wrapped_lines(text: str) -> str:
    # PDF-extracted paragraphs often keep visual line wraps. Turn those into
    # spaces, but preserve blank lines as paragraph boundaries.
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"(?<!\n)\n(?!\n)", " ", text)
    text = re.sub(r" {2,}", " ", text)
    return text


def strip_markdown(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Remove YAML front matter often used in markdown-based note systems.
    text = re.sub(r"\A---\s*\n.*?\n---\s*(?:\n|$)", "", text, flags=re.DOTALL)

    text = re.sub(r"<!--.*?-->", " ", text, flags=re.DOTALL)
    text = re.sub(r"```.*?```", " ", text, flags=re.DOTALL)
    text = re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1", text)
    text = re.sub(r"<[^>\n]+>", " ", text)
    text = re.sub(r"^\s*[-*_]{3,}\s*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\|?(?:\s*:?-{3,}:?\s*\|)+\s*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\|(.+)\|$", lambda match: match.group(1).replace("|", ", "), text, flags=re.MULTILINE)
    text = re.sub(r"\[\^.+?\]", "", text)

    text = re.sub(r"^#{1,6}\s+(.+)$", r"\1.", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*>\s?", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+[.)]\s+", "", text, flags=re.MULTILINE)

    text = text.replace("`", "")
    text = re.sub(r"(?<!\*)\*\*([^*\n]+)\*\*(?!\*)", r"\1", text)
    text = re.sub(r"(?<!_)__([^_\n]+)__(?!_)", r"\1", text)
    text = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"\1", text)
    text = re.sub(r"(?<!\w)_([^_\n]+)_(?!\w)", r"\1", text)

    text = re.sub(r"[ \t]+", " ", text)
    text = collapse_hard_wrapped_lines(text)

    return text.strip()


def prepare_text_for_tts(text: str, suffix: str) -> str:
    cleaned = strip_markdown(text) if suffix.lower() == ".md" else text.strip()
    return cleaned.strip()


def paragraph_chunks(text: str) -> list[str]:
    return [paragraph.strip() for paragraph in re.split(r"\n\s*\n", text) if paragraph.strip()]


def split_oversized_piece(text: str, max_chars: int) -> list[str]:
    text = text.strip()
    if len(text) <= max_chars:
        return [text]

    parts = re.split(r"(?<=[,;:])\s+", text)
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for part in parts:
        part = part.strip()
        if not part:
            continue

        if len(part) > max_chars:
            words = part.split()
            word_current: list[str] = []
            word_len = 0

            for word in words:
                extra = len(word) + (1 if word_current else 0)
                if word_current and word_len + extra > max_chars:
                    chunks.append(" ".join(word_current))
                    word_current = [word]
                    word_len = len(word)
                else:
                    word_current.append(word)
                    word_len += extra

            if word_current:
                if current:
                    chunks.append(" ".join(current))
                    current = []
                    current_len = 0
                chunks.append(" ".join(word_current))
            continue

        extra = len(part) + (1 if current else 0)
        if current and current_len + extra > max_chars:
            chunks.append(" ".join(current))
            current = [part]
            current_len = len(part)
        else:
            current.append(part)
            current_len += extra

    if current:
        chunks.append(" ".join(current))

    return chunks


def split_long_chunk(text: str, max_chars: int = 1200) -> list[str]:
    text = text.strip()
    if len(text) <= max_chars:
        return [text]

    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue

        if len(sentence) > max_chars:
            if current:
                chunks.append(" ".join(current))
                current = []
                current_len = 0
            chunks.extend(split_oversized_piece(sentence, max_chars))
            continue

        extra = len(sentence) + (1 if current else 0)
        if current and current_len + extra > max_chars:
            chunks.append(" ".join(current))
            current = [sentence]
            current_len = len(sentence)
        else:
            current.append(sentence)
            current_len += extra

    if current:
        chunks.append(" ".join(current))

    return chunks


def merge_small_chunks(chunks: list[str], min_chars: int = 140, max_chars: int = 1200) -> list[str]:
    if not chunks:
        return []

    merged = list(chunks)
    index = 0

    while index < len(merged):
        current = merged[index].strip()
        if len(current) >= min_chars:
            index += 1
            continue

        if index + 1 < len(merged):
            combined_with_next = f"{current}\n\n{merged[index + 1].strip()}"
            if len(combined_with_next) <= max_chars:
                merged[index + 1] = combined_with_next
                del merged[index]
                continue

        if index > 0:
            combined_with_previous = f"{merged[index - 1].strip()}\n\n{current}"
            if len(combined_with_previous) <= max_chars:
                merged[index - 1] = combined_with_previous
                del merged[index]
                index -= 1
                continue

        index += 1

    return merged


def pack_chunks(chunks: list[str], max_chars: int = 1200) -> list[str]:
    packed: list[str] = []
    current: str | None = None

    for chunk in chunks:
        chunk = chunk.strip()
        if not chunk:
            continue

        if current is None:
            current = chunk
            continue

        combined = f"{current}\n\n{chunk}"
        if len(combined) <= max_chars:
            current = combined
        else:
            packed.append(current)
            current = chunk

    if current is not None:
        packed.append(current)

    return packed


def make_chunks(
    text: str,
    max_chars: int = 1200,
    min_chunk_chars: int = 140,
    pack_to_max: bool = False,
) -> list[str]:
    output: list[str] = []
    for paragraph in paragraph_chunks(text):
        output.extend(split_long_chunk(paragraph, max_chars=max_chars))
    merged = merge_small_chunks(output, min_chars=min_chunk_chars, max_chars=max_chars)
    return pack_chunks(merged, max_chars=max_chars) if pack_to_max else merged
