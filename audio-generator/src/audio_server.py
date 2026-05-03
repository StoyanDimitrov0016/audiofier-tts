from __future__ import annotations

import argparse
import json
import queue
import sys
import threading
import traceback
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from generation import (
    DEFAULT_LANG_CODE,
    DEFAULT_VOICE,
    GenerationOptions,
    GenerationResult,
    generate_audio_from_text,
    validate_generation_options,
)
from paths import PROJECT_ROOT, resolve_output_dir
from voices import DEFAULT_VOICE_ID, list_voices

MAX_REQUEST_BYTES = 2_000_000
MAX_QUEUED_JOBS = 8
SUPPORTED_GENERATION_REQUEST_KEYS = frozenset(
    {
        "langCode",
        "outputDir",
        "speed",
        "stem",
        "suffix",
        "text",
        "voice",
        "wavOnly",
    }
)


@dataclass(frozen=True)
class ServerConfig:
    host: str
    port: int
    output_dir: Path


@dataclass
class GenerationJob:
    id: str
    status: str
    progress: dict[str, Any]
    result: dict[str, Any] | None = None
    error: str | None = None


class JobStore:
    def __init__(self) -> None:
        self._jobs: dict[str, GenerationJob] = {}
        self._lock = threading.Lock()

    def create(self) -> GenerationJob:
        job = GenerationJob(
            id=uuid.uuid4().hex,
            status="queued",
            progress={
                "stage": "queued",
                "current": 0,
                "total": None,
                "message": "Waiting to start.",
            },
        )
        with self._lock:
            self._jobs[job.id] = job
        return job

    def delete(self, job_id: str) -> None:
        with self._lock:
            self._jobs.pop(job_id, None)

    def update(
        self,
        job_id: str,
        *,
        status: str | None = None,
        progress: dict[str, Any] | None = None,
        result: dict[str, Any] | None = None,
        error: str | None = None,
    ) -> None:
        with self._lock:
            job = self._jobs[job_id]
            if status is not None:
                job.status = status
            if progress is not None:
                job.progress = progress
            if result is not None:
                job.result = result
            if error is not None:
                job.error = error

    def get(self, job_id: str) -> GenerationJob | None:
        with self._lock:
            return self._jobs.get(job_id)


JOB_STORE = JobStore()


@dataclass(frozen=True)
class GenerationRequest:
    text: str
    stem: str
    suffix: str
    options: GenerationOptions


class ApiError(Exception):
    def __init__(self, status: HTTPStatus, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.message = message


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the local Audiofier TTS HTTP service.")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind. Defaults to local-only.")
    parser.add_argument("--port", type=int, default=8765, help="Port to listen on.")
    parser.add_argument("--output-dir", default="output", help="Base folder for generated audio output.")
    return parser.parse_args()


def get_bool(payload: dict[str, Any], key: str, default: bool) -> bool:
    value = payload.get(key, default)
    if isinstance(value, bool):
        return value
    raise ApiError(HTTPStatus.BAD_REQUEST, f"{key} must be a boolean.")


def get_float(payload: dict[str, Any], key: str, default: float) -> float:
    value = payload.get(key, default)
    if isinstance(value, bool):
        raise ApiError(HTTPStatus.BAD_REQUEST, f"{key} must be a number.")
    try:
        return float(value)
    except (TypeError, ValueError):
        raise ApiError(HTTPStatus.BAD_REQUEST, f"{key} must be a number.") from None


def get_optional_string(payload: dict[str, Any], key: str) -> str | None:
    value = payload.get(key)
    if value is None:
        return None
    if isinstance(value, str):
        return value
    raise ApiError(HTTPStatus.BAD_REQUEST, f"{key} must be a string.")


def get_string(payload: dict[str, Any], key: str, default: str | None = None) -> str:
    value = payload.get(key, default)
    if isinstance(value, str):
        return value
    raise ApiError(HTTPStatus.BAD_REQUEST, f"{key} must be a string.")


def validate_payload_keys(payload: dict[str, Any]) -> None:
    unexpected = sorted(set(payload).difference(SUPPORTED_GENERATION_REQUEST_KEYS))

    if unexpected:
        raise ApiError(HTTPStatus.BAD_REQUEST, f"Unsupported request fields: {', '.join(unexpected)}.")


