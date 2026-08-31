import path from "node:path";
import { createServerFn } from "@tanstack/react-start";

import {
  CreateLessonInputSchema,
  GenerateLessonInputSchema,
  LessonIdInputSchema,
  SaveLessonGenerationResultInputSchema,
  UpdateLessonInputSchema,
} from "../lessons.schemas";
import {
  AUDIO_MODEL_ID_MAX_LENGTH,
  AUDIO_VOICE_LANGUAGE_FILTER,
  DEFAULT_AUDIO_MODEL_ID,
} from "../lessons.constants";
import { MARKDOWN_TEXT_SUFFIX } from "@/lib/audio.constants";
import {
  getAudioModelVoices,
  getAudioModels,
  startAudioGenerationJob,
} from "@/server/audio-generator-api";
import { lessonService } from "@/server/application.server";
import { storagePaths } from "@/server/storage/paths";
import { slugify } from "@/features/shared/storage.utils";

function generationRunStem(lessonId: string, modelId: string | undefined) {
  const modelStem = slugify(modelId ?? DEFAULT_AUDIO_MODEL_ID, {
    fallback: DEFAULT_AUDIO_MODEL_ID,
    maxLength: AUDIO_MODEL_ID_MAX_LENGTH,
  });
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  return `${lessonId}-${modelStem}-${stamp}`;
}

export const getLessonDetailsFn = createServerFn({ method: "GET" })
  .validator((input) => LessonIdInputSchema.parse(input))
  .handler(({ data }) => lessonService.findById(data));

export const createLessonFn = createServerFn({ method: "POST" })
  .validator((input) => CreateLessonInputSchema.parse(input))
  .handler(async ({ data }) => ({ lesson: await lessonService.create(data) }));

export const updateLessonFn = createServerFn({ method: "POST" })
  .validator((input) => UpdateLessonInputSchema.parse(input))
  .handler(async ({ data }) => ({ lesson: await lessonService.update(data) }));

export const deleteLessonFn = createServerFn({ method: "POST" })
  .validator((input) => LessonIdInputSchema.parse(input))
  .handler(async ({ data }) => {
    await lessonService.remove(data.collectionId, data.lessonId);
    return { deleted: true };
  });

export const startLessonAudioGenerationFn = createServerFn({ method: "POST" })
  .validator((input) => GenerateLessonInputSchema.parse(input))
  .handler(async ({ data }) => {
    const lesson = await lessonService.findById(data);
    if (!lesson) {
      throw new Error(`Lesson not found: ${data.lessonId}`);
    }
    return startAudioGenerationJob({
      text: lesson.markdown,
      stem: generationRunStem(lesson.id, data.modelId),
      suffix: MARKDOWN_TEXT_SUFFIX,
      modelId: data.modelId,
      voice: data.voice,
      langCode: data.langCode,
      speed: data.speed,
      instruct: data.instruct,
      wavOnly: data.wavOnly,
      outputDir: path.join(storagePaths.storageRoot, "generated", "groups", data.collectionId),
    });
  });

export const saveLessonGenerationResultFn = createServerFn({ method: "POST" })
  .validator((input) => SaveLessonGenerationResultInputSchema.parse(input))
  .handler(async ({ data }) => ({
    generatedAudio: await lessonService.saveGeneratedAudio(
      data.collectionId,
      data.lessonId,
      data.result
    ),
  }));

export const getAvailableAudioVoicesFn = createServerFn({ method: "GET" }).handler(async () => {
  const models = await getAudioModels();
  const voicesByModel = Object.fromEntries(
    await Promise.all(
      models.models.map(
        async (model) =>
          [model.id, await getAudioModelVoices(model.id, AUDIO_VOICE_LANGUAGE_FILTER)] as const
      )
    )
  );
  return { models, voicesByModel };
});
