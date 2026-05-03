import { z } from "zod";

import { GenerateAudioJobStatusSchema } from "./audio-schemas";

const DEFAULT_AUDIO_GENERATOR_URL = "http://127.0.0.1:8765";

function getAudioGeneratorUrl() {
  return import.meta.env.VITE_AUDIO_GENERATOR_URL ?? DEFAULT_AUDIO_GENERATOR_URL;
}

const AudioGeneratorApiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
});

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

export async function getAudioGenerationJob(jobId: string) {
  const response = await fetch(`${getAudioGeneratorUrl()}/generate-jobs/${jobId}`);
  return readAudioResponse(response, GenerateAudioJobStatusSchema);
}
