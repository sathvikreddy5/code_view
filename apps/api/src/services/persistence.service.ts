import path from "node:path";

import { prisma } from "../config/prisma.js";
import type { RepositoryScanResult } from "./repository-scanner.service.js";
import type { CompleteRepositoryAnalysis } from "./analysis.service.js";

type RepositoryMetadataInput = {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  defaultBranch: string;
  primaryLanguage: string | null;
  stars: number;
  forks: number;
  sizeKb: number;
};

type CommitMetadataInput = {
  sha: string;
  message: string;
  author: string | null;
  date: string | null;
};

type PersistAnalysisInput = {
  repository: RepositoryMetadataInput;
  commit: CommitMetadataInput;
  branch: string;
  result: CompleteRepositoryAnalysis;
  durationMs?: number;
};

type FlatTreeNode = {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  purpose: string;
  language?: string;
  sizeBytes?: number;
  parentPath: string | null;
  depth: number;
};

function flattenTree(
  node: RepositoryScanResult["tree"],
  parentPath: string | null = null,
  depth = 0,
  result: FlatTreeNode[] = [],
): FlatTreeNode[] {
  result.push({
    id: node.id,
    name: node.name,
    path: node.path,
    type: node.type,
    purpose: node.purpose,
    language: node.language,
    sizeBytes: node.sizeBytes,
    parentPath,
    depth,
  });

  for (const child of node.children ?? []) {
    flattenTree(child, node.path, depth + 1, result);
  }

  return result;
}

