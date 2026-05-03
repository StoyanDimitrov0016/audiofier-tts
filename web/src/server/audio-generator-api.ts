import { z } from "zod";

import { AudioVoicesResponseSchema, GenerateAudioInputSchema, GenerateAudioJobStatusSchema } from "../lib/audio-schemas";
import type { GenerateAudioInput } from "../lib/audio-types";

const DEFAULT_AUDIO_GENERATOR_URL = "http://127.0.0.1:8765";

function getAudioGeneratorUrl() {
  return process.env.AUDIO_GENERATOR_URL ?? DEFAULT_AUDIO_GENERATOR_URL;
}

const AudioGeneratorApiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
});

function validateGenerateInput(input: unknown): GenerateAudioInput {
  return GenerateAudioInputSchema.parse(input);
}

async function readAudioResponse<T extends object>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const payload = (await response.json()) as unknown;
  const apiError = AudioGeneratorApiErrorSchema.safeParse(payload);

  if (!response.ok) {
    throw new Error(apiError.success ? apiError.data.error : `Audio generator returned ${response.status}`);
  }

  if (apiError.success) {
    throw new Error(apiError.data.error);
  }

  return schema.parse(payload);
}

export async function startAudioGenerationJob(input: GenerateAudioInput) {
  const data = validateGenerateInput(input);
  const response = await fetch(`${getAudioGeneratorUrl()}/generate-jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return readAudioResponse(response, GenerateAudioJobStatusSchema);
}

export async function getAudioVoices() {
  const response = await fetch(`${getAudioGeneratorUrl()}/voices`);
  return readAudioResponse(response, AudioVoicesResponseSchema);
}
