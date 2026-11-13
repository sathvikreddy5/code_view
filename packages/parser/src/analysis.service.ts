import path from "node:path";
import { readFile } from "node:fs/promises";
import { detectSourceLanguage, parseSource } from "./parser.js";
import { extractImports } from "./js-import-extractor.js";
import { resolveDependency } from "./dependency-resolver.js";
import {
  buildDependencyGraph,
  type FileDependencyInput,
} from "./dependency-graph.js";

type ScannableNode = {
  path: string;
  type: "file" | "folder";
  children?: ScannableNode[];
};

export type CodeAnalysisResult = {
  graph: ReturnType<typeof buildDependencyGraph>;
  parsedFiles: number;
  skippedFiles: number;
  syntaxErrorFiles: string[];
  fileErrors: Array<{
    path: string;
    message: string;
  }>;
};

const MAX_SOURCE_FILE_BYTES = 1 * 1024 * 1024;

function collectFiles(node: ScannableNode, result: string[] = []): string[] {
  if (node.type === "file") {
    result.push(node.path);
  }

  for (const child of node.children ?? []) {
    collectFiles(child, result);
  }

  return result;
}

export async function analyzeRepository(
  rootDir: string,
  tree: ScannableNode,
): Promise<CodeAnalysisResult> {
  const allPaths = collectFiles(tree);

  const supportedFiles = allPaths.filter((filePath) =>
    detectSourceLanguage(filePath),
  );

  const repositoryFiles = new Set(supportedFiles);

  const fileInputs: FileDependencyInput[] = [];
  const syntaxErrorFiles: string[] = [];
  const fileErrors: CodeAnalysisResult["fileErrors"] = [];

  let parsedFiles = 0;
  let skippedFiles = allPaths.length - supportedFiles.length;

  for (const filePath of supportedFiles) {
    const language = detectSourceLanguage(filePath);

    if (!language) {
      skippedFiles += 1;
      continue;
    }

    try {
      const absolutePath = path.resolve(rootDir, filePath);
      const sourceBuffer = await readFile(absolutePath);

      if (sourceBuffer.byteLength > MAX_SOURCE_FILE_BYTES) {
        skippedFiles += 1;

        fileErrors.push({
          path: filePath,
          message: "Source file exceeds the 1 MB parser limit.",
        });

        continue;
      }

      const source = sourceBuffer.toString("utf8");
      const parsed = await parseSource(source, language);

      let extractedImports: ReturnType<typeof extractImports>;

      try {
        if (parsed.hasSyntaxErrors) {
          syntaxErrorFiles.push(filePath);
        }

        extractedImports = extractImports(parsed.tree.rootNode);
      } finally {
        parsed.tree.delete();
      }

      const dependencies = extractedImports.map((dependency) => ({
        ...resolveDependency(filePath, dependency.source, repositoryFiles),
        kind: dependency.kind,
        line: dependency.line,
      }));

      fileInputs.push({
        filePath,
        dependencies,
      });

      parsedFiles += 1;
    } catch (error) {
      skippedFiles += 1;

      fileErrors.push({
        path: filePath,
        message:
          error instanceof Error ? error.message : "Unknown parser error.",
      });
    }
  }

  return {
    graph: buildDependencyGraph(fileInputs),
    parsedFiles,
    skippedFiles,
    syntaxErrorFiles,
    fileErrors,
  };
}
