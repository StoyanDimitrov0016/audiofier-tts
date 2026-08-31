import type { CreateLessonInput, UpdateLessonInput } from "@/features/lessons/lessons.schemas";
import type { GenerateAudioResult } from "@/lib/audio-types";
import type { LessonRepository } from "../repositories/lessons.repository.server";
import { UNIQUE_ID_SUFFIX_START } from "@/features/shared/storage.constants";
import { slugify } from "@/features/shared/storage.utils";
import { isUniqueConstraintError } from "@/db/database.errors";
import { LESSON_ID_CONSTRAINT } from "@/features/lessons/lessons.constants";

export function initLessonService(repository: LessonRepository) {
  async function create(input: CreateLessonInput) {
    const stem = slugify(input.title);
    let lessonId = stem;
    let suffix = UNIQUE_ID_SUFFIX_START;
    while (true) {
      if (await repository.exists({ collectionId: input.collectionId, lessonId })) {
        lessonId = `${stem}-${suffix}`;
        suffix += 1;
        continue;
      }
      try {
        return await repository.insertOne(lessonId, input);
      } catch (error) {
        if (!isUniqueConstraintError(error, LESSON_ID_CONSTRAINT)) {
          throw error;
        }
        lessonId = `${stem}-${suffix}`;
        suffix += 1;
      }
    }
  }

  async function update(input: UpdateLessonInput) {
    const lesson = await repository.updateOne(input);
    if (!lesson) {
      throw new Error(`Lesson not found: ${input.lessonId}`);
    }
    return lesson;
  }

  async function remove(collectionId: string, lessonId: string) {
    if (!(await repository.deleteOne({ collectionId, lessonId }))) {
      throw new Error(`Lesson not found: ${lessonId}`);
    }
  }

  function saveGeneratedAudio(collectionId: string, lessonId: string, result: GenerateAudioResult) {
    return repository.saveGeneratedAudio({ collectionId, lessonId }, result);
  }

  return {
    create,
    findAll: repository.findAll,
    findAllByCollection: repository.findAllByCollection,
    findById: repository.findById,
    remove,
    saveGeneratedAudio,
    update,
  };
}

export type LessonService = ReturnType<typeof initLessonService>;
