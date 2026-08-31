import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";
import { getDatabaseUrl } from "./database.environment";

export type DatabaseConnection = ReturnType<typeof initDatabaseConnection>;
export type Database = DatabaseConnection["database"];

export function initDatabaseConnection(connectionString = getDatabaseUrl()) {
  const pool = new Pool({ connectionString });
  const database = drizzle({ client: pool, schema });
  return { database, pool };
}
