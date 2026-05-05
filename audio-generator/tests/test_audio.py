import os
import sys
import time
import unittest
from pathlib import Path
from types import ModuleType
from unittest.mock import patch

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"

if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

import local_runtime
from audio_generation import resolve_ffmpeg, resolve_qwen_custom_model_source, synthesize_chunks
from audio_server import (
    JOB_STORE,
    ApiError,
    GenerationJobRunner,
    ServerConfig,
    generate_from_request,
    options_from_payload,
    parse_generation_request,
)
from chunk_review import preview_chunks
from cli import build_output_dir
from generation import GenerationOptions, GenerationResult, min_chunk_chars_for_backend, sanitize_stem
from local_runtime import DEFAULT_HF_HOME, DEFAULT_TORCH_HOME, LOCAL_SOX_DIR, LOCAL_TOOLS_DIR, configure_local_runtime
from paths import resolve_cli_input_path, resolve_output_dir
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

    def test_preview_chunks_returns_cleaned_text_and_chunks(self) -> None:
        input_path = ROOT / ".test-tmp" / "chunk-review.md"
        input_path.parent.mkdir(parents=True, exist_ok=True)
        input_path.write_text("# Title\n\nA short paragraph.\n\nAnother short paragraph.", encoding="utf-8")

        cleaned, chunks = preview_chunks(input_path, max_chars=1200, min_chars=80)

        self.assertIn("Title.", cleaned)
        self.assertEqual(len(chunks), 1)
        self.assertIn("Another short paragraph.", chunks[0])

    def test_qwen_uses_larger_minimum_chunks(self) -> None:
        self.assertEqual(min_chunk_chars_for_backend("kokoro"), 140)
        self.assertEqual(min_chunk_chars_for_backend("qwen-1.7b-custom"), 600)


class OutputLayoutTests(unittest.TestCase):
    def test_build_output_dir_nests_lesson_in_base_output_dir(self) -> None:
        output_dir = build_output_dir(Path("output"), Path("lessons/fundamentals.md"))
        self.assertEqual(output_dir, Path("output/fundamentals"))

    def test_resolve_cli_input_path_prefers_existing_caller_relative_file(self) -> None:
        expected = (ROOT / "lessons" / "sample.md").resolve()
        previous_cwd = Path.cwd()
        try:
            os.chdir(ROOT)
            resolved = resolve_cli_input_path("lessons/sample.md", project_root=Path("unused"))
        finally:
            os.chdir(previous_cwd)

        self.assertEqual(resolved, expected)

    def test_resolve_cli_input_path_falls_back_to_project_root(self) -> None:
        expected = (ROOT / "lessons" / "missing.md").resolve()
        resolved = resolve_cli_input_path("lessons/missing.md", project_root=ROOT)

        self.assertEqual(resolved, expected)

    def test_resolve_output_dir_keeps_relative_output_under_project_root(self) -> None:
        resolved = resolve_output_dir("output", project_root=ROOT)

        self.assertEqual(resolved, (ROOT / "output").resolve())

    def test_sanitize_stem_keeps_output_names_path_safe(self) -> None:
        self.assertEqual(sanitize_stem("../My Lesson: 01"), "My-Lesson-01")
        self.assertEqual(sanitize_stem("   "), "lesson")


