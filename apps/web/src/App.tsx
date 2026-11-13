import { useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  FolderGit2,
  GitBranch,
  Network,
} from "lucide-react";

import Topbar from "./components/layout/Topbar";
import RepositoryExplorer from "./pages/RepositoryExplorer";
import WelcomePage from "./pages/WelcomePage";

const features = [
  {
    label: "REPOSITORY STRUCTURE",
    title: "Explore folders and files",
    description: "Navigate repository hierarchies visually.",
    icon: FolderGit2,
    color: "cyan",
  },
  {
    label: "FILE ANALYSIS",
    title: "Understand your code",
    description: "Inspect files and their information.",
    icon: Code2,
    color: "violet",
  },
  {
    label: "DEPENDENCY MAPPING",
    title: "Discover connections",
    description: "Visualize relationships between files.",
    icon: Network,
    color: "teal",
  },
  {
    label: "GIT EXPLORATION",
    title: "Explore repository history",
    description: "Build toward branch and commit-aware exploration.",
    icon: GitBranch,
    color: "blue",
  },
];

function App() {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [message, setMessage] = useState("");
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const heroTitleRef = useRef<HTMLDivElement>(null);

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

  if (!hasEntered) {
    return <WelcomePage onEnter={() => setHasEntered(true)} />;
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

          <section
            className="welcome-section"
            onPointerMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();

              const x = (event.clientX - rect.left) / rect.width - 0.5;
              const y = (event.clientY - rect.top) / rect.height - 0.5;

              heroTitleRef.current?.style.setProperty(
                "--pointer-x",
                `${x * 8}px`,
              );

              heroTitleRef.current?.style.setProperty(
                "--pointer-y",
                `${y * 5}px`,
              );
            }}
            onPointerLeave={() => {
              heroTitleRef.current?.style.setProperty("--pointer-x", "0px");
              heroTitleRef.current?.style.setProperty("--pointer-y", "0px");
            }}
          >
            <div className="welcome-copy">
              <div className="welcome-eyebrow">
                <span className="eyebrow-line" />
                OPEN-SOURCE REPOSITORY EXPLORER
              </div>

              <div className="hero-title-motion" ref={heroTitleRef}>
                <h1 className="hero-title">
                  Understand your codebase.
                  <br />
                  <span>See the bigger picture.</span>
                </h1>
              </div>

              <p className="hero-description">
                CodeMap transforms GitHub repositories into interactive visual
                maps. Explore folders, understand file relationships, and
                discover how your codebase connects.
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

          {/* CODEMAP FEATURES */}

          <section className="stats-section">
            <div className="section-heading">
              <div>
                <h2>Explore what CodeMap can do</h2>
                <p>Tools to understand your codebase visually</p>
              </div>
            </div>

            <div className="stats-grid">
              {features.map((feature) => {
                const Icon = feature.icon;

                return (
                  <article className="stat-card" key={feature.label}>
                    <div className="stat-card-top">
                      <span className="stat-title">{feature.label}</span>

                      <div className={`stat-icon ${feature.color}`}>
                        <Icon size={21} />
                      </div>
                    </div>

                    <div className="feature-card-title">{feature.title}</div>

                    <div className="stat-description">
                      <span className="stat-description-dot" />
                      {feature.description}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* RECENT REPOSITORIES */}

          {/* HOW CODEMAP WORKS */}

          <section className="recent-section how-it-works">
            <div className="section-heading">
              <div>
                <h2>How CodeMap works</h2>
                <p>
                  From a GitHub URL to a visual understanding of your codebase
                </p>
              </div>
            </div>

            <div className="how-it-works-grid">
              <article className="how-card">
                <div className="how-card-icon cyan">
                  <FolderGit2 size={23} />
                </div>

                <span className="how-step">STEP 01</span>
                <h3>Connect a repository</h3>
                <p>
                  Paste a public GitHub repository URL and start exploring
                  without installing anything.
                </p>
              </article>

              <article className="how-card">
                <div className="how-card-icon violet">
                  <Code2 size={23} />
                </div>

                <span className="how-step">STEP 02</span>
                <h3>Analyze the codebase</h3>
                <p>
                  CodeMap discovers repository files, folders and supported
                  import relationships.
                </p>
              </article>

              <article className="how-card">
                <div className="how-card-icon teal">
                  <Network size={23} />
                </div>

                <span className="how-step">STEP 03</span>
                <h3>Explore the connections</h3>
                <p>
                  Navigate the repository structure and visualize how files
                  connect through dependencies.
                </p>
              </article>
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
