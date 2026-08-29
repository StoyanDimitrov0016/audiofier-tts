import path from "node:path";

const WEB_WORKSPACE_DIRECTORY = "web";
const DEFAULT_STORAGE_DIRECTORY = "storage";

const cwd = process.cwd();
const repositoryRoot =
  path.basename(cwd) === WEB_WORKSPACE_DIRECTORY ? path.resolve(cwd, "..") : cwd;

function resolveFromRepositoryRoot(value: string | undefined, fallback: string) {
  if (!value) {
    return path.resolve(repositoryRoot, fallback);
  }

  return path.isAbsolute(value) ? value : path.resolve(repositoryRoot, value);
}

export const storagePaths = {
  repositoryRoot,
  storageRoot: resolveFromRepositoryRoot(
    process.env.AUDIOFIER_STORAGE_DIR,
    DEFAULT_STORAGE_DIRECTORY
  ),
};
