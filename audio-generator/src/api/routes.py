from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from api.schemas import (
    AudioJobStatus,
    CreateAudioJobRequest,
    HealthResponse,
    ModelsResponse,
    VoicesResponse,
)
from services.job_service import JobService, job_to_payload
from services.model_catalog_service import ModelCatalogService

router = APIRouter()


def get_job_service(request: Request) -> JobService:
    return request.app.state.job_service


def get_model_catalog_service(request: Request) -> ModelCatalogService:
    return request.app.state.model_catalog_service


JobServiceDependency = Annotated[JobService, Depends(get_job_service)]
ModelCatalogDependency = Annotated[ModelCatalogService, Depends(get_model_catalog_service)]


@router.get("/health", response_model=HealthResponse, response_model_by_alias=True)
def health(request: Request) -> dict[str, object]:
    return {
        "ok": True,
        "service": "audiofier-tts",
        "outputDir": str(request.app.state.settings.resolved_output_dir),
    }


@router.get("/models", response_model=ModelsResponse, response_model_by_alias=True)
def list_models(catalog: ModelCatalogDependency) -> dict[str, object]:
    return {"ok": True, **catalog.list_models()}


@router.get("/models/{model_id}/voices", response_model=VoicesResponse, response_model_by_alias=True)
def list_model_voices(
    model_id: str,
    catalog: ModelCatalogDependency,
    language: str | None = Query(default=None),
) -> dict[str, object]:
    return {"ok": True, **catalog.list_voices(model_id, language=language)}


@router.post("/jobs", response_model=AudioJobStatus, response_model_by_alias=True, status_code=status.HTTP_202_ACCEPTED)
def create_job(request: CreateAudioJobRequest, job_service: JobServiceDependency) -> dict[str, object]:
    job = job_service.create_job(request)
    return {"ok": True, **job_to_payload(job)}


@router.get("/jobs/{job_id}", response_model=AudioJobStatus, response_model_by_alias=True)
def get_job(job_id: str, job_service: JobServiceDependency) -> dict[str, object]:
    job = job_service.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Audio job was not found: {job_id}")
    return {"ok": True, **job_to_payload(job)}
