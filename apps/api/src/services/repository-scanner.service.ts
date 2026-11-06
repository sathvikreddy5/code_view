import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export type RepositoryPurpose =
  | "source"
  | "tests"
  | "docs"
  | "config"
  | "build"
  | "examples"
  | "generated"
  | "vendor"
  | "other";

export type RepositoryTreeNode = {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  purpose: RepositoryPurpose;
  language?: string;
  sizeBytes?: number;
  children?: RepositoryTreeNode[];
};

export type RepositoryScanResult = {
  tree: RepositoryTreeNode;
  stats: {
    totalFiles: number;
    totalFolders: number;
    totalSizeBytes: number;
    languages: Record<string, number>;
  };
};

const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "vendor",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "coverage",
  ".turbo",
  ".cache",
  "out",
  "target",
  "__pycache__",
]);

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".mts": "TypeScript",
  ".cts": "TypeScript",
  ".py": "Python",
  ".java": "Java",
  ".go": "Go",
  ".rs": "Rust",
  ".c": "C",
  ".h": "C",
  ".cpp": "C++",
  ".hpp": "C++",
  ".cc": "C++",
  ".cs": "C#",
  ".php": "PHP",
  ".rb": "Ruby",
  ".swift": "Swift",
  ".kt": "Kotlin",
  ".kts": "Kotlin",
  ".html": "HTML",
  ".css": "CSS",
  ".scss": "SCSS",
  ".json": "JSON",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".md": "Markdown",
  ".sql": "SQL",
  ".sh": "Shell",
  ".xml": "XML",
  ".vue": "Vue",
  ".svelte": "Svelte",
};

const MAX_FILES = 10_000;
const MAX_TOTAL_SIZE = 200 * 1024 * 1024;

function toRelativePath(value: string): string {
  return value.split(path.sep).join("/");
}

function detectPurpose(
  name: string,
  relativePath: string,
  isDirectory: boolean,
): RepositoryPurpose {
  const normalized = relativePath.toLowerCase();
  const lowerName = name.toLowerCase();

  if (normalized.includes("node_modules/") || normalized.includes("vendor/")) {
    return "vendor";
  }

  if (
    lowerName.includes("generated") ||
    lowerName.includes(".min.") ||
    normalized.includes("/generated/")
  ) {
    return "generated";
  }

  if (
    lowerName.includes("test") ||
    lowerName.includes("spec") ||
    normalized.includes("/tests/") ||
    normalized.includes("/__tests__/")
  ) {
    return "tests";
  }

  if (
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".mdx") ||
    lowerName === "docs" ||
    normalized.startsWith("docs/")
  ) {
    return "docs";
  }

  if (
    lowerName.startsWith(".") ||
    lowerName.includes("config") ||
    lowerName.includes("lock") ||
    lowerName === "dockerfile" ||
    lowerName === "makefile" ||
    lowerName === "package.json"
  ) {
    return "config";
  }

  if (
    lowerName === "examples" ||
    lowerName === "example" ||
    normalized.includes("/examples/")
  ) {
    return "examples";
  }

  if (
    lowerName === "scripts" ||
    lowerName === "dist" ||
    lowerName === "build"
  ) {
    return "build";
  }

  if (isDirectory) {
    return "other";
  }

  return "source";
}

export async function scanRepository(
  rootDir: string,
): Promise<RepositoryScanResult> {
  const stats = {
    totalFiles: 0,
    totalFolders: 0,
    totalSizeBytes: 0,
    languages: {} as Record<string, number>,
  };

  async function scanDirectory(
    absoluteDirectory: string,
    relativeDirectory: string,
  ): Promise<RepositoryTreeNode[]> {
    const entries = await readdir(absoluteDirectory, {
      withFileTypes: true,
    });

    entries.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) {
        return a.isDirectory() ? -1 : 1;
      }

      return a.name.localeCompare(b.name);
    });

    const nodes: RepositoryTreeNode[] = [];

    for (const entry of entries) {
      // Never follow symbolic links.
      if (entry.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      if (!entry.isDirectory() && !entry.isFile()) {
        continue;
      }

      const relativePath = relativeDirectory
        ? `${relativeDirectory}/${entry.name}`
        : entry.name;

      const absolutePath = path.join(absoluteDirectory, entry.name);

      const normalizedPath = toRelativePath(relativePath);
      const isDirectory = entry.isDirectory();

      if (isDirectory) {
        stats.totalFolders += 1;

        const children = await scanDirectory(absolutePath, normalizedPath);

        nodes.push({
          id: normalizedPath,
          name: entry.name,
          path: normalizedPath,
          type: "folder",
          purpose: detectPurpose(entry.name, normalizedPath, true),
          children,
        });

        continue;
      }

      const fileStats = await stat(absolutePath);

      stats.totalFiles += 1;
      stats.totalSizeBytes += fileStats.size;

      if (stats.totalFiles > MAX_FILES) {
        throw new Error(
          `Repository exceeds the ${MAX_FILES} file scanning limit.`,
        );
      }

      if (stats.totalSizeBytes > MAX_TOTAL_SIZE) {
        throw new Error("Repository exceeds the 200 MB scanning limit.");
      }

      const extension = path.extname(entry.name).toLowerCase();
      const language = LANGUAGE_BY_EXTENSION[extension];

      if (language) {
        stats.languages[language] = (stats.languages[language] ?? 0) + 1;
      }

      nodes.push({
        id: normalizedPath,
        name: entry.name,
        path: normalizedPath,
        type: "file",
        purpose: detectPurpose(entry.name, normalizedPath, false),
        language,
        sizeBytes: fileStats.size,
      });
    }

    return nodes;
  }

  const children = await scanDirectory(rootDir, "");

  return {
    tree: {
      id: "root",
      name: "repository",
      path: "",
      type: "folder",
      purpose: "source",
      children,
    },
    stats,
  };
}
