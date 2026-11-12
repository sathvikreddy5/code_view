import "@xyflow/react/dist/style.css";

import "./RepositoryExplorer.css";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { MouseEvent } from "react";

import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  useNodesState,
} from "@xyflow/react";

import type { Edge, Node, NodeProps } from "@xyflow/react";

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
  Layers3,
  Network,
  Search,
  Settings2,
  X,
} from "lucide-react";

type RepositoryTreeNode = {
  name: string;

  path: string;

  type: "file" | "folder";

  children?: RepositoryTreeNode[];

  language?: string | null;

  sizeBytes?: number;
};

type ExplorerNodeData = {
  kind: "folder" | "file";

  label: string;

  path: string;

  language?: string;

  fanIn?: number;

  fanOut?: number;

  expanded?: boolean;

  childCount?: number;

  onToggle?: (path: string) => void;
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

type TreeEntryProps = {
  item: RepositoryTreeNode;

  depth: number;

  selectedPath: string;

  search: string;

  onSelect: (file: RepositoryTreeNode) => void;
};

function getLanguage(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (["ts", "tsx", "mts", "cts"].includes(extension ?? ""))
    return "TypeScript";

  if (["js", "jsx", "mjs", "cjs"].includes(extension ?? ""))
    return "JavaScript";

  if (extension === "py") return "Python";

  if (extension === "java") return "Java";

  if (extension === "go") return "Go";

  if (extension === "rs") return "Rust";

  if (extension === "css" || extension === "scss") return "CSS";

  if (extension === "html") return "HTML";

  if (extension === "json") return "JSON";

  if (extension === "md") return "Markdown";

  return "File";
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined || !Number.isFinite(bytes)) return "—";

  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function filterTree(
  nodes: RepositoryTreeNode[],

  query: string,
): RepositoryTreeNode[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) return nodes;

  return nodes.reduce<RepositoryTreeNode[]>((matches, node) => {
    const matchingChildren = node.children
      ? filterTree(node.children, normalized)
      : [];

    if (
      node.name.toLowerCase().includes(normalized) ||
      node.path.toLowerCase().includes(normalized) ||
      matchingChildren.length > 0
    ) {
      matches.push({ ...node, children: matchingChildren });
    }

    return matches;
  }, []);
}

function findFirstFile(node: RepositoryTreeNode): RepositoryTreeNode | null {
  if (node.type === "file") return node;

  for (const child of node.children ?? []) {
    const found = findFirstFile(child);

    if (found) return found;
  }

  return null;
}

function findTreeNode(
  nodes: RepositoryTreeNode[],

  path: string,
): RepositoryTreeNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;

    if (node.children) {
      const found = findTreeNode(node.children, path);

      if (found) return found;
    }
  }

  return null;
}

