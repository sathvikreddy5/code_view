import "@xyflow/react/dist/style.css";
import "./RepositoryExplorer.css";

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";

import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  FileCode2,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  GitBranch,
  GitCommit,
  Github,
  Search,
  Settings2,
  X,
  Network,
  Layers3,
} from "lucide-react";

type FileNodeData = {
  label: string;
  language: string;
  kind: string;
};
type RepositoryTreeNode = {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: RepositoryTreeNode[];
  language?: string | null;
  sizeBytes?: number;
};

type RepositoryGraphNode = {
  id: string;
  type: string;
  fanIn: number;
  fanOut: number;
};

type RepositoryGraphEdge = {
  id: string;
  source: string;
  target: string | null;
  importSource: string;
  importKind: string;
  resolution: "resolved" | "external" | "unresolved";
  line: number;
};

type RepositoryAnalysisResponse = {
  success: boolean;
  message: string;
  error?: string;

  repository: {
    fullName: string;
    defaultBranch: string;
    primaryLanguage: string | null;
    stars: number;
    forks: number;
  };

  commit: {
    sha: string;
    message: string;
    author: string | null;
    date: string | null;
  };

  analysis: {
    status: string;
    totalFiles: number;
    totalFolders: number;
    languages: Record<string, number>;
    parser: {
      parsedFiles: number;
      skippedFiles: number;
    };
    graph: {
      totalNodes: number;
      totalEdges: number;
      resolvedEdges: number;
      unresolvedImports: number;
      externalImports: number;
    };
  };

  tree: RepositoryTreeNode;
  graph: {
    nodes: RepositoryGraphNode[];
    edges: RepositoryGraphEdge[];
  };
};