class ServerRequestTests(unittest.TestCase):
    def test_options_from_payload_uses_server_output_dir_by_default(self) -> None:
        output_dir = ROOT / "server-output"
        config = ServerConfig(host="127.0.0.1", port=8765, output_dir=output_dir)
        options = options_from_payload({"wavOnly": True, "speed": 1.05}, config)

        self.assertEqual(options.output_dir, output_dir)
        self.assertTrue(options.wav_only)
        self.assertEqual(options.speed, 1.05)

    def test_parse_generation_request_accepts_raw_text(self) -> None:
        output_dir = ROOT / "server-output"
        config = ServerConfig(host="127.0.0.1", port=8765, output_dir=output_dir)
        request = parse_generation_request(
            {
                "text": "# Hello",
                "stem": "sample",
                "suffix": ".md",
                "wavOnly": True,
            },
            config,
        )

        self.assertEqual(request.text, "# Hello")
        self.assertEqual(request.stem, "sample")
        self.assertEqual(request.suffix, ".md")
        self.assertTrue(request.options.wav_only)

    def test_options_from_payload_defaults_qwen_voice_to_ryan(self) -> None:
        output_dir = ROOT / "server-output"
        config = ServerConfig(host="127.0.0.1", port=8765, output_dir=output_dir)
        options = options_from_payload(
            {
                "backend": "qwen-0.6b-custom",
                "wavOnly": True,
            },
            config,
        )

        self.assertEqual(options.backend, "qwen-0.6b-custom")
        self.assertEqual(options.voice, "Ryan")

    def test_options_from_payload_accepts_qwen_aiden(self) -> None:
        output_dir = ROOT / "server-output"
        config = ServerConfig(host="127.0.0.1", port=8765, output_dir=output_dir)
        options = options_from_payload(
            {
                "backend": "qwen-0.6b-custom",
                "voice": "Aiden",
                "instruct": "Read evenly.",
                "wavOnly": True,
            },
            config,
        )

        self.assertEqual(options.backend, "qwen-0.6b-custom")
        self.assertEqual(options.voice, "Aiden")
        self.assertEqual(options.instruct, "Read evenly.")

    def test_options_from_payload_defaults_qwen_1_7b_voice_to_ryan(self) -> None:
        output_dir = ROOT / "server-output"
        config = ServerConfig(host="127.0.0.1", port=8765, output_dir=output_dir)
        options = options_from_payload(
            {
                "backend": "qwen-1.7b-custom",
                "wavOnly": True,
            },
            config,
        )

        self.assertEqual(options.backend, "qwen-1.7b-custom")
        self.assertEqual(options.voice, "Ryan")

    def test_parse_generation_request_rejects_unknown_qwen_speaker(self) -> None:
        output_dir = ROOT / "server-output"
        config = ServerConfig(host="127.0.0.1", port=8765, output_dir=output_dir)

        with self.assertRaisesRegex(ApiError, "Unsupported Qwen speaker"):
            parse_generation_request(
                {
                    "text": "Hello",
                    "backend": "qwen-0.6b-custom",
                    "voice": "NotRyan",
                    "wavOnly": True,
                },
                config,
            )

    def test_generate_from_request_runs_text_generation(self) -> None:
        output_dir = ROOT / "server-output"
        expected = GenerationResult(
            lesson_output_dir=output_dir / "sample",
            wav_path=output_dir / "sample" / "sample.wav",
            mp3_path=None,
            chunk_count=1,
            cleaned_character_count=12,
            duration_seconds=1.5,
            backend="kokoro",
            voice="af_heart",
            model_source="hexgrad/Kokoro-82M",
        )

        request = parse_generation_request(
            {
                "text": "# Hello",
                "stem": "sample",
                "suffix": ".md",
                "wavOnly": True,
                "outputDir": str(output_dir),
            },
            ServerConfig(host="127.0.0.1", port=8765, output_dir=output_dir),
        )

        with patch("audio_server.generate_audio_from_text", return_value=expected) as generate:
            result = generate_from_request(request)

        self.assertEqual(result, expected)
        generate.assert_called_once()
        self.assertEqual(generate.call_args.kwargs["text"], "# Hello")
        self.assertEqual(generate.call_args.kwargs["stem"], "sample")
        self.assertTrue(generate.call_args.kwargs["options"].wav_only)

    def test_parse_generation_request_requires_text(self) -> None:
        output_dir = ROOT / "server-output"
        config = ServerConfig(host="127.0.0.1", port=8765, output_dir=output_dir)

        with self.assertRaisesRegex(ApiError, "Request must include text."):
            parse_generation_request(
                {
                    "stem": "sample",
                    "suffix": ".md",
                    "wavOnly": True,
                },
                config,
            )

    def test_parse_generation_request_rejects_unsupported_fields(self) -> None:
        output_dir = ROOT / "server-output"
        config = ServerConfig(host="127.0.0.1", port=8765, output_dir=output_dir)

        with self.assertRaisesRegex(ApiError, "Unsupported request fields: repoId."):
            parse_generation_request(
                {
                    "text": "Hello",
                    "repoId": "hexgrad/Kokoro-82M",
                },
                config,
            )


