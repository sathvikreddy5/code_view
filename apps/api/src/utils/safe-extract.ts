import * as tar from "tar";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ReadEntry } from "tar";
import type { Stats } from "node:fs";

const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
const MAX_EXTRACTED_BYTES = 200 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_ENTRIES = 10_000;

export type ExtractedRepository = {
  rootDir: string;
  cleanup: () => Promise<void>;
};

export async function extractRepositoryArchive(
  archive: Uint8Array,
): Promise<ExtractedRepository> {
  if (archive.byteLength === 0) {
    throw new Error("Cannot extract an empty repository archive.");
  }

  if (archive.byteLength > MAX_ARCHIVE_BYTES) {
    throw new Error("Archive exceeds the 100 MB download limit.");
  }

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "codemap-"));

  const archivePath = path.join(tempRoot, "repository.tar.gz");
  const rootDir = path.join(tempRoot, "repository");

  try {
    await mkdir(rootDir, { recursive: true });
    await writeFile(archivePath, archive);

    let entryCount = 0;
    let extractedBytes = 0;
    let skippedLargeFiles = 0;

    await tar.x({
      file: archivePath,
      cwd: rootDir,

      // GitHub archives contain one top-level directory.
      strip: 1,

      // Keep the extraction library's path protections enabled.
      preservePaths: false,
      unlink: true,
      strict: true,

      filter: (entryPath, entry: ReadEntry | Stats) => {
        entryCount += 1;

        if (entryCount > MAX_ENTRIES) {
          throw new Error("Repository contains too many archive entries.");
        }

        const normalizedPath = path.posix.normalize(
          entryPath.replace(/\\/g, "/"),
        );

        const pathSegments = normalizedPath.split("/");

        if (
          normalizedPath.startsWith("/") ||
          /^[a-zA-Z]:/.test(normalizedPath) ||
          pathSegments.includes("..")
        ) {
          throw new Error("Unsafe path detected in repository archive.");
        }

        if (!("type" in entry)) {
          throw new Error("Unexpected archive entry metadata.");
        }

        // Reject symbolic links and hard links entirely.
        if (entry.type === "SymbolicLink" || entry.type === "Link") {
          return false;
        }

        // Only extract ordinary files and directories.
        if (entry.type !== "File" && entry.type !== "Directory") {
          return false;
        }

        if (entry.type === "File") {
          const fileSize = entry.size ?? 0;

          // Skip oversized files instead of crashing extraction.
          if (fileSize > MAX_FILE_BYTES) {
            skippedLargeFiles++;

            console.warn(
              `[CodeMap] Skipping oversized file (${(
                fileSize /
                (1024 * 1024)
              ).toFixed(2)} MB): ${entryPath}`,
            );

            return false;
          }

          extractedBytes += fileSize;

          // Retain the overall extracted-size protection.
          if (extractedBytes > MAX_EXTRACTED_BYTES) {
            throw new Error(
              "Repository exceeds the 200 MB extracted-size limit.",
            );
          }
        }

        return true;
      },
    });

    console.log(
      `[CodeMap] Repository extraction completed. Skipped ${skippedLargeFiles} oversized file(s).`,
    );

    return {
      rootDir,
      cleanup: async () => {
        await rm(tempRoot, {
          recursive: true,
          force: true,
        });
      },
    };
  } catch (error) {
    await rm(tempRoot, {
      recursive: true,
      force: true,
    });

    throw error;
  }
}
