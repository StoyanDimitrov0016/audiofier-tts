import { promises as fs } from "node:fs";
import path from "node:path";
import * as z from "zod";

import { generatedAudioTable, collectionsTable, lessonsTable } from "./schema";
import { initDatabaseConnection } from "./database.provider.server";
import { CollectionSchema } from "@/features/collections/collections.schemas";
import { GeneratedAudioSchema } from "@/features/lessons/lessons.schemas";
import { StorageIdSchema } from "@/features/shared/storage.schemas";
import { MARKDOWN_TEXT_SUFFIX } from "@/lib/audio.constants";
import { storagePaths } from "@/server/storage/paths";

const TEXT_ENCODING = "utf-8";
const JSON_FILE_SUFFIX = ".json";
const LEGACY_MARKDOWNS_DIRECTORY = "markdowns";
const LEGACY_GROUPS_DIRECTORY = "groups";
const LEGACY_LESSONS_DIRECTORY = "chapters";
const LEGACY_COLLECTION_METADATA_FILE = "group.json";
const GENERATED_AUDIO_DIRECTORY = "generated";
const GENERATED_AUDIO_METADATA_FILE = "metadata.json";

const LegacyLessonMetaSchema = z.compile(
  z.object({
    id: StorageIdSchema,
    groupId: StorageIdSchema,
    title: z.string().min(1),
    order: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
);
const LegacyGeneratedAudioSchema = z.compile(z.record(z.string(), z.unknown()));

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(filePath, TEXT_ENCODING));
}

async function importFilesystem() {
  const connection = initDatabaseConnection();
  const groupsRoot = path.join(
    storagePaths.storageRoot,
    LEGACY_MARKDOWNS_DIRECTORY,
    LEGACY_GROUPS_DIRECTORY
  );
  try {
    const entries = await fs.readdir(groupsRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const collection = CollectionSchema.parse(
        await readJson(path.join(groupsRoot, entry.name, LEGACY_COLLECTION_METADATA_FILE))
      );
      await connection.database
        .insert(collectionsTable)
        .values({
          ...collection,
          createdAt: new Date(collection.createdAt),
          updatedAt: new Date(collection.updatedAt),
        })
        .onConflictDoNothing();

      const lessonsRoot = path.join(groupsRoot, entry.name, LEGACY_LESSONS_DIRECTORY);
      const lessonEntries = await fs.readdir(lessonsRoot, { withFileTypes: true });
      for (const lessonEntry of lessonEntries) {
        if (!lessonEntry.isFile() || !lessonEntry.name.endsWith(JSON_FILE_SUFFIX)) {
          continue;
        }
        const meta = LegacyLessonMetaSchema.parse(
          await readJson(path.join(lessonsRoot, lessonEntry.name))
        );
        const markdownPath = path.join(lessonsRoot, `${meta.id}${MARKDOWN_TEXT_SUFFIX}`);
        const markdown = await fs.readFile(markdownPath, TEXT_ENCODING);
        await connection.database
          .insert(lessonsTable)
          .values({
            collectionId: collection.id,
            id: meta.id,
            title: meta.title,
            order: meta.order,
            markdown,
            createdAt: new Date(meta.createdAt),
            updatedAt: new Date(meta.updatedAt),
          })
          .onConflictDoNothing();

        const audioMetadataPath = path.join(
          storagePaths.storageRoot,
          GENERATED_AUDIO_DIRECTORY,
          LEGACY_GROUPS_DIRECTORY,
          collection.id,
          meta.id,
          GENERATED_AUDIO_METADATA_FILE
        );
        try {
          const legacyAudio = LegacyGeneratedAudioSchema.parse(await readJson(audioMetadataPath));
          const audio = GeneratedAudioSchema.parse({
            ...legacyAudio,
            collectionId: collection.id,
            lessonId: meta.id,
          });
          await connection.database
            .insert(generatedAudioTable)
            .values({ ...audio, generatedAt: new Date(audio.generatedAt) })
            .onConflictDoNothing();
        } catch (error) {
          if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
            throw error;
          }
        }
      }
    }
  } finally {
    await connection.pool.end();
  }
}

void importFilesystem();