class FfmpegResolutionTests(unittest.TestCase):
    def test_resolve_ffmpeg_rejects_missing_explicit_path(self) -> None:
        with self.assertRaises(FileNotFoundError):
            resolve_ffmpeg("C:/definitely-missing/ffmpeg.exe")

    def test_resolve_ffmpeg_uses_env_path(self) -> None:
        expected = (ROOT.parent / ".local-tts-ai" / "tools" / "ffmpeg.exe").resolve()
        with patch.dict("audio_generation.os.environ", {"FFMPEG_PATH": ".local-tts-ai/tools/ffmpeg.exe"}):
            with patch.object(Path, "exists", autospec=True, side_effect=lambda path: path == expected):
                resolved = resolve_ffmpeg(None)
        self.assertEqual(resolved, str(expected))

    def test_resolve_ffmpeg_uses_project_local_default(self) -> None:
        expected = ROOT.parent / ".local-tts-ai" / "tools" / "ffmpeg.exe"
        with patch.dict("audio_generation.os.environ", {"FFMPEG_PATH": ""}):
            with patch("audio_generation.shutil.which", return_value=None):
                with patch.object(Path, "exists", autospec=True, side_effect=lambda path: path == expected):
                    resolved = resolve_ffmpeg(None)
        self.assertEqual(resolved, str(expected))

    def test_resolve_ffmpeg_uses_common_downloads_location(self) -> None:
        expected = str(Path.home() / "Downloads" / "ffmpeg" / "bin" / "ffmpeg.exe")
        with patch.dict("audio_generation.os.environ", {"FFMPEG_PATH": ""}):
            with patch("audio_generation.shutil.which", return_value=None):
                with patch.object(Path, "exists", autospec=True, side_effect=lambda path: str(path) == expected):
                    resolved = resolve_ffmpeg(None)
        self.assertEqual(resolved, expected)


class LocalRuntimeTests(unittest.TestCase):
    def test_configure_local_runtime_sets_project_cache_dirs(self) -> None:
        with patch.dict("local_runtime.os.environ", {}, clear=True):
            with patch.object(Path, "mkdir", autospec=True) as mkdir:
                configure_local_runtime()

            self.assertEqual(local_runtime.os.environ["HF_HOME"], str(DEFAULT_HF_HOME))
            self.assertEqual(local_runtime.os.environ["TORCH_HOME"], str(DEFAULT_TORCH_HOME))
            self.assertEqual(mkdir.call_count, 2)

    def test_configure_local_runtime_prepends_local_tool_dirs(self) -> None:
        with patch.dict("local_runtime.os.environ", {"PATH": "C:/Windows/System32"}, clear=True):
            with patch.object(Path, "mkdir", autospec=True):
                configure_local_runtime()

            entries = local_runtime.os.environ["PATH"].split(os.pathsep)
            self.assertEqual(entries[:2], [str(LOCAL_SOX_DIR), str(LOCAL_TOOLS_DIR)])


class QwenModelResolutionTests(unittest.TestCase):
    def test_resolve_qwen_custom_model_source_uses_1_7b_env_path(self) -> None:
        expected = (ROOT.parent / ".local-tts-ai" / "models" / "qwen3-tts-1-7b-custom").resolve()
        with patch.dict("audio_generation.os.environ", {"QWEN_TTS_1_7B_MODEL_PATH": str(expected)}):
            resolved = resolve_qwen_custom_model_source("qwen-1.7b-custom")

        self.assertEqual(resolved, str(expected))

    def test_resolve_qwen_custom_model_source_uses_1_7b_default_path(self) -> None:
        expected = ROOT.parent / ".local-tts-ai" / "models" / "qwen3-tts-1-7b-custom"
        with patch.dict("audio_generation.os.environ", {}, clear=True):
            with patch.object(Path, "exists", autospec=True, side_effect=lambda path: path == expected):
                resolved = resolve_qwen_custom_model_source("qwen-1.7b-custom")

        self.assertEqual(resolved, str(expected))


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

        fake_module.__dict__["KPipeline"] = FakePipeline

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
        last_call = FakePipeline.last_call
        self.assertIsNotNone(last_call)
        assert last_call is not None
        self.assertEqual(last_call["split_pattern"], r"\n{2,}")


