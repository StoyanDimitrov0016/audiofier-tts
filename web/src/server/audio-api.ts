import { z } from "zod";

import type { GenerateAudioInput, GenerateAudioResult } from "../lib/audio-types";

const DEFAULT_AUDIO_API_URL = "http://127.0.0.1:8765";

function getAudioApiUrl() {
  return process.env.AUDIO_API_URL ?? DEFAULT_AUDIO_API_URL;
}

const GenerateAudioInputSchema = z.object({
  text: z.string().refine((value) => value.trim().length > 0, "Lesson text is required."),
  stem: z.string().trim().min(1, "Lesson name is required."),
  suffix: z.enum([".md", ".txt"]),
  voice: z.string().trim().min(1, "Voice is required."),
  speed: z.number().positive("Speed must be greater than 0."),
  wavOnly: z.boolean(),
  outputDir: z.string().trim().min(1).optional(),
}) satisfies z.ZodType<GenerateAudioInput>;

const GenerateAudioResultSchema = z.object({
  ok: z.literal(true),
  lessonOutputDir: z.string(),
  wavPath: z.string(),
  mp3Path: z.string().nullable(),
  chunkCount: z.number(),
  cleanedCharacterCount: z.number(),
  durationSeconds: z.number(),
  formattedDuration: z.string(),
}) satisfies z.ZodType<GenerateAudioResult>;

const AudioApiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
});

function validateGenerateInput(input: unknown): GenerateAudioInput {
  return GenerateAudioInputSchema.parse(input);
}

async function readAudioResponse<T extends object>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const payload = (await response.json()) as unknown;
  const apiError = AudioApiErrorSchema.safeParse(payload);

  if (!response.ok) {
    throw new Error(apiError.success ? apiError.data.error : `Audio API returned ${response.status}`);
  }

  if (apiError.success) {
    throw new Error(apiError.data.error);
  }

  return schema.parse(payload);
}

export async function callAudioGeneration(input: GenerateAudioInput) {
  const data = validateGenerateInput(input);
  const response = await fetch(`${getAudioApiUrl()}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return readAudioResponse(response, GenerateAudioResultSchema);
}
