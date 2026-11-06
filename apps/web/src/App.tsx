import { useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  ExternalLink,
  FolderGit2,
  GitBranch,
  Network,
} from "lucide-react";

import Topbar from "./components/layout/Topbar";
import RepositoryExplorer from "./pages/RepositoryExplorer";

const statistics = [
  {
    label: "Repositories",
    value: "03",
    description: "Sample repositories",
    icon: FolderGit2,
    color: "cyan",
  },
  {
    label: "Files analyzed",
    value: "1,758",
    description: "Across demo repositories",
    icon: Code2,
    color: "violet",
  },
  {
    label: "Dependencies",
    value: "4,326",
    description: "Sample dependency links",
    icon: Network,
    color: "teal",
  },
  {
    label: "Branches",
    value: "08",
    description: "Sample branch count",
    icon: GitBranch,
    color: "blue",
  },
];

const repositories = [
  {
    name: "react-dashboard",
    description: "Modern React dashboard application",
    language: "TypeScript",
    languageColor: "#438eaa",
    files: "428",
    dependencies: "124",
    updated: "2 hours ago",
    owner: "demo",
  },
  {
    name: "express-api",
    description: "REST API and backend services",
    language: "JavaScript",
    languageColor: "#d5a6c9",
    files: "315",
    dependencies: "86",
    updated: "Yesterday",
    owner: "demo",
  },
  {
    name: "career-platform",
    description: "Full-stack recruitment platform",
    language: "TypeScript",
    languageColor: "#65d3d1",
    files: "1,015",
    dependencies: "215",
    updated: "3 days ago",
    owner: "demo",
  },
];

function App() {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [message, setMessage] = useState("");
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const url = repositoryUrl.trim();

    const validGitHubUrl =
      /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(url);

    if (!validGitHubUrl) {
      setMessage("Please enter a valid GitHub repository URL.");
      return;
    }

    setMessage("");
    setIsExplorerOpen(true);
  }

  function handleNewAnalysis() {
    setRepositoryUrl("");
    setMessage("");
    inputRef.current?.focus();
  }

  function handleOpenRepository(url: string) {
    setRepositoryUrl(url);
    setMessage("");
    setIsExplorerOpen(true);
  }

  if (isExplorerOpen) {
    return (
      <RepositoryExplorer
        repositoryUrl={repositoryUrl}
        onBack={() => setIsExplorerOpen(false)}
      />
    );
  }

  return (
    <div className="app-shell">
      <div className="main-content">
        <Topbar onNewAnalysis={handleNewAnalysis} />

        <main className="dashboard-content">
          {/* HERO */}

          <section className="welcome-section">
            <div>
              <div className="welcome-eyebrow">
                <span className="eyebrow-line" />
                YOUR CODE INTELLIGENCE WORKSPACE
              </div>

              <h1>
                Understand your codebase.
                <br />
                <span>See the bigger picture.</span>
              </h1>

              <p>
                Explore repository structure, discover dependencies, and
                understand how your code connects.
              </p>
            </div>

            <div className="welcome-decoration">
              <div className="decoration-orbit orbit-one">
                <span className="decoration-node node-one" />
                <span className="decoration-node node-two" />
                <span className="decoration-node node-three" />
                <span className="decoration-node node-four" />

                <div className="decoration-orbit orbit-two">
                  <div className="decoration-center">
                    <Network size={34} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ANALYZE REPOSITORY */}

          <section className="analyze-panel">
            <div className="analyze-panel-heading">
              <div className="analyze-icon">
                <FolderGit2 size={23} />
              </div>

              <div>
                <h2>Analyze a repository</h2>
                <p>
                  Start exploring by entering a public GitHub repository URL.
                </p>
              </div>

              <span className="analyze-beta">PUBLIC REPOS</span>
            </div>

            <form className="repository-form" onSubmit={handleAnalyze}>
              <div className="repository-input-wrapper">
                <Code2 size={19} />

                <input
                  ref={inputRef}
                  type="url"
                  value={repositoryUrl}
                  onChange={(event) => {
                    setRepositoryUrl(event.target.value);
                    setMessage("");
                  }}
                  placeholder="https://github.com/owner/repository"
                  aria-label="GitHub repository URL"
                />
              </div>

              <button type="submit" className="analyze-button">
                Analyze repository
                <ArrowRight size={18} />
              </button>
            </form>

            {message && (
              <div className="form-message error" role="alert">
                {message}
              </div>
            )}

            <div className="analyze-footer">
              <span>
                <CheckCircle2 size={14} />
                No installation required
              </span>

              <span>
                <CheckCircle2 size={14} />
                Public repositories
              </span>

              <span>
                <CheckCircle2 size={14} />
                Commit-aware analysis planned
              </span>
            </div>
          </section>

          {/* STATISTICS */}

          <section className="stats-section">
            <div className="section-heading">
              <div>
                <h2>Workspace overview</h2>
                <p>Your repository analysis at a glance</p>
              </div>

              <span className="demo-label">DEMO DATA</span>
            </div>

            <div className="stats-grid">
              {statistics.map((stat) => {
                const Icon = stat.icon;

                return (
                  <article className="stat-card" key={stat.label}>
                    <div className="stat-card-top">
                      <span className="stat-title">{stat.label}</span>

                      <div className={`stat-icon ${stat.color}`}>
                        <Icon size={21} />
                      </div>
                    </div>

                    <div className="stat-value">{stat.value}</div>

                    <div className="stat-description">
                      <span className="stat-description-dot" />
                      {stat.description}
                      <ArrowRight className="stat-arrow" size={15} />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* RECENT REPOSITORIES */}

          <section className="recent-section">
            <div className="section-heading">
              <div>
                <h2>Recent repositories</h2>
                <p>Explore your recently analyzed projects</p>
              </div>

              <button
                type="button"
                className="text-button"
                onClick={handleNewAnalysis}
              >
                New analysis
                <ArrowRight size={15} />
              </button>
            </div>

            <div className="repositories-panel">
              <div className="repository-table">
                <div className="repository-table-header">
                  <span>REPOSITORY</span>
                  <span>LANGUAGE</span>
                  <span>FILES</span>
                  <span>DEPENDENCIES</span>
                  <span>LAST UPDATED</span>
                  <span />
                </div>

                {repositories.map((repo, index) => (
                  <div className="repository-row" key={repo.name}>
                    <div className="repository-name">
                      <div
                        className={`repository-avatar ${
                          index === 0 ? "cyan" : index === 1 ? "violet" : "teal"
                        }`}
                      >
                        <FolderGit2 size={18} />
                      </div>

                      <div>
                        <strong>{repo.name}</strong>
                        <span>{repo.description}</span>
                      </div>
                    </div>

                    <div className="language-cell">
                      <span
                        className="language-dot"
                        style={{ background: repo.languageColor }}
                      />
                      {repo.language}
                    </div>

                    <span className="table-number">{repo.files}</span>

                    <span className="table-number">{repo.dependencies}</span>

                    <span className="updated-cell">{repo.updated}</span>

                    <button
                      type="button"
                      className="row-menu"
                      aria-label={`Explore ${repo.name}`}
                      onClick={() =>
                        handleOpenRepository(
                          `https://github.com/${repo.owner}/${repo.name}`,
                        )
                      }
                    >
                      <ExternalLink size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FOOTER */}

          <footer className="dashboard-footer">
            <span className="footer-status">
              <span />
              CodeMap — Understand your code, not just your files.
            </span>

            <span>
              Built for developers and open-source contributors
              <span className="footer-version">v1.0</span>
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