function DependencyNode({ data }: NodeProps<Node<ExplorerNodeData>>) {
  if (data.kind === "folder") {
    return (
      <div
        className={`repository-folder-node ${data.expanded ? "expanded" : "collapsed"}`}
      >
        <Handle type="target" position={Position.Left} />

        <button
          type="button"
          className="repository-folder-header"
          onClick={(event) => {
            event.stopPropagation();

            data.onToggle?.(data.path);
          }}
          title={data.expanded ? "Collapse folder" : "Expand folder"}
        >
          {data.expanded ? <FolderOpen size={19} /> : <Folder size={19} />}

          <span className="repository-folder-name">{data.label}</span>

          <span className="repository-folder-count">
            {data.childCount ?? 0}
          </span>

          {data.expanded ? (
            <ChevronDown size={15} />
          ) : (
            <ChevronRight size={15} />
          )}
        </button>

        <Handle type="source" position={Position.Right} />
      </div>
    );
  }

  return (
    <div className="dependency-node" title={data.path}>
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

function TreeEntry({
  item,

  depth,

  selectedPath,

  search,

  onSelect,
}: TreeEntryProps) {
  const [expanded, setExpanded] = useState(
    depth === 0 || search.trim().length > 0,
  );

  const isFolder = item.type === "folder";

  const isSelected = selectedPath === item.path;

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
        title={item.path}
        onClick={() => {
          if (isFolder) {
            setExpanded((current) => !current);
          } else {
            onSelect(item);
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

      {isFolder &&
        expanded &&
        item.children?.map((child) => (
          <TreeEntry
            key={child.path}
            item={child}
            depth={depth + 1}
            selectedPath={selectedPath}
            search={search}
            onSelect={onSelect}
          />
        ))}
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
  const [selectedFile, setSelectedFile] = useState<RepositoryTreeNode | null>(
    null,
  );

  const [search, setSearch] = useState("");

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<
    Node<ExplorerNodeData>
  >([]);

  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const [miniMapPosition, setMiniMapPosition] = useState({
    x: 0,

    y: 0,
  });

  const [miniMapDrag, setMiniMapDrag] = useState<{
    startX: number;

    startY: number;

    originX: number;

    originY: number;
  } | null>(null);

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

      setSelectedFile(null);

      setExpandedPaths(new Set());

      try {
        const response = await fetch("http://localhost:4000/api/repos", {
          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({ url: repositoryUrl }),

          signal: controller.signal,
        });

        const payload: unknown = await response.json();

        if (!response.ok) {
          const message =
            typeof payload === "object" &&
            payload !== null &&
            "error" in payload
              ? String(payload.error)
              : `Repository analysis failed (${response.status}).`;

          throw new Error(message);
        }

        const data = payload as RepositoryAnalysisResponse;

        if (!data.success) {
          throw new Error(
            data.error || data.message || "Repository analysis failed.",
          );
        }

        setAnalysisData(data);

        setSelectedFile(findFirstFile(data.tree));
      } catch (caught) {
        if (caught instanceof Error && caught.name !== "AbortError") {
          setError(caught.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    // Start analysis whenever the repository URL changes.
    void analyzeRepository();

    // Abort the request if the component unmounts or URL changes.
    return () => controller.abort();
  }, [repositoryUrl]);

  const toggleFolder = useCallback((path: string) => {
    setExpandedPaths((current) => {
      const next = new Set(current);

      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }

      return next;
    });
  }, []);

  const graphNodes = useMemo<Node<ExplorerNodeData>[]>(() => {
    const treeItems = analysisData?.tree?.children ?? [];

    const dependencyNodes = analysisData?.graph?.nodes ?? [];

    const dependencyMap = new Map(
      dependencyNodes.map((node) => [node.id, node]),
    );

    const NODE_HEIGHT = 64;

    const VERTICAL_GAP = 18;

    const ROOT_GAP = 64;

    const HORIZONTAL_GAP = 270;

    // Calculate the complete vertical space needed by each subtree.

    const getSubtreeHeight = (item: RepositoryTreeNode): number => {
      const expanded = item.type === "folder" && expandedPaths.has(item.path);

      const children = expanded ? (item.children ?? []) : [];

      if (children.length === 0) {
        return NODE_HEIGHT;
      }

      const childrenHeight = children.reduce(
        (total, child) => total + getSubtreeHeight(child),

        0,
      );

      return Math.max(
        NODE_HEIGHT,

        childrenHeight + VERTICAL_GAP * (children.length - 1),
      );
    };

    const nodes: Node<ExplorerNodeData>[] = [];

    const addNode = (
      item: RepositoryTreeNode,

      depth: number,

      subtreeTop: number,
    ) => {
      const isFolder = item.type === "folder";

      const expanded = isFolder && expandedPaths.has(item.path);

      const children = expanded ? (item.children ?? []) : [];

      const subtreeHeight = getSubtreeHeight(item);

      // Center the parent node alongside its entire child group.

      const nodeY = subtreeTop + (subtreeHeight - NODE_HEIGHT) / 2;

      const dependency = dependencyMap.get(item.path);

      const kind: ExplorerNodeData["kind"] = isFolder ? "folder" : "file";

      nodes.push({
        id: item.path,

        type: "dependency",

        position: {
          x: depth * HORIZONTAL_GAP,

          y: nodeY,
        },

        data: {
          label: item.name,

          path: item.path,

          kind,

          language: item.language ?? getLanguage(item.name),

          fanIn: dependency?.fanIn ?? 0,

          fanOut: dependency?.fanOut ?? 0,

          expanded,

          childCount: item.children?.length ?? 0,

          onToggle: toggleFolder,
        },
      });

      // Position each child inside its parent's reserved vertical area.

      let childTop = subtreeTop;

      children.forEach((child) => {
        addNode(child, depth + 1, childTop);

        childTop += getSubtreeHeight(child) + VERTICAL_GAP;
      });
    };

    let rootTop = 0;

    treeItems.forEach((item) => {
      addNode(item, 0, rootTop);

      rootTop += getSubtreeHeight(item) + ROOT_GAP;
    });

    return nodes;
  }, [analysisData, expandedPaths, toggleFolder]);

  useEffect(() => {
    setFlowNodes(graphNodes);
  }, [graphNodes, setFlowNodes]);

  const graphEdges = useMemo<Edge[]>(() => {
    const visibleNodeIds = new Set(graphNodes.map((node) => node.id));

    const visibleFileIds = new Set(
      graphNodes

        .filter((node) => node.data.kind === "file")

        .map((node) => node.id),
    );

    const hierarchyEdges: Edge[] = [];

    const addHierarchyEdges = (items: RepositoryTreeNode[]) => {
      items.forEach((item) => {
        const isExpanded = expandedPaths.has(item.path);

        if (
          item.type === "folder" &&
          isExpanded &&
          visibleNodeIds.has(item.path)
        ) {
          (item.children ?? []).forEach((child) => {
            if (visibleNodeIds.has(child.path)) {
              hierarchyEdges.push({
                id: `hierarchy:${item.path}->${child.path}`,

                source: item.path,

                target: child.path,

                type: "smoothstep",

                className: "hierarchy-edge",

                style: {
                  stroke: "#64748b",

                  strokeWidth: 1.5,
                },
              });
            }
          });

          addHierarchyEdges(item.children ?? []);
        }
      });
    };

    addHierarchyEdges(analysisData?.tree?.children ?? []);

    const dependencyEdges: Edge[] = (analysisData?.graph?.edges ?? [])

      .filter(
        (edge) =>
          edge.resolution === "resolved" &&
          edge.target !== null &&
          visibleFileIds.has(edge.source) &&
          visibleFileIds.has(edge.target),
      )

      .map((edge) => ({
        id: `dependency:${edge.id}`,

        source: edge.source,

        target: edge.target as string,

        animated: true,

        label: edge.importKind,

        type: "smoothstep",

        className: "dependency-edge",

        zIndex: -1,

        style: {
          stroke: "#9b79c8",

          strokeWidth: 1.5,

          strokeDasharray: "6 6",

          opacity: 0.55,
        },
      }));

    return [...hierarchyEdges, ...dependencyEdges];
  }, [analysisData, graphNodes, expandedPaths]);

  const filteredTree = useMemo(
    () => filterTree(analysisData?.tree.children ?? [], search),

    [analysisData, search],
  );

  const selectedGraphNode = selectedFile
    ? analysisData?.graph.nodes.find((node) => node.id === selectedFile.path)
    : undefined;

  const selectedImports = selectedFile
    ? (analysisData?.graph.edges ?? []).filter(
        (edge) => edge.source === selectedFile.path,
      )
    : [];

  const selectedImporters = selectedFile
    ? (analysisData?.graph.edges ?? []).filter(
        (edge) => edge.target === selectedFile.path,
      )
    : [];

  const repoName =
    repositoryUrl.replace(/\/+$/, "").split("/").slice(-2).join("/") ||
    "repository";

  const handleTreeSelect = useCallback((file: RepositoryTreeNode) => {
    setSelectedFile(file);
  }, []);

  const handleNodeClickWithTree = useCallback(
    (_event: MouseEvent, node: Node<ExplorerNodeData>) => {
      // Folder clicks are handled by the folder's own toggle button.

      if (node.data.kind !== "file") return;

      const treeNode = findTreeNode(
        analysisData?.tree.children ?? [],

        node.data.path,
      );

      if (treeNode && treeNode.type === "file") {
        setSelectedFile(treeNode);
      }
    },

    [analysisData],
  );

  return (
    <div className="explorer-page">
      <header className="explorer-header">
        <div className="explorer-header-left">
          <button
            className="explorer-back"
            type="button"
            onClick={onBack}
            aria-label="Back to repository search"
          >
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
                  : "Analysis complete"}
            </span>
          </div>
        </div>

        <div className="explorer-header-right">
          <div className="branch-chip">
            <GitBranch size={14} />

            {analysisData?.repository.defaultBranch ?? "default"}

            <ChevronDown size={13} />
          </div>

          <div
            className="explorer-header-button"
            title={analysisData?.commit.sha}
          >
            <GitCommit size={15} />

            {analysisData?.commit.sha
              ? `Commit ${analysisData.commit.sha.slice(0, 7)}`
              : "Latest commit"}
          </div>

          <div className="explorer-header-button">
            <Settings2 size={15} />
            Repository analysis
          </div>
        </div>
      </header>

      {loading && (
        <div className="explorer-loading">
          Analyzing repository and building dependency graph...
        </div>
      )}

      {error && (
        <div className="explorer-error" role="alert">
          <strong>Repository analysis failed</strong>

          <p>{error}</p>

          <button type="button" onClick={onBack}>
            Back
          </button>
        </div>
      )}

      {!loading && !error && analysisData && (
        <>
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

                  <span>{analysisData.repository.fullName}</span>
                </div>

                {filteredTree.length > 0 ? (
                  filteredTree.map((item) => (
                    <TreeEntry
                      key={item.path}
                      item={item}
                      depth={0}
                      selectedPath={selectedFile?.path ?? ""}
                      search={search}
                      onSelect={handleTreeSelect}
                    />
                  ))
                ) : (
                  <p className="tree-empty">No matching files found.</p>
                )}
              </div>
            </aside>

            <main className="explorer-graph-panel">
              <div className="explorer-graph-heading">
                <div className="graph-heading-main">
                  <h2>
                    <Network size={17} />
                    Dependency graph
                  </h2>

                  <div
                    className="graph-statistics"
                    aria-label="Repository graph statistics"
                  >
                    <div className="graph-stat-card">
                      <strong>{analysisData.analysis.graph.totalNodes}</strong>

                      <span>Files</span>
                    </div>

                    <div className="graph-stat-card graph-stat-card-accent">
                      <strong>
                        {analysisData.analysis.graph.resolvedEdges}
                      </strong>

                      <span>Resolved dependencies</span>
                    </div>
                  </div>
                </div>

                <div className="graph-legend">
                  <span>
                    <i className="legend-dot resolved" />
                    Resolved dependencies
                  </span>

                  <span>
                    <i className="legend-dot hierarchy" />
                    Folder hierarchy
                  </span>
                </div>
              </div>

              <div className="graph-canvas">
                {flowNodes.length > 0 ? (
                  <ReactFlow
                    nodes={flowNodes}
                    edges={graphEdges}
                    nodeTypes={nodeTypes}
                    onNodesChange={onNodesChange}
                    onNodeClick={handleNodeClickWithTree}
                    defaultViewport={{ x: 40, y: 40, zoom: 0.85 }}
                    minZoom={0.35}
                    maxZoom={2.5}
                    nodesDraggable
                    elementsSelectable
                    panOnDrag
                    zoomOnScroll
                    zoomOnPinch
                    defaultEdgeOptions={{ type: "smoothstep" }}
                  >
                    <Background />

                    <Controls />

                    <Panel
                      position="bottom-right"
                      className="codemap-minimap-panel"
                      style={{
                        transform: `translate(${miniMapPosition.x}px, ${miniMapPosition.y}px)`,
                      }}
                    >
                      <div
                        className="codemap-minimap-header"
                        onPointerDown={(event) => {
                          event.currentTarget.setPointerCapture(
                            event.pointerId,
                          );

                          setMiniMapDrag({
                            startX: event.clientX,

                            startY: event.clientY,

                            originX: miniMapPosition.x,

                            originY: miniMapPosition.y,
                          });
                        }}
                        onPointerMove={(event) => {
                          if (!miniMapDrag) return;

                          setMiniMapPosition({
                            x:
                              miniMapDrag.originX +
                              event.clientX -
                              miniMapDrag.startX,

                            y:
                              miniMapDrag.originY +
                              event.clientY -
                              miniMapDrag.startY,
                          });
                        }}
                        onPointerUp={() => setMiniMapDrag(null)}
                        onPointerCancel={() => setMiniMapDrag(null)}
                      >
                        <span>Repository map</span>

                        <span className="minimap-drag-icon">⠿</span>
                      </div>

                      <MiniMap
                        pannable
                        zoomable
                        nodeColor={(node) =>
                          (node.data as ExplorerNodeData)?.kind === "folder"
                            ? "#14b8a6"
                            : "#64748b"
                        }
                      />
                    </Panel>
                  </ReactFlow>
                ) : (
                  <div className="graph-empty">
                    <Network size={28} />

                    <strong>No dependency nodes found</strong>

                    <span>
                      The repository was analyzed, but no supported source files
                      were added to the graph.
                    </span>
                  </div>
                )}
              </div>
            </main>

            <aside className="explorer-details-panel">
              <div className="explorer-panel-heading">
                <div>
                  <h2>File details</h2>

                  <span>Selected source file</span>
                </div>

                <FileCode2 size={17} />
              </div>

              {selectedFile ? (
                <div className="file-details">
                  <div className="file-detail-title">
                    <FileCode2 size={20} />

                    <strong>{selectedFile.name}</strong>
                  </div>

                  <p className="file-detail-path">{selectedFile.path}</p>

                  <div className="file-detail-language">
                    {selectedFile.language ?? getLanguage(selectedFile.name)}
                  </div>

                  <section className="file-detail-section">
                    <h3>FILE INFORMATION</h3>

                    <div className="file-detail-grid">
                      <div>
                        <span>Language</span>

                        <strong>
                          {selectedFile.language ??
                            getLanguage(selectedFile.name)}
                        </strong>
                      </div>

                      <div>
                        <span>Size</span>

                        <strong>{formatBytes(selectedFile.sizeBytes)}</strong>
                      </div>
                    </div>
                  </section>

                  <section className="file-detail-section">
                    <h3>DEPENDENCY METRICS</h3>

                    <div className="file-detail-grid">
                      <div>
                        <span>Fan-in</span>

                        <strong>
                          {selectedGraphNode?.fanIn ?? selectedImporters.length}
                        </strong>
                      </div>

                      <div>
                        <span>Fan-out</span>

                        <strong>
                          {selectedGraphNode?.fanOut ?? selectedImports.length}
                        </strong>
                      </div>
                    </div>
                  </section>

                  <section className="file-detail-section">
                    <h3>IMPORTS ({selectedImports.length})</h3>

                    {selectedImports.length > 0 ? (
                      selectedImports.map((edge) => (
                        <div className="file-relation" key={edge.id}>
                          <span>{edge.importSource}</span>

                          <small>
                            {edge.resolution} · line {edge.line}
                          </small>
                        </div>
                      ))
                    ) : (
                      <p className="file-detail-muted">No imports detected.</p>
                    )}
                  </section>

                  <section className="file-detail-section">
                    <h3>IMPORTED BY ({selectedImporters.length})</h3>

                    {selectedImporters.length > 0 ? (
                      selectedImporters.map((edge) => (
                        <div className="file-relation" key={edge.id}>
                          <span>{edge.source.split("/").pop()}</span>

                          <small>
                            {edge.importKind} · line {edge.line}
                          </small>
                        </div>
                      ))
                    ) : (
                      <p className="file-detail-muted">
                        No files import this file.
                      </p>
                    )}
                  </section>
                </div>
              ) : (
                <div className="file-detail-empty">
                  <FileCode2 size={28} />

                  <strong>No file selected</strong>

                  <span>
                    Select a file from the repository tree or dependency graph
                    to inspect its details.
                  </span>
                </div>
              )}
            </aside>
          </div>

          <footer className="explorer-footer">
            <div>
              <span>{analysisData.analysis.totalFiles} files</span>

              <span>{analysisData.analysis.totalFolders} folders</span>

              <span>{analysisData.analysis.parser.parsedFiles} parsed</span>

              <span>{analysisData.analysis.parser.skippedFiles} skipped</span>
            </div>

            <div>
              {Object.entries(analysisData.analysis.languages).map(
                ([language, count]) => (
                  <span key={language}>
                    {language}: {count}
                  </span>
                ),
              )}
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
