import type { z } from "zod";

import type {
  GenerateAudioInputSchema,
  GenerateAudioJobStatusSchema,
  GenerateAudioProgressSchema,
  GenerateAudioResultSchema,
} from "./audio-schemas";

export type GenerateAudioInput = z.infer<typeof GenerateAudioInputSchema>;

export type GenerateAudioResult = z.infer<typeof GenerateAudioResultSchema>;

export type GenerateAudioProgress = z.infer<typeof GenerateAudioProgressSchema>;

export type GenerateAudioJobStatus = z.infer<typeof GenerateAudioJobStatusSchema>;
