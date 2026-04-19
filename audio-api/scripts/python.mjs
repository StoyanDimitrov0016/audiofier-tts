import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const venvDir = path.join(root, ".venv");
const pythonPath =
  process.platform === "win32" ? path.join(venvDir, "Scripts", "python.exe") : path.join(venvDir, "bin", "python");

function normalize(value) {
  return path.normalize(value).toLowerCase();
}

function isMovedVenv() {
  const configPath = path.join(venvDir, "pyvenv.cfg");

  if (!existsSync(configPath)) {
    return false;
  }

  const config = readFileSync(configPath, "utf-8");
  return config.includes("command =") && !normalize(config).includes(normalize(venvDir));
}

if (!existsSync(pythonPath) || isMovedVenv()) {
  console.error(`Python virtual environment is missing or stale at ${venvDir}.`);
  console.error("Recreate it with:");
  console.error("  npm run setup:audio");
  console.error("Or delete audio-api/.venv and run:");
  console.error("  npm run setup:venv -w audiofier-audio-api");
  process.exit(1);
}

const result = spawnSync(pythonPath, process.argv.slice(2), {
  cwd: root,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
