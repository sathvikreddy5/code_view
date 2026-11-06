export type ImportKind = "import" | "re-export" | "require" | "dynamic-import";

export type ExtractedImport = {
  source: string;
  kind: ImportKind;
  line: number;
};

type SyntaxNodeLike = {
  type: string;
  text: string;
  startPosition: {
    row: number;
    column: number;
  };
  namedChildren: SyntaxNodeLike[];
  childForFieldName(name: string): SyntaxNodeLike | null;
};

function readStringLiteral(node: SyntaxNodeLike | null): string | null {
  if (!node || node.type !== "string") {
    return null;
  }

  const raw = node.text;

  if (raw.length < 2) {
    return null;
  }

  const quote = raw[0];

  if (
    (quote !== "'" && quote !== '"' && quote !== "`") ||
    raw[raw.length - 1] !== quote
  ) {
    return null;
  }

  const value = raw.slice(1, -1);

  // Ignore template literals containing interpolation.
  if (quote === "`" && value.includes("${")) {
    return null;
  }

  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\(['"`\\])/g, "$1");
}

export function extractImports(rootNode: SyntaxNodeLike): ExtractedImport[] {
  const imports: ExtractedImport[] = [];

  function visit(node: SyntaxNodeLike): void {
    if (node.type === "import_statement" || node.type === "export_statement") {
      const sourceNode = node.childForFieldName("source");
      const source = readStringLiteral(sourceNode);

      if (source) {
        imports.push({
          source,
          kind: node.type === "import_statement" ? "import" : "re-export",
          line: node.startPosition.row + 1,
        });
      }
    }

    if (node.type === "call_expression") {
      const functionNode = node.childForFieldName("function");
      const argumentsNode = node.childForFieldName("arguments");
      const firstArgument = argumentsNode?.namedChildren[0] ?? null;

      const source = readStringLiteral(firstArgument);
      const functionText = functionNode?.text;

      if (source && functionText === "require") {
        imports.push({
          source,
          kind: "require",
          line: node.startPosition.row + 1,
        });
      }

      if (source && functionNode?.type === "import") {
        imports.push({
          source,
          kind: "dynamic-import",
          line: node.startPosition.row + 1,
        });
      }
    }

    for (const child of node.namedChildren) {
      visit(child);
    }
  }

  visit(rootNode);

  return imports;
}
