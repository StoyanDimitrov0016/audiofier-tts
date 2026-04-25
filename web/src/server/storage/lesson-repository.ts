import { promises as fs } from "node:fs";
import path from "node:path";

import type { AudioGroup, Chapter, ChapterSummary, GeneratedAudio, LessonLibrary } from "../../lib/lesson-types";
import type { GenerateAudioResult } from "../../lib/audio-types";
import { AudioGroupSchema, ChapterMetaSchema, GeneratedAudioSchema } from "./schemas";
import { storagePaths } from "./paths";
import { ensureDir, nowIso, pathExists, readJson, uniqueId, writeJson } from "../lib/persistence";

const markdownGroupsRoot = path.join(storagePaths.storageRoot, "markdowns", "groups");
const generatedGroupsRoot = path.join(storagePaths.storageRoot, "generated", "groups");

type ChapterMeta = Omit<Chapter, "markdown" | "markdownPath" | "generatedAudio">;

function groupDir(groupId: string) {
  return path.join(markdownGroupsRoot, groupId);
}

function groupMetaPath(groupId: string) {
  return path.join(groupDir(groupId), "group.json");
}

function chaptersDir(groupId: string) {
  return path.join(groupDir(groupId), "chapters");
}

function chapterMetaPath(groupId: string, chapterId: string) {
  return path.join(chaptersDir(groupId), `${chapterId}.json`);
}

function chapterMarkdownPath(groupId: string, chapterId: string) {
  return path.join(chaptersDir(groupId), `${chapterId}.md`);
}

function generatedGroupDir(groupId: string) {
  return path.join(generatedGroupsRoot, groupId);
}

function generatedChapterDir(groupId: string, chapterId: string) {
  return path.join(generatedGroupDir(groupId), chapterId);
}

function generatedMetadataPath(groupId: string, chapterId: string) {
  return path.join(generatedChapterDir(groupId, chapterId), "metadata.json");
}

async function ensureStorage() {
  await ensureDir(markdownGroupsRoot);
  await ensureDir(generatedGroupsRoot);
}

async function resolveGroupId(groupId: string): Promise<string | null> {
  if (await pathExists(groupMetaPath(groupId))) {
    return groupId;
  }

  await ensureStorage();

  const entries = await fs.readdir(markdownGroupsRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const group = await readJson(groupMetaPath(entry.name), AudioGroupSchema).catch(() => null);

    if (group?.id === groupId) {
      return entry.name;
    }
  }

  return null;
}

async function assertGroupExists(groupId: string) {
  const resolvedGroupId = await resolveGroupId(groupId);

  if (!resolvedGroupId) {
    throw new Error(`Audio group not found: ${groupId}`);
  }

  return resolvedGroupId;
}

async function readGeneratedAudio(groupId: string, chapterId: string): Promise<GeneratedAudio | null> {
  const filePath = generatedMetadataPath(groupId, chapterId);

  if (!(await pathExists(filePath))) {
    return null;
  }

  const generatedAudio = await readJson(filePath, GeneratedAudioSchema);

  return {
    ...generatedAudio,
    groupId,
    chapterId,
  };
}

async function readChapterMeta(groupId: string, chapterId: string): Promise<ChapterMeta> {
  const meta = await readJson(chapterMetaPath(groupId, chapterId), ChapterMetaSchema);

  return {
    ...meta,
    groupId,
  };
}

async function listGroups(): Promise<AudioGroup[]> {
  await ensureStorage();
  const entries = await fs.readdir(markdownGroupsRoot, { withFileTypes: true });
  const groups = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) =>
        readJson(groupMetaPath(entry.name), AudioGroupSchema)
          .then((group) => ({
            ...group,
            id: entry.name,
          }))
          .catch(() => null)
      )
  );

  return groups
    .filter((group): group is AudioGroup => group !== null)
    .sort((left, right) => left.title.localeCompare(right.title));
}

