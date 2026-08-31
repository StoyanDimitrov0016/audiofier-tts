import { initDatabaseConnection } from "@/db/database.provider.server";
import { initCollectionRepository } from "@/features/collections/server/repositories/collections.repository.server";
import { initCollectionService } from "@/features/collections/server/services/collections.service.server";
import { initLessonRepository } from "@/features/lessons/server/repositories/lessons.repository.server";
import { initLessonService } from "@/features/lessons/server/services/lessons.service.server";

export const databaseConnection = initDatabaseConnection();
export const collectionRepository = initCollectionRepository(databaseConnection.database);
export const lessonRepository = initLessonRepository(databaseConnection.database);
export const collectionService = initCollectionService(collectionRepository);
export const lessonService = initLessonService(lessonRepository);
