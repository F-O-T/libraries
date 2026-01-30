# PDF Library Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a comprehensive PDF 1.7 library from scratch with generation, parsing, and digital signature capabilities, fully integrated with @f-o-t/digital-certificate.

**Architecture:** PDF object model with streaming support, generation engine for creating PDFs, parsing engine for reading PDFs, and deep integration with digital-certificate library for signing. All validation through Zod schemas. Phased approach: basic generation → parsing → advanced features → signatures.

**Tech Stack:** TypeScript 5.9, Zod 4.3, Bun runtime, @f-o-t/digital-certificate for signatures

---

**NOTE:** This is a comprehensive long-term plan. Given the scope, it's recommended to implement in phases:
- **Phase 1**: PDF object model and basic generation (MVP)
- **Phase 2**: Text rendering and fonts
- **Phase 3**: Parsing and reading
- **Phase 4**: Advanced graphics and images
- **Phase 5**: Digital signatures
- **Phase 6**: Forms, annotations, encryption

Each phase can be delivered independently for incremental value.

---

## Phase 1: Project Setup & PDF Object Model

### Task 1: Initialize Library Structure

**Files:**
- Create: `libraries/pdf/package.json`
- Create: `libraries/pdf/tsconfig.json`
- Create: `libraries/pdf/bunup.config.ts`
- Create: `libraries/pdf/src/index.ts`
- Create: `libraries/pdf/README.md`

**Step 1: Create package.json**

```json
{
   "name": "@f-o-t/pdf",
   "version": "0.1.0",
   "description": "Comprehensive PDF 1.7 library with generation, parsing, and digital signatures",
   "type": "module",
   "module": "./dist/index.js",
   "types": "./dist/index.d.ts",
   "exports": {
      ".": {
         "bun": "./src/index.ts",
         "import": {
            "default": "./dist/index.js",
            "types": "./dist/index.d.ts"
         },
         "types": "./src/index.ts"
      },
      "./generation": {
         "bun": "./src/generation/index.ts",
         "import": {
            "default": "./dist/generation/index.js",
            "types": "./dist/generation/index.d.ts"
         },
         "types": "./src/generation/index.ts"
      },
      "./parsing": {
         "bun": "./src/parsing/index.ts",
         "import": {
            "default": "./dist/parsing/index.js",
            "types": "./dist/parsing/index.d.ts"
         },
         "types": "./src/parsing/index.ts"
      },
      "./signing": {
         "bun": "./src/signing/index.ts",
         "import": {
            "default": "./dist/signing/index.js",
            "types": "./dist/signing/index.d.ts"
         },
         "types": "./src/signing/index.ts"
      },
      "./package.json": "./package.json"
   },
   "files": [
      "dist"
   ],
   "scripts": {
      "build": "bunup",
      "dev": "bunup --watch",
      "test": "bun test",
      "test:coverage": "bun test --coverage",
      "test:watch": "bun test --watch",
      "typecheck": "tsc",
      "check": "biome check --write .",
      "release": "bumpp --commit --push --tag"
   },
   "dependencies": {
      "@f-o-t/digital-certificate": "workspace:*",
      "zod": "4.3.4"
   },
   "devDependencies": {
      "@biomejs/biome": "2.3.10",
      "@types/bun": "1.3.5",
      "bumpp": "10.3.2",
      "bunup": "0.16.11",
      "typescript": "5.9.3"
   },
   "peerDependencies": {
      "typescript": ">=4.5.0"
   },
   "peerDependenciesMeta": {
      "typescript": {
         "optional": true
      }
   },
   "private": false,
   "publishConfig": {
      "access": "public"
   },
   "repository": {
      "type": "git",
      "url": "https://github.com/F-O-T/montte-nx.git"
   },
   "bugs": {
      "url": "https://github.com/F-O-T/montte-nx/issues"
   },
   "homepage": "https://github.com/F-O-T/montte-nx/blob/master/libraries/pdf",
   "license": "MIT"
}
```

**Step 2: Create tsconfig.json**

