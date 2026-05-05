import { createServerFn } from "@tanstack/react-start";

import { getAudioVoices, startAudioGenerationJob } from "./audio-generator-api";
import {
  CreateChapterInputSchema,
  CreateGroupInputSchema,
  DeleteChapterInputSchema,
  DeleteGroupInputSchema,
  GenerateChapterInputSchema,
  GetChapterInputSchema,
  GetGroupInputSchema,
  SaveChapterGenerationResultInputSchema,
  UpdateChapterInputSchema,
  UpdateGroupInputSchema,
} from "../lib/lesson-schemas";

function parseCreateGroupInput(input: unknown) {
  return CreateGroupInputSchema.parse(input);
}

function parseUpdateGroupInput(input: unknown) {
  return UpdateGroupInputSchema.parse(input);
}

function parseDeleteGroupInput(input: unknown) {
  return DeleteGroupInputSchema.parse(input);
}

function parseGetGroupInput(input: unknown) {
  return GetGroupInputSchema.parse(input);
}

function parseCreateChapterInput(input: unknown) {
  return CreateChapterInputSchema.parse(input);
}

function parseUpdateChapterInput(input: unknown) {
  return UpdateChapterInputSchema.parse(input);
}

function parseDeleteChapterInput(input: unknown) {
  return DeleteChapterInputSchema.parse(input);
}

function parseGetChapterInput(input: unknown) {
  return GetChapterInputSchema.parse(input);
}

function parseGenerateChapterInput(input: unknown) {
  return GenerateChapterInputSchema.parse(input);
}

function parseSaveChapterGenerationResultInput(input: unknown) {
  return SaveChapterGenerationResultInputSchema.parse(input);
}

async function getLessonRepository() {
  const module = await import("./storage/lesson-repository");
  return module.lessonRepository;
}

export const getLessonLibrary = createServerFn({ method: "GET" }).handler(async () => {
  const lessonRepository = await getLessonRepository();
  return lessonRepository.getLibrary();
});

export const getAudioGroupDetails = createServerFn({ method: "GET" })
  .inputValidator(parseGetGroupInput)
  .handler(async ({ data }) => {
    const lessonRepository = await getLessonRepository();
    const group = await lessonRepository.findGroup(data.groupId);

    if (!group) {
      return null;
    }

    return {
      group,
      chapters: await lessonRepository.listChapters(data.groupId),
    };
  });

export const createAudioGroup = createServerFn({ method: "POST" })
  .inputValidator(parseCreateGroupInput)
  .handler(async ({ data }) => {
    const lessonRepository = await getLessonRepository();
    const group = await lessonRepository.createGroup(data);
    return {
      group,
    };
  });

export const updateAudioGroup = createServerFn({ method: "POST" })
  .inputValidator(parseUpdateGroupInput)
  .handler(async ({ data }) => {
    const lessonRepository = await getLessonRepository();
    const group = await lessonRepository.updateGroup(data);
    return {
      group,
    };
  });

export const deleteAudioGroup = createServerFn({ method: "POST" })
  .inputValidator(parseDeleteGroupInput)
  .handler(async ({ data }) => {
    const lessonRepository = await getLessonRepository();
    await lessonRepository.deleteGroup(data.groupId);
    return {
      ok: true,
    };
  });

export const createChapter = createServerFn({ method: "POST" })
  .inputValidator(parseCreateChapterInput)
  .handler(async ({ data }) => {
    const lessonRepository = await getLessonRepository();
    const chapter = await lessonRepository.createChapter(data);
    return {
      chapter,
    };
  });

export const getChapterDetails = createServerFn({ method: "GET" })
  .inputValidator(parseGetChapterInput)
  .handler(async ({ data }) => {
    const lessonRepository = await getLessonRepository();
    return lessonRepository.findChapter(data.groupId, data.chapterId);
  });

export const updateChapter = createServerFn({ method: "POST" })
  .inputValidator(parseUpdateChapterInput)
  .handler(async ({ data }) => {
    const lessonRepository = await getLessonRepository();
    const chapter = await lessonRepository.updateChapter(data);
    return {
      chapter,
    };
  });

export const deleteChapter = createServerFn({ method: "POST" })
  .inputValidator(parseDeleteChapterInput)
  .handler(async ({ data }) => {
    const lessonRepository = await getLessonRepository();
    await lessonRepository.deleteChapter(data.groupId, data.chapterId);
    return {
      ok: true,
    };
  });

export const startChapterAudioGeneration = createServerFn({ method: "POST" })
  .inputValidator(parseGenerateChapterInput)
  .handler(async ({ data }) => {
    const lessonRepository = await getLessonRepository();
    const chapter = await lessonRepository.getChapter(data.groupId, data.chapterId);
    const job = await startAudioGenerationJob({
      text: chapter.markdown,
      stem: chapter.id,
      suffix: ".md",
      backend: data.backend,
      voice: data.voice,
      langCode: data.langCode,
      speed: data.speed,
      wavOnly: data.wavOnly,
      outputDir: lessonRepository.getGroupGeneratedOutputDir(chapter.groupId),
    });

    return job;
  });

export const saveChapterAudioGenerationResult = createServerFn({ method: "POST" })
  .inputValidator(parseSaveChapterGenerationResultInput)
  .handler(async ({ data }) => {
    const lessonRepository = await getLessonRepository();
    const chapter = await lessonRepository.getChapter(data.groupId, data.chapterId);
    const generatedAudio = await lessonRepository.saveGenerationResult({
      groupId: chapter.groupId,
      chapterId: data.chapterId,
      result: data.result,
    });

    return {
      generatedAudio,
    };
  });

export const getAvailableAudioVoices = createServerFn({ method: "GET" }).handler(async () => {
  return getAudioVoices();
});
