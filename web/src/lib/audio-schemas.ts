import * as z from "zod";

import {
  AUDIO_IDENTIFIER_MAX_LENGTH,
  FORMATTED_DURATION_MAX_LENGTH,
  SUPPORTED_TEXT_SUFFIXES,
} from "./audio.constants";

export const GenerateAudioInputSchema = z.compile(
  z.object({
    text: z.string().trim().min(1, "Lesson text is required."),
    stem: z.string().trim().min(1, "Lesson name is required."),
    suffix: z.enum(SUPPORTED_TEXT_SUFFIXES),
    modelId: z.string().trim().min(1, "Model is required.").optional(),
    voice: z.string().trim().min(1, "Voice is required."),
    langCode: z.string().trim().min(1, "Language code is required.").optional(),
    speed: z.number().positive("Speed must be greater than 0."),
    instruct: z.string().trim().min(1).optional(),
    wavOnly: z.boolean(),
    outputDir: z.string().trim().min(1).optional(),
  })
);

export const GenerateAudioResultSchema = z.compile(
  z.object({
    ok: z.literal(true),
    lessonOutputDir: z.string(),
    wavPath: z.string(),
    mp3Path: z.string().nullable(),
    chunkCount: z.number().int().nonnegative(),
    cleanedCharacterCount: z.number().int().nonnegative(),
    durationSeconds: z.number().nonnegative(),
    formattedDuration: z.string().max(FORMATTED_DURATION_MAX_LENGTH),
    modelId: z.string().max(AUDIO_IDENTIFIER_MAX_LENGTH).optional(),
    voice: z.string().max(AUDIO_IDENTIFIER_MAX_LENGTH).optional(),
    modelSource: z.string().nullable().optional(),
    instruct: z.string().nullable().optional(),
  })
);

export const GenerateAudioProgressSchema = z.compile(
  z.object({
    stage: z.string(),
    current: z.number().int().nonnegative(),
    total: z.number().int().nonnegative().nullable(),
    message: z.string(),
  })
);

export const GenerateAudioJobStatusSchema = z.compile(
  z.object({
    ok: z.literal(true),
    jobId: z.string(),
    status: z.enum(["queued", "running", "succeeded", "failed"]),
    progress: GenerateAudioProgressSchema,
    result: GenerateAudioResultSchema.nullable(),
    error: z.string().nullable(),
  })
);

export const AudioVoiceSchema = z.compile(
  z.object({
    id: z.string(),
    name: z.string(),
    langCode: z.string(),
    language: z.string(),
    gender: z.string(),
    grade: z.string().nullable(),
    modelId: z.string(),
  })
);

export const AudioModelSchema = z.compile(
  z.object({
    id: z.string(),
    name: z.string(),
    defaultVoice: z.string(),
    supportsInstruct: z.boolean(),
    languages: z.array(z.string()),
  })
);

export const AudioModelsResponseSchema = z.compile(
  z.object({ ok: z.literal(true), defaultModel: z.string(), models: z.array(AudioModelSchema) })
);
export const AudioVoicesResponseSchema = z.compile(
  z.object({
    ok: z.literal(true),
    modelId: z.string(),
    defaultVoice: z.string(),
    voices: z.array(AudioVoiceSchema),
  })
);
