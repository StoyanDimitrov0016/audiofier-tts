import * as z from "zod";

import { StorageIdSchema } from "../shared/storage.schemas";
import {
  COLLECTION_DESCRIPTION_MAX_LENGTH,
  COLLECTION_TITLE_MAX_LENGTH,
} from "./collections.constants";

export const CollectionSchema = z.compile(
  z.object({
    id: StorageIdSchema,
    title: z.string().min(1).max(COLLECTION_TITLE_MAX_LENGTH),
    description: z.string().max(COLLECTION_DESCRIPTION_MAX_LENGTH),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
);

export const CollectionFormSchema = z.compile(
  z.object({
    title: z
      .string()
      .trim()
      .min(1, "Collection title is required.")
      .max(COLLECTION_TITLE_MAX_LENGTH),
    description: z.string().trim().max(COLLECTION_DESCRIPTION_MAX_LENGTH),
  })
);

export const CreateCollectionInputSchema = CollectionFormSchema;
export const UpdateCollectionInputSchema = z.compile(
  CollectionFormSchema.extend({ collectionId: StorageIdSchema })
);
export const CollectionIdInputSchema = z.compile(z.object({ collectionId: StorageIdSchema }));

export type Collection = z.infer<typeof CollectionSchema>;
export type CollectionFormValues = z.infer<typeof CollectionFormSchema>;
export type CreateCollectionInput = z.infer<typeof CreateCollectionInputSchema>;
export type UpdateCollectionInput = z.infer<typeof UpdateCollectionInputSchema>;
