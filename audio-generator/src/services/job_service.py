from __future__ import annotations

import queue
import threading
import traceback
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol

from api.schemas import CreateAudioJobRequest
from services.audio_service import AudioService
from services.generation import GenerationResult


class AudioGenerator(Protocol):
    def generate(
        self,
        *,
        text: str,
        stem: str,
        suffix: str,
        output_dir: Path,
        model_id: str,
        voice: str | None,
        lang_code: str | None,
        speed: float,
        instruct: str | None,
        wav_only: bool,
        progress_callback: Any,
    ) -> GenerationResult: ...


@dataclass
class AudioJob:
    id: str
    status: str
    progress: dict[str, Any]
    result: dict[str, Any] | None = None
    error: str | None = None


class JobStore:
    def __init__(self) -> None:
        self._jobs: dict[str, AudioJob] = {}
        self._lock = threading.Lock()

    def create(self) -> AudioJob:
        job = AudioJob(
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

    def get(self, job_id: str) -> AudioJob | None:
        with self._lock:
            return self._jobs.get(job_id)


class JobService:
    def __init__(
        self,
        *,
        output_dir: Path,
        audio_service: AudioGenerator | None = None,
        max_queued_jobs: int = 8,
    ) -> None:
        self._output_dir = output_dir
        self._audio_service = audio_service or AudioService()
        self._store = JobStore()
        self._queue: queue.Queue[tuple[str, CreateAudioJobRequest]] = queue.Queue(maxsize=max_queued_jobs)
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread is not None and self._thread.is_alive():
            return
        self._thread = threading.Thread(target=self._work_loop, name="audiofier-job-runner", daemon=True)
        self._thread.start()

    def create_job(self, request: CreateAudioJobRequest) -> AudioJob:
        job = self._store.create()
        try:
            self._queue.put_nowait((job.id, request))
        except queue.Full as error:
            self._store.update(
                job.id,
                status="failed",
                progress={
                    "stage": "failed",
                    "current": 0,
                    "total": None,
                    "message": "Audio generation queue is full. Wait for current jobs to finish and try again.",
                },
                error="Audio generation queue is full. Wait for current jobs to finish and try again.",
            )
            raise RuntimeError(
                "Audio generation queue is full. Wait for current jobs to finish and try again."
            ) from error

        queued_ahead = max(0, self._queue.qsize() - 1)
        message = "Waiting to start." if queued_ahead == 0 else f"Queued behind {queued_ahead} job(s)."
        self._store.update(
            job.id,
            progress={
                "stage": "queued",
                "current": 0,
                "total": None,
                "message": message,
            },
        )
        return job

    def get_job(self, job_id: str) -> AudioJob | None:
        return self._store.get(job_id)

    def _work_loop(self) -> None:
        while True:
            job_id, request = self._queue.get()
            try:
                self._run_job(job_id, request)
            finally:
                self._queue.task_done()

    def _run_job(self, job_id: str, request: CreateAudioJobRequest) -> None:
        def update_progress(progress: dict[str, Any]) -> None:
            self._store.update(job_id, status="running", progress=progress)

        try:
            self._store.update(
                job_id,
                status="running",
                progress={
                    "stage": "starting",
                    "current": 0,
                    "total": None,
                    "message": "Starting audio generation.",
                },
            )
            result = self._audio_service.generate(
                text=request.text,
                stem=request.stem,
                suffix=request.suffix,
                output_dir=Path(request.output_dir) if request.output_dir is not None else self._output_dir,
                model_id=request.model_id,
                voice=request.voice,
                lang_code=request.lang_code,
                speed=request.speed,
                instruct=request.instruct,
                wav_only=request.wav_only,
                progress_callback=update_progress,
            )
            self._store.update(
                job_id,
                status="succeeded",
                progress={
                    "stage": "complete",
                    "current": result.chunk_count,
                    "total": result.chunk_count,
                    "message": "Audio generation complete.",
                },
                result=generation_result_to_payload(result),
            )
        except Exception as error:
            traceback.print_exc()
            self._store.update(
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


def generation_result_to_payload(result: GenerationResult) -> dict[str, Any]:
    return {
        "lessonOutputDir": str(result.lesson_output_dir),
        "wavPath": str(result.wav_path),
        "mp3Path": str(result.mp3_path) if result.mp3_path else None,
        "chunkCount": result.chunk_count,
        "cleanedCharacterCount": result.cleaned_character_count,
        "durationSeconds": result.duration_seconds,
        "formattedDuration": result.formatted_duration,
        "modelId": result.model_id,
        "voice": result.voice,
        "modelSource": result.model_source,
        "instruct": result.instruct,
    }


def job_to_payload(job: AudioJob) -> dict[str, Any]:
    return {
        "jobId": job.id,
        "status": job.status,
        "progress": job.progress,
        "result": job.result,
        "error": job.error,
    }