async function listChapters(groupId: string): Promise<ChapterSummary[]> {
  const resolvedGroupId = await assertGroupExists(groupId);
  await ensureDir(chaptersDir(resolvedGroupId));

  const entries = await fs.readdir(chaptersDir(resolvedGroupId), { withFileTypes: true });
  const chapters = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map(async (entry) => {
        const meta = await readJson(path.join(chaptersDir(resolvedGroupId), entry.name), ChapterMetaSchema);
        const chapter = {
          ...meta,
          groupId: resolvedGroupId,
        };

        return {
          ...chapter,
          generatedAudio: await readGeneratedAudio(resolvedGroupId, chapter.id),
        };
      })
  );

  return chapters.sort((left, right) => left.order - right.order || left.title.localeCompare(right.title));
}

async function getLibrary(): Promise<LessonLibrary> {
  const groups = await listGroups();
  const chaptersByGroupEntries = await Promise.all(
    groups.map(async (group) => [group.id, await listChapters(group.id)] as const)
  );

  return {
    groups,
    chaptersByGroup: Object.fromEntries(chaptersByGroupEntries),
  };
}

async function getGroup(groupId: string): Promise<AudioGroup> {
  const resolvedGroupId = await assertGroupExists(groupId);
  const group = await readJson(groupMetaPath(resolvedGroupId), AudioGroupSchema);

  return {
    ...group,
    id: resolvedGroupId,
  };
}

async function findGroup(groupId: string): Promise<AudioGroup | null> {
  const resolvedGroupId = await resolveGroupId(groupId);

  if (!resolvedGroupId) {
    return null;
  }

  return getGroup(resolvedGroupId);
}

