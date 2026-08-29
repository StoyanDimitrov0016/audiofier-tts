import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { collectionsTable } from "./collections.table";
import { LESSON_TITLE_MAX_LENGTH } from "@/features/lessons/lessons.constants";
import { STORAGE_ID_MAX_LENGTH } from "@/features/shared/storage.constants";
import { AUDIO_IDENTIFIER_MAX_LENGTH, FORMATTED_DURATION_MAX_LENGTH } from "@/lib/audio.constants";

export const lessonsTable = pgTable(
  "lessons",
  {
    collectionId: varchar("collection_id", { length: STORAGE_ID_MAX_LENGTH })
      .notNull()
      .references(() => collectionsTable.id, { onDelete: "cascade" }),
    id: varchar("id", { length: STORAGE_ID_MAX_LENGTH }).notNull(),
    title: varchar("title", { length: LESSON_TITLE_MAX_LENGTH }).notNull(),
    order: integer("lesson_order").notNull(),
    markdown: text("markdown").default("").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.id] }),
    uniqueIndex("lessons_collection_order_unique").on(table.collectionId, table.order),
    index("lessons_collection_title_idx").on(table.collectionId, table.title),
    check("lessons_order_positive", sql`${table.order} >= 1`),
  ]
);

export const generatedAudioTable = pgTable(
  "generated_audio",
  {
    collectionId: varchar("collection_id", { length: STORAGE_ID_MAX_LENGTH }).notNull(),
    lessonId: varchar("lesson_id", { length: STORAGE_ID_MAX_LENGTH }).notNull(),
    lessonOutputDir: text("lesson_output_dir").notNull(),
    wavPath: text("wav_path").notNull(),
    mp3Path: text("mp3_path"),
    chunkCount: integer("chunk_count").notNull(),
    cleanedCharacterCount: integer("cleaned_character_count").notNull(),
    durationSeconds: real("duration_seconds").notNull(),
    formattedDuration: varchar("formatted_duration", {
      length: FORMATTED_DURATION_MAX_LENGTH,
    }).notNull(),
    modelId: varchar("model_id", { length: AUDIO_IDENTIFIER_MAX_LENGTH }),
    voice: varchar("voice", { length: AUDIO_IDENTIFIER_MAX_LENGTH }),
    modelSource: text("model_source"),
    instruct: text("instruct"),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.lessonId] }),
    foreignKey({
      columns: [table.collectionId, table.lessonId],
      foreignColumns: [lessonsTable.collectionId, lessonsTable.id],
    }).onDelete("cascade"),
  ]
);

export type SelectLesson = typeof lessonsTable.$inferSelect;
export type SelectGeneratedAudio = typeof generatedAudioTable.$inferSelect;
