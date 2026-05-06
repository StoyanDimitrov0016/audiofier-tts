import { z } from "zod";

export const GenerateAudioInputSchema = z.object({
  text: z.string().refine((value) => value.trim().length > 0, "Lesson text is required."),
  stem: z.string().trim().min(1, "Lesson name is required."),
  suffix: z.enum([".md", ".txt"]),
  modelId: z.string().trim().min(1, "Model is required.").optional(),
  voice: z.string().trim().min(1, "Voice is required."),
  langCode: z.string().trim().min(1, "Language code is required.").optional(),
  speed: z.number().positive("Speed must be greater than 0."),
  instruct: z.string().trim().min(1).optional(),
  wavOnly: z.boolean(),
  outputDir: z.string().trim().min(1).optional(),
});

export const GenerateAudioResultSchema = z.object({
  ok: z.literal(true),
  lessonOutputDir: z.string(),
  wavPath: z.string(),
  mp3Path: z.string().nullable(),
  chunkCount: z.number(),
  cleanedCharacterCount: z.number(),
  durationSeconds: z.number(),
  formattedDuration: z.string(),
  modelId: z.string().optional(),
  voice: z.string().optional(),
  modelSource: z.string().nullable().optional(),
  instruct: z.string().nullable().optional(),
});

export const GenerateAudioProgressSchema = z.object({
  stage: z.string(),
  current: z.number(),
  total: z.number().nullable(),
  message: z.string(),
});

export const GenerateAudioJobStatusSchema = z.object({
  ok: z.literal(true),
  jobId: z.string(),
  status: z.enum(["queued", "running", "succeeded", "failed"]),
  progress: GenerateAudioProgressSchema,
  result: GenerateAudioResultSchema.nullable(),
  error: z.string().nullable(),
});

export const AudioVoiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  langCode: z.string(),
  language: z.string(),
  gender: z.string(),
  grade: z.string().nullable(),
  modelId: z.string(),
});

export const AudioModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  defaultVoice: z.string(),
  supportsInstruct: z.boolean(),
  languages: z.array(z.string()),
});

export const AudioModelsResponseSchema = z.object({
  ok: z.literal(true),
  defaultModel: z.string(),
  models: z.array(AudioModelSchema),
});

export const AudioVoicesResponseSchema = z.object({
  ok: z.literal(true),
  modelId: z.string(),
  defaultVoice: z.string(),
  voices: z.array(AudioVoiceSchema),
});

export const AudioModelCatalogSchema = z.object({
  models: AudioModelsResponseSchema,
  voicesByModel: z.record(z.string(), AudioVoicesResponseSchema),
});