```json
{
   "compilerOptions": {
      "allowImportingTsExtensions": true,
      "declaration": true,
      "isolatedDeclarations": false,
      "module": "Preserve",
      "moduleDetection": "force",
      "moduleResolution": "bundler",
      "noEmit": true,
      "noFallthroughCasesInSwitch": true,
      "noImplicitOverride": true,
      "noPropertyAccessFromIndexSignature": false,
      "noUncheckedIndexedAccess": true,
      "noUnusedLocals": false,
      "noUnusedParameters": false,
      "skipLibCheck": true,
      "strict": true,
      "target": "ES2023",
      "verbatimModuleSyntax": true
   },
   "exclude": ["node_modules", "dist", "bunup.config.ts"],
   "include": ["src/**/*"]
}
```

**Step 3: Create bunup.config.ts**

```typescript
import { defineConfig } from "bunup";

export default defineConfig({
   entry: [
      "src/index.ts",
      "src/generation/index.ts",
      "src/parsing/index.ts",
      "src/signing/index.ts",
   ],
   outdir: "dist",
   clean: true,
   dts: true,
   format: "esm",
   target: "es2023",
   minify: false,
   sourcemap: true,
});
```

**Step 4: Create initial src/index.ts**

```typescript
// Main exports - will be populated as we build
export * from "./core/index.ts";
export * from "./generation/index.ts";
export * from "./parsing/index.ts";
export * from "./types.ts";
export * from "./schemas.ts";
export * from "./errors.ts";
```

**Step 5: Create minimal README.md**

```markdown
# @f-o-t/pdf

Comprehensive PDF 1.7 library with generation, parsing, and digital signatures.

## Features

- **Complete PDF 1.7 Support**: Full spec implementation
- **Generation**: Create PDFs from scratch with text, graphics, images
- **Parsing**: Read and extract content from PDFs
- **Digital Signatures**: Sign PDFs with @f-o-t/digital-certificate
- **Zod-First**: Complete validation
- **TypeScript-First**: Full type safety
- **Stream Support**: Memory-efficient processing

## Installation

\`\`\`bash
bun add @f-o-t/pdf
\`\`\`

## Quick Start

\`\`\`typescript
import { createPDF } from "@f-o-t/pdf";

const pdf = createPDF();
pdf.addPage()
   .drawText("Hello, World!", { x: 50, y: 750 });

const bytes = await pdf.save();
\`\`\`

## Documentation

Coming soon.

## License

MIT
```

**Step 6: Commit**

```bash
git add libraries/pdf/
git commit -m "feat(pdf): initialize library structure

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Define Core Types and Schemas

**Files:**
- Create: `libraries/pdf/src/types.ts`
- Create: `libraries/pdf/src/schemas.ts`
- Create: `libraries/pdf/src/errors.ts`

**Step 1: Create types.ts**

```typescript
/**
 * PDF object types
 */
export type PDFObjectType =
   | "boolean"
   | "number"
   | "string"
   | "name"
   | "array"
   | "dictionary"
   | "stream"
   | "null"
   | "indirect";

/**
 * PDF reference to indirect object
 */
export type PDFRef = {
   objectNumber: number;
   generation: number;
};

/**
 * PDF indirect object
 */
export type PDFIndirectObject = {
   ref: PDFRef;
   value: PDFValue;
};

/**
 * PDF value types
 */
export type PDFValue =
   | boolean
   | number
   | string
   | PDFName
   | PDFArray
   | PDFDictionary
   | PDFStream
   | null
   | PDFRef;

/**
 * PDF Name object
 */
export type PDFName = {
   type: "name";
   value: string;
};

/**
 * PDF Array
 */
export type PDFArray = PDFValue[];

/**
 * PDF Dictionary
 */
export type PDFDictionary = Map<string, PDFValue>;

/**
 * PDF Stream
 */
export type PDFStream = {
   dictionary: PDFDictionary;
   data: Uint8Array;
};

/**
 * PDF Page size presets
 */
export type PageSize =
   | "A4"
   | "Letter"
   | "Legal"
   | "A3"
   | "A5"
   | "Tabloid"
   | { width: number; height: number };

/**
 * PDF Color
 */
export type PDFColor =
   | { type: "rgb"; r: number; g: number; b: number }
   | { type: "cmyk"; c: number; m: number; y: number; k: number }
   | { type: "gray"; gray: number };

/**
 * Text options
 */
export type TextOptions = {
   x: number;
   y: number;
   size?: number;
   font?: string;
   color?: PDFColor;
   align?: "left" | "center" | "right";
};

