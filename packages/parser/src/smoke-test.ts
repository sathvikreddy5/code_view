import { detectSourceLanguage, parseSource } from "./parser.js";

import { extractImports } from "./js-import-extractor.js";

type SmokeTestCase = {
  filePath: string;
  source: string;
  expectedLanguage: "javascript" | "typescript" | "tsx";
  expectedImports: number;
  expectedKinds: string[];
};

const testCases: SmokeTestCase[] = [
  {
    filePath: "src/App.tsx",
    expectedLanguage: "tsx",
    expectedImports: 4,
    expectedKinds: ["import", "re-export", "dynamic-import"],
    source: `
import React from "react";
import Button from "./components/Button";
export { helper } from "../utils/helper";
const LazyComponent = import("./LazyComponent");

export default function App() {
  return <Button />;
}
`,
  },
  {
    filePath: "src/server.js",
    expectedLanguage: "javascript",
    expectedImports: 2,
    expectedKinds: ["require", "import"],
    source: `
const express = require("express");
import routes from "./routes.js";

const app = express();
app.use(routes);

export default app;
`,
  },
  {
    filePath: "src/utils.ts",
    expectedLanguage: "typescript",
    expectedImports: 1,
    expectedKinds: ["import"],
    source: `
import { helper } from "./helper";

export function calculate(value: number): number {
  return helper(value) * 2;
}
`,
  },
];

async function runSmokeTest(): Promise<void> {
  console.log("Starting Tree-sitter parser smoke tests...\n");

  let totalImports = 0;
  let totalFiles = 0;

  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.filePath}`);

    // 1. Verify file extension detection.
    const detectedLanguage = detectSourceLanguage(testCase.filePath);

    if (detectedLanguage !== testCase.expectedLanguage) {
      throw new Error(
        `Language detection failed for ${testCase.filePath}. ` +
          `Expected ${testCase.expectedLanguage}, received ${detectedLanguage}.`,
      );
    }

    // 2. Parse the source using the appropriate grammar.
    const parsed = await parseSource(testCase.source, detectedLanguage);

    try {
      if (parsed.hasSyntaxErrors) {
        throw new Error(
          `Tree-sitter reported syntax errors in ${testCase.filePath}.`,
        );
      }

      // 3. Extract imports from the syntax tree.
      const imports = extractImports(parsed.tree.rootNode);

      if (imports.length !== testCase.expectedImports) {
        throw new Error(
          `Expected ${testCase.expectedImports} imports in ` +
            `${testCase.filePath}, received ${imports.length}.\n` +
            JSON.stringify(imports, null, 2),
        );
      }

      // 4. Verify that expected import kinds are present.
      const actualKinds = new Set(imports.map((item) => item.kind));

      for (const expectedKind of testCase.expectedKinds) {
        if (!actualKinds.has(expectedKind as never)) {
          throw new Error(
            `Missing expected import kind "${expectedKind}" ` +
              `in ${testCase.filePath}.\n` +
              `Found: ${[...actualKinds].join(", ")}`,
          );
        }
      }

      totalFiles++;
      totalImports += imports.length;

      console.log(`  Language: ${detectedLanguage}`);
      console.log("  Syntax errors: false");
      console.log(`  Extracted imports: ${imports.length}`);
      console.log("  Import kinds:", [...actualKinds].join(", "));
      console.log("  Passed.\n");
    } finally {
      // Always release Tree-sitter's native/WASM tree resources.
      parsed.tree.delete();
    }
  }

  console.log("-----------------------------------");
  console.log("All parser smoke tests passed.");
  console.log(`Files tested: ${totalFiles}`);
  console.log(`Imports extracted: ${totalImports}`);
  console.log("-----------------------------------");
}

runSmokeTest().catch((error: unknown) => {
  console.error("\nParser smoke test failed:");

  if (error instanceof Error) {
    console.error(error.stack ?? error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
