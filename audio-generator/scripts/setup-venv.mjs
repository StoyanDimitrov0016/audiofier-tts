import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const venvDir = path.join(root, ".venv");
const requirementsPath = path.join(root, "requirements.txt");
const devRequirementsPath = path.join(root, "requirements-dev.txt");
const dependencyStatePath = path.join(venvDir, ".audiofier-dependencies.json");
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

function getRequirementsHash() {
  const hash = createHash("sha256");
  hash.update(readFileSync(requirementsPath));

  if (existsSync(devRequirementsPath)) {
    hash.update(readFileSync(devRequirementsPath));
  }

  return hash.digest("hex");
}

function readDependencyState() {
  if (!existsSync(dependencyStatePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(dependencyStatePath, "utf-8"));
  } catch {
    return null;
  }
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
  console.error("Delete audio-generator/.venv, then rerun npm run setup:audio.");
  process.exit(1);
}

if (!existsSync(pythonPath)) {
  const created =
    (process.platform === "win32" && run("py", ["-3.12", "-m", "venv", ".venv"])) ||
    run("python", ["-m", "venv", ".venv"]) ||
    run("python3", ["-m", "venv", ".venv"]);

  if (!created) {
    console.error("Could not create audio-generator/.venv. Install Python 3.12 and try again.");
    process.exit(1);
  }
}

const requirementsHash = getRequirementsHash();
const dependencyState = readDependencyState();

if (dependencyState?.requirementsHash === requirementsHash) {
  console.log("Python dependencies are up to date.");
  process.exit(0);
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

writeFileSync(
  dependencyStatePath,
  `${JSON.stringify(
    {
      requirementsHash,
      updatedAt: new Date().toISOString(),
    },
    null,
    2
  )}\n`,
  "utf-8"
);