def options_from_payload(payload: dict[str, Any], config: ServerConfig) -> GenerationOptions:
    output_dir_value = get_string(payload, "outputDir", str(config.output_dir))
    options = GenerationOptions(
        output_dir=resolve_output_dir(output_dir_value),
        voice=get_string(payload, "voice", DEFAULT_VOICE),
        speed=get_float(payload, "speed", 1.0),
        lang_code=get_string(payload, "langCode", DEFAULT_LANG_CODE),
        wav_only=get_bool(payload, "wavOnly", False),
    )
    validate_generation_options(options)
    return options


def display_path(path: Path | None) -> str | None:
    if path is None:
        return None
    resolved = path.resolve()
    try:
        return str(resolved.relative_to(PROJECT_ROOT))
    except ValueError:
        return str(resolved)


def result_to_payload(result: GenerationResult) -> dict[str, Any]:
    return {
        "ok": True,
        "lessonOutputDir": display_path(result.lesson_output_dir),
        "wavPath": display_path(result.wav_path),
        "mp3Path": display_path(result.mp3_path),
        "chunkCount": result.chunk_count,
        "cleanedCharacterCount": result.cleaned_character_count,
        "durationSeconds": result.duration_seconds,
        "formattedDuration": result.formatted_duration,
    }


def parse_generation_request(payload: dict[str, Any], config: ServerConfig) -> GenerationRequest:
    validate_payload_keys(payload)
    text = get_optional_string(payload, "text")

    if text is None:
        raise ApiError(HTTPStatus.BAD_REQUEST, "Request must include text.")

    return GenerationRequest(
        text=text,
        stem=get_string(payload, "stem", "lesson"),
        suffix=get_string(payload, "suffix", ".md"),
        options=options_from_payload(payload, config),
    )


def generate_from_request(
    request: GenerationRequest,
    progress_callback: Callable[[dict[str, Any]], None] | None = None,
) -> GenerationResult:
    return generate_audio_from_text(
        text=request.text,
        stem=request.stem,
        suffix=request.suffix,
        options=request.options,
        progress_callback=progress_callback,
    )


class GenerationJobRunner:
    def __init__(self, job_store: JobStore, *, max_queued_jobs: int = MAX_QUEUED_JOBS) -> None:
        self._job_store = job_store
        self._queue: queue.Queue[tuple[str, GenerationRequest]] = queue.Queue(maxsize=max_queued_jobs)
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread is not None and self._thread.is_alive():
            return

        self._thread = threading.Thread(target=self._work_loop, name="audiofier-job-runner", daemon=True)
        self._thread.start()

    def enqueue(self, job_id: str, request: GenerationRequest) -> None:
        try:
            self._queue.put_nowait((job_id, request))
        except queue.Full as error:
            raise ApiError(
                HTTPStatus.SERVICE_UNAVAILABLE,
                "Audio generation queue is full. Wait for current jobs to finish and try again.",
            ) from error

        queued_ahead = max(0, self._queue.qsize() - 1)
        message = "Waiting to start." if queued_ahead == 0 else f"Queued behind {queued_ahead} job(s)."
        self._job_store.update(
            job_id,
            progress={
                "stage": "queued",
                "current": 0,
                "total": None,
                "message": message,
            },
        )

    def _work_loop(self) -> None:
        while True:
            job_id, request = self._queue.get()
            try:
                self._run_job(job_id, request)
            finally:
                self._queue.task_done()

    def _run_job(self, job_id: str, request: GenerationRequest) -> None:
        def update_progress(progress: dict[str, Any]) -> None:
            self._job_store.update(job_id, status="running", progress=progress)

        try:
            self._job_store.update(
                job_id,
                status="running",
                progress={
                    "stage": "starting",
                    "current": 0,
                    "total": None,
                    "message": "Starting audio generation.",
                },
            )
            result = generate_from_request(request, progress_callback=update_progress)
            self._job_store.update(
                job_id,
                status="succeeded",
                progress={
                    "stage": "complete",
                    "current": result.chunk_count,
                    "total": result.chunk_count,
                    "message": "Audio generation complete.",
                },
                result=result_to_payload(result),
            )
        except Exception as error:
            traceback.print_exc()
            self._job_store.update(
                job_id,
                status="failed",
                progress={
                    "stage": "failed",
                    "current": 0,
                    "total": None,
                    "message": str(error),
                },
                error=str(error),
            )


