import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const failures = [];

function run(command, args = []) {
  return spawnSync(command, args, { cwd: root, encoding: "utf8", shell: false });
}

function checkCommand(label, command, args, expected) {
  const result = run(command, args);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim().split("\n")[0];
  const ok = !result.error && result.status === 0 && (!expected || expected.test(output));
  console.log(`${ok ? "OK" : "FAIL"} ${label}: ${output || result.error?.message || "not found"}`);
  if (!ok) failures.push(label);
}

function checkFile(label, relativePath) {
  const fullPath = path.join(root, relativePath);
  const ok = existsSync(fullPath);
  console.log(`${ok ? "OK" : "FAIL"} ${label}: ${fullPath}`);
  if (!ok) failures.push(label);
}

const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const expectedNpm = packageJson.packageManager.split("@").at(-1);

checkCommand("Node 24", "node", ["--version"], /^v24\./);
checkCommand(
  "locked npm",
  process.env.ComSpec ?? "cmd.exe",
  ["/d", "/s", "/c", "npm --version"],
  new RegExp(`^${expectedNpm.replaceAll(".", "\\.")}$`)
);
checkCommand("FNM", "fnm", ["--version"]);
checkCommand("uv", "uv", ["--version"]);
checkCommand("FFmpeg", "ffmpeg", ["-version"]);
checkCommand("FFprobe", "ffprobe", ["-version"]);
checkCommand("SoX", "sox", ["--version"]);
checkCommand("NVIDIA driver", "nvidia-smi", ["--query-gpu=name,driver_version", "--format=csv,noheader"]);
checkCommand("uv lock", "uv", ["lock", "--project", "audio-generator", "--check"]);
checkCommand(
  "Python 3.12 environment",
  "uv",
  ["run", "--project", "audio-generator", "--frozen", "python", "--version"],
  /^Python 3\.12\./
);
checkCommand(
  "Python packages",
  "uv",
  [
    "run",
    "--project",
    "audio-generator",
    "--frozen",
    "python",
    "-c",
    "import importlib.util, torch; names=('fastapi', 'kokoro', 'qwen_tts'); missing=[name for name in names if importlib.util.find_spec(name) is None]; assert not missing, missing; print('packages found; CUDA available:', torch.cuda.is_available())",
  ],
  /CUDA available: True$/
);

checkFile("Kokoro config", ".local-tts-ai/models/kokoro-82m/config.json");
checkFile("Kokoro weights", ".local-tts-ai/models/kokoro-82m/kokoro-v1_0.pth");
for (const size of ["0-6b", "1-7b"]) {
  checkFile(`Qwen ${size} config`, `.local-tts-ai/models/qwen3-tts-${size}-custom/config.json`);
  checkFile(`Qwen ${size} weights`, `.local-tts-ai/models/qwen3-tts-${size}-custom/model.safetensors`);
}

const ollama = run("ollama", ["--version"]);
if (!ollama.error && ollama.status === 0) {
  console.log(`INFO Ollama (optional): ${ollama.stdout.trim()}`);
}

if (failures.length > 0) {
  console.error(`\nDoctor found ${failures.length} problem(s): ${failures.join(", ")}`);
  process.exit(1);
}

console.log("\nToolchain and local runtime checks passed.");
