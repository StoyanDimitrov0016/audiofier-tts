import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { DEFAULT_DATABASE_URL } from "./database.constants";

const ENVIRONMENT_FILE = ".env";
const WEB_WORKSPACE_DIRECTORY = "web";

function repositoryRoot() {
  const cwd = process.cwd();
  return path.basename(cwd) === WEB_WORKSPACE_DIRECTORY ? path.resolve(cwd, "..") : cwd;
}

export function getDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    const environmentPath = path.join(repositoryRoot(), ENVIRONMENT_FILE);
    if (existsSync(environmentPath)) {
      process.loadEnvFile(environmentPath);
    }
  }
  return process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}
