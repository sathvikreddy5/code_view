import { Router } from "express";
import { z } from "zod";

import {
  getRepositoryMetadata,
  downloadRepositoryArchive,
} from "../services/github.service.js";
import { persistRepositoryAnalysis } from "../services/persistence.service.js";

import { analyzeExtractedRepository } from "../services/analysis.service.js";

import { extractRepositoryArchive } from "../utils/safe-extract.js";

const router = Router();

const createRepositorySchema = z.object({
  url: z.string().url("A valid repository URL is required."),
});

router.post("/", async (req, res) => {
  let cleanup: (() => Promise<void>) | undefined;

  try {
    const validation = createRepositorySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid request.",
        errors: validation.error.flatten(),
      });
    }

    // 1. Get GitHub metadata and the pinned commit.
    const metadata = await getRepositoryMetadata(validation.data.url);

    // GitHub may redirect renamed or transferred repositories.
    const canonicalParts = metadata.repository.full_name.split("/");

    if (canonicalParts.length !== 2) {
      throw new Error("GitHub returned an invalid canonical repository name.");
    }

    const [owner, repositoryName] = canonicalParts;

    // 2. Download the exact commit archive.
    const archive = await downloadRepositoryArchive(
      owner,
      repositoryName,
      metadata.commit.sha,
    );

    // 3. Safely extract the downloaded archive.
    const extracted = await extractRepositoryArchive(archive);
    cleanup = extracted.cleanup;

    // 4. Scan the repository and build its dependency graph.
    const result = await analyzeExtractedRepository(extracted.rootDir);

    const persistence = await persistRepositoryAnalysis({
      repository: {
        id: metadata.repository.id,
        owner,
        name: metadata.repository.name,
        fullName: metadata.repository.full_name,
        url: metadata.repository.html_url,
        description: metadata.repository.description,
        defaultBranch: metadata.repository.default_branch,
        primaryLanguage: metadata.repository.language,
        stars: metadata.repository.stargazers_count,
        forks: metadata.repository.forks_count,
        sizeKb: metadata.repository.size,
      },

      commit: {
        sha: metadata.commit.sha,
        message: metadata.commit.commit.message,
        author: metadata.commit.commit.author?.name ?? null,
        date: metadata.commit.commit.author?.date ?? null,
      },

      branch: metadata.repository.default_branch,
      result,
    });

    // 5. Return the complete analysis.
    return res.status(200).json({
      success: true,
      message: "Repository analyzed successfully.",

      repository: {
        githubId: metadata.repository.id,
        owner,
        name: metadata.repository.name,
        fullName: metadata.repository.full_name,
        url: metadata.repository.html_url,
        description: metadata.repository.description,
        defaultBranch: metadata.repository.default_branch,
        primaryLanguage: metadata.repository.language,
        stars: metadata.repository.stargazers_count,
        forks: metadata.repository.forks_count,
        sizeKb: metadata.repository.size,
      },

      commit: {
        sha: metadata.commit.sha,
        message: metadata.commit.commit.message,
        author: metadata.commit.commit.author?.name ?? null,
        date: metadata.commit.commit.author?.date ?? null,
      },

      analysis: {
        status: "completed",
        ...result.scan.stats,

        parser: {
          parsedFiles: result.codeAnalysis.parsedFiles,
          skippedFiles: result.codeAnalysis.skippedFiles,
          syntaxErrorFiles: result.codeAnalysis.syntaxErrorFiles,
          fileErrors: result.codeAnalysis.fileErrors,
        },

        graph: result.codeAnalysis.graph.metrics,
      },
      persistence: {
        repositoryId: persistence.repositoryId,
        analysisId: persistence.analysisId,
        reusedExistingAnalysis: persistence.reusedExistingAnalysis,
      },

      tree: result.scan.tree,

      graph: result.codeAnalysis.graph,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    console.error("Repository analysis failed:", error);

    const isNotFound =
      message.includes("not found") ||
      message.includes("not publicly accessible");

    const isRateLimited = message.includes("rate limit");

    const isClientError =
      message.startsWith("Only standard HTTPS") ||
      message.startsWith("Use a URL") ||
      message.startsWith("Invalid") ||
      message.includes("Private repositories") ||
      message.includes("Archived repositories");

    const statusCode = isRateLimited
      ? 429
      : isNotFound
        ? 404
        : isClientError
          ? 400
          : 502;

    return res.status(statusCode).json({
      success: false,
      message: "Repository analysis failed.",
      error: message,
    });
  } finally {
    if (cleanup) {
      try {
        await cleanup();
      } catch (cleanupError) {
        console.error("Temporary repository cleanup failed:", cleanupError);
      }
    }
  }
});

export default router;
