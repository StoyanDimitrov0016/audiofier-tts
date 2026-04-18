import os
from pathlib import Path
from types import ModuleType
import sys
import tempfile
import unittest
from unittest.mock import patch

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"

if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from audio_generation import resolve_ffmpeg, synthesize_chunks
from cli import build_output_dir, resolve_input_path, resolve_output_dir
from text_processing import make_chunks, merge_small_chunks, prepare_text_for_tts, strip_markdown


class MarkdownCleaningTests(unittest.TestCase):
    def test_strip_markdown_handles_front_matter_links_and_lists(self) -> None:
        source = """---
title: Sample
---

# Intro

Visit [Kokoro](https://example.com).

- First point
- Second point
"""
        cleaned = strip_markdown(source)
        self.assertNotIn("title:", cleaned)
        self.assertIn("Intro.", cleaned)
        self.assertIn("Visit Kokoro.", cleaned)
        self.assertIn("First point", cleaned)
        self.assertIn("Second point", cleaned)

    def test_prepare_text_trims_plain_text(self) -> None:
        cleaned = prepare_text_for_tts("  hello world  \n", ".txt")
        self.assertEqual(cleaned, "hello world")

    def test_strip_markdown_collapses_pdf_line_wraps_but_keeps_paragraphs(self) -> None:
        source = """# Intro

First line of a paragraph
continues on the next line.

Second paragraph stays separate.
"""
        cleaned = strip_markdown(source)
        self.assertIn("Intro.", cleaned)
        self.assertIn("First line of a paragraph continues on the next line.", cleaned)
        self.assertIn("\n\nSecond paragraph stays separate.", cleaned)
        self.assertNotIn("paragraph\ncontinues", cleaned)


class ChunkingTests(unittest.TestCase):
    def test_make_chunks_splits_long_sentence(self) -> None:
        text = " ".join(["sentence"] * 120)
        chunks = make_chunks(text, max_chars=120)
        self.assertGreater(len(chunks), 1)
        self.assertTrue(all(len(chunk) <= 120 for chunk in chunks))

    def test_merge_small_chunks_combines_tiny_heading_with_following_text(self) -> None:
        chunks = [
            "4.1 System Interface",
            "Dynamo stores objects associated with a key through a simple interface.",
            "Another substantial paragraph that should remain separate if needed.",
        ]
        merged = merge_small_chunks(chunks, min_chars=80, max_chars=140)
        self.assertEqual(len(merged), 2)
        self.assertIn("4.1 System Interface", merged[0])
        self.assertIn("Dynamo stores objects associated with a key", merged[0])


class OutputLayoutTests(unittest.TestCase):
    def test_build_output_dir_nests_lesson_in_base_output_dir(self) -> None:
        output_dir = build_output_dir(Path("output"), Path("lessons/fundamentals.md"))
        self.assertEqual(output_dir, Path("output/fundamentals"))

    def test_resolve_input_path_prefers_existing_caller_relative_file(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            temp_path = Path(temp)
            input_path = temp_path / "caller.md"
            input_path.write_text("hello", encoding="utf-8")

            previous_cwd = Path.cwd()
            try:
                os.chdir(temp_path)
                resolved = resolve_input_path("caller.md", project_root=Path("unused"))
            finally:
                os.chdir(previous_cwd)

        self.assertEqual(resolved, input_path)

    def test_resolve_input_path_falls_back_to_project_root(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            project_root = Path(temp)
            expected = (project_root / "lessons" / "lesson.md").resolve()
            resolved = resolve_input_path("lessons/lesson.md", project_root=project_root)

        self.assertEqual(resolved, expected)

    def test_resolve_output_dir_keeps_relative_output_under_project_root(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            project_root = Path(temp)
            resolved = resolve_output_dir("output", project_root=project_root)

        self.assertEqual(resolved, (project_root / "output").resolve())


class FfmpegResolutionTests(unittest.TestCase):
    def test_resolve_ffmpeg_rejects_missing_explicit_path(self) -> None:
        with self.assertRaises(FileNotFoundError):
            resolve_ffmpeg("C:/definitely-missing/ffmpeg.exe")

    def test_resolve_ffmpeg_uses_common_downloads_location(self) -> None:
        expected = str(Path.home() / "Downloads" / "ffmpeg" / "bin" / "ffmpeg.exe")
        with patch("audio_generation.shutil.which", return_value=None):
            with patch.object(Path, "exists", autospec=True, side_effect=lambda path: str(path) == expected):
                resolved = resolve_ffmpeg(None)
        self.assertEqual(resolved, expected)


class SynthesisTests(unittest.TestCase):
    def test_synthesize_chunks_merges_pipeline_fragments_per_outer_chunk(self) -> None:
        fake_module = ModuleType("kokoro")

        class FakePipeline:
            last_call: dict[str, object] | None = None

            def __init__(self, repo_id: str, lang_code: str) -> None:
                self.repo_id = repo_id
                self.lang_code = lang_code

            def __call__(self, chunk: str, voice: str, speed: float, split_pattern: str):
                FakePipeline.last_call = {
                    "chunk": chunk,
                    "voice": voice,
                    "speed": speed,
                    "split_pattern": split_pattern,
                }
                yield None, None, np.array([0.1, 0.2], dtype=np.float32)
                yield None, None, np.array([0.3], dtype=np.float32)

        fake_module.KPipeline = FakePipeline

        with patch.dict(sys.modules, {"kokoro": fake_module}):
            wavs = synthesize_chunks(
                chunks=["one chunk"],
                voice="af_heart",
                speed=1.0,
                repo_id="repo",
                lang_code="a",
            )

        self.assertEqual(len(wavs), 1)
        np.testing.assert_allclose(wavs[0], np.array([0.1, 0.2, 0.3], dtype=np.float32))
        self.assertEqual(FakePipeline.last_call["split_pattern"], r"\n{2,}")


if __name__ == "__main__":
    unittest.main()
