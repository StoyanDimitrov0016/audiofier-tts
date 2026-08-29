import type {
  CreateCollectionInput,
  UpdateCollectionInput,
} from "@/features/collections/collections.schemas";
import type { CollectionRepository } from "../repositories/collections.repository.server";
import { UNIQUE_ID_SUFFIX_START } from "@/features/shared/storage.constants";
import { slugify } from "@/features/shared/storage.utils";
import { isUniqueConstraintError } from "@/db/database.errors";
import { COLLECTION_ID_CONSTRAINT } from "@/features/collections/collections.constants";

export function initCollectionService(repository: CollectionRepository) {
  async function create(input: CreateCollectionInput) {
    const stem = slugify(input.title);
    let collectionId = stem;
    let suffix = UNIQUE_ID_SUFFIX_START;
    while (true) {
      if (await repository.exists(collectionId)) {
        collectionId = `${stem}-${suffix}`;
        suffix += 1;
        continue;
      }
      try {
        return await repository.insertOne(collectionId, input);
      } catch (error) {
        if (!isUniqueConstraintError(error, COLLECTION_ID_CONSTRAINT)) {
          throw error;
        }
        collectionId = `${stem}-${suffix}`;
        suffix += 1;
      }
    }
  }

  async function update(input: UpdateCollectionInput) {
    const collection = await repository.updateOne(input);
    if (!collection) {
      throw new Error(`Collection not found: ${input.collectionId}`);
    }
    return collection;
  }

  async function remove(collectionId: string) {
    if (!(await repository.deleteOne(collectionId))) {
      throw new Error(`Collection not found: ${collectionId}`);
    }
  }

  return { create, findAll: repository.findAll, findById: repository.findById, remove, update };
}

export type CollectionService = ReturnType<typeof initCollectionService>;
