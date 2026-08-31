import { asc, eq } from "drizzle-orm";

import type { Database } from "@/db/database.provider.server";
import type {
  CreateCollectionInput,
  UpdateCollectionInput,
} from "@/features/collections/collections.schemas";
import { collectionsTable } from "@/db/schema";
import { collectionMapper } from "../collections.mapper";

type CollectionRepositoryDb = Pick<Database, "delete" | "insert" | "select" | "update">;

export function initCollectionRepository(db: CollectionRepositoryDb) {
  async function findAll() {
    const rows = await db.select().from(collectionsTable).orderBy(asc(collectionsTable.title));
    return rows.map(collectionMapper.toCollection);
  }

  async function findById(collectionId: string) {
    const rows = await db
      .select()
      .from(collectionsTable)
      .where(eq(collectionsTable.id, collectionId))
      .limit(1);
    return rows[0] ? collectionMapper.toCollection(rows[0]) : null;
  }

  async function exists(collectionId: string) {
    return Boolean(await findById(collectionId));
  }

  async function insertOne(collectionId: string, input: CreateCollectionInput) {
    const rows = await db
      .insert(collectionsTable)
      .values({ id: collectionId, ...input })
      .returning();
    return collectionMapper.toCollection(rows[0]);
  }

  async function updateOne(input: UpdateCollectionInput) {
    const rows = await db
      .update(collectionsTable)
      .set({ title: input.title, description: input.description, updatedAt: new Date() })
      .where(eq(collectionsTable.id, input.collectionId))
      .returning();
    return rows[0] ? collectionMapper.toCollection(rows[0]) : null;
  }

  async function deleteOne(collectionId: string) {
    const rows = await db
      .delete(collectionsTable)
      .where(eq(collectionsTable.id, collectionId))
      .returning({ id: collectionsTable.id });
    return Boolean(rows[0]);
  }

  return { deleteOne, exists, findAll, findById, insertOne, updateOne };
}

export type CollectionRepository = ReturnType<typeof initCollectionRepository>;
