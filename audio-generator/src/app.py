from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.errors import add_error_handlers
from api.routes import router
from infrastructure.local_runtime import configure_local_runtime
from infrastructure.settings import AudioApiSettings, get_settings
from services.job_service import JobService
from services.model_catalog_service import ModelCatalogService


def create_app(settings: AudioApiSettings | None = None) -> FastAPI:
    configure_local_runtime()
    resolved_settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.job_service.start()
        yield

    app = FastAPI(title="Audiofier TTS API", version="1.0.0", lifespan=lifespan)
    app.state.settings = resolved_settings
    app.state.model_catalog_service = ModelCatalogService()
    app.state.job_service = JobService(
        output_dir=resolved_settings.resolved_output_dir,
        max_queued_jobs=resolved_settings.max_queued_jobs,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )
    add_error_handlers(app)
    app.include_router(router)

    return app


app = create_app()