/**
 * Rectangle options
 */
export type RectOptions = {
   x: number;
   y: number;
   width: number;
   height: number;
   fill?: PDFColor;
   stroke?: PDFColor;
   lineWidth?: number;
};

/**
 * Line options
 */
export type LineOptions = {
   x1: number;
   y1: number;
   x2: number;
   y2: number;
   color?: PDFColor;
   lineWidth?: number;
};

/**
 * PDF metadata
 */
export type PDFMetadata = {
   title?: string;
   author?: string;
   subject?: string;
   keywords?: string[];
   creator?: string;
   producer?: string;
   creationDate?: Date;
   modificationDate?: Date;
};

/**
 * PDF version
 */
export type PDFVersion = "1.4" | "1.5" | "1.6" | "1.7";
```

**Step 2: Create schemas.ts**

```typescript
import { z } from "zod";

/**
 * PDF Reference schema
 */
export const PDFRefSchema = z.object({
   objectNumber: z.number().int().positive(),
   generation: z.number().int().nonnegative(),
});

/**
 * PDF Name schema
 */
export const PDFNameSchema = z.object({
   type: z.literal("name"),
   value: z.string(),
});

/**
 * Page size schema
 */
export const PageSizeSchema = z.union([
   z.enum(["A4", "Letter", "Legal", "A3", "A5", "Tabloid"]),
   z.object({
      width: z.number().positive(),
      height: z.number().positive(),
   }),
]);

/**
 * RGB color schema
 */
export const RGBColorSchema = z.object({
   type: z.literal("rgb"),
   r: z.number().min(0).max(1),
   g: z.number().min(0).max(1),
   b: z.number().min(0).max(1),
});

/**
 * CMYK color schema
 */
export const CMYKColorSchema = z.object({
   type: z.literal("cmyk"),
   c: z.number().min(0).max(1),
   m: z.number().min(0).max(1),
   y: z.number().min(0).max(1),
   k: z.number().min(0).max(1),
});

/**
 * Gray color schema
 */
export const GrayColorSchema = z.object({
   type: z.literal("gray"),
   gray: z.number().min(0).max(1),
});

/**
 * PDF Color schema
 */
export const PDFColorSchema = z.union([
   RGBColorSchema,
   CMYKColorSchema,
   GrayColorSchema,
]);

/**
 * Text options schema
 */
export const TextOptionsSchema = z.object({
   x: z.number(),
   y: z.number(),
   size: z.number().positive().optional(),
   font: z.string().optional(),
   color: PDFColorSchema.optional(),
   align: z.enum(["left", "center", "right"]).optional(),
});

/**
 * Rectangle options schema
 */
export const RectOptionsSchema = z.object({
   x: z.number(),
   y: z.number(),
   width: z.number().positive(),
   height: z.number().positive(),
   fill: PDFColorSchema.optional(),
   stroke: PDFColorSchema.optional(),
   lineWidth: z.number().positive().optional(),
});

/**
 * Line options schema
 */
export const LineOptionsSchema = z.object({
   x1: z.number(),
   y1: z.number(),
   x2: z.number(),
   y2: z.number(),
   color: PDFColorSchema.optional(),
   lineWidth: z.number().positive().optional(),
});

/**
 * PDF metadata schema
 */
export const PDFMetadataSchema = z.object({
   title: z.string().optional(),
   author: z.string().optional(),
   subject: z.string().optional(),
   keywords: z.array(z.string()).optional(),
   creator: z.string().optional(),
   producer: z.string().optional(),
   creationDate: z.date().optional(),
   modificationDate: z.date().optional(),
});

/**
 * PDF version schema
 */
export const PDFVersionSchema = z.enum(["1.4", "1.5", "1.6", "1.7"]);
```

**Step 3: Create errors.ts**

```typescript
/**
 * Base error class for all PDF errors
 */
export class PDFError extends Error {
   constructor(message: string) {
      super(message);
      this.name = "PDFError";
   }
}

/**
 * Error thrown when PDF parsing fails
 */
export class PDFParseError extends PDFError {
   constructor(
      message: string,
      public readonly offset?: number,
   ) {
      super(message);
      this.name = "PDFParseError";
   }
}

/**
 * Error thrown when PDF generation fails
 */