function DependencyNode({ data }: NodeProps<Node<FileNodeData>>) {
  return (
    <div className={`dependency-node ${data.kind}`}>
      <Handle type="target" position={Position.Left} />

      <div className="dependency-node-icon">
        <FileCode2 size={17} />
      </div>

      <div className="dependency-node-info">
        <strong>{data.label}</strong>
        <span>{data.language}</span>
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = {
  dependency: DependencyNode,
};

const fileDetails: Record<
  string,
  {
    path: string;
    language: string;
    size: string;
    imports: string[];
    importers: string[];
  }
> = {
  "App.tsx": {
    path: "src/App.tsx",
    language: "TypeScript / React",
    size: "4.2 KB",
    imports: ["Dashboard.tsx", "Sidebar.tsx", "api.ts"],
    importers: ["main.tsx"],
  },
  "Dashboard.tsx": {
    path: "src/components/Dashboard.tsx",
    language: "TypeScript / React",
    size: "3.8 KB",
    imports: ["Sidebar.tsx", "StatCard.tsx"],
    importers: ["App.tsx"],
  },
  "Sidebar.tsx": {
    path: "src/components/Sidebar.tsx",
    language: "TypeScript / React",
    size: "2.1 KB",
    imports: ["lucide-react"],
    importers: ["App.tsx", "Dashboard.tsx"],
  },
  "api.ts": {
    path: "src/services/api.ts",
    language: "TypeScript",
    size: "1.6 KB",
    imports: ["axios"],
    importers: ["App.tsx"],
  },
  "server.ts": {
    path: "server/src/server.ts",
    language: "TypeScript / Node.js",
    size: "2.7 KB",
    imports: ["express", "routes.ts"],
    importers: ["package.json scripts"],
  },
};

type TreeItem = {
  name: string;
  type: string;
  children?: TreeItem[];
};

function TreeEntry({
  item,
  depth,
  selectedFile,
  onSelect,
}: {
  item: TreeItem;
  depth: number;
  selectedFile: string;
  onSelect: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);

  const isFolder = item.type === "folder";
  const isSelected = selectedFile === item.name;

  const FileIcon = item.name.endsWith(".json")
    ? FileJson
    : item.name.endsWith(".md")
      ? FileText
      : FileCode2;

  return (
    <div>
      <button
        type="button"
        className={`tree-entry ${isSelected ? "selected" : ""}`}
        style={{ paddingLeft: `${12 + depth * 15}px` }}
        onClick={() => {
          if (isFolder) {
            setExpanded((previous) => !previous);
          } else {
            onSelect(item.name);
          }
        }}
      >
        {isFolder ? (
          <>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {expanded ? (
              <FolderOpen size={15} className="folder-icon" />
            ) : (
              <Folder size={15} className="folder-icon" />
            )}
          </>
        ) : (
          <>
            <span className="tree-spacer" />
            <FileIcon size={15} className="source-file-icon" />
          </>
        )}

        <span>{item.name}</span>
      </button>

      {isFolder && expanded && item.children && (
        <div>
          {item.children.map((child) => (
            <TreeEntry
              key={`${item.name}/${child.name}`}
              item={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RepositoryExplorer({
  repositoryUrl,
  onBack,
}: {
  repositoryUrl: string;
  onBack: () => void;
}) {
  const [selectedFile, setSelectedFile] = useState("App.tsx");
  const [search, setSearch] = useState("");

  const [analysisData, setAnalysisData] =
    useState<RepositoryAnalysisResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function analyzeRepository() {
      setLoading(true);
      setError(null);
      setAnalysisData(null);

      try {
        const response = await fetch("http://localhost:4000/api/repos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: repositoryUrl }),
          signal: controller.signal,
        });

        const data: RepositoryAnalysisResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || data.message || "Repository analysis failed.",
          );
        }

        setAnalysisData(data);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    analyzeRepository();

    return () => controller.abort();
  }, [repositoryUrl]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedFile(String(node.data.label));
    },
    [],
  );

  const details = fileDetails[selectedFile];

  const repoName =
    repositoryUrl.replace(/\/+$/, "").split("/").slice(-2).join("/") ||
    "sample/repository";

  const tree = analysisData?.tree.children ?? [];

  const graphNodes: Node<FileNodeData>[] = (
    analysisData?.graph.nodes ?? []
  ).map((node, index) => {
    const fileName = node.id.split("/").pop() ?? node.id;
    const extension = fileName.split(".").pop()?.toLowerCase();

    const language =
      extension === "tsx" || extension === "jsx"
        ? "React component"
        : extension === "ts"
          ? "TypeScript"
          : extension === "js"
            ? "JavaScript"
            : extension === "py"
              ? "Python"
              : extension === "java"
                ? "Java"
                : (extension?.toUpperCase() ?? "Source file");

    return {
      id: node.id,
      type: "dependency",
      position: {
        x: (index % 4) * 280,
        y: Math.floor(index / 4) * 130,
      },
      data: {
        label: fileName,
        language,
        kind: "component",
      },
    };
  });

  const graphEdges: Edge[] = (analysisData?.graph.edges ?? [])
    .filter((edge) => edge.resolution === "resolved" && edge.target !== null)
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target!,
      animated: true,
      label: edge.importKind,
    }));

  return (
    <div className="explorer-page">
      <header className="explorer-header">
        <div className="explorer-header-left">
          <button className="explorer-back" type="button" onClick={onBack}>
            <ArrowLeft size={17} />
          </button>

          <div className="explorer-repo-icon">
            <Github size={19} />
          </div>

          <div className="explorer-repo-title">
            <strong>{analysisData?.repository.fullName ?? repoName}</strong>
            <span>
              <span className="demo-dot" />
              {loading
                ? "Analyzing repository..."
                : error
                  ? "Analysis failed"
                  : analysisData
                    ? "Analysis complete"
                    : "Waiting for analysis"}
            </span>
          </div>
        </div>

        <div className="explorer-header-right">
          <div className="branch-chip">
            <GitBranch size={14} />
            main
            <ChevronDown size={13} />
          </div>

          <button className="explorer-header-button" type="button">
            <GitCommit size={15} />
            Latest commit
          </button>

          <button className="explorer-header-button" type="button">
            <Settings2 size={15} />
            Settings
          </button>
        </div>
      </header>

      {loading && (
        <div className="explorer-loading">
          Analyzing repository and building dependency graph...
        </div>
      )}

      {error && (
        <div className="explorer-error">
          <strong>Repository analysis failed</strong>
          <p>{error}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      )}

      <div className="explorer-workspace">
        <aside className="explorer-tree-panel">
          <div className="explorer-panel-heading">
            <div>
              <h2>Explorer</h2>
              <span>Repository structure</span>
            </div>
            <Layers3 size={17} />
          </div>

          <div className="explorer-search">
            <Search size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find files..."
              aria-label="Find files"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="tree-root">
            <div className="tree-root-label">
              <FolderOpen size={15} />
              <strong>{repoName.split("/").pop()}</strong>
            </div>

            {tree.map((item) => (
              <TreeEntry
                key={item.name}
                item={item}
                depth={0}
                selectedFile={selectedFile}
                onSelect={setSelectedFile}
              />
            ))}
          </div>

          <div className="tree-footer">
            <div>
              <span>FILES</span>
              <strong>{analysisData?.analysis.totalFiles ?? 0}</strong>
            </div>
            <div>
              <span>LANGUAGES</span>
              <strong>
                {Object.keys(analysisData?.analysis.languages ?? {}).length}
              </strong>
            </div>
          </div>
        </aside>

        <main className="explorer-graph-panel">
          <div className="graph-toolbar">
            <div>
              <h2>Dependency graph</h2>
              <p>Explore how files connect to each other</p>
            </div>

            <div className="graph-legend">
              <span>
                <i className="legend-dot frontend" /> Frontend
              </span>
              <span>
                <i className="legend-dot service" /> Service
              </span>
              <span>
                <i className="legend-dot backend" /> Backend
              </span>
            </div>
          </div>

          <div className="graph-canvas">
            <ReactFlow
              nodes={graphNodes}
              edges={graphEdges}
              nodeTypes={nodeTypes}
              onNodeClick={handleNodeClick}
              fitView
              fitViewOptions={{ padding: 0.25 }}
              minZoom={0.15}
              maxZoom={2}
              nodesDraggable
              elementsSelectable
              panOnDrag={true}
              panOnScroll={true}
              zoomOnScroll={true}
              zoomOnPinch={true}
            >
              <Background color="#71637d" gap={25} size={1} />
              <Controls />
              <MiniMap
                nodeColor={(node) => {
                  if (node.data.kind === "backend") return "#a879d4";
                  if (node.data.kind === "service") return "#55d4d4";
                  return "#8e70c7";
                }}
                maskColor="rgba(9, 8, 18, 0.72)"
              />
            </ReactFlow>

            <div className="graph-demo-label">
              {loading
                ? "ANALYZING DEPENDENCIES..."
                : `${graphNodes.length} FILES · ${graphEdges.length} CONNECTIONS`}
            </div>
          </div>
        </main>

        <aside className="explorer-details-panel">
          <div className="explorer-panel-heading">
            <div>
              <h2>File details</h2>
              <span>Selected node information</span>
            </div>
            <FileCode2 size={17} />
          </div>

          {details ? (
            <>
              <div className="selected-file-card">
                <div className="selected-file-icon">
                  <FileCode2 size={22} />
                </div>
                <strong>{selectedFile}</strong>
                <span>{details.path}</span>
                <div className="file-language-tag">{details.language}</div>
              </div>

              <div className="detail-section">
                <h3>FILE INFORMATION</h3>
                <div className="detail-row">
                  <span>Language</span>
                  <strong>{details.language.split(" / ")[0]}</strong>
                </div>
                <div className="detail-row">
                  <span>File size</span>
                  <strong>{details.size}</strong>
                </div>
                <div className="detail-row">
                  <span>Analysis status</span>
                  <strong className="resolved-status">Demo only</strong>
                </div>
              </div>

              <div className="detail-section">
                <h3>IMPORTS ({details.imports.length})</h3>
                {details.imports.map((name) => (
                  <div className="dependency-item" key={name}>
                    <FileCode2 size={14} />
                    <span>{name}</span>
                  </div>
                ))}
              </div>

              <div className="detail-section">
                <h3>IMPORTED BY ({details.importers.length})</h3>
                {details.importers.map((name) => (
                  <div className="dependency-item" key={name}>
                    <Network size={14} />
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-file-details">
              <FileCode2 size={28} />
              <p>Select a graph file or a supported file in the tree.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
