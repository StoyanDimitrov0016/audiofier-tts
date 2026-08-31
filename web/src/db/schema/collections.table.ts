import { index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { COLLECTION_TITLE_MAX_LENGTH } from "@/features/collections/collections.constants";
import { STORAGE_ID_MAX_LENGTH } from "@/features/shared/storage.constants";

export const collectionsTable = pgTable(
  "collections",
  {
    id: varchar("id", { length: STORAGE_ID_MAX_LENGTH }).primaryKey(),
    title: varchar("title", { length: COLLECTION_TITLE_MAX_LENGTH }).notNull(),
    description: text("description").default("").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("collections_title_idx").on(table.title)]
);

export type SelectCollection = typeof collectionsTable.$inferSelect;
