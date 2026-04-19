import promises from "node:fs/promises";
import path from "node:path";

type JsonSchema<T> = {
  parse: (value: unknown) => T;
};

export function nowIso() {
  return new Date().toISOString();
}

export function slugify(value: string, options?: { fallback?: string; maxLength?: number }) {
  const fallback = options?.fallback ?? "item";
  const maxLength = options?.maxLength ?? 72;
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, maxLength);

  return slug || fallback;
}

export async function pathExists(filePath: string) {
  try {
    await promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath: string) {
  await promises.mkdir(dirPath, { recursive: true });
}

export async function readJson<T>(filePath: string, schema: JsonSchema<T>) {
  const raw = await promises.readFile(filePath, "utf-8");
  return schema.parse(JSON.parse(raw));
}

export async function writeJson(filePath: string, value: unknown) {
  await ensureDir(path.dirname(filePath));
  await promises.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

export async function uniqueId(
  base: string,
  exists: (id: string) => Promise<boolean>,
  options?: { fallback?: string; maxAttempts?: number; maxLength?: number },
) {
  const stem = slugify(base, {
    fallback: options?.fallback,
    maxLength: options?.maxLength,
  });

  if (!(await exists(stem))) {
    return stem;
  }

  const maxAttempts = options?.maxAttempts ?? 1000;

  for (let index = 2; index < maxAttempts; index += 1) {
    const candidate = `${stem}-${index}`;

    if (!(await exists(candidate))) {
      return candidate;
    }
  }

  throw new Error(`Could not create a unique id for ${base}.`);
}
