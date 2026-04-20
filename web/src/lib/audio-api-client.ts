import { z } from "zod";

import { GenerateAudioJobStatusSchema } from "./audio-schemas";

const DEFAULT_AUDIO_API_URL = "http://127.0.0.1:8765";

function getAudioApiUrl() {
  return import.meta.env.VITE_AUDIO_API_URL ?? DEFAULT_AUDIO_API_URL;
}

const AudioApiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
});

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

export async function getAudioGenerationJob(jobId: string) {
  const response = await fetch(`${getAudioApiUrl()}/generate-jobs/${jobId}`);
  return readAudioResponse(response, GenerateAudioJobStatusSchema);
}
