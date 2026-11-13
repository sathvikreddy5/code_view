import {
  Activity,
  FolderGit2,
  Github,
  HelpCircle,
  LayoutDashboard,
  Network,
  Settings,
  Sparkles,
} from "lucide-react";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Repositories", icon: FolderGit2, active: false },
  { label: "Dependency Graph", icon: Network, active: false },
  { label: "Activity", icon: Activity, active: false },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Network size={21} strokeWidth={2.3} />
        </div>

        <div>
          <h1>
            Atlas<span>Flow</span>
          </h1>
          <p>CODE INTELLIGENCE</p>
        </div>
      </div>

      <div className="workspace-label">WORKSPACE</div>

      <div className="workspace-switcher">
        <div className="workspace-avatar">S</div>
        <div className="workspace-info">
          <strong>Personal Workspace</strong>
          <span>Free workspace</span>
        </div>
        <span className="workspace-chevron">⌄</span>
      </div>

      <div className="nav-section">
        <span className="nav-heading">PLATFORM</span>

        <nav className="nav-list">
          {navigation.map(({ label, icon: Icon, active }) => (
            <button
              className={`nav-item ${active ? "active" : ""}`}
              key={label}
              type="button"
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === "Repositories" && <span className="nav-count">3</span>}
            </button>
          ))}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <div className="upgrade-card">
          <div className="upgrade-icon">
            <Sparkles size={17} />
          </div>
          <strong>Explore CodeMap</strong>
          <p>Understand complex codebases with visual insights.</p>
          <button type="button" className="upgrade-link">
            Explore features <span>↗</span>
          </button>
        </div>

        <button className="nav-item bottom-nav" type="button">
          <HelpCircle size={18} />
          <span>Help & Support</span>
        </button>

        <button className="nav-item bottom-nav" type="button">
          <Settings size={18} />
          <span>Settings</span>
        </button>

        <div className="sidebar-user">
          <div className="user-avatar">SR</div>
          <div className="user-info">
            <strong>My Workspace</strong>
            <span>Personal account</span>
          </div>
          <Github size={17} className="user-github" />
        </div>
      </div>
    </aside>
  );
}
