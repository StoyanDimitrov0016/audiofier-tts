import * as z from "zod";

import { GenerateAudioResultSchema } from "../../lib/audio-schemas";
import { StorageIdSchema } from "../shared/storage.schemas";
import { LESSON_TITLE_MAX_LENGTH, MIN_LESSON_ORDER } from "./lessons.constants";

const LessonBaseSchema = z.object({
  id: StorageIdSchema,
  collectionId: StorageIdSchema,
  title: z.string().min(1).max(LESSON_TITLE_MAX_LENGTH),
  order: z.number().int().min(MIN_LESSON_ORDER),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const GeneratedAudioSchema = z.compile(
  z.object({
    collectionId: StorageIdSchema,
    lessonId: StorageIdSchema,
    lessonOutputDir: z.string(),
    wavPath: z.string(),
    mp3Path: z.string().nullable(),
    chunkCount: z.number().int().nonnegative(),
    cleanedCharacterCount: z.number().int().nonnegative(),
    durationSeconds: z.number().nonnegative(),
    formattedDuration: z.string(),
    modelId: z.string().optional(),
    voice: z.string().optional(),
    modelSource: z.string().nullable().optional(),
    instruct: z.string().nullable().optional(),
    generatedAt: z.iso.datetime(),
  })
);

export const LessonSummarySchema = z.compile(
  LessonBaseSchema.extend({ generatedAudio: GeneratedAudioSchema.nullable() })
);
export const LessonSchema = z.compile(LessonSummarySchema.extend({ markdown: z.string() }));
export const LessonEditorSchema = z.compile(
  z.object({
    title: z.string().trim().min(1, "Lesson title is required.").max(LESSON_TITLE_MAX_LENGTH),
    order: z.number().int().min(MIN_LESSON_ORDER, "Order must be at least 1."),
    markdown: z.string(),
  })
);
export const CreateLessonInputSchema = z.compile(
  z.object({
    collectionId: StorageIdSchema,
    title: z.string().trim().min(1, "Lesson title is required.").max(LESSON_TITLE_MAX_LENGTH),
    order: z.number().int().min(MIN_LESSON_ORDER).optional(),
    markdown: z.string().default(""),
  })
);
export const UpdateLessonInputSchema = z.compile(
  LessonEditorSchema.extend({ collectionId: StorageIdSchema, lessonId: StorageIdSchema })
);
export const LessonIdInputSchema = z.compile(
  z.object({ collectionId: StorageIdSchema, lessonId: StorageIdSchema })
);
export const GenerateLessonInputSchema = z.compile(
  LessonIdInputSchema.extend({
    modelId: z.string().trim().min(1).optional(),
    voice: z.string().trim().min(1, "Voice is required."),
    langCode: z.string().trim().min(1).optional(),
    speed: z.number().positive(),
    instruct: z.string().trim().min(1).optional(),
    wavOnly: z.boolean(),
  })
);
export const SaveLessonGenerationResultInputSchema = z.compile(
  LessonIdInputSchema.extend({ result: GenerateAudioResultSchema })
);

export type GeneratedAudio = z.infer<typeof GeneratedAudioSchema>;
export type LessonSummary = z.infer<typeof LessonSummarySchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type LessonEditorValues = z.infer<typeof LessonEditorSchema>;
export type CreateLessonInput = z.infer<typeof CreateLessonInputSchema>;
export type UpdateLessonInput = z.infer<typeof UpdateLessonInputSchema>;
