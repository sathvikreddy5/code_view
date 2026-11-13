import { Plus, Network } from "lucide-react";

type TopbarProps = {
  onNewAnalysis?: () => void;
  onLogoClick?: () => void;
};

export default function Topbar({ onNewAnalysis, onLogoClick }: TopbarProps) {
  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar-brand topbar-brand-home"
        onClick={onLogoClick}
        aria-label="Return to AtlasFlow welcome page"
      >
        <div className="topbar-brand-icon">
          <Network size={21} strokeWidth={2.2} />
        </div>

        <div className="topbar-brand-info">
          <strong>
            Atlas<span>Flow</span>
          </strong>
          <small>CODE INTELLIGENCE</small>
        </div>
      </button>

      <div className="topbar-actions">
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