async function createGroup(input: { title: string; description?: string }): Promise<AudioGroup> {
  await ensureStorage();
  const id = await uniqueId(input.title, async (candidate) => pathExists(groupDir(candidate)));
  const timestamp = nowIso();
  const group: AudioGroup = {
    id,
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await ensureDir(chaptersDir(id));
  await ensureDir(generatedGroupDir(id));
  await writeJson(groupMetaPath(id), group);

  return group;
}

async function updateGroup(input: { groupId: string; title: string; description?: string }): Promise<AudioGroup> {
  const resolvedGroupId = await assertGroupExists(input.groupId);
  const existing = await getGroup(resolvedGroupId);
  const group: AudioGroup = {
    ...existing,
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    updatedAt: nowIso(),
  };

  await writeJson(groupMetaPath(group.id), group);
  return group;
}

async function deleteGroup(groupId: string): Promise<void> {
  const resolvedGroupId = await assertGroupExists(groupId);

  await fs.rm(groupDir(resolvedGroupId), { recursive: true, force: true });
  await fs.rm(generatedGroupDir(resolvedGroupId), { recursive: true, force: true });
}

async function getChapter(groupId: string, chapterId: string): Promise<Chapter> {
  const resolvedGroupId = await assertGroupExists(groupId);

  const meta = await readChapterMeta(resolvedGroupId, chapterId);
  const markdown = await fs.readFile(chapterMarkdownPath(resolvedGroupId, chapterId), "utf-8");

  return {
    ...meta,
    markdown,
    markdownPath: chapterMarkdownPath(resolvedGroupId, chapterId),
    generatedAudio: await readGeneratedAudio(resolvedGroupId, chapterId),
  };
}

async function findChapter(groupId: string, chapterId: string): Promise<Chapter | null> {
  const resolvedGroupId = await resolveGroupId(groupId);

  if (!resolvedGroupId) {
    return null;
  }

  if (!(await pathExists(chapterMetaPath(resolvedGroupId, chapterId)))) {
    return null;
  }

  if (!(await pathExists(chapterMarkdownPath(resolvedGroupId, chapterId)))) {
    return null;
  }

  return getChapter(resolvedGroupId, chapterId);
}

async function createChapter(input: {
  groupId: string;
  title: string;
  order?: number;
  markdown?: string;
}): Promise<Chapter> {
  const resolvedGroupId = await assertGroupExists(input.groupId);

  const existingChapters = await listChapters(resolvedGroupId);
  const id = await uniqueId(input.title, async (candidate) => pathExists(chapterMetaPath(resolvedGroupId, candidate)));
  const timestamp = nowIso();
  const meta: ChapterMeta = {
    id,
    groupId: resolvedGroupId,
    title: input.title.trim(),
    order: input.order ?? existingChapters.length + 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await writeJson(chapterMetaPath(resolvedGroupId, id), meta);
  await fs.writeFile(chapterMarkdownPath(resolvedGroupId, id), input.markdown ?? "", "utf-8");

  return {
    ...meta,
    markdown: input.markdown ?? "",
    markdownPath: chapterMarkdownPath(resolvedGroupId, id),
    generatedAudio: null,
  };
}

async function updateChapter(input: {
  groupId: string;
  chapterId: string;
  title: string;
  order: number;
  markdown: string;
}): Promise<Chapter> {
  const resolvedGroupId = await assertGroupExists(input.groupId);
  const existing = await readChapterMeta(resolvedGroupId, input.chapterId);
  const markdownFilePath = chapterMarkdownPath(resolvedGroupId, input.chapterId);
  const previousMarkdown = await fs.readFile(markdownFilePath, "utf-8");
  const markdownChanged = previousMarkdown !== input.markdown;
  const meta: ChapterMeta = {
    ...existing,
    groupId: resolvedGroupId,
    title: input.title.trim(),
    order: input.order,
    updatedAt: nowIso(),
  };

  await writeJson(chapterMetaPath(resolvedGroupId, input.chapterId), meta);
  await fs.writeFile(markdownFilePath, input.markdown, "utf-8");

  if (markdownChanged) {
    await fs.rm(generatedChapterDir(resolvedGroupId, input.chapterId), { recursive: true, force: true });
  }

  return {
    ...meta,
    markdown: input.markdown,
    markdownPath: markdownFilePath,
    generatedAudio: markdownChanged ? null : await readGeneratedAudio(resolvedGroupId, input.chapterId),
  };
}

async function deleteChapter(groupId: string, chapterId: string): Promise<void> {
  const resolvedGroupId = await assertGroupExists(groupId);

  await fs.rm(chapterMetaPath(resolvedGroupId, chapterId), { force: true });
  await fs.rm(chapterMarkdownPath(resolvedGroupId, chapterId), { force: true });
  await fs.rm(generatedChapterDir(resolvedGroupId, chapterId), { recursive: true, force: true });
}

async function saveGenerationResult(input: {
  groupId: string;
  chapterId: string;
  result: GenerateAudioResult;
}): Promise<GeneratedAudio> {
  const resolvedGroupId = await assertGroupExists(input.groupId);
  const generatedAt = nowIso();
  const generatedAudio: GeneratedAudio = {
    groupId: resolvedGroupId,
    chapterId: input.chapterId,
    lessonOutputDir: input.result.lessonOutputDir,
    wavPath: input.result.wavPath,
    mp3Path: input.result.mp3Path,
    chunkCount: input.result.chunkCount,
    cleanedCharacterCount: input.result.cleanedCharacterCount,
    durationSeconds: input.result.durationSeconds,
    formattedDuration: input.result.formattedDuration,
    generatedAt,
  };

  await writeJson(generatedMetadataPath(resolvedGroupId, input.chapterId), generatedAudio);
  return generatedAudio;
}

export const lessonRepository = {
  getLibrary,
  listGroups,
  listChapters,
  getGroup,
  findGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  getChapter,
  findChapter,
  createChapter,
  updateChapter,
  deleteChapter,
  saveGenerationResult,
  getGroupGeneratedOutputDir: generatedGroupDir,
};
