import type { SelectCollection } from "@/db/schema";
import type { Collection } from "@/features/collections/collections.schemas";

export function toCollection(row: SelectCollection): Collection {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const collectionMapper = { toCollection };