def make_handler(config: ServerConfig, runner: GenerationJobRunner) -> type[BaseHTTPRequestHandler]:
    class AudioRequestHandler(BaseHTTPRequestHandler):
        server_version = "AudiofierTTS/1.0"

        def do_OPTIONS(self) -> None:
            self.send_response(HTTPStatus.NO_CONTENT.value)
            self.write_cors_headers()
            self.end_headers()

        def do_GET(self) -> None:
            parsed_path = urlparse(self.path)

            if self.path == "/health":
                self.write_json(
                    HTTPStatus.OK,
                    {
                        "ok": True,
                        "service": "audiofier-tts",
                        "outputDir": display_path(config.output_dir),
                    },
                )
                return

            if self.path == "/voices":
                self.write_json(
                    HTTPStatus.OK,
                    {
                        "ok": True,
                        "defaultVoice": DEFAULT_VOICE_ID,
                        "voices": list_voices(),
                    },
                )
                return

            job_id = parsed_path.path.removeprefix("/generate-jobs/")
            if parsed_path.path.startswith("/generate-jobs/") and job_id:
                job = JOB_STORE.get(job_id)

                if job is None:
                    self.write_json(
                        HTTPStatus.OK,
                        {
                            "ok": True,
                            "jobId": job_id,
                            "status": "failed",
                            "progress": {
                                "stage": "failed",
                                "current": 0,
                                "total": None,
                                "message": "Generation job was not found. Restart the generation.",
                            },
                            "result": None,
                            "error": "Generation job was not found. Restart the generation.",
                        },
                    )
                    return

                self.write_json(
                    HTTPStatus.OK,
                    {
                        "ok": True,
                        "jobId": job.id,
                        "status": job.status,
                        "progress": job.progress,
                        "result": job.result,
                        "error": job.error,
                    },
                )
                return

            self.write_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "Not found."})

        def do_POST(self) -> None:
            if self.path == "/generate-jobs":
                try:
                    payload = self.read_json()
                    request = parse_generation_request(payload, config)
                    job = JOB_STORE.create()
                    try:
                        runner.enqueue(job.id, request)
                    except Exception:
                        JOB_STORE.delete(job.id)
                        raise
                    self.write_json(
                        HTTPStatus.ACCEPTED,
                        {
                            "ok": True,
                            "jobId": job.id,
                            "status": job.status,
                            "progress": job.progress,
                            "result": job.result,
                            "error": job.error,
                        },
                    )
                except ApiError as error:
                    self.write_json(error.status, {"ok": False, "error": error.message})
                except Exception as error:
                    traceback.print_exc()
                    self.write_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"ok": False, "error": str(error)})
                return

            self.write_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "Not found."})

        def read_json(self) -> dict[str, Any]:
            content_length = self.headers.get("Content-Length")
            if content_length is None:
                raise ApiError(HTTPStatus.BAD_REQUEST, "Missing Content-Length header.")

            try:
                size = int(content_length)
            except ValueError:
                raise ApiError(HTTPStatus.BAD_REQUEST, "Invalid Content-Length header.") from None

            if size > MAX_REQUEST_BYTES:
                raise ApiError(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "Request body is too large.")

            raw = self.rfile.read(size)
            try:
                payload = json.loads(raw.decode("utf-8"))
            except json.JSONDecodeError as error:
                raise ApiError(HTTPStatus.BAD_REQUEST, f"Invalid JSON: {error.msg}.") from None

            if not isinstance(payload, dict):
                raise ApiError(HTTPStatus.BAD_REQUEST, "Request body must be a JSON object.")

            return payload

        def write_json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
            body = json.dumps(payload, indent=2).encode("utf-8")
            try:
                self.send_response(status.value)
                self.write_cors_headers()
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError, TimeoutError):
                return

        def write_cors_headers(self) -> None:
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")

        def log_message(self, format: str, *args: Any) -> None:
            print(f"{self.address_string()} - {format % args}")

    return AudioRequestHandler


def run_server(config: ServerConfig) -> None:
    runner = GenerationJobRunner(JOB_STORE)
    runner.start()
    handler = make_handler(config, runner)
    server = ThreadingHTTPServer((config.host, config.port), handler)
    print(f"Audiofier TTS server listening on http://{config.host}:{config.port}")
    print(f"Output directory: {config.output_dir}")
    print(f"Python executable: {sys.executable}")
    server.serve_forever()


def main() -> None:
    args = parse_args()
    config = ServerConfig(
        host=args.host,
        port=args.port,
        output_dir=resolve_output_dir(args.output_dir),
    )
    run_server(config)
