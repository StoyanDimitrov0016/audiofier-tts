import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const venvDir = path.join(root, ".venv");
const requirementsPath = path.join(root, "requirements.txt");
const devRequirementsPath = path.join(root, "requirements-dev.txt");
const pythonPath =
  process.platform === "win32" ? path.join(venvDir, "Scripts", "python.exe") : path.join(venvDir, "bin", "python");

function normalize(value) {
  return path.normalize(value).toLowerCase();
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });

  return !result.error && result.status === 0;
}

function isMovedVenv() {
  const configPath = path.join(venvDir, "pyvenv.cfg");

  if (!existsSync(configPath)) {
    return false;
  }

  const config = readFileSync(configPath, "utf-8");
  return config.includes("command =") && !normalize(config).includes(normalize(venvDir));
}

if (existsSync(venvDir) && (!existsSync(pythonPath) || isMovedVenv())) {
  console.error(`Found a stale Python virtual environment at ${venvDir}.`);
  console.error("Delete audio-api/.venv, then rerun npm run setup:audio.");
  process.exit(1);
}

if (!existsSync(pythonPath)) {
  const created =
    (process.platform === "win32" && run("py", ["-3.12", "-m", "venv", ".venv"])) ||
    run("python", ["-m", "venv", ".venv"]) ||
    run("python3", ["-m", "venv", ".venv"]);

  if (!created) {
    console.error("Could not create audio-api/.venv. Install Python 3.12 and try again.");
    process.exit(1);
  }
}

if (!run(pythonPath, ["-m", "pip", "install", "--upgrade", "pip"])) {
  process.exit(1);
}

if (!run(pythonPath, ["-m", "pip", "install", "-r", requirementsPath])) {
  process.exit(1);
}

if (existsSync(devRequirementsPath) && !run(pythonPath, ["-m", "pip", "install", "-r", devRequirementsPath])) {
  process.exit(1);
}