export class PDFGenerationError extends PDFError {
   constructor(message: string) {
      super(message);
      this.name = "PDFGenerationError";
   }
}

/**
 * Error thrown when PDF object is invalid
 */
export class InvalidPDFObjectError extends PDFError {
   constructor(
      public readonly objectType: string,
      reason: string,
   ) {
      super(`Invalid ${objectType}: ${reason}`);
      this.name = "InvalidPDFObjectError";
   }
}

/**
 * Error thrown when font is not found
 */
export class FontNotFoundError extends PDFError {
   constructor(public readonly fontName: string) {
      super(`Font not found: ${fontName}`);
      this.name = "FontNotFoundError";
   }
}

/**
 * Error thrown when image is invalid
 */
export class InvalidImageError extends PDFError {
   constructor(reason: string) {
      super(`Invalid image: ${reason}`);
      this.name = "InvalidImageError";
   }
}

/**
 * Error thrown when PDF signature fails
 */
export class PDFSignatureError extends PDFError {
   constructor(reason: string) {
      super(`PDF signature error: ${reason}`);
      this.name = "PDFSignatureError";
   }
}

/**
 * Error thrown when PDF encryption fails
 */
export class PDFEncryptionError extends PDFError {
   constructor(reason: string) {
      super(`PDF encryption error: ${reason}`);
      this.name = "PDFEncryptionError";
   }
}

/**
 * Error thrown when required feature is not implemented
 */
export class NotImplementedError extends PDFError {
   constructor(feature: string) {
      super(`Feature not yet implemented: ${feature}`);
      this.name = "NotImplementedError";
   }
}
```

**Step 4: Commit**

```bash
git add libraries/pdf/src/types.ts libraries/pdf/src/schemas.ts libraries/pdf/src/errors.ts
git commit -m "feat(pdf): add core types, schemas, and errors

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Implement PDF Object Model

**Files:**
- Create: `libraries/pdf/src/core/objects.ts`
- Create: `libraries/pdf/src/core/objects.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, expect, test } from "bun:test";
import {
   createName,
   createRef,
   createDictionary,
   createArray,
   createStream,
   isRef,
   isName,
   isDictionary,
} from "./objects.ts";

describe("PDF Objects", () => {
   test("createName creates PDF name", () => {
      const name = createName("Type");
      expect(name.type).toBe("name");
      expect(name.value).toBe("Type");
   });

   test("createRef creates PDF reference", () => {
      const ref = createRef(1, 0);
      expect(ref.objectNumber).toBe(1);
      expect(ref.generation).toBe(0);
   });

   test("createDictionary creates empty dictionary", () => {
      const dict = createDictionary();
      expect(dict instanceof Map).toBe(true);
      expect(dict.size).toBe(0);
   });

   test("createDictionary with entries", () => {
      const dict = createDictionary({
         Type: createName("Page"),
         Parent: createRef(1, 0),
      });
      expect(dict.get("Type")).toEqual(createName("Page"));
      expect(dict.get("Parent")).toEqual(createRef(1, 0));
   });

   test("createArray creates PDF array", () => {
      const arr = createArray([1, 2, 3]);
      expect(arr).toEqual([1, 2, 3]);
   });

   test("createStream creates PDF stream", () => {
      const data = new Uint8Array([1, 2, 3]);
      const stream = createStream(data);
      expect(stream.data).toEqual(data);
      expect(stream.dictionary instanceof Map).toBe(true);
   });

   test("isRef type guard", () => {
      expect(isRef(createRef(1, 0))).toBe(true);
      expect(isRef({ objectNumber: 1 })).toBe(false);
      expect(isRef(123)).toBe(false);
   });

   test("isName type guard", () => {
      expect(isName(createName("Test"))).toBe(true);
      expect(isName({ type: "other", value: "test" })).toBe(false);
      expect(isName("test")).toBe(false);
   });

   test("isDictionary type guard", () => {
      expect(isDictionary(createDictionary())).toBe(true);
      expect(isDictionary(new Map())).toBe(true);
      expect(isDictionary({})).toBe(false);
   });
});
```

**Step 2: Run tests**

Run: `cd libraries/pdf && bun test src/core/objects.test.ts`
Expected: FAIL - functions not defined

**Step 3: Implement PDF objects**

Create `objects.ts`:

