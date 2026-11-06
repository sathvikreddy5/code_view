import type { ImportKind } from "./js-import-extractor.js";
import type { ResolvedDependency } from "./dependency-resolver.js";

export type GraphNode = {
  id: string;
  type: "file";
  fanIn: number;
  fanOut: number;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string | null;
  type: "import";
  importSource: string;
  importKind: ImportKind;
  resolution: "resolved" | "external" | "unresolved";
  line: number;
};

export type FileDependencyInput = {
  filePath: string;
  dependencies: Array<
    ResolvedDependency & {
      kind: ImportKind;
      line: number;
    }
  >;
};

export type DependencyGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metrics: {
    totalNodes: number;
    totalEdges: number;
    resolvedEdges: number;
    unresolvedImports: number;
    externalImports: number;
    circularDependencyGroups: string[][];
  };
};

export function buildDependencyGraph(
  files: FileDependencyInput[],
): DependencyGraph {
  const nodeIds = new Set<string>();
  const edges: GraphEdge[] = [];
  const edgeIds = new Set<string>();

  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();

  let unresolvedImports = 0;
  let externalImports = 0;
  let resolvedEdges = 0;

  function addNode(id: string): void {
    nodeIds.add(id);

    if (!outgoing.has(id)) outgoing.set(id, new Set());
    if (!incoming.has(id)) incoming.set(id, new Set());
  }

  for (const file of files) {
    addNode(file.filePath);

    for (const dependency of file.dependencies) {
      const target =
        dependency.status === "resolved" ? dependency.targetPath : null;

      const edgeId = [
        file.filePath,
        dependency.line,
        dependency.kind,
        dependency.source,
      ].join("::");

      if (edgeIds.has(edgeId)) continue;
      edgeIds.add(edgeId);

      edges.push({
        id: edgeId,
        source: file.filePath,
        target,
        type: "import",
        importSource: dependency.source,
        importKind: dependency.kind,
        resolution: dependency.status,
        line: dependency.line,
      });

      if (dependency.status === "external") {
        externalImports += 1;
        continue;
      }

      if (dependency.status !== "resolved" || !target) {
        unresolvedImports += 1;
        continue;
      }

      resolvedEdges += 1;
      addNode(target);

      outgoing.get(file.filePath)!.add(target);
      incoming.get(target)!.add(file.filePath);
    }
  }

  const nodes: GraphNode[] = [...nodeIds].map((id) => ({
    id,
    type: "file",
    fanIn: incoming.get(id)?.size ?? 0,
    fanOut: outgoing.get(id)?.size ?? 0,
  }));

  const circularDependencyGroups = findStronglyConnectedComponents(outgoing);

  return {
    nodes,
    edges,
    metrics: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      resolvedEdges,
      unresolvedImports,
      externalImports,
      circularDependencyGroups,
    },
  };
}

/**
 * Tarjan's Strongly Connected Components algorithm.
 * Components with multiple nodes represent cycles.
 * A single node is a cycle only if it imports itself.
 */
function findStronglyConnectedComponents(
  adjacency: Map<string, Set<string>>,
): string[][] {
  let nextIndex = 0;

  const indexMap = new Map<string, number>();
  const lowLinkMap = new Map<string, number>();

  const stack: string[] = [];
  const onStack = new Set<string>();
  const cycles: string[][] = [];

  function connect(node: string): void {
    indexMap.set(node, nextIndex);
    lowLinkMap.set(node, nextIndex);
    nextIndex += 1;

    stack.push(node);
    onStack.add(node);

    for (const neighbor of adjacency.get(node) ?? []) {
      if (!indexMap.has(neighbor)) {
        connect(neighbor);

        lowLinkMap.set(
          node,
          Math.min(lowLinkMap.get(node)!, lowLinkMap.get(neighbor)!),
        );
      } else if (onStack.has(neighbor)) {
        lowLinkMap.set(
          node,
          Math.min(lowLinkMap.get(node)!, indexMap.get(neighbor)!),
        );
      }
    }

    if (lowLinkMap.get(node) !== indexMap.get(node)) return;

    const component: string[] = [];
    let current: string;

    do {
      current = stack.pop()!;
      onStack.delete(current);
      component.push(current);
    } while (current !== node);

    const hasSelfLoop =
      component.length === 1 && (adjacency.get(node)?.has(node) ?? false);

    if (component.length > 1 || hasSelfLoop) {
      cycles.push(component);
    }
  }

  for (const node of adjacency.keys()) {
    if (!indexMap.has(node)) connect(node);
  }

  return cycles;
}
