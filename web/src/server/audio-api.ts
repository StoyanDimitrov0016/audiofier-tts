import { z } from "zod";

import {
  GenerateAudioInputSchema,
  GenerateAudioJobStatusSchema,
  GenerateAudioResultSchema,
} from "../lib/audio-schemas";
import type { GenerateAudioInput } from "../lib/audio-types";

const DEFAULT_AUDIO_API_URL = "http://127.0.0.1:8765";

function getAudioApiUrl() {
  return process.env.AUDIO_API_URL ?? DEFAULT_AUDIO_API_URL;
}

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

export async function startAudioGenerationJob(input: GenerateAudioInput) {
  const data = validateGenerateInput(input);
  const response = await fetch(`${getAudioApiUrl()}/generate-jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return readAudioResponse(response, GenerateAudioJobStatusSchema);
}
