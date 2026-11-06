import { ArrowUpRight, Clock3, GitBranch, MoreHorizontal } from "lucide-react";

const repositories = [
  {
    name: "react",
    owner: "facebook",
    language: "JavaScript",
    color: "#F0DB4F",
    files: "1,248",
    dependencies: "3,420",
    updated: "2 hours ago",
    initials: "R",
    avatar: "cyan",
  },
  {
    name: "express",
    owner: "expressjs",
    language: "JavaScript",
    color: "#A5B4FC",
    files: "186",
    dependencies: "294",
    updated: "Yesterday",
    initials: "E",
    avatar: "violet",
  },
  {
    name: "fastapi",
    owner: "fastapi",
    language: "Python",
    color: "#4ADE80",
    files: "324",
    dependencies: "612",
    updated: "3 days ago",
    initials: "F",
    avatar: "teal",
  },
];

export default function RecentRepositories() {
  return (
    <section className="repositories-panel">
      <div className="section-heading">
        <div>
          <h2>Recent repositories</h2>
          <p>Your recently analyzed codebases</p>
        </div>

        <button className="text-button" type="button">
          View all <ArrowUpRight size={15} />
        </button>
      </div>

      <div className="repository-table">
        <div className="repository-table-header">
          <span>REPOSITORY</span>
          <span>LANGUAGE</span>
          <span>FILES</span>
          <span>DEPENDENCIES</span>
          <span>LAST ANALYZED</span>
          <span />
        </div>

        {repositories.map((repo) => (
          <div className="repository-row" key={repo.name}>
            <div className="repository-name">
              <div className={`repository-avatar ${repo.avatar}`}>
                {repo.initials}
              </div>

              <div>
                <strong>
                  {repo.owner}/{repo.name}
                </strong>
                <span>
                  <GitBranch size={12} /> main
                </span>
              </div>
            </div>

            <div className="language-cell">
              <span
                className="language-dot"
                style={{ backgroundColor: repo.color }}
              />
              {repo.language}
            </div>

            <span className="table-number">{repo.files}</span>
            <span className="table-number">{repo.dependencies}</span>

            <span className="updated-cell">
              <Clock3 size={13} />
              {repo.updated}
            </span>

            <button
              className="row-menu"
              type="button"
              aria-label={`More options for ${repo.name}`}
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
