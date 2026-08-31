import { createServerFn } from "@tanstack/react-start";

import {
  CollectionIdInputSchema,
  CreateCollectionInputSchema,
  UpdateCollectionInputSchema,
} from "../collections.schemas";
import { collectionService, lessonService } from "@/server/application.server";
import type { LessonSummary } from "@/features/lessons/lessons.schemas";

export const getCatalogFn = createServerFn({ method: "GET" }).handler(async () => {
  const [collections, lessons] = await Promise.all([
    collectionService.findAll(),
    lessonService.findAll(),
  ]);
  const lessonsByCollection: Record<string, LessonSummary[]> = {};
  for (const collection of collections) {
    lessonsByCollection[collection.id] = [];
  }
  for (const lesson of lessons) {
    lessonsByCollection[lesson.collectionId]?.push(lesson);
  }
  return { collections, lessonsByCollection };
});

export const getCollectionDetailsFn = createServerFn({ method: "GET" })
  .validator((input) => CollectionIdInputSchema.parse(input))
  .handler(async ({ data }) => {
    const collection = await collectionService.findById(data.collectionId);
    if (!collection) {
      return null;
    }
    return {
      collection,
      lessons: await lessonService.findAllByCollection(collection.id),
    };
  });

export const createCollectionFn = createServerFn({ method: "POST" })
  .validator((input) => CreateCollectionInputSchema.parse(input))
  .handler(async ({ data }) => ({ collection: await collectionService.create(data) }));

export const updateCollectionFn = createServerFn({ method: "POST" })
  .validator((input) => UpdateCollectionInputSchema.parse(input))
  .handler(async ({ data }) => ({ collection: await collectionService.update(data) }));

export const deleteCollectionFn = createServerFn({ method: "POST" })
  .validator((input) => CollectionIdInputSchema.parse(input))
  .handler(async ({ data }) => {
    await collectionService.remove(data.collectionId);
    return { deleted: true };
  });