class GenerationBackendTests(unittest.TestCase):
    def test_generate_audio_from_cleaned_text_uses_qwen_backend(self) -> None:
        from generation import generate_audio_from_cleaned_text

        output_dir = ROOT / ".test-tmp" / "qwen-backend"
        options = GenerationOptions(
            output_dir=output_dir,
            backend="qwen-0.6b-custom",
            voice="Aiden",
            wav_only=True,
        )
        expected = [np.array([0.1, 0.2, 0.3], dtype=np.float32)]

        with patch("audio_generation.synthesize_qwen_custom_chunks", return_value=(expected, 24000)) as synthesize:
            with patch("audio_generation.save_final_wav", return_value=(output_dir / "sample" / "sample.wav", 1.0)):
                text = " ".join(
                    [
                        "This is a short Qwen paragraph.",
                        "Another short paragraph follows.",
                        "A third short paragraph should be merged.",
                    ]
                )
                result = generate_audio_from_cleaned_text(text, "sample", options)

        synthesize.assert_called_once()
        self.assertEqual(synthesize.call_args.kwargs["chunks"][0], text)
        self.assertEqual(synthesize.call_args.kwargs["speaker"], "Aiden")
        self.assertEqual(synthesize.call_args.kwargs["backend"], "qwen-0.6b-custom")
        self.assertIsNone(synthesize.call_args.kwargs["instruct"])
        self.assertEqual(result.backend, "qwen-0.6b-custom")
        self.assertEqual(result.voice, "Aiden")
        self.assertIsNotNone(result.model_source)
        self.assertIsNone(result.mp3_path)

    def test_generate_audio_from_cleaned_text_uses_qwen_1_7b_backend(self) -> None:
        from generation import generate_audio_from_cleaned_text

        output_dir = ROOT / ".test-tmp" / "qwen-1-7b-backend"
        options = GenerationOptions(
            output_dir=output_dir,
            backend="qwen-1.7b-custom",
            voice="Ryan",
            instruct="Read evenly.",
            wav_only=True,
        )
        expected = [np.array([0.1, 0.2, 0.3], dtype=np.float32)]

        with patch("audio_generation.synthesize_qwen_custom_chunks", return_value=(expected, 24000)) as synthesize:
            with patch("audio_generation.save_final_wav", return_value=(output_dir / "sample" / "sample.wav", 1.0)):
                result = generate_audio_from_cleaned_text("Hello from Qwen.", "sample", options)

        synthesize.assert_called_once()
        self.assertEqual(synthesize.call_args.kwargs["backend"], "qwen-1.7b-custom")
        self.assertEqual(synthesize.call_args.kwargs["instruct"], "Read evenly.")
        self.assertEqual(result.backend, "qwen-1.7b-custom")
        self.assertEqual(result.voice, "Ryan")
        self.assertIsNotNone(result.model_source)
        self.assertEqual(result.instruct, "Read evenly.")
        self.assertIsNone(result.mp3_path)


class GenerationJobRunnerTests(unittest.TestCase):
    def test_runner_processes_jobs_and_marks_success(self) -> None:
        runner = GenerationJobRunner(JOB_STORE, max_queued_jobs=1)
        runner.start()
        request = parse_generation_request(
            {
                "text": "Queued text",
                "stem": "queued-text",
                "suffix": ".md",
                "wavOnly": True,
                "outputDir": str(ROOT / "server-output"),
            },
            ServerConfig(host="127.0.0.1", port=8765, output_dir=ROOT / "server-output"),
        )
        job = JOB_STORE.create()
        expected = GenerationResult(
            lesson_output_dir=ROOT / "server-output" / "queued-text",
            wav_path=ROOT / "server-output" / "queued-text" / "queued-text.wav",
            mp3_path=None,
            chunk_count=1,
            cleaned_character_count=11,
            duration_seconds=1.0,
            backend="kokoro",
            voice="af_heart",
            model_source="hexgrad/Kokoro-82M",
        )

        with patch("audio_server.generate_from_request", return_value=expected):
            runner.enqueue(job.id, request)

            deadline = time.monotonic() + 2
            while time.monotonic() < deadline:
                current = JOB_STORE.get(job.id)
                if current is not None and current.status == "succeeded":
                    break
                time.sleep(0.01)
            else:
                self.fail("Timed out waiting for queued generation job to complete.")

        current = JOB_STORE.get(job.id)
        self.assertIsNotNone(current)
        assert current is not None
        self.assertEqual(current.status, "succeeded")
        self.assertIsNotNone(current.result)
        assert current.result is not None
        self.assertTrue(current.result["wavPath"].endswith("queued-text.wav"))
        JOB_STORE.delete(job.id)


if __name__ == "__main__":
    unittest.main()
