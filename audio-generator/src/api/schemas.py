from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ApiModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class CreateAudioJobRequest(ApiModel):
    text: str
    stem: str = "lesson"
    suffix: Literal[".md", ".txt"] = ".md"
    output_dir: str | None = Field(default=None, alias="outputDir")
    model_id: str = Field(default="kokoro", alias="modelId")
    voice: str | None = None
    lang_code: str | None = Field(default=None, alias="langCode")
    speed: float = 1.0
    instruct: str | None = None
    wav_only: bool = Field(default=False, alias="wavOnly")

    @field_validator("text")
    @classmethod
    def text_must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Lesson text is required.")
        return value

    @field_validator("stem")
    @classmethod
    def stem_must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Lesson name is required.")
        return value

    @field_validator("model_id")
    @classmethod
    def model_id_must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Model is required.")
        return value

    @field_validator("voice")
    @classmethod
    def voice_must_not_be_empty(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("Voice is required.")
        return value

    @field_validator("speed")
    @classmethod
    def speed_must_be_positive(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("Speed must be greater than 0.")
        return value


class AudioGenerationResult(ApiModel):
    ok: Literal[True] = True
    lesson_output_dir: str = Field(alias="lessonOutputDir")
    wav_path: str = Field(alias="wavPath")
    mp3_path: str | None = Field(alias="mp3Path")
    chunk_count: int = Field(alias="chunkCount")
    cleaned_character_count: int = Field(alias="cleanedCharacterCount")
    duration_seconds: float = Field(alias="durationSeconds")
    formatted_duration: str = Field(alias="formattedDuration")
    model_id: str | None = Field(default=None, alias="modelId")
    voice: str | None = None
    model_source: str | None = Field(default=None, alias="modelSource")
    instruct: str | None = None


class AudioProgress(ApiModel):
    stage: str
    current: int
    total: int | None
    message: str


class AudioJobStatus(ApiModel):
    ok: Literal[True] = True
    job_id: str = Field(alias="jobId")
    status: Literal["queued", "running", "succeeded", "failed"]
    progress: AudioProgress
    result: AudioGenerationResult | None = None
    error: str | None = None


class VoiceInfo(ApiModel):
    id: str
    name: str
    lang_code: str = Field(alias="langCode")
    language: str
    gender: str
    grade: str | None = None
    model_id: str = Field(alias="modelId")


class TtsModelInfo(ApiModel):
    id: str
    name: str
    default_voice: str = Field(alias="defaultVoice")
    supports_instruct: bool = Field(alias="supportsInstruct")
    languages: list[str]


class ModelsResponse(ApiModel):
    ok: Literal[True] = True
    default_model: str = Field(alias="defaultModel")
    models: list[TtsModelInfo]


class VoicesResponse(ApiModel):
    ok: Literal[True] = True
    model_id: str = Field(alias="modelId")
    default_voice: str = Field(alias="defaultVoice")
    voices: list[VoiceInfo]


class HealthResponse(ApiModel):
    ok: Literal[True] = True
    service: str
    output_dir: str = Field(alias="outputDir")
