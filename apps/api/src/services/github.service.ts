export type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  private: boolean;
  fork: boolean;
  archived: boolean;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  size: number;
};

export type GitHubCommit = {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    } | null;
  };
};

export type RepositoryMetadata = {
  owner: string;
  name: string;
  repository: GitHubRepository;
  commit: GitHubCommit;
};

const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;

function parseGitHubUrl(url: string) {
  const parsed = new URL(url);

  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "github.com" ||
    parsed.port !== "" ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error(
      "Only standard HTTPS GitHub repository URLs are supported.",
    );
  }

  const segments = parsed.pathname
    .replace(/\/+$/, "")
    .split("/")
    .filter(Boolean);

  if (segments.length !== 2) {
    throw new Error("Use a URL in the format github.com/owner/repository.");
  }

  const [owner, rawName] = segments;
  const name = rawName.replace(/\.git$/i, "");

  if (
    !owner ||
    !name ||
    owner === "." ||
    owner === ".." ||
    name === "." ||
    name === ".."
  ) {
    throw new Error("Invalid GitHub repository owner or name.");
  }

  return { owner, name };
}

async function githubGet<T>(endpoint: string): Promise<T> {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "CodeMap",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (response.status === 404) {
    throw new Error(
      "Repository or commit not found, or not publicly accessible.",
    );
  }

  if (response.status === 403 || response.status === 429) {
    throw new Error("GitHub API rate limit reached. Try again later.");
  }

  if (!response.ok) {
    throw new Error(`GitHub API returned HTTP ${response.status}.`);
  }

  return (await response.json()) as T;
}

export async function getRepositoryMetadata(
  url: string,
): Promise<RepositoryMetadata> {
  const { owner, name } = parseGitHubUrl(url);

  const encodedOwner = encodeURIComponent(owner);
  const encodedName = encodeURIComponent(name);

  const repository = await githubGet<GitHubRepository>(
    `/repos/${encodedOwner}/${encodedName}`,
  );

  if (repository.private) {
    throw new Error("Private repositories are not supported yet.");
  }

  if (repository.archived) {
    throw new Error("Archived repositories are not supported yet.");
  }

  const commit = await githubGet<GitHubCommit>(
    `/repos/${encodedOwner}/${encodedName}/commits/${encodeURIComponent(
      repository.default_branch,
    )}`,
  );

  return {
    owner,
    name: repository.name,
    repository,
    commit,
  };
}

/**
 * Downloads the archive for one exact commit.
 * The compressed download is limited to 100 MB.
 *
 * Returns the archive bytes. Extraction is handled separately.
 */
export async function downloadRepositoryArchive(
  owner: string,
  repository: string,
  commitSha: string,
): Promise<Uint8Array> {
  if (!/^[a-f0-9]{40}$/i.test(commitSha)) {
    throw new Error("Invalid commit SHA.");
  }

  const endpoint =
    `https://api.github.com/repos/${encodeURIComponent(owner)}/` +
    `${encodeURIComponent(repository)}/tarball/${encodeURIComponent(commitSha)}`;

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "CodeMap",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new Error(`GitHub archive download failed: HTTP ${response.status}.`);
  }

  if (!response.body) {
    throw new Error("GitHub returned an empty archive response.");
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);

  if (contentLength > MAX_ARCHIVE_BYTES) {
    throw new Error("Repository archive exceeds the 100 MB download limit.");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      totalBytes += value.byteLength;

      if (totalBytes > MAX_ARCHIVE_BYTES) {
        await reader.cancel();
        throw new Error(
          "Repository archive exceeds the 100 MB download limit.",
        );
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const archive = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    archive.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return archive;
}
