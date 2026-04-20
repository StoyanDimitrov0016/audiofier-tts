import { z } from "zod";

export const GenerateAudioInputSchema = z.object({
  text: z.string().refine((value) => value.trim().length > 0, "Lesson text is required."),
  stem: z.string().trim().min(1, "Lesson name is required."),
  suffix: z.enum([".md", ".txt"]),
  voice: z.string().trim().min(1, "Voice is required."),
  speed: z.number().positive("Speed must be greater than 0."),
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
