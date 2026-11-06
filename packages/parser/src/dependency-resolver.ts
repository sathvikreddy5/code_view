import path from "node:path";

export type ResolutionStatus = "resolved" | "external" | "unresolved";

export type ResolvedDependency = {
  source: string;
  targetPath: string | null;
  status: ResolutionStatus;
};

const SOURCE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
];

const EXTERNAL_SCHEMES = ["node:", "http:", "https:", "data:"];

function normalizeRepoPath(filePath: string): string {
  return path.posix.normalize(filePath.replace(/\\/g, "/"));
}

function isRelativeImport(source: string): boolean {
  return source.startsWith("./") || source.startsWith("../");
}

function isExternalImport(source: string): boolean {
  return EXTERNAL_SCHEMES.some((scheme) => source.startsWith(scheme));
}

function isSafeRepositoryPath(filePath: string): boolean {
  return (
    filePath !== ".." &&
    !filePath.startsWith("../") &&
    !path.posix.isAbsolute(filePath)
  );
}

function generateCandidates(basePath: string): string[] {
  const candidates = new Set<string>();

  // Case 1: Import explicitly includes an extension.
  candidates.add(basePath);

  // Case 2: Extensionless imports.
  for (const extension of SOURCE_EXTENSIONS) {
    candidates.add(`${basePath}${extension}`);
  }

  // Case 3: Directory imports resolved through index files.
  for (const extension of SOURCE_EXTENSIONS) {
    candidates.add(path.posix.join(basePath, `index${extension}`));
  }

  return [...candidates];
}

export function resolveDependency(
  importerPath: string,
  source: string,
  repositoryFiles: Set<string>,
): ResolvedDependency {
  const unresolved = (): ResolvedDependency => ({
    source,
    targetPath: null,
    status: "unresolved",
  });

  // Empty or invalid import.
  if (!source || source.trim() !== source) {
    return unresolved();
  }

  // External package imports and built-in modules.
  if (isExternalImport(source)) {
    return {
      source,
      targetPath: null,
      status: "external",
    };
  }

  // This initial resolver intentionally supports only
  // relative imports. Package imports need package.json
  // and workspace-aware resolution.
  if (!isRelativeImport(source)) {
    return {
      source,
      targetPath: null,
      status: "external",
    };
  }

  const importerDirectory = path.posix.dirname(normalizeRepoPath(importerPath));

  const basePath = normalizeRepoPath(
    path.posix.join(importerDirectory, source),
  );

  // Prevent imports from escaping the repository root.
  if (!isSafeRepositoryPath(basePath)) {
    return unresolved();
  }

  const candidates = generateCandidates(basePath);

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeRepoPath(candidate);

    if (
      isSafeRepositoryPath(normalizedCandidate) &&
      repositoryFiles.has(normalizedCandidate)
    ) {
      return {
        source,
        targetPath: normalizedCandidate,
        status: "resolved",
      };
    }
  }

  return unresolved();
}
