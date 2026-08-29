import { defineConfig } from "drizzle-kit";
import { getDatabaseUrl } from "./src/db/database.environment";

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