```typescript
import type {
   PDFName,
   PDFRef,
   PDFDictionary,
   PDFArray,
   PDFStream,
   PDFValue,
} from "../types.ts";

/**
 * Create a PDF Name object
 */
export function createName(value: string): PDFName {
   return { type: "name", value };
}

/**
 * Create a PDF Reference
 */
export function createRef(objectNumber: number, generation = 0): PDFRef {
   return { objectNumber, generation };
}

/**
 * Create a PDF Dictionary
 */
export function createDictionary(
   entries?: Record<string, PDFValue>,
): PDFDictionary {
   const dict = new Map<string, PDFValue>();
   if (entries) {
      for (const [key, value] of Object.entries(entries)) {
         dict.set(key, value);
      }
   }
   return dict;
}

/**
 * Create a PDF Array
 */
export function createArray(values: PDFValue[] = []): PDFArray {
   return values;
}

/**
 * Create a PDF Stream
 */
export function createStream(
   data: Uint8Array,
   dictionary?: PDFDictionary,
): PDFStream {
   return {
      dictionary: dictionary ?? createDictionary(),
      data,
   };
}

/**
 * Type guard for PDF Reference
 */
export function isRef(value: unknown): value is PDFRef {
   return (
      typeof value === "object" &&
      value !== null &&
      "objectNumber" in value &&
      "generation" in value &&
      typeof (value as PDFRef).objectNumber === "number" &&
      typeof (value as PDFRef).generation === "number"
   );
}

/**
 * Type guard for PDF Name
 */
export function isName(value: unknown): value is PDFName {
   return (
      typeof value === "object" &&
      value !== null &&
      "type" in value &&
      (value as PDFName).type === "name" &&
      "value" in value &&
      typeof (value as PDFName).value === "string"
   );
}

/**
 * Type guard for PDF Dictionary
 */
export function isDictionary(value: unknown): value is PDFDictionary {
   return value instanceof Map;
}

/**
 * Type guard for PDF Stream
 */
export function isStream(value: unknown): value is PDFStream {
   return (
      typeof value === "object" &&
      value !== null &&
      "dictionary" in value &&
      "data" in value &&
      isDictionary((value as PDFStream).dictionary) &&
      (value as PDFStream).data instanceof Uint8Array
   );
}

/**
 * Type guard for PDF Array
 */
export function isArray(value: unknown): value is PDFArray {
   return Array.isArray(value);
}
```

**Step 4: Run tests**

Run: `cd libraries/pdf && bun test src/core/objects.test.ts`
Expected: All tests PASS

**Step 5: Create core index**

Create `libraries/pdf/src/core/index.ts`:

```typescript
export * from "./objects.ts";
```

**Step 6: Commit**

```bash
git add libraries/pdf/src/core/
git commit -m "feat(pdf): implement PDF object model

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: PDF Generation Engine

### Task 4: Implement PDF Document Class

**Files:**
- Create: `libraries/pdf/src/generation/document.ts`
- Create: `libraries/pdf/src/generation/document.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, expect, test } from "bun:test";
import { PDFDocument } from "./document.ts";

describe("PDFDocument", () => {
   test("creates document with default version", () => {
      const doc = new PDFDocument();
      expect(doc.version).toBe("1.7");
   });

   test("creates document with custom version", () => {
      const doc = new PDFDocument({ version: "1.4" });
      expect(doc.version).toBe("1.4");
   });

   test("generates valid PDF header", () => {
      const doc = new PDFDocument();
      const bytes = doc.save();
      const decoder = new TextDecoder();
      const header = decoder.decode(bytes.slice(0, 8));
      expect(header).toBe("%PDF-1.7");
   });

   test("has catalog object", () => {
      const doc = new PDFDocument();
      expect(doc.catalog).toBeDefined();
   });

   test("has pages object", () => {
      const doc = new PDFDocument();
      expect(doc.pages).toBeDefined();
   });
});
```

**Step 2: Run tests**

Run: `cd libraries/pdf && bun test src/generation/document.test.ts`
Expected: FAIL

**Step 3: Implement PDFDocument (basic)**

Create `document.ts`:

```typescript
import type { PDFVersion, PDFMetadata, PDFRef, PDFDictionary } from "../types.ts";
import { createDictionary, createName, createRef, createArray } from "../core/objects.ts";
import { PDFVersionSchema, PDFMetadataSchema } from "../schemas.ts";

