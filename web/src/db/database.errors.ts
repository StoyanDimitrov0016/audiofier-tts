const POSTGRES_UNIQUE_VIOLATION_CODE = "23505";

export function isUniqueConstraintError(error: unknown, constraint: string) {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === POSTGRES_UNIQUE_VIOLATION_CODE &&
    "constraint" in error &&
    error.constraint === constraint
  );
}
