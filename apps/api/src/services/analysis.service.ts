import { analyzeRepository, type CodeAnalysisResult } from "@codemap/parser";

import {
  scanRepository,
  type RepositoryScanResult,
} from "./repository-scanner.service.js";

export type CompleteRepositoryAnalysis = {
  scan: RepositoryScanResult;
  codeAnalysis: CodeAnalysisResult;
};

export async function analyzeExtractedRepository(
  rootDir: string,
): Promise<CompleteRepositoryAnalysis> {
  // First build the real repository tree.
  const scan = await scanRepository(rootDir);

  // Then parse supported source files and build the graph.
  const codeAnalysis = await analyzeRepository(rootDir, scan.tree);

  return {
    scan,
    codeAnalysis,
  };
}
