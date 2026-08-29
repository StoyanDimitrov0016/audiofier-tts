import type { SelectGeneratedAudio, SelectLesson } from "@/db/schema";
import type { GeneratedAudio, Lesson, LessonSummary } from "@/features/lessons/lessons.schemas";

export function toGeneratedAudio(row: SelectGeneratedAudio): GeneratedAudio {
  return {
    ...row,
    modelId: row.modelId ?? undefined,
    voice: row.voice ?? undefined,
    generatedAt: row.generatedAt.toISOString(),
  };
}

export function toLessonSummary(
  row: SelectLesson,
  audio: SelectGeneratedAudio | null
): LessonSummary {
  return {
    id: row.id,
    collectionId: row.collectionId,
    title: row.title,
    order: row.order,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    generatedAudio: audio ? toGeneratedAudio(audio) : null,
  };
}

export function toLesson(row: SelectLesson, audio: SelectGeneratedAudio | null): Lesson {
  return {
    ...toLessonSummary(row, audio),
    markdown: row.markdown,
  };
}

export const lessonMapper = { toGeneratedAudio, toLesson, toLessonSummary };
