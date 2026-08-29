import { and, asc, eq, gte, lte, ne, sql } from "drizzle-orm";

import type { Database } from "@/db/database.provider.server";
import type { CreateLessonInput, UpdateLessonInput } from "@/features/lessons/lessons.schemas";
import type { GenerateAudioResult } from "@/lib/audio-types";
import { collectionsTable, generatedAudioTable, lessonsTable } from "@/db/schema";
import { lessonMapper } from "../lessons.mapper";

type LessonKey = { collectionId: string; lessonId: string };

const keyCondition = (key: LessonKey) =>
  and(eq(lessonsTable.collectionId, key.collectionId), eq(lessonsTable.id, key.lessonId));

export function initLessonRepository(db: Database) {
  async function findAll() {
    const rows = await db
      .select({ lesson: lessonsTable, audio: generatedAudioTable })
      .from(lessonsTable)
      .leftJoin(
        generatedAudioTable,
        and(
          eq(generatedAudioTable.collectionId, lessonsTable.collectionId),
          eq(generatedAudioTable.lessonId, lessonsTable.id)
        )
      )
      .orderBy(asc(lessonsTable.collectionId), asc(lessonsTable.order), asc(lessonsTable.title));
    return rows.map((row) => lessonMapper.toLessonSummary(row.lesson, row.audio));
  }

  async function findAllByCollection(collectionId: string) {
    const rows = await db
      .select({ lesson: lessonsTable, audio: generatedAudioTable })
      .from(lessonsTable)
      .leftJoin(
        generatedAudioTable,
        and(
          eq(generatedAudioTable.collectionId, lessonsTable.collectionId),
          eq(generatedAudioTable.lessonId, lessonsTable.id)
        )
      )
      .where(eq(lessonsTable.collectionId, collectionId))
      .orderBy(asc(lessonsTable.order), asc(lessonsTable.title));
    return rows.map((row) => lessonMapper.toLessonSummary(row.lesson, row.audio));
  }

  async function findById(key: LessonKey) {
    const rows = await db
      .select({ lesson: lessonsTable, audio: generatedAudioTable })
      .from(lessonsTable)
      .leftJoin(
        generatedAudioTable,
        and(
          eq(generatedAudioTable.collectionId, lessonsTable.collectionId),
          eq(generatedAudioTable.lessonId, lessonsTable.id)
        )
      )
      .where(keyCondition(key))
      .limit(1);
    return rows[0] ? lessonMapper.toLesson(rows[0].lesson, rows[0].audio) : null;
  }

  async function exists(key: LessonKey) {
    return Boolean(await findById(key));
  }

  async function insertOne(lessonId: string, input: CreateLessonInput) {
    return db.transaction(async (transaction) => {
      await transaction
        .select({ id: collectionsTable.id })
        .from(collectionsTable)
        .where(eq(collectionsTable.id, input.collectionId))
        .for("update");
      const existingLessons = await transaction
        .select({ order: lessonsTable.order })
        .from(lessonsTable)
        .where(eq(lessonsTable.collectionId, input.collectionId));
      const order = input.order ?? existingLessons.length + 1;
      if (order > existingLessons.length + 1) {
        throw new Error(`Lesson order must be between 1 and ${existingLessons.length + 1}.`);
      }
      if (order <= existingLessons.length) {
        const offset = existingLessons.length + 1;
        await transaction
          .update(lessonsTable)
          .set({ order: sql`${lessonsTable.order} + ${offset}` })
          .where(
            and(eq(lessonsTable.collectionId, input.collectionId), gte(lessonsTable.order, order))
          );
        await transaction
          .update(lessonsTable)
          .set({ order: sql`${lessonsTable.order} - ${offset} + 1` })
          .where(
            and(
              eq(lessonsTable.collectionId, input.collectionId),
              gte(lessonsTable.order, order + offset)
            )
          );
      }
      const rows = await transaction
        .insert(lessonsTable)
        .values({
          collectionId: input.collectionId,
          id: lessonId,
          title: input.title,
          order,
          markdown: input.markdown,
        })
        .returning();
      return lessonMapper.toLesson(rows[0], null);
    });
  }

  async function updateOne(input: UpdateLessonInput) {
    return db.transaction(async (transaction) => {
      await transaction
        .select({ id: collectionsTable.id })
        .from(collectionsTable)
        .where(eq(collectionsTable.id, input.collectionId))
        .for("update");
      const existingRows = await transaction
        .select()
        .from(lessonsTable)
        .where(keyCondition(input))
        .limit(1);
      const existing = existingRows[0];
      if (!existing) {
        return null;
      }
      const collectionLessons = await transaction
        .select({ order: lessonsTable.order })
        .from(lessonsTable)
        .where(eq(lessonsTable.collectionId, input.collectionId));
      if (input.order > collectionLessons.length) {
        throw new Error(`Lesson order must be between 1 and ${collectionLessons.length}.`);
      }
      const markdownChanged = existing.markdown !== input.markdown;
      if (input.order !== existing.order) {
        const movingEarlier = input.order < existing.order;
        const lowerOrder = movingEarlier ? input.order : existing.order + 1;
        const upperOrder = movingEarlier ? existing.order - 1 : input.order;
        const offset = collectionLessons.length + 1;
        await transaction
          .update(lessonsTable)
          .set({ order: sql`${lessonsTable.order} + ${offset}` })
          .where(
            and(
              eq(lessonsTable.collectionId, input.collectionId),
              ne(lessonsTable.id, input.lessonId),
              gte(lessonsTable.order, lowerOrder),
              lte(lessonsTable.order, upperOrder)
            )
          );
        await transaction
          .update(lessonsTable)
          .set({ order: input.order })
          .where(keyCondition(input));
        const orderAdjustment = movingEarlier ? 1 : -1;
        await transaction
          .update(lessonsTable)
          .set({ order: sql`${lessonsTable.order} - ${offset} + ${orderAdjustment}` })
          .where(
            and(
              eq(lessonsTable.collectionId, input.collectionId),
              gte(lessonsTable.order, lowerOrder + offset),
              lte(lessonsTable.order, upperOrder + offset)
            )
          );
      }
      const rows = await transaction
        .update(lessonsTable)
        .set({
          title: input.title,
          order: input.order,
          markdown: input.markdown,
          updatedAt: new Date(),
        })
        .where(keyCondition(input))
        .returning();
      if (markdownChanged) {
        await transaction
          .delete(generatedAudioTable)
          .where(
            and(
              eq(generatedAudioTable.collectionId, input.collectionId),
              eq(generatedAudioTable.lessonId, input.lessonId)
            )
          );
      }
      const audioRows = markdownChanged
        ? []
        : await transaction
            .select()
            .from(generatedAudioTable)
            .where(
              and(
                eq(generatedAudioTable.collectionId, input.collectionId),
                eq(generatedAudioTable.lessonId, input.lessonId)
              )
            )
            .limit(1);
      return lessonMapper.toLesson(rows[0], audioRows[0] ?? null);
    });
  }

  async function deleteOne(key: LessonKey) {
    return db.transaction(async (transaction) => {
      await transaction
        .select({ id: collectionsTable.id })
        .from(collectionsTable)
        .where(eq(collectionsTable.id, key.collectionId))
        .for("update");
      const existingRows = await transaction
        .select({ order: lessonsTable.order })
        .from(lessonsTable)
        .where(keyCondition(key))
        .limit(1);
      const existing = existingRows[0];
      if (!existing) {
        return false;
      }
      const collectionLessons = await transaction
        .select({ order: lessonsTable.order })
        .from(lessonsTable)
        .where(eq(lessonsTable.collectionId, key.collectionId));
      await transaction.delete(lessonsTable).where(keyCondition(key));
      const laterLessonCount = collectionLessons.length - existing.order;
      if (laterLessonCount > 0) {
        const offset = collectionLessons.length + 1;
        await transaction
          .update(lessonsTable)
          .set({ order: sql`${lessonsTable.order} + ${offset}` })
          .where(
            and(
              eq(lessonsTable.collectionId, key.collectionId),
              gte(lessonsTable.order, existing.order + 1)
            )
          );
        await transaction
          .update(lessonsTable)
          .set({ order: sql`${lessonsTable.order} - ${offset} - 1` })
          .where(
            and(
              eq(lessonsTable.collectionId, key.collectionId),
              gte(lessonsTable.order, existing.order + 1 + offset)
            )
          );
      }
      return true;
    });
  }

  async function saveGeneratedAudio(key: LessonKey, result: GenerateAudioResult) {
    const rows = await db
      .insert(generatedAudioTable)
      .values({ ...result, ...key })
      .onConflictDoUpdate({
        target: [generatedAudioTable.collectionId, generatedAudioTable.lessonId],
        set: { ...result, generatedAt: new Date() },
      })
      .returning();
    return lessonMapper.toGeneratedAudio(rows[0]);
  }

  return {
    deleteOne,
    exists,
    findAll,
    findAllByCollection,
    findById,
    insertOne,
    saveGeneratedAudio,
    updateOne,
  };
}

export type LessonRepository = ReturnType<typeof initLessonRepository>;
