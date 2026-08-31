import * as z from "zod";

import { STORAGE_ID_MAX_LENGTH } from "./storage.constants";

export const StorageIdSchema = z.compile(
  z
    .string()
    .min(1)
    .max(STORAGE_ID_MAX_LENGTH)
    .regex(
      /^[a-z0-9][a-z0-9._-]*$/,
      "Use lowercase letters, numbers, dots, dashes, or underscores."
    )
);