function parseCommitDate(value: string | null): Date | null {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

export type PersistAnalysisResult = {
  repositoryId: string;
  analysisId: string;
  reusedExistingAnalysis: boolean;
};

export async function persistRepositoryAnalysis(
  input: PersistAnalysisInput,
): Promise<PersistAnalysisResult> {
  const { repository, commit, result } = input;

  return prisma.$transaction(
    async (tx) => {
      // 1. Find or create the GitHub repository.
      const savedRepository = await tx.repository.upsert({
        where: {
          githubId: BigInt(repository.id),
        },
        create: {
          githubId: BigInt(repository.id),
          owner: repository.owner,
          name: repository.name,
          fullName: repository.fullName,
          url: repository.url,
          description: repository.description,
          defaultBranch: repository.defaultBranch,
          primaryLanguage: repository.primaryLanguage,
          stars: repository.stars,
          forks: repository.forks,
          sizeKb: repository.sizeKb,
        },
        update: {
          owner: repository.owner,
          name: repository.name,
          fullName: repository.fullName,
          url: repository.url,
          description: repository.description,
          defaultBranch: repository.defaultBranch,
          primaryLanguage: repository.primaryLanguage,
          stars: repository.stars,
          forks: repository.forks,
          sizeKb: repository.sizeKb,
        },
      });

      // 2. Check whether this exact commit was already analyzed.
      const existingAnalysis = await tx.analysis.findUnique({
        where: {
          repositoryId_commitSha: {
            repositoryId: savedRepository.id,
            commitSha: commit.sha,
          },
        },
      });

      if (existingAnalysis?.status === "COMPLETED") {
        return {
          repositoryId: savedRepository.id,
          analysisId: existingAnalysis.id,
          reusedExistingAnalysis: true,
        };
      }

      // 3. Create or reset an incomplete analysis.
      const savedAnalysis = existingAnalysis
        ? await tx.analysis.update({
            where: { id: existingAnalysis.id },
            data: {
              status: "PROCESSING",
              branch: input.branch,
              commitMessage: commit.message,
              commitAuthor: commit.author,
              commitDate: parseCommitDate(commit.date),
              startedAt: new Date(),
              completedAt: null,
              errorMessage: null,
            },
          })
        : await tx.analysis.create({
            data: {
              repositoryId: savedRepository.id,
              commitSha: commit.sha,
              branch: input.branch,
              commitMessage: commit.message,
              commitAuthor: commit.author,
              commitDate: parseCommitDate(commit.date),
              status: "PROCESSING",
              startedAt: new Date(),
              parserVersion: "1.0.0",
              analyzerVersion: "1.0.0",
            },
          });

      // Remove previous incomplete analysis data before retrying.
      if (existingAnalysis) {
        await tx.dependencyEdge.deleteMany({
          where: { analysisId: savedAnalysis.id },
        });

        await tx.fileNode.deleteMany({
          where: { analysisId: savedAnalysis.id },
        });

        await tx.analysisMetric.deleteMany({
          where: { analysisId: savedAnalysis.id },
        });
      }

      // 4. Flatten the repository tree and save its files/folders.
      const flatNodes = flattenTree(result.scan.tree);
      const nodeIdByPath = new Map<string, string>();

      const maxDepth = Math.max(0, ...flatNodes.map((node) => node.depth));

      for (let depth = 0; depth <= maxDepth; depth += 1) {
        const currentLevel = flatNodes.filter((node) => node.depth === depth);

        const rows = currentLevel.map((node) => {
          const parentPath = node.parentPath;
          const parentId =
            parentPath === null ? null : nodeIdByPath.get(parentPath);

          if (parentPath !== null && !parentId) {
            throw new Error(
              `Parent node not found for repository path: ${node.path}`,
            );
          }

          return {
            analysisId: savedAnalysis.id,
            parentId: parentId ?? null,
            path: node.path,
            name: node.name,
            extension:
              node.type === "file"
                ? path.extname(node.name).toLowerCase() || null
                : null,
            language: node.language ?? null,
            purpose: node.purpose,
            type:
              node.type === "file" ? ("FILE" as const) : ("DIRECTORY" as const),
            sizeBytes: BigInt(node.sizeBytes ?? 0),
          };
        });

        for (const batch of chunkArray(rows, 1000)) {
          const createdNodes = await tx.fileNode.createManyAndReturn({
            data: batch,
            select: {
              id: true,
              path: true,
            },
          });

          for (const createdNode of createdNodes) {
            nodeIdByPath.set(createdNode.path, createdNode.id);
          }
        }
      }

      // 5. Save graph connectivity metrics on file nodes.
      const graphNodes = result.codeAnalysis.graph.nodes;

      for (const batch of chunkArray(graphNodes, 500)) {
        for (const node of batch) {
          const nodeId = nodeIdByPath.get(node.id);

          if (!nodeId) {
            throw new Error(
              `Graph node missing from repository tree: ${node.id}`,
            );
          }

          await tx.fileNode.update({
            where: { id: nodeId },
            data: {
              fanIn: node.fanIn,
              fanOut: node.fanOut,
            },
          });
        }
      }

      // 6. Save all import relationships and resolution results.
      const importKindMap = {
        import: "IMPORT",
        "re-export": "RE_EXPORT",
        require: "REQUIRE",
        "dynamic-import": "DYNAMIC_IMPORT",
      } as const;

      const resolutionMap = {
        resolved: "RESOLVED",
        external: "EXTERNAL",
        unresolved: "UNRESOLVED",
      } as const;

      const edgeRows = result.codeAnalysis.graph.edges.map((edge) => {
        const sourceNodeId = nodeIdByPath.get(edge.source);

        if (!sourceNodeId) {
          throw new Error(
            `Dependency source missing from repository tree: ${edge.source}`,
          );
        }

        const targetNodeId = edge.target
          ? (nodeIdByPath.get(edge.target) ?? null)
          : null;

        if (edge.resolution === "resolved" && !targetNodeId) {
          throw new Error(
            `Resolved dependency target missing from repository tree: ${edge.target}`,
          );
        }

        return {
          analysisId: savedAnalysis.id,
          sourceNodeId,
          targetNodeId,
          importSource: edge.importSource,
          importKind: importKindMap[edge.importKind],
          resolution: resolutionMap[edge.resolution],
          line: edge.line,
        };
      });

      for (const batch of chunkArray(edgeRows, 1000)) {
        if (batch.length > 0) {
          await tx.dependencyEdge.createMany({
            data: batch,
          });
        }
      }

      // 7. Save analysis metrics.
      const graphMetrics = result.codeAnalysis.graph.metrics;
      const scanStats = result.scan.stats;

      await tx.analysisMetric.upsert({
        where: {
          analysisId: savedAnalysis.id,
        },
        create: {
          analysisId: savedAnalysis.id,
          totalFiles: scanStats.totalFiles,
          totalFolders: scanStats.totalFolders,
          parsedFiles: result.codeAnalysis.parsedFiles,
          skippedFiles: result.codeAnalysis.skippedFiles,
          syntaxErrorFiles: result.codeAnalysis.syntaxErrorFiles.length,
          failedFiles: result.codeAnalysis.fileErrors.length,
          totalNodes: graphMetrics.totalNodes,
          totalEdges: graphMetrics.totalEdges,
          resolvedEdges: graphMetrics.resolvedEdges,
          externalEdges: graphMetrics.externalImports,
          unresolvedEdges: graphMetrics.unresolvedImports,
          circularDependencies: graphMetrics.circularDependencyGroups.length,
          totalSizeBytes: BigInt(scanStats.totalSizeBytes),
          languageCounts: scanStats.languages,
          analysisDurationMs: input.durationMs ?? null,
        },
        update: {
          totalFiles: scanStats.totalFiles,
          totalFolders: scanStats.totalFolders,
          parsedFiles: result.codeAnalysis.parsedFiles,
          skippedFiles: result.codeAnalysis.skippedFiles,
          syntaxErrorFiles: result.codeAnalysis.syntaxErrorFiles.length,
          failedFiles: result.codeAnalysis.fileErrors.length,
          totalNodes: graphMetrics.totalNodes,
          totalEdges: graphMetrics.totalEdges,
          resolvedEdges: graphMetrics.resolvedEdges,
          externalEdges: graphMetrics.externalImports,
          unresolvedEdges: graphMetrics.unresolvedImports,
          circularDependencies: graphMetrics.circularDependencyGroups.length,
          totalSizeBytes: BigInt(scanStats.totalSizeBytes),
          languageCounts: scanStats.languages,
          analysisDurationMs: input.durationMs ?? null,
        },
      });

      // 8. Mark the analysis completed after all writes succeed.
      await tx.analysis.update({
        where: { id: savedAnalysis.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      return {
        repositoryId: savedRepository.id,
        analysisId: savedAnalysis.id,
        reusedExistingAnalysis: false,
      };
    },
    {
      maxWait: 10_000,
      timeout: 120_000,
    },
  );
}
