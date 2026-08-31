import { DEFAULT_SLUG_FALLBACK, DEFAULT_SLUG_MAX_LENGTH } from "./storage.constants";

export function slugify(value: string, options?: { fallback?: string; maxLength?: number }) {
  const fallback = options?.fallback ?? DEFAULT_SLUG_FALLBACK;
  const maxLength = options?.maxLength ?? DEFAULT_SLUG_MAX_LENGTH;
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, maxLength);

  return slug || fallback;
}
