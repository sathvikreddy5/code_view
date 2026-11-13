import { ArrowRight, Network, Github, Code2 } from "lucide-react";

type WelcomePageProps = {
  onEnter: () => void;
};

export default function WelcomePage({ onEnter }: WelcomePageProps) {
  return (
    <main className="welcome-screen">
      <div className="welcome-background">
        <div className="welcome-glow glow-one" />
        <div className="welcome-glow glow-two" />
        <div className="welcome-grid" />
      </div>

      <header className="welcome-nav">
        <div className="welcome-brand">
          <div className="welcome-brand-icon">
            <Network size={23} />
          </div>
          <span>
            Atlas <span>Flow</span>
          </span>
        </div>

        <div className="welcome-nav-label">CODE INTELLIGENCE PLATFORM</div>
      </header>

      <section className="welcome-hero">
        <div className="welcome-visual">
          <div className="welcome-ring ring-one" />
          <div className="welcome-ring ring-two" />
          <div className="welcome-ring ring-three" />

          <div className="welcome-connection connection-one" />
          <div className="welcome-connection connection-two" />
          <div className="welcome-connection connection-three" />
          <div className="welcome-connection connection-four" />

          <div className="welcome-node node-top">
            <Code2 size={19} />
          </div>

          <div className="welcome-node node-left">
            <Github size={19} />
          </div>

          <div className="welcome-node node-right">
            <Network size={19} />
          </div>

          <div className="welcome-node node-bottom">
            <Code2 size={18} />
          </div>

          <div className="welcome-logo-core">
            <Network size={48} strokeWidth={1.7} />
            <span />
          </div>
        </div>

        <div className="welcome-content">
          <div className="welcome-tag">
            <span />
            YOUR CODEBASE, VISUALIZED
          </div>

          <h1 aria-label="Your codebase has a bigger picture.">
            <span className="hero-typing-line" aria-hidden="true">
              {"Your codebase has".split("").map((char, index) => (
                <span
                  className="hero-char"
                  key={index}
                  style={{ animationDelay: `${index * 0.045}s` }}
                >
                  {char === " " ? "\u00A0" : char}
                </span>
              ))}
            </span>

            <br />

            <span className="hero-gradient-line" aria-hidden="true">
              {"a bigger picture.".split("").map((char, index) => (
                <span
                  className="hero-char"
                  key={index}
                  style={{
                    animationDelay: `${(17 + index) * 0.045}s`,
                  }}
                >
                  {char === " " ? "\u00A0" : char}
                </span>
              ))}
            </span>
          </h1>

          <p>
            Explore your GitHub repositories in a whole new way. Understand
            project structure, discover file relationships, and visualize how
            everything connects.
          </p>

          <button
            className="welcome-enter-button"
            onClick={onEnter}
            type="button"
          >
            Explore AtlasFlow
            <ArrowRight size={19} />
          </button>

          <div className="welcome-trust">
            <span>
              <Github size={15} /> GitHub repositories
            </span>
            <i />
            <span>No sign-up required</span>
          </div>
        </div>
      </section>

      <footer className="welcome-bottom">
        <span>ATLASFLOW</span>
        <span>UNDERSTAND YOUR CODE, NOT JUST YOUR FILES.</span>
      </footer>
    </main>
  );
}
