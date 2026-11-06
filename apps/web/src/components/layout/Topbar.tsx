import { Bell, Command, Search, Plus } from "lucide-react";

type TopbarProps = {
  onNewAnalysis?: () => void;
};

export default function Topbar({ onNewAnalysis }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>Workspace</span>
        <span className="breadcrumb-separator">/</span>
        <strong>Overview</strong>
      </div>

      <div className="topbar-actions">
        <button className="search-trigger" type="button">
          <Search size={16} />
          <span>Search anything...</span>
          <kbd>
            <Command size={11} /> K
          </kbd>
        </button>

        <button
          className="icon-button notification-button"
          type="button"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="notification-dot" />
        </button>

        <button
          className="topbar-add-button"
          type="button"
          onClick={onNewAnalysis}
        >
          <Plus size={16} />
          <span>New analysis</span>
        </button>
      </div>
    </header>
  );
}
