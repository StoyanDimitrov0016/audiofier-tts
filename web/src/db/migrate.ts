import { migrate } from "drizzle-orm/node-postgres/migrator";

import { initDatabaseConnection } from "./database.provider.server";

async function runMigrations() {
  const connection = initDatabaseConnection();
  try {
    await migrate(connection.database, { migrationsFolder: "./drizzle" });
  } finally {
    await connection.pool.end();
  }
}

void runMigrations();