export type PDFDocumentOptions = {
   version?: PDFVersion;
   metadata?: PDFMetadata;
};

/**
 * Main PDF Document class for generation
 */
export class PDFDocument {
   version: PDFVersion;
   metadata: PDFMetadata;
   private objects: Map<number, unknown> = new Map();
   private nextObjectNumber = 1;

   catalog: PDFRef;
   pages: PDFRef;
   private pageRefs: PDFRef[] = [];

   constructor(options: PDFDocumentOptions = {}) {
      this.version = PDFVersionSchema.parse(options.version ?? "1.7");
      this.metadata = PDFMetadataSchema.parse(options.metadata ?? {});

      // Create catalog
      this.catalog = this.allocateRef();

      // Create pages tree
      this.pages = this.allocateRef();

      // Initialize catalog dictionary
      const catalogDict = createDictionary({
         Type: createName("Catalog"),
         Pages: this.pages,
      });
      this.objects.set(this.catalog.objectNumber, catalogDict);

      // Initialize pages dictionary
      const pagesDict = createDictionary({
         Type: createName("Pages"),
         Kids: createArray([]),
         Count: 0,
      });
      this.objects.set(this.pages.objectNumber, pagesDict);
   }

   /**
    * Allocate a new object reference
    */
   private allocateRef(): PDFRef {
      return createRef(this.nextObjectNumber++, 0);
   }

   /**
    * Save PDF to bytes
    */
   save(): Uint8Array {
      // For now, just return header
      const header = `%PDF-${this.version}\n`;
      return new TextEncoder().encode(header);
   }
}
```

**Step 4: Run tests**

Run: `cd libraries/pdf && bun test src/generation/document.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add libraries/pdf/src/generation/
git commit -m "feat(pdf): implement basic PDFDocument class

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

**NOTE: The PDF library implementation is significantly larger than datetime. The remaining tasks would include:**

### Remaining Tasks (Summary)

**Phase 2 Continued: Generation**
- Task 5: Implement Page class
- Task 6: Implement basic text rendering
- Task 7: Implement graphics state and colors
- Task 8: Implement standard 14 fonts
- Task 9: Implement content stream generation
- Task 10: Implement complete PDF writer (cross-reference table, trailer)

**Phase 3: Parsing**
- Task 11: Implement PDF lexer/tokenizer
- Task 12: Implement PDF parser
- Task 13: Implement object reading
- Task 14: Implement page content extraction
- Task 15: Implement text extraction

**Phase 4: Advanced Graphics**
- Task 16: Implement path construction
- Task 17: Implement image embedding (JPEG, PNG)
- Task 18: Implement TrueType font embedding
- Task 19: Implement gradients and patterns

**Phase 5: Digital Signatures**
- Task 20: Integrate @f-o-t/digital-certificate
- Task 21: Implement signature dictionary
- Task 22: Implement byte range calculation
- Task 23: Implement PKCS#7 signature creation
- Task 24: Implement signature verification

**Phase 6: Advanced Features**
- Task 25: Implement forms (AcroForm)
- Task 26: Implement annotations
- Task 27: Implement encryption (40-bit, 128-bit, AES)
- Task 28: Implement compression (Flate)
- Task 29: Implement metadata (XMP)
- Task 30: Implement linearization (fast web view)

**Phase 7: Documentation & Polish**
- Task 31: Write comprehensive README
- Task 32: Write API documentation
- Task 33: Create examples
- Task 34: Performance optimization
- Task 35: Build and publish

---

## Execution Strategy

Given the scope, recommend:

1. **Start with Phase 1-2 (MVP)**: Get basic PDF generation working
2. **Add Phase 3**: Enable reading existing PDFs
3. **Incrementally add phases** based on priority

Each phase can be a separate implementation cycle with its own:
- Planning session
- Implementation
- Testing
- Documentation
- Release

This allows for:
- Faster time to value
- User feedback between phases
- Adjustable priorities based on needs

---

## MVP Deliverable (Phase 1-2)

Minimum viable product includes:
- PDF document creation
- Page management
- Basic text rendering with standard fonts
- Simple graphics (rectangles, lines)
- RGB colors
- Save to file/buffer

This gives users immediate value while you build out remaining features.
