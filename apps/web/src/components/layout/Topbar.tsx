import { useEffect, useRef, useState } from "react";
import {
  Command,
  Search,
  Plus,
  Network,
  X,
  FileCode2,
  Folder,
  GitBranch,
} from "lucide-react";

type TopbarProps = {
  onNewAnalysis?: () => void;
};

export default function Topbar({ onNewAnalysis }: TopbarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen(true);
      }

      if (event.key === "Escape") {
        setIsSearchOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyboard);

    return () => {
      window.removeEventListener("keydown", handleKeyboard);
    };
  }, []);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    } else {
      setSearchQuery("");
    }
  }, [isSearchOpen]);

  return (
    <>
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-brand-icon">
            <Network size={21} strokeWidth={2.2} />
          </div>

          <div className="topbar-brand-info">
            <strong>
              Atlas<span>Flow</span>
            </strong>
            <small>CODE INTELLIGENCE</small>
          </div>

          <span className="breadcrumb-separator">/</span>
          <strong className="topbar-page-title">Overview</strong>
        </div>

        <div className="topbar-actions">
          <button
            className="search-trigger"
            type="button"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Open search"
          >
            <Search size={16} />
            <span>Search anything...</span>
            <kbd>
              <Command size={11} /> K
            </kbd>
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

      {isSearchOpen && (
        <div
          className="atlas-search-overlay"
          onMouseDown={() => setIsSearchOpen(false)}
        >
          <div
            className="atlas-search-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Search Atlas Flow"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="atlas-search-input-row">
              <Search size={20} />

              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search files, folders and dependencies..."
                aria-label="Search files, folders and dependencies"
              />

              <button
                type="button"
                className="atlas-search-close"
                onClick={() => setIsSearchOpen(false)}
                aria-label="Close search"
              >
                <X size={19} />
              </button>
            </div>

            <div className="atlas-search-content">
              {searchQuery.trim() ? (
                <div className="atlas-search-empty">
                  <Search size={25} />
                  <strong>Repository search is not connected yet</strong>
                  <p>
                    We'll connect this search to actual repository files,
                    folders and dependencies next.
                  </p>
                </div>
              ) : (
                <>
                  <div className="atlas-search-section-label">
                    SEARCH WITH ATLAS FLOW
                  </div>

                  <div className="atlas-search-suggestion">
                    <FileCode2 size={17} />
                    <span>Find source files</span>
                  </div>

                  <div className="atlas-search-suggestion">
                    <Folder size={17} />
                    <span>Explore folders</span>
                  </div>

                  <div className="atlas-search-suggestion">
                    <GitBranch size={17} />
                    <span>Discover dependencies</span>
                  </div>
                </>
              )}
            </div>

            <div className="atlas-search-footer">
              <span>
                <kbd>ESC</kbd> to close
              </span>
              <span>ATLAS FLOW SEARCH</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
