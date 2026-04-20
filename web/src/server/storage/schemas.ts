import { z } from "zod";

import { GenerateAudioResultSchema } from "../../lib/audio-schemas";

const StorageIdSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9._-]{0,79}$/, "Use lowercase letters, numbers, dots, dashes, or underscores.");

export const CreateGroupInputSchema = z.object({
  title: z.string().trim().min(1, "Group title is required."),
  description: z.string().trim().optional().default(""),
});

export const UpdateGroupInputSchema = z.object({
  groupId: StorageIdSchema,
  title: z.string().trim().min(1, "Group title is required."),
  description: z.string().trim().optional().default(""),
});

export const DeleteGroupInputSchema = z.object({
  groupId: StorageIdSchema,
});

export const GetGroupInputSchema = z.object({
  groupId: StorageIdSchema,
});

export const CreateChapterInputSchema = z.object({
  groupId: StorageIdSchema,
  title: z.string().trim().min(1, "Chapter title is required."),
  order: z.number().int().min(1, "Order must be at least 1.").optional(),
  markdown: z.string().optional().default(""),
});

export const UpdateChapterInputSchema = z.object({
  groupId: StorageIdSchema,
  chapterId: StorageIdSchema,
  title: z.string().trim().min(1, "Chapter title is required."),
  order: z.number().int().min(1, "Order must be at least 1."),
  markdown: z.string(),
});

export const DeleteChapterInputSchema = z.object({
  groupId: StorageIdSchema,
  chapterId: StorageIdSchema,
});

export const GetChapterInputSchema = z.object({
  groupId: StorageIdSchema,
  chapterId: StorageIdSchema,
});

export const GenerateChapterInputSchema = z.object({
  groupId: StorageIdSchema,
  chapterId: StorageIdSchema,
  voice: z.string().trim().min(1, "Voice is required."),
  speed: z.number().positive("Speed must be greater than 0."),
  wavOnly: z.boolean(),
});

export const SaveChapterGenerationResultInputSchema = z.object({
  groupId: StorageIdSchema,
  chapterId: StorageIdSchema,
  result: GenerateAudioResultSchema,
});

export const AudioGroupSchema = z.object({
  id: StorageIdSchema,
  title: z.string(),
  description: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const GeneratedAudioSchema = z.object({
  groupId: StorageIdSchema,
  chapterId: StorageIdSchema,
  lessonOutputDir: z.string(),
  wavPath: z.string(),
  mp3Path: z.string().nullable(),
  chunkCount: z.number(),
  cleanedCharacterCount: z.number(),
  durationSeconds: z.number(),
  formattedDuration: z.string(),
  generatedAt: z.string(),
});

export const ChapterMetaSchema = z.object({
  id: StorageIdSchema,
  groupId: StorageIdSchema,
  title: z.string(),
  order: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
