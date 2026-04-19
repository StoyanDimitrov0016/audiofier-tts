import { promises as fs } from "node:fs";
import path from "node:path";

import type { AudioGroup, Chapter, ChapterSummary, GeneratedAudio, LessonLibrary } from "../../lib/lesson-types";
import type { GenerateAudioResult } from "../../lib/audio-types";
import { AudioGroupSchema, ChapterMetaSchema, GeneratedAudioSchema } from "./schemas";
import { storagePaths } from "./paths";
import { ensureDir, nowIso, pathExists, readJson, uniqueId, writeJson } from "../lib/persistence";

const markdownGroupsRoot = path.join(storagePaths.storageRoot, "markdowns", "groups");
const generatedGroupsRoot = path.join(storagePaths.storageRoot, "generated", "groups");

type ChapterMeta = Omit<Chapter, "markdown" | "generatedAudio">;

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

async function assertGroupExists(groupId: string) {
  if (!(await pathExists(groupMetaPath(groupId)))) {
    throw new Error(`Audio group not found: ${groupId}`);
  }
}

async function readGeneratedAudio(groupId: string, chapterId: string): Promise<GeneratedAudio | null> {
  const filePath = generatedMetadataPath(groupId, chapterId);

  if (!(await pathExists(filePath))) {
    return null;
  }

  return readJson(filePath, GeneratedAudioSchema);
}

async function readChapterMeta(groupId: string, chapterId: string): Promise<ChapterMeta> {
  return readJson(chapterMetaPath(groupId, chapterId), ChapterMetaSchema);
}

async function listGroups(): Promise<AudioGroup[]> {
  await ensureStorage();
  const entries = await fs.readdir(markdownGroupsRoot, { withFileTypes: true });
  const groups = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => readJson(groupMetaPath(entry.name), AudioGroupSchema).catch(() => null)),
  );

  return groups
    .filter((group): group is AudioGroup => group !== null)
    .sort((left, right) => left.title.localeCompare(right.title));
}

async function listChapters(groupId: string): Promise<ChapterSummary[]> {
  await assertGroupExists(groupId);
  await ensureDir(chaptersDir(groupId));

  const entries = await fs.readdir(chaptersDir(groupId), { withFileTypes: true });
  const chapters = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map(async (entry) => {
        const meta = await readJson(path.join(chaptersDir(groupId), entry.name), ChapterMetaSchema);
        return {
          ...meta,
          generatedAudio: await readGeneratedAudio(groupId, meta.id),
        };
      }),
  );

  return chapters.sort((left, right) => left.order - right.order || left.title.localeCompare(right.title));
}

async function getLibrary(): Promise<LessonLibrary> {
  const groups = await listGroups();
  const chaptersByGroupEntries = await Promise.all(
    groups.map(async (group) => [group.id, await listChapters(group.id)] as const),
  );

  return {
    groups,
    chaptersByGroup: Object.fromEntries(chaptersByGroupEntries),
  };
}

async function getGroup(groupId: string): Promise<AudioGroup> {
  await assertGroupExists(groupId);
  return readJson(groupMetaPath(groupId), AudioGroupSchema);
}

async function findGroup(groupId: string): Promise<AudioGroup | null> {
  if (!(await pathExists(groupMetaPath(groupId)))) {
    return null;
  }

  return readJson(groupMetaPath(groupId), AudioGroupSchema);
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
  const existing = await getGroup(input.groupId);
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
  await fs.rm(groupDir(groupId), { recursive: true, force: true });
  await fs.rm(generatedGroupDir(groupId), { recursive: true, force: true });
}

async function getChapter(groupId: string, chapterId: string): Promise<Chapter> {
  await assertGroupExists(groupId);

  const meta = await readChapterMeta(groupId, chapterId);
  const markdown = await fs.readFile(chapterMarkdownPath(groupId, chapterId), "utf-8");

  return {
    ...meta,
    markdown,
    generatedAudio: await readGeneratedAudio(groupId, chapterId),
  };
}

async function findChapter(groupId: string, chapterId: string): Promise<Chapter | null> {
  if (!(await pathExists(groupMetaPath(groupId)))) {
    return null;
  }

  if (!(await pathExists(chapterMetaPath(groupId, chapterId)))) {
    return null;
  }

  if (!(await pathExists(chapterMarkdownPath(groupId, chapterId)))) {
    return null;
  }

  return getChapter(groupId, chapterId);
}

async function createChapter(input: {
  groupId: string;
  title: string;
  order?: number;
  markdown?: string;
}): Promise<Chapter> {
  await assertGroupExists(input.groupId);

  const existingChapters = await listChapters(input.groupId);
  const id = await uniqueId(input.title, async (candidate) => pathExists(chapterMetaPath(input.groupId, candidate)));
  const timestamp = nowIso();
  const meta: ChapterMeta = {
    id,
    groupId: input.groupId,
    title: input.title.trim(),
    order: input.order ?? existingChapters.length + 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await writeJson(chapterMetaPath(input.groupId, id), meta);
  await fs.writeFile(chapterMarkdownPath(input.groupId, id), input.markdown ?? "", "utf-8");

  return {
    ...meta,
    markdown: input.markdown ?? "",
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
  const existing = await readChapterMeta(input.groupId, input.chapterId);
  const meta: ChapterMeta = {
    ...existing,
    title: input.title.trim(),
    order: input.order,
    updatedAt: nowIso(),
  };

  await writeJson(chapterMetaPath(input.groupId, input.chapterId), meta);
  await fs.writeFile(chapterMarkdownPath(input.groupId, input.chapterId), input.markdown, "utf-8");

  return {
    ...meta,
    markdown: input.markdown,
    generatedAudio: await readGeneratedAudio(input.groupId, input.chapterId),
  };
}

async function deleteChapter(groupId: string, chapterId: string): Promise<void> {
  await fs.rm(chapterMetaPath(groupId, chapterId), { force: true });
  await fs.rm(chapterMarkdownPath(groupId, chapterId), { force: true });
  await fs.rm(generatedChapterDir(groupId, chapterId), { recursive: true, force: true });
}

async function saveGenerationResult(input: {
  groupId: string;
  chapterId: string;
  result: GenerateAudioResult;
}): Promise<GeneratedAudio> {
  const generatedAt = nowIso();
  const generatedAudio: GeneratedAudio = {
    groupId: input.groupId,
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

  await writeJson(generatedMetadataPath(input.groupId, input.chapterId), generatedAudio);
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
