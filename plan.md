# Audio API Structure Plan

## Goal

Prepare the audio-generator API for model-specific text preparation, chunking, synthesis, transformation, and filesystem storage. The first architecture pass is implemented; this document now describes the current structure and the remaining extension work.

## Current Request Flow

```text
HTTP request
  -> FastAPI route
  -> Pydantic request validation
  -> JobService
  -> AudioService
  -> model registry
  -> TextPreparationService
  -> selected TTS model adapter
  -> AudioTransformService
  -> AudioRepository
  -> JobService result state
  -> Pydantic response
```

Queued generation:

```text
POST /jobs
  -> validate CreateAudioJobRequest
  -> create in-memory job
  -> enqueue request
  -> return AudioJobStatus

background worker
  -> AudioService.generate(request, progress_callback)
  -> update progress
  -> store result or error

GET /jobs/{job_id}
  -> return status/progress/result/error
```

## Public API

Target routes are now the only intended routes. This project does not preserve old API compatibility.

- `GET /health`
- `GET /models`
- `GET /models/{model_id}/voices`
- `GET /models/{model_id}/voices?language=english`
- `POST /jobs`
- `GET /jobs/{job_id}`

Public API naming uses `model`/`modelId`, not `backend`. Python code uses snake_case internally and Pydantic aliases expose camelCase JSON to the frontend.

## Current Module Structure

```text
audio-generator/src/
  app.py
  api/
    routes.py
    schemas.py
    errors.py
  domain/
    models.py
  infrastructure/
    audio_runtime.py
    local_runtime.py
    paths.py
    settings.py
  repositories/
    audio_repository.py
    voice_repository.py
  services/
    audio_service.py
    audio_transform_service.py
    generation.py
    job_service.py
    model_catalog_service.py
    text_preparation_service.py
    text_processing.py
  tts_models/
    base.py
    kokoro_model.py
    qwen_model.py
    registry.py
```

Root-level scripts remain only for executable helpers:

- `audio.py`
- `server.py`
- `src/cli.py`
- `src/chunk_review.py`
- `src/abc_generate.py`

## Layer Responsibilities

`api/routes.py`

- Owns HTTP routes.
- Converts request schemas into service calls.
- Does not contain synthesis, chunking, or filesystem persistence logic.

`api/schemas.py`

- Owns Pydantic request/response contracts.
- Uses aliases such as `modelId`, `outputDir`, `langCode`, and `wavOnly`.
- Handles request-shape validation.

`services/audio_service.py`

- Orchestrates the full audio workflow.
- Resolves model defaults.
- Selects a TTS model through the registry.
- Calls text preparation, synthesis, audio transforms, and repository persistence.

`services/text_preparation_service.py`

- Cleans text based on source suffix.
- Chunks prepared text.
- Should become the main entry point for future Kokoro/Qwen-specific normalization and chunking profiles.

`tts_models/*`

- Wrap Kokoro and Qwen synthesis behind a shared adapter interface.
- Keep heavy model loading and model-specific runtime calls outside the HTTP layer.
- Expose model descriptors through the registry.

`services/audio_transform_service.py`

- Merges generated WAV arrays.
- Inserts pauses.
- Converts WAV to MP3.
- Resolves FFmpeg through infrastructure helpers.

`repositories/audio_repository.py`

- Owns output folder creation.
- Sanitizes output stems.
- Saves final WAV files and optional chunk WAVs.

`repositories/voice_repository.py`

- Owns the voice catalog.
- Filters voices by model and language.
- Provides default voices without loading heavy TTS models.

`services/model_catalog_service.py`

- Combines the TTS model registry and voice repository.
- Powers `/models` and `/models/{model_id}/voices`.

`services/job_service.py`

- Owns in-memory job IDs, queueing, progress, results, and errors.

`infrastructure/*`

- Owns runtime configuration, local cache/tool paths, settings, low-level model loading helpers, and FFmpeg integration details.

## Package Strategy

Current recommended package set:

- `fastapi`: routing, validation integration, OpenAPI, Swagger UI.
- `uvicorn`: ASGI server.
- `pydantic`: request/response schemas through FastAPI.
- `pydantic-settings`: typed environment and server settings.
- `httpx`: FastAPI `TestClient` support.
- `typer`: worth using when the CLI scripts are cleaned up further.

Package to evaluate later:

- `pydub`: may simplify future audio transforms and MP3 export, but only adopt it if it reduces code and still works cleanly with FFmpeg and NumPy/soundfile.

Packages to avoid for now:

- Celery/RQ/Redis: too much for one local generator process.
- ORM/database: not needed while jobs are in-memory and audio files are the persistent output.
- Dependency injection framework: explicit constructors and FastAPI app state are enough.

## Remaining Work

1. Add model-specific text preparation profiles.
   - Kokoro profile: conservative paragraph/sentence chunking and any Kokoro-specific normalization.
   - Qwen profile: larger chunk defaults, chunk packing, and model-specific prompt/instruct handling.
   - Keep the public entry point in `TextPreparationService`.

2. Decide whether `services/generation.py` stays as a legacy CLI compatibility service.
   - It is now under `services/`, but it still duplicates some orchestration that `AudioService` owns.
   - Preferred next cleanup: either make CLI scripts call `AudioService`, or rename this module to make its legacy role explicit.

3. Split `infrastructure/audio_runtime.py` if it keeps growing.
   - Candidate modules: `kokoro_runtime.py`, `qwen_runtime.py`, `ffmpeg_runtime.py`, and `runtime_warnings.py`.
   - Do this when it reduces real coupling, not just for folder aesthetics.

4. Add prompt authoring files separately from runtime behavior.
   - `docs/prompts/kokoro.md`
   - `docs/prompts/qwen-0.6b-custom.md`
   - `docs/prompts/qwen-1.7b-custom.md`

5. Consider `typer` for CLI scripts.
   - Convert `cli.py`, `chunk_review.py`, and `abc_generate.py` only if we continue expanding CLI options.

## Acceptance Criteria For This Architecture Pass

- FastAPI app is available through `server.py`.
- Swagger UI is available at `/docs`.
- Frontend uses `/models`, `/models/{model_id}/voices`, `/jobs`, and `/jobs/{job_id}`.
- Public request field is `modelId`.
- Route code does not contain synthesis logic.
- `AudioService` owns orchestration.
- Kokoro and Qwen are selected through a TTS model registry.
- Voice metadata is isolated behind `VoiceRepository`.
- WAV/MP3 work is isolated behind `AudioTransformService`.
- Filesystem writes are isolated behind `AudioRepository`.
- The remaining work is model-specific text normalization/chunking, not API plumbing.
