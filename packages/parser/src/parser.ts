import { Language, Parser } from "web-tree-sitter";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type SupportedSourceLanguage = "javascript" | "typescript" | "tsx";

const wasmDirectory = fileURLToPath(new URL("../wasm/", import.meta.url));

const grammarFiles: Record<SupportedSourceLanguage, string> = {
  javascript: "tree-sitter-javascript.wasm",
  typescript: "tree-sitter-typescript.wasm",
  tsx: "tree-sitter-tsx.wasm",
};

const languageCache = new Map<
  SupportedSourceLanguage,
  Awaited<ReturnType<typeof Language.load>>
>();

let runtimeInitialization: Promise<void> | undefined;

async function initializeRuntime(): Promise<void> {
  runtimeInitialization ??= Parser.init();
  await runtimeInitialization;
}

export async function loadLanguage(language: SupportedSourceLanguage) {
  await initializeRuntime();

  const cached = languageCache.get(language);

  if (cached) {
    return cached;
  }

  const grammarPath = path.join(wasmDirectory, grammarFiles[language]);

  const grammar = await Language.load(grammarPath);
  languageCache.set(language, grammar);

  return grammar;
}

export function detectSourceLanguage(
  filePath: string,
): SupportedSourceLanguage | null {
  const extension = path.extname(filePath).toLowerCase();

  if ([".js", ".jsx", ".mjs", ".cjs"].includes(extension)) {
    return "javascript";
  }

  if ([".ts", ".mts", ".cts"].includes(extension)) {
    return "typescript";
  }

  if (extension === ".tsx") {
    return "tsx";
  }

  return null;
}

export async function parseSource(
  source: string,
  language: SupportedSourceLanguage,
) {
  if (source.length > 1_000_000) {
    throw new Error("Source file exceeds the 1 MB parser limit.");
  }

  await initializeRuntime();

  const grammar = await loadLanguage(language);
  const parser = new Parser();

  try {
    parser.setLanguage(grammar);

    const tree = parser.parse(source);

    if (!tree) {
      throw new Error("Tree-sitter could not parse this source file.");
    }

    return {
      tree,
      hasSyntaxErrors: tree.rootNode.hasError,
    };
  } finally {
    parser.delete();
  }
}
