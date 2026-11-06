export {
  analyzeRepository,
  type CodeAnalysisResult,
} from "./analysis.service.js";

export {
  parseSource,
  detectSourceLanguage,
  loadLanguage,
  type SupportedSourceLanguage,
} from "./parser.js";

export {
  extractImports,
  type ExtractedImport,
  type ImportKind,
} from "./js-import-extractor.js";

export {
  resolveDependency,
  type ResolvedDependency,
  type ResolutionStatus,
} from "./dependency-resolver.js";

export {
  buildDependencyGraph,
  type DependencyGraph,
  type GraphNode,
  type GraphEdge,
  type FileDependencyInput,
} from "./dependency-graph.js";
