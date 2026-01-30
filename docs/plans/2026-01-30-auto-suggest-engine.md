# Auto-Suggest Engine with NES Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an intelligent auto-suggest engine with dual modes (FIM completion + Next Edit Suggestion) that integrates rules engine, content analysis, spelling, thesaurus, and adaptive learning for the Contentta CMS.

**Architecture:** Multi-layered worker architecture with Main Coordinator Worker dispatching to specialized workers (Parse, Spelling+Thesaurus, Content Analysis, Rules Engine). Incremental analysis with caching, adaptive ranking with IndexedDB persistence, and LSP protocol integration for editor support.

**Tech Stack:** Bun, TypeScript, Zod, Web Workers, IndexedDB, existing @f-o-t libraries (rules-engine, markdown, spelling, content-analysis), LSP protocol

---

## Phase 1: Foundation Libraries

### Task 1: Create @f-o-t/thesaurus Library

**Files:**
- Create: `libraries/thesaurus/package.json`
- Create: `libraries/thesaurus/tsconfig.json`
- Create: `libraries/thesaurus/biome.json`
- Create: `libraries/thesaurus/src/index.ts`
- Create: `libraries/thesaurus/src/types.ts`
- Create: `libraries/thesaurus/src/thesaurus.test.ts`
- Create: `libraries/thesaurus/README.md`

**Step 1: Write the failing test**

Create test file at `libraries/thesaurus/src/thesaurus.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { createThesaurus, type ThesaurusEntry } from "./index";

describe("Thesaurus", () => {
  it("should find synonyms for a word", () => {
    const entries: ThesaurusEntry[] = [
      {
        word: "good",
        synonyms: ["excellent", "great", "fine"],
        antonyms: ["bad", "poor"],
        related: ["better", "best"],
      },
    ];

    const thesaurus = createThesaurus({ entries });
    const result = thesaurus.getSynonyms("good");

    expect(result).toEqual(["excellent", "great", "fine"]);
  });

  it("should filter synonyms by style", () => {
    const entries: ThesaurusEntry[] = [
      {
        word: "use",
        synonyms: [
          { word: "utilize", style: "formal" },
          { word: "employ", style: "formal" },
          { word: "apply", style: "casual" },
        ],
        antonyms: [],
        related: [],
      },
    ];

    const thesaurus = createThesaurus({ entries });
    const result = thesaurus.getSynonyms("use", { style: "formal" });

    expect(result).toEqual(["utilize", "employ"]);
  });

  it("should detect weak words", () => {
    const thesaurus = createThesaurus({
      weakWords: ["very", "really", "quite"],
    });

    const result = thesaurus.detectWeakWords("This is very good and really nice");

    expect(result).toEqual([
      { word: "very", offset: 8, suggestions: [] },
      { word: "really", offset: 22, suggestions: [] },
    ]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/thesaurus && bun test`
Expected: FAIL with "Cannot find module './index'"

**Step 3: Write types file**

Create `libraries/thesaurus/src/types.ts`:

```typescript
import { z } from "zod";

export const StyleSchema = z.enum(["formal", "casual", "technical", "general"]);
export type Style = z.infer<typeof StyleSchema>;

export const SynonymEntrySchema = z.union([
  z.string(),
  z.object({
    word: z.string(),
    style: StyleSchema.optional(),
  }),
]);
export type SynonymEntry = z.infer<typeof SynonymEntrySchema>;

export const ThesaurusEntrySchema = z.object({
  word: z.string(),
  synonyms: z.array(SynonymEntrySchema),
  antonyms: z.array(z.string()),
  related: z.array(z.string()),
});
export type ThesaurusEntry = z.infer<typeof ThesaurusEntrySchema>;

export const ThesaurusConfigSchema = z.object({
  entries: z.array(ThesaurusEntrySchema).optional().default([]),
  weakWords: z.array(z.string()).optional().default([]),
});
export type ThesaurusConfig = z.infer<typeof ThesaurusConfigSchema>;

export const WeakWordDetectionSchema = z.object({
  word: z.string(),
  offset: z.number(),
  suggestions: z.array(z.string()),
});
export type WeakWordDetection = z.infer<typeof WeakWordDetectionSchema>;

export const SynonymOptionsSchema = z.object({
  style: StyleSchema.optional(),
  limit: z.number().optional().default(10),
});
export type SynonymOptions = z.infer<typeof SynonymOptionsSchema>;
```

**Step 4: Write minimal implementation**

Create `libraries/thesaurus/src/index.ts`:

```typescript
export * from "./types";
import type {
  ThesaurusConfig,
  ThesaurusEntry,
  SynonymEntry,
  SynonymOptions,
  WeakWordDetection,
} from "./types";

export interface Thesaurus {
  getSynonyms(word: string, options?: SynonymOptions): string[];
  getAntonyms(word: string): string[];
  getRelated(word: string): string[];
  detectWeakWords(text: string): WeakWordDetection[];
  hasWord(word: string): boolean;
}

export function createThesaurus(config: ThesaurusConfig): Thesaurus {
  const entries = new Map<string, ThesaurusEntry>();
  const weakWordsSet = new Set(config.weakWords ?? []);

  // Index entries by word
  for (const entry of config.entries ?? []) {
    entries.set(entry.word.toLowerCase(), entry);
  }

  function getSynonyms(word: string, options?: SynonymOptions): string[] {
    const entry = entries.get(word.toLowerCase());
    if (!entry) return [];

    const style = options?.style;
    const limit = options?.limit ?? 10;

    const synonyms: string[] = [];

    for (const syn of entry.synonyms) {
      if (typeof syn === "string") {
        if (!style || style === "general") {
          synonyms.push(syn);
        }
      } else {
        if (!style || !syn.style || syn.style === style || syn.style === "general") {
          synonyms.push(syn.word);
        }
      }
    }

    return synonyms.slice(0, limit);
  }

  function getAntonyms(word: string): string[] {
    const entry = entries.get(word.toLowerCase());
    return entry?.antonyms ?? [];
  }

  function getRelated(word: string): string[] {
    const entry = entries.get(word.toLowerCase());
    return entry?.related ?? [];
  }

  function detectWeakWords(text: string): WeakWordDetection[] {
    const detections: WeakWordDetection[] = [];
    const words = text.match(/\b\w+\b/g) ?? [];
    let offset = 0;

    for (const word of words) {
      const index = text.indexOf(word, offset);
      if (weakWordsSet.has(word.toLowerCase())) {
        detections.push({
          word,
          offset: index,
          suggestions: [],
        });
      }
      offset = index + word.length;
    }

    return detections;
  }

  function hasWord(word: string): boolean {
    return entries.has(word.toLowerCase());
  }

  return {
    getSynonyms,
    getAntonyms,
    getRelated,
    detectWeakWords,
    hasWord,
  };
}
```

**Step 5: Run test to verify it passes**

Run: `cd libraries/thesaurus && bun test`
Expected: PASS

**Step 6: Create package.json**

Create `libraries/thesaurus/package.json`:

```json
{
  "name": "@f-o-t/thesaurus",
  "version": "1.0.0",
  "description": "Thesaurus library with synonym, antonym, weak word detection and style-aware filtering",
  "type": "module",
  "private": false,
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "bun": "./src/index.ts",
      "import": {
        "default": "./dist/index.js",
        "types": "./dist/index.d.ts"
      },
      "types": "./dist/index.d.ts"
    },
    "./types": {
      "bun": "./src/types.ts",
      "import": {
        "default": "./dist/types.js",
        "types": "./dist/types.d.ts"
      },
      "types": "./dist/types.d.ts"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "bunup",
    "check": "biome check --write .",
    "dev": "bunup --watch",
    "test": "bun test",
    "test:coverage": "bun test --coverage",
    "test:watch": "bun test --watch",
    "typecheck": "tsc"
  },
  "dependencies": {
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@biomejs/biome": "2.3.12",
    "@types/bun": "1.3.6",
    "bumpp": "10.4.0",
    "bunup": "0.16.20",
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
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/F-O-T/contentta-nx.git"
  },
  "homepage": "https://github.com/F-O-T/contentta-nx/blob/master/libraries/thesaurus",
  "bugs": {
    "url": "https://github.com/F-O-T/contentta-nx/issues"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

**Step 7: Create tsconfig.json and biome.json**

Create `libraries/thesaurus/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

Create `libraries/thesaurus/biome.json`:

```json
{
  "extends": "../../biome.json"
}
```

**Step 8: Install dependencies and build**

Run: `cd libraries/thesaurus && bun install && bun run build`
Expected: SUCCESS - dist folder created

**Step 9: Commit**

```bash
git add libraries/thesaurus/
git commit -m "feat(thesaurus): add thesaurus library with synonym detection and style filtering"
```

---

### Task 2: Create @f-o-t/suggestion-rules Library

**Files:**
- Create: `libraries/suggestion-rules/package.json`
- Create: `libraries/suggestion-rules/tsconfig.json`
- Create: `libraries/suggestion-rules/biome.json`
- Create: `libraries/suggestion-rules/src/index.ts`
- Create: `libraries/suggestion-rules/src/types.ts`
- Create: `libraries/suggestion-rules/src/rule-packs/seo-blog.ts`
- Create: `libraries/suggestion-rules/src/rule-packs/index.ts`
- Create: `libraries/suggestion-rules/src/suggestion-rules.test.ts`
- Create: `libraries/suggestion-rules/README.md`

**Step 1: Write the failing test**

Create `libraries/suggestion-rules/src/suggestion-rules.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { getSuggestionRulePack, getAllRulePacks } from "./index";

describe("Suggestion Rules", () => {
  it("should get SEO blog rule pack", () => {
    const pack = getSuggestionRulePack("seo-blog");

    expect(pack).toBeDefined();
    expect(pack?.name).toBe("SEO Blog Content");
    expect(pack?.rules.length).toBeGreaterThan(0);
  });

  it("should list all available packs", () => {
    const packs = getAllRulePacks();

    expect(packs.length).toBeGreaterThan(0);
    expect(packs.some(p => p.id === "seo-blog")).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/suggestion-rules && bun test`
Expected: FAIL with "Cannot find module './index'"

**Step 3: Write types file**

Create `libraries/suggestion-rules/src/types.ts`:

```typescript
import { z } from "zod";
import type { Rule } from "@f-o-t/rules-engine";

export const SuggestionTypeSchema = z.enum([
  "completion",
  "enhancement",
  "quality",
  "seo",
  "readability",
  "structure",
  "style",
]);
export type SuggestionType = z.infer<typeof SuggestionTypeSchema>;

export const SuggestionSeveritySchema = z.enum([
  "error",
  "warning",
  "info",
  "hint",
]);
export type SuggestionSeverity = z.infer<typeof SuggestionSeveritySchema>;

export const SuggestionRulePackSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string(),
  rules: z.array(z.any()), // Rule type from rules-engine
  tags: z.array(z.string()),
  enabled: z.boolean().default(true),
});
export type SuggestionRulePack = z.infer<typeof SuggestionRulePackSchema>;
```

**Step 4: Create SEO blog rule pack**

Create `libraries/suggestion-rules/src/rule-packs/seo-blog.ts`:

```typescript
import { rule, num, str, bool, all } from "@f-o-t/rules-engine";
import type { SuggestionRulePack } from "../types";

export const seoBlogRulePack: SuggestionRulePack = {
  id: "seo-blog",
  name: "SEO Blog Content",
  description: "Rules for optimizing blog content for search engines and readability",
  version: "1.0.0",
  enabled: true,
  tags: ["seo", "blog", "content"],
  rules: [
    rule()
      .named("Missing H2 Headings")
      .describedAs("Content should have H2 headings for every 200-300 words")
      .when(
        all(
          num("wordCount", "gt", 600),
          num("h2Count", "lt", 2)
        )
      )
      .then("suggest_add_headings", {
        type: "structure",
        severity: "warning",
        message: "Add more H2 headings to break up content (1 per 200-300 words)",
        action: "insert_heading",
      })
      .withPriority(80)
      .tagged("seo", "structure")
      .inCategory("content-structure")
      .build(),

    rule()
      .named("Low Readability Score")
      .describedAs("Content readability is below target for general audience")
      .when(
        all(
          num("readabilityScore", "lt", 60),
          str("targetAudience", "eq", "general")
        )
      )
      .then("suggest_simplify", {
        type: "readability",
        severity: "warning",
        message: "Readability score is low. Consider shorter sentences and simpler words.",
        action: "show_alternatives",
      })
      .withPriority(70)
      .tagged("readability", "quality")
      .inCategory("content-quality")
      .build(),

    rule()
      .named("Missing Meta Description")
      .describedAs("Document should have a meta description for SEO")
      .when(
        bool("hasMetaDescription", "eq", false)
      )
      .then("suggest_meta_description", {
        type: "seo",
        severity: "error",
        message: "Add a meta description (150-160 characters) for better SEO",
        action: "generate_meta_description",
      })
      .withPriority(100)
      .tagged("seo", "metadata")
      .inCategory("seo-basics")
      .build(),

    rule()
      .named("Keyword Not in Title")
      .describedAs("Target keyword should appear in the title")
      .when(
        all(
          bool("hasTargetKeyword", "eq", true),
          bool("keywordInTitle", "eq", false)
        )
      )
      .then("suggest_title_keyword", {
        type: "seo",
        severity: "warning",
        message: "Include your target keyword in the title for better SEO",
        action: "suggest_title_rewrite",
      })
      .withPriority(90)
      .tagged("seo", "keywords")
      .inCategory("seo-keywords")
      .build(),

    rule()
      .named("Content Too Short")
      .describedAs("Blog content should be at least 600 words for good SEO")
      .when(
        num("wordCount", "lt", 600)
      )
      .then("suggest_expand_content", {
        type: "quality",
        severity: "info",
        message: "Content is short. Consider expanding to 600+ words for better SEO.",
        action: "suggest_topics",
      })
      .withPriority(50)
      .tagged("seo", "content-length")
      .inCategory("content-quality")
      .build(),

    rule()
      .named("No Internal Links")
      .describedAs("Content should include internal links for SEO")
      .when(
        num("internalLinkCount", "eq", 0)
      )
      .then("suggest_internal_links", {
        type: "seo",
        severity: "info",
        message: "Add internal links to improve site structure and SEO",
        action: "suggest_related_content",
      })
      .withPriority(60)
      .tagged("seo", "links")
      .inCategory("seo-links")
      .build(),

    rule()
      .named("Images Missing Alt Text")
      .describedAs("All images should have descriptive alt text")
      .when(
        num("imagesWithoutAlt", "gt", 0)
      )
      .then("suggest_alt_text", {
        type: "seo",
        severity: "warning",
        message: "Add alt text to images for accessibility and SEO",
        action: "generate_alt_text",
      })
      .withPriority(75)
      .tagged("seo", "accessibility", "images")
      .inCategory("seo-images")
      .build(),
  ],
};
```

**Step 5: Create index exports**

Create `libraries/suggestion-rules/src/rule-packs/index.ts`:

```typescript
export { seoBlogRulePack } from "./seo-blog";
```

Create `libraries/suggestion-rules/src/index.ts`:

```typescript
export * from "./types";
import type { SuggestionRulePack } from "./types";
import { seoBlogRulePack } from "./rule-packs";

const RULE_PACKS = new Map<string, SuggestionRulePack>([
  ["seo-blog", seoBlogRulePack],
]);

export function getSuggestionRulePack(id: string): SuggestionRulePack | undefined {
  return RULE_PACKS.get(id);
}

export function getAllRulePacks(): SuggestionRulePack[] {
  return Array.from(RULE_PACKS.values());
}

export function registerRulePack(pack: SuggestionRulePack): void {
  RULE_PACKS.set(pack.id, pack);
}

export * from "./rule-packs";
```

**Step 6: Run test to verify it passes**

Run: `cd libraries/suggestion-rules && bun test`
Expected: PASS

**Step 7: Create package.json**

Create `libraries/suggestion-rules/package.json`:

```json
{
  "name": "@f-o-t/suggestion-rules",
  "version": "1.0.0",
  "description": "Pre-built rule packs for content suggestions and auto-suggest engine",
  "type": "module",
  "private": false,
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "bun": "./src/index.ts",
      "import": {
        "default": "./dist/index.js",
        "types": "./dist/index.d.ts"
      },
      "types": "./dist/index.d.ts"
    },
    "./seo-blog": {
      "bun": "./src/rule-packs/seo-blog.ts",
      "import": {
        "default": "./dist/rule-packs/seo-blog.js",
        "types": "./dist/rule-packs/seo-blog.d.ts"
      }
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "bunup",
    "check": "biome check --write .",
    "dev": "bunup --watch",
    "test": "bun test",
    "test:coverage": "bun test --coverage",
    "test:watch": "bun test --watch",
    "typecheck": "tsc"
  },
  "dependencies": {
    "@f-o-t/rules-engine": "2.0.2",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@biomejs/biome": "2.3.12",
    "@types/bun": "1.3.6",
    "bumpp": "10.4.0",
    "bunup": "0.16.20",
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
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/F-O-T/contentta-nx.git"
  },
  "homepage": "https://github.com/F-O-T/contentta-nx/blob/master/libraries/suggestion-rules",
  "bugs": {
    "url": "https://github.com/F-O-T/contentta-nx/issues"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

**Step 8: Install dependencies and build**

Run: `cd libraries/suggestion-rules && bun install && bun run build`
Expected: SUCCESS

**Step 9: Commit**

```bash
git add libraries/suggestion-rules/
git commit -m "feat(suggestion-rules): add suggestion rule packs with SEO blog rules"
```

---

### Task 3: Create @f-o-t/auto-suggest Core Library

**Files:**
- Create: `libraries/auto-suggest/package.json`
- Create: `libraries/auto-suggest/tsconfig.json`
- Create: `libraries/auto-suggest/biome.json`
- Create: `libraries/auto-suggest/src/index.ts`
- Create: `libraries/auto-suggest/src/types.ts`
- Create: `libraries/auto-suggest/src/engine.ts`
- Create: `libraries/auto-suggest/src/engine.test.ts`
- Create: `libraries/auto-suggest/README.md`

**Step 1: Write the failing test**

Create `libraries/auto-suggest/src/engine.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { createAutoSuggestEngine } from "./engine";
import type { AutoSuggestConfig } from "./types";

describe("AutoSuggestEngine", () => {
  it("should create engine with default config", () => {
    const engine = createAutoSuggestEngine({});

    expect(engine).toBeDefined();
    expect(engine.analyze).toBeDefined();
    expect(engine.getSuggestions).toBeDefined();
  });

  it("should analyze content and return issues", async () => {
    const engine = createAutoSuggestEngine({
      enabledRulePacks: ["seo-blog"],
    });

    const result = await engine.analyze({
      content: "# Hello\n\nThis is a short post.",
      metadata: {
        title: "Hello World",
        targetKeywords: ["test"],
      },
    });

    expect(result).toBeDefined();
    expect(result.issues).toBeDefined();
    expect(Array.isArray(result.issues)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/auto-suggest && bun test`
Expected: FAIL

**Step 3: Write types file**

Create `libraries/auto-suggest/src/types.ts`:

```typescript
import { z } from "zod";

export const SuggestionSeveritySchema = z.enum(["error", "warning", "info", "hint"]);
export type SuggestionSeverity = z.infer<typeof SuggestionSeveritySchema>;

export const SuggestionTypeSchema = z.enum([
  "completion",
  "enhancement",
  "quality",
  "seo",
  "readability",
  "structure",
  "style",
  "spelling",
  "thesaurus",
]);
export type SuggestionType = z.infer<typeof SuggestionTypeSchema>;

export const IssueSchema = z.object({
  id: z.string(),
  type: SuggestionTypeSchema,
  severity: SuggestionSeveritySchema,
  message: z.string(),
  range: z.object({
    start: z.number(),
    end: z.number(),
  }),
  suggestions: z.array(z.string()).optional(),
  ruleId: z.string().optional(),
  fix: z.any().optional(),
});
export type Issue = z.infer<typeof IssueSchema>;

export const SuggestionSchema = z.object({
  id: z.string(),
  type: SuggestionTypeSchema,
  text: z.string(),
  insertAt: z.number(),
  confidence: z.number().min(0).max(1),
  source: z.enum(["ai", "rules", "thesaurus", "spelling"]),
  metadata: z.record(z.any()).optional(),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;

export const NextEditLocationSchema = z.object({
  id: z.string(),
  position: z.number(),
  severity: SuggestionSeveritySchema,
  type: SuggestionTypeSchema,
  preview: z.string(),
  issueId: z.string(),
});
export type NextEditLocation = z.infer<typeof NextEditLocationSchema>;

export const AnalysisResultSchema = z.object({
  issues: z.array(IssueSchema),
  suggestions: z.array(SuggestionSchema),
  nextEditLocations: z.array(NextEditLocationSchema),
  metrics: z.object({
    wordCount: z.number(),
    readabilityScore: z.number(),
    seoScore: z.number(),
    spellingErrors: z.number(),
  }),
  timestamp: z.number(),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

export const AnalysisInputSchema = z.object({
  content: z.string(),
  metadata: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    targetKeywords: z.array(z.string()).optional(),
    targetAudience: z.enum(["general", "technical", "academic", "casual"]).optional(),
  }).optional(),
  delta: z.object({
    start: z.number(),
    end: z.number(),
    newText: z.string(),
  }).optional(),
});
export type AnalysisInput = z.infer<typeof AnalysisInputSchema>;

export const AutoSuggestConfigSchema = z.object({
  enabledRulePacks: z.array(z.string()).optional().default(["seo-blog"]),
  customRules: z.array(z.any()).optional().default([]),
  thesaurusEnabled: z.boolean().optional().default(true),
  spellingEnabled: z.boolean().optional().default(true),
  aiCompletionEnabled: z.boolean().optional().default(true),
  adaptiveRanking: z.boolean().optional().default(true),
  cacheEnabled: z.boolean().optional().default(true),
});
export type AutoSuggestConfig = z.infer<typeof AutoSuggestConfigSchema>;
```

**Step 4: Write minimal engine implementation**

Create `libraries/auto-suggest/src/engine.ts`:

```typescript
import type {
  AutoSuggestConfig,
  AnalysisInput,
  AnalysisResult,
  Issue,
  Suggestion,
  NextEditLocation,
} from "./types";
import { AutoSuggestConfigSchema } from "./types";

export interface AutoSuggestEngine {
  analyze(input: AnalysisInput): Promise<AnalysisResult>;
  getSuggestions(content: string, cursorPosition: number): Promise<Suggestion[]>;
  getNextEditLocations(): NextEditLocation[];
  dispose(): void;
}

export function createAutoSuggestEngine(
  config: AutoSuggestConfig
): AutoSuggestEngine {
  const validConfig = AutoSuggestConfigSchema.parse(config);

  let cachedResult: AnalysisResult | null = null;

  async function analyze(input: AnalysisInput): Promise<AnalysisResult> {
    // TODO: Implement full analysis pipeline
    // For now, return minimal valid result

    const result: AnalysisResult = {
      issues: [],
      suggestions: [],
      nextEditLocations: [],
      metrics: {
        wordCount: input.content.split(/\s+/).length,
        readabilityScore: 65,
        seoScore: 50,
        spellingErrors: 0,
      },
      timestamp: Date.now(),
    };

    cachedResult = result;
    return result;
  }

  async function getSuggestions(
    content: string,
    cursorPosition: number
  ): Promise<Suggestion[]> {
    // TODO: Implement suggestion generation
    return [];
  }

  function getNextEditLocations(): NextEditLocation[] {
    if (!cachedResult) return [];
    return cachedResult.nextEditLocations;
  }

  function dispose(): void {
    cachedResult = null;
  }

  return {
    analyze,
    getSuggestions,
    getNextEditLocations,
    dispose,
  };
}
```

**Step 5: Create index exports**

Create `libraries/auto-suggest/src/index.ts`:

```typescript
export * from "./types";
export * from "./engine";
```

**Step 6: Run test to verify it passes**

Run: `cd libraries/auto-suggest && bun test`
Expected: PASS

**Step 7: Create package.json**

Create `libraries/auto-suggest/package.json`:

```json
{
  "name": "@f-o-t/auto-suggest",
  "version": "1.0.0",
  "description": "Intelligent auto-suggest engine with FIM completion and Next Edit Suggestion for Contentta CMS",
  "type": "module",
  "private": false,
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "bun": "./src/index.ts",
      "import": {
        "default": "./dist/index.js",
        "types": "./dist/index.d.ts"
      },
      "types": "./dist/index.d.ts"
    },
    "./workers": {
      "bun": "./src/workers/index.ts",
      "import": {
        "default": "./dist/workers/index.js",
        "types": "./dist/workers/index.d.ts"
      }
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "bunup",
    "check": "biome check --write .",
    "dev": "bunup --watch",
    "test": "bun test",
    "test:coverage": "bun test --coverage",
    "test:watch": "bun test --watch",
    "typecheck": "tsc"
  },
  "dependencies": {
    "@f-o-t/rules-engine": "2.0.2",
    "@f-o-t/suggestion-rules": "1.0.0",
    "@f-o-t/markdown": "1.0.2",
    "@f-o-t/spelling": "1.0.1",
    "@f-o-t/content-analysis": "1.0.2",
    "@f-o-t/thesaurus": "1.0.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@biomejs/biome": "2.3.12",
    "@types/bun": "1.3.6",
    "bumpp": "10.4.0",
    "bunup": "0.16.20",
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
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/F-O-T/contentta-nx.git"
  },
  "homepage": "https://github.com/F-O-T/contentta-nx/blob/master/libraries/auto-suggest",
  "bugs": {
    "url": "https://github.com/F-O-T/contentta-nx/issues"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

**Step 8: Install dependencies and build**

Run: `cd libraries/auto-suggest && bun install && bun run build`
Expected: SUCCESS

**Step 9: Commit**

```bash
git add libraries/auto-suggest/
git commit -m "feat(auto-suggest): add auto-suggest engine foundation"
```

---

## Phase 2: Worker Architecture

### Task 4: Create Worker Communication Types

**Files:**
- Create: `libraries/auto-suggest/src/workers/types.ts`
- Create: `libraries/auto-suggest/src/workers/messages.ts`
- Create: `libraries/auto-suggest/src/workers/types.test.ts`

**Step 1: Write the failing test**

Create `libraries/auto-suggest/src/workers/types.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import {
  WorkerMessageSchema,
  WorkerResponseSchema,
  createAnalysisMessage,
  createSuccessResponse,
  createErrorResponse,
} from "./messages";

describe("Worker Messages", () => {
  it("should create valid analysis message", () => {
    const msg = createAnalysisMessage("task-1", {
      content: "# Test",
      type: "full",
    });

    expect(msg.type).toBe("analyze");
    expect(msg.taskId).toBe("task-1");
    expect(msg.payload.content).toBe("# Test");

    const result = WorkerMessageSchema.safeParse(msg);
    expect(result.success).toBe(true);
  });

  it("should create success response", () => {
    const response = createSuccessResponse("task-1", { result: "ok" });

    expect(response.status).toBe("success");
    expect(response.taskId).toBe("task-1");
    expect(response.data.result).toBe("ok");

    const result = WorkerResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("should create error response", () => {
    const response = createErrorResponse("task-1", "Something failed");

    expect(response.status).toBe("error");
    expect(response.taskId).toBe("task-1");
    expect(response.error).toBe("Something failed");

    const result = WorkerResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/auto-suggest && bun test src/workers/types.test.ts`
Expected: FAIL

**Step 3: Create worker types**

Create `libraries/auto-suggest/src/workers/types.ts`:

```typescript
import { z } from "zod";

export const WorkerTypeSchema = z.enum([
  "coordinator",
  "parse",
  "spelling",
  "analysis",
  "rules",
]);
export type WorkerType = z.infer<typeof WorkerTypeSchema>;

export const AnalysisTypeSchema = z.enum(["full", "incremental"]);
export type AnalysisType = z.infer<typeof AnalysisTypeSchema>;

export const WorkerMessageTypeSchema = z.enum([
  "analyze",
  "suggest",
  "cache_invalidate",
  "terminate",
]);
export type WorkerMessageType = z.infer<typeof WorkerMessageTypeSchema>;

export const WorkerStatusSchema = z.enum([
  "idle",
  "busy",
  "error",
  "terminated",
]);
export type WorkerStatus = z.infer<typeof WorkerStatusSchema>;
```

**Step 4: Create message schemas and helpers**

Create `libraries/auto-suggest/src/workers/messages.ts`:

```typescript
import { z } from "zod";
import {
  WorkerMessageTypeSchema,
  AnalysisTypeSchema,
  type WorkerMessageType,
} from "./types";

export const WorkerMessageSchema = z.object({
  type: WorkerMessageTypeSchema,
  taskId: z.string(),
  payload: z.any(),
  timestamp: z.number(),
});
export type WorkerMessage = z.infer<typeof WorkerMessageSchema>;

export const WorkerResponseSchema = z.object({
  taskId: z.string(),
  status: z.enum(["success", "error"]),
  data: z.any().optional(),
  error: z.string().optional(),
  timestamp: z.number(),
});
export type WorkerResponse = z.infer<typeof WorkerResponseSchema>;

export const AnalysisPayloadSchema = z.object({
  content: z.string(),
  type: AnalysisTypeSchema,
  delta: z.object({
    start: z.number(),
    end: z.number(),
    newText: z.string(),
  }).optional(),
  previousState: z.any().optional(),
});
export type AnalysisPayload = z.infer<typeof AnalysisPayloadSchema>;

export function createAnalysisMessage(
  taskId: string,
  payload: AnalysisPayload
): WorkerMessage {
  return {
    type: "analyze",
    taskId,
    payload,
    timestamp: Date.now(),
  };
}

export function createSuccessResponse(
  taskId: string,
  data: any
): WorkerResponse {
  return {
    taskId,
    status: "success",
    data,
    timestamp: Date.now(),
  };
}

export function createErrorResponse(
  taskId: string,
  error: string
): WorkerResponse {
  return {
    taskId,
    status: "error",
    error,
    timestamp: Date.now(),
  };
}
```

**Step 5: Run test to verify it passes**

Run: `cd libraries/auto-suggest && bun test src/workers/types.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add libraries/auto-suggest/src/workers/
git commit -m "feat(auto-suggest): add worker communication types and message schemas"
```

---

### Task 5: Create Main Coordinator Worker

**Files:**
- Create: `libraries/auto-suggest/src/workers/coordinator.worker.ts`
- Create: `libraries/auto-suggest/src/workers/coordinator.test.ts`

**Step 1: Write the failing test**

Create `libraries/auto-suggest/src/workers/coordinator.test.ts`:

```typescript
import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { createAnalysisMessage } from "./messages";

describe("Coordinator Worker", () => {
  let worker: Worker;

  beforeAll(() => {
    worker = new Worker(new URL("./coordinator.worker.ts", import.meta.url));
  });

  afterAll(() => {
    worker.terminate();
  });

  it("should respond to analysis message", async () => {
    const msg = createAnalysisMessage("test-1", {
      content: "# Hello World\n\nThis is a test.",
      type: "full",
    });

    const response = await new Promise((resolve) => {
      worker.onmessage = (e) => resolve(e.data);
      worker.postMessage(msg);
    });

    expect(response).toBeDefined();
    expect((response as any).taskId).toBe("test-1");
    expect((response as any).status).toBe("success");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/auto-suggest && bun test src/workers/coordinator.test.ts`
Expected: FAIL

**Step 3: Create coordinator worker**

Create `libraries/auto-suggest/src/workers/coordinator.worker.ts`:

```typescript
import type { WorkerMessage, WorkerResponse } from "./messages";
import { createSuccessResponse, createErrorResponse } from "./messages";

// Worker state
let cache = new Map<string, any>();

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;

  try {
    switch (msg.type) {
      case "analyze":
        await handleAnalyze(msg);
        break;

      case "suggest":
        await handleSuggest(msg);
        break;

      case "cache_invalidate":
        handleCacheInvalidate(msg);
        break;

      case "terminate":
        self.close();
        break;

      default:
        throw new Error(`Unknown message type: ${msg.type}`);
    }
  } catch (error) {
    const response = createErrorResponse(
      msg.taskId,
      error instanceof Error ? error.message : "Unknown error"
    );
    self.postMessage(response);
  }
};

async function handleAnalyze(msg: WorkerMessage): Promise<void> {
  const { content, type, delta, previousState } = msg.payload;

  // TODO: Implement full analysis pipeline
  // For now, return minimal result

  const result = {
    issues: [],
    suggestions: [],
    nextEditLocations: [],
    metrics: {
      wordCount: content.split(/\s+/).length,
      readabilityScore: 65,
      seoScore: 50,
      spellingErrors: 0,
    },
  };

  // Cache result
  cache.set(msg.taskId, result);

  const response = createSuccessResponse(msg.taskId, result);
  self.postMessage(response);
}

async function handleSuggest(msg: WorkerMessage): Promise<void> {
  // TODO: Implement suggestion generation
  const response = createSuccessResponse(msg.taskId, { suggestions: [] });
  self.postMessage(response);
}

function handleCacheInvalidate(msg: WorkerMessage): void {
  const { keys } = msg.payload;

  if (keys === "*") {
    cache.clear();
  } else if (Array.isArray(keys)) {
    for (const key of keys) {
      cache.delete(key);
    }
  }

  const response = createSuccessResponse(msg.taskId, { cleared: true });
  self.postMessage(response);
}
```

**Step 4: Run test to verify it passes**

Run: `cd libraries/auto-suggest && bun test src/workers/coordinator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add libraries/auto-suggest/src/workers/coordinator.*
git commit -m "feat(auto-suggest): add main coordinator worker"
```

---

### Task 6: Create Specialized Workers (Parse, Spelling, Analysis, Rules)

**Files:**
- Create: `libraries/auto-suggest/src/workers/parse.worker.ts`
- Create: `libraries/auto-suggest/src/workers/spelling.worker.ts`
- Create: `libraries/auto-suggest/src/workers/analysis.worker.ts`
- Create: `libraries/auto-suggest/src/workers/rules.worker.ts`
- Create: `libraries/auto-suggest/src/workers/specialized.test.ts`

**Step 1: Write the failing test**

Create `libraries/auto-suggest/src/workers/specialized.test.ts`:

```typescript
import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { createAnalysisMessage } from "./messages";

describe("Specialized Workers", () => {
  describe("Parse Worker", () => {
    let worker: Worker;

    beforeAll(() => {
      worker = new Worker(new URL("./parse.worker.ts", import.meta.url));
    });

    afterAll(() => {
      worker.terminate();
    });

    it("should parse markdown content", async () => {
      const msg = createAnalysisMessage("test-1", {
        content: "# Hello\n\n**Bold text**",
        type: "full",
      });

      const response = await new Promise((resolve) => {
        worker.onmessage = (e) => resolve(e.data);
        worker.postMessage(msg);
      });

      expect((response as any).status).toBe("success");
      expect((response as any).data.ast).toBeDefined();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/auto-suggest && bun test src/workers/specialized.test.ts`
Expected: FAIL

**Step 3: Create parse worker**

Create `libraries/auto-suggest/src/workers/parse.worker.ts`:

```typescript
import { parse } from "@f-o-t/markdown";
import type { WorkerMessage } from "./messages";
import { createSuccessResponse, createErrorResponse } from "./messages";

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;

  try {
    const { content, type, delta } = msg.payload;

    let result;

    if (type === "full") {
      // Full parse
      const parseResult = parse(content);

      if (!parseResult.success) {
        throw new Error("Failed to parse markdown");
      }

      result = {
        ast: parseResult.data,
        blocks: parseResult.data.root.children,
      };
    } else {
      // Incremental parse (delta only)
      // For now, just parse the delta region
      const deltaContent = content.slice(delta!.start, delta!.end);
      const parseResult = parse(deltaContent);

      result = {
        ast: parseResult.success ? parseResult.data : null,
        isDelta: true,
        range: { start: delta!.start, end: delta!.end },
      };
    }

    const response = createSuccessResponse(msg.taskId, result);
    self.postMessage(response);
  } catch (error) {
    const response = createErrorResponse(
      msg.taskId,
      error instanceof Error ? error.message : "Parse error"
    );
    self.postMessage(response);
  }
};
```

**Step 4: Create spelling worker**

Create `libraries/auto-suggest/src/workers/spelling.worker.ts`:

```typescript
import { createSpellChecker } from "@f-o-t/spelling";
import { createThesaurus } from "@f-o-t/thesaurus";
import type { WorkerMessage } from "./messages";
import { createSuccessResponse, createErrorResponse } from "./messages";

// Initialize spell checker and thesaurus
// Note: In production, load dictionary from IndexedDB cache
let spellChecker: any = null;
let thesaurus: any = null;

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;

  try {
    const { content, type } = msg.payload;

    // TODO: Load dictionaries if not loaded
    // For now, return empty results

    const result = {
      spellingErrors: [],
      weakWords: [],
      suggestions: [],
    };

    const response = createSuccessResponse(msg.taskId, result);
    self.postMessage(response);
  } catch (error) {
    const response = createErrorResponse(
      msg.taskId,
      error instanceof Error ? error.message : "Spelling check error"
    );
    self.postMessage(response);
  }
};
```

**Step 5: Create analysis worker**

Create `libraries/auto-suggest/src/workers/analysis.worker.ts`:

```typescript
import { analyzeContent } from "@f-o-t/content-analysis";
import type { WorkerMessage } from "./messages";
import { createSuccessResponse, createErrorResponse } from "./messages";

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;

  try {
    const { content, metadata } = msg.payload;

    const analysis = analyzeContent({
      content,
      title: metadata?.title,
      description: metadata?.description,
      targetKeywords: metadata?.targetKeywords,
    });

    const result = {
      seo: analysis.seo,
      readability: analysis.readability,
      structure: analysis.structure,
      badPatterns: analysis.badPatterns,
      keywords: analysis.keywords,
    };

    const response = createSuccessResponse(msg.taskId, result);
    self.postMessage(response);
  } catch (error) {
    const response = createErrorResponse(
      msg.taskId,
      error instanceof Error ? error.message : "Analysis error"
    );
    self.postMessage(response);
  }
};
```

**Step 6: Create rules worker**

Create `libraries/auto-suggest/src/workers/rules.worker.ts`:

```typescript
import { createEngine } from "@f-o-t/rules-engine";
import { getSuggestionRulePack } from "@f-o-t/suggestion-rules";
import type { WorkerMessage } from "./messages";
import { createSuccessResponse, createErrorResponse } from "./messages";

// Initialize rules engine
const engine = createEngine();

// Load default rule packs
const seoBlogPack = getSuggestionRulePack("seo-blog");
if (seoBlogPack) {
  engine.addRules(seoBlogPack.rules);
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;

  try {
    const { context, rulePacks } = msg.payload;

    // Evaluate rules against context
    const evalResult = await engine.evaluate(context, {
      tags: rulePacks,
    });

    const result = {
      matchedRules: evalResult.matchedRules,
      consequences: evalResult.consequences,
      executionTimeMs: evalResult.executionTimeMs,
    };

    const response = createSuccessResponse(msg.taskId, result);
    self.postMessage(response);
  } catch (error) {
    const response = createErrorResponse(
      msg.taskId,
      error instanceof Error ? error.message : "Rules evaluation error"
    );
    self.postMessage(response);
  }
};
```

**Step 7: Run test to verify it passes**

Run: `cd libraries/auto-suggest && bun test src/workers/specialized.test.ts`
Expected: PASS

**Step 8: Create worker index**

Create `libraries/auto-suggest/src/workers/index.ts`:

```typescript
export * from "./types";
export * from "./messages";
```

**Step 9: Commit**

```bash
git add libraries/auto-suggest/src/workers/
git commit -m "feat(auto-suggest): add specialized workers for parse, spelling, analysis, and rules"
```

---

## Phase 3: Analysis Pipeline Integration

### Task 7: Implement Full Analysis Pipeline in Coordinator

**Files:**
- Modify: `libraries/auto-suggest/src/workers/coordinator.worker.ts`
- Create: `libraries/auto-suggest/src/workers/pipeline.ts`
- Create: `libraries/auto-suggest/src/workers/pipeline.test.ts`

**Step 1: Write the failing test**

Create `libraries/auto-suggest/src/workers/pipeline.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { createAnalysisPipeline } from "./pipeline";

describe("Analysis Pipeline", () => {
  it("should create pipeline with workers", () => {
    const pipeline = createAnalysisPipeline();

    expect(pipeline).toBeDefined();
    expect(pipeline.analyze).toBeDefined();
    expect(pipeline.dispose).toBeDefined();
  });

  it("should analyze content through pipeline", async () => {
    const pipeline = createAnalysisPipeline();

    const result = await pipeline.analyze({
      content: "# Test\n\nThis is a test post.",
      metadata: { title: "Test" },
    });

    expect(result).toBeDefined();
    expect(result.parse).toBeDefined();
    expect(result.analysis).toBeDefined();

    pipeline.dispose();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/auto-suggest && bun test src/workers/pipeline.test.ts`
Expected: FAIL

**Step 3: Create pipeline orchestrator**

Create `libraries/auto-suggest/src/workers/pipeline.ts`:

```typescript
import type { WorkerMessage, WorkerResponse } from "./messages";
import { createAnalysisMessage } from "./messages";

interface PipelineWorkers {
  parse: Worker;
  spelling: Worker;
  analysis: Worker;
  rules: Worker;
}

interface PipelineResult {
  parse: any;
  spelling: any;
  analysis: any;
  rules: any;
  timestamp: number;
}

export interface AnalysisPipeline {
  analyze(input: { content: string; metadata?: any }): Promise<PipelineResult>;
  dispose(): void;
}

export function createAnalysisPipeline(): AnalysisPipeline {
  // Initialize workers
  const workers: PipelineWorkers = {
    parse: new Worker(new URL("./parse.worker.ts", import.meta.url)),
    spelling: new Worker(new URL("./spelling.worker.ts", import.meta.url)),
    analysis: new Worker(new URL("./analysis.worker.ts", import.meta.url)),
    rules: new Worker(new URL("./rules.worker.ts", import.meta.url)),
  };

  let taskIdCounter = 0;

  function generateTaskId(): string {
    return `task-${++taskIdCounter}-${Date.now()}`;
  }

  function sendToWorker(
    worker: Worker,
    message: WorkerMessage
  ): Promise<WorkerResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Worker timeout for task ${message.taskId}`));
      }, 5000);

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        clearTimeout(timeout);
        if (event.data.status === "error") {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data);
        }
      };

      worker.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };

      worker.postMessage(message);
    });
  }

  async function analyze(input: {
    content: string;
    metadata?: any;
  }): Promise<PipelineResult> {
    const startTime = Date.now();

    // Run all workers in parallel
    const [parseResult, spellingResult, analysisResult] = await Promise.all([
      sendToWorker(
        workers.parse,
        createAnalysisMessage(generateTaskId(), {
          content: input.content,
          type: "full",
        })
      ),
      sendToWorker(
        workers.spelling,
        createAnalysisMessage(generateTaskId(), {
          content: input.content,
          type: "full",
        })
      ),
      sendToWorker(
        workers.analysis,
        createAnalysisMessage(generateTaskId(), {
          content: input.content,
          metadata: input.metadata,
          type: "full",
        })
      ),
    ]);

    // Build context for rules engine from analysis results
    const rulesContext = {
      wordCount: analysisResult.data?.seo?.metrics?.wordCount ?? 0,
      h2Count: analysisResult.data?.structure?.structure?.headingCount ?? 0,
      readabilityScore:
        analysisResult.data?.readability?.fleschKincaidReadingEase ?? 0,
      hasMetaDescription: !!input.metadata?.description,
      hasTargetKeyword: (input.metadata?.targetKeywords?.length ?? 0) > 0,
      keywordInTitle: false, // TODO: Implement
      internalLinkCount: analysisResult.data?.seo?.metrics?.internalLinks ?? 0,
      imagesWithoutAlt: analysisResult.data?.seo?.metrics?.imagesWithoutAlt ?? 0,
      targetAudience: input.metadata?.targetAudience ?? "general",
    };

    // Run rules evaluation
    const rulesResult = await sendToWorker(
      workers.rules,
      createAnalysisMessage(generateTaskId(), {
        context: rulesContext,
        rulePacks: ["seo-blog"],
        type: "full",
      })
    );

    return {
      parse: parseResult.data,
      spelling: spellingResult.data,
      analysis: analysisResult.data,
      rules: rulesResult.data,
      timestamp: Date.now() - startTime,
    };
  }

  function dispose(): void {
    workers.parse.terminate();
    workers.spelling.terminate();
    workers.analysis.terminate();
    workers.rules.terminate();
  }

  return {
    analyze,
    dispose,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `cd libraries/auto-suggest && bun test src/workers/pipeline.test.ts`
Expected: PASS

**Step 5: Update coordinator worker to use pipeline**

Update `libraries/auto-suggest/src/workers/coordinator.worker.ts`:

```typescript
import type { WorkerMessage, WorkerResponse } from "./messages";
import { createSuccessResponse, createErrorResponse } from "./messages";
import { createAnalysisPipeline } from "./pipeline";

// Worker state
let cache = new Map<string, any>();
let pipeline = createAnalysisPipeline();

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;

  try {
    switch (msg.type) {
      case "analyze":
        await handleAnalyze(msg);
        break;

      case "suggest":
        await handleSuggest(msg);
        break;

      case "cache_invalidate":
        handleCacheInvalidate(msg);
        break;

      case "terminate":
        pipeline.dispose();
        self.close();
        break;

      default:
        throw new Error(`Unknown message type: ${msg.type}`);
    }
  } catch (error) {
    const response = createErrorResponse(
      msg.taskId,
      error instanceof Error ? error.message : "Unknown error"
    );
    self.postMessage(response);
  }
};

async function handleAnalyze(msg: WorkerMessage): Promise<void> {
  const { content, type, delta, previousState, metadata } = msg.payload;

  // Run through pipeline
  const pipelineResult = await pipeline.analyze({
    content,
    metadata,
  });

  // Transform pipeline results into issues and suggestions
  const issues = transformRulesToIssues(pipelineResult.rules);
  const suggestions = []; // TODO: Generate suggestions
  const nextEditLocations = createNextEditLocations(issues);

  const result = {
    issues,
    suggestions,
    nextEditLocations,
    metrics: {
      wordCount: pipelineResult.analysis?.seo?.metrics?.wordCount ?? 0,
      readabilityScore:
        pipelineResult.analysis?.readability?.fleschKincaidReadingEase ?? 0,
      seoScore: pipelineResult.analysis?.seo?.score ?? 0,
      spellingErrors: pipelineResult.spelling?.spellingErrors?.length ?? 0,
    },
    executionTimeMs: pipelineResult.timestamp,
  };

  // Cache result
  cache.set(msg.taskId, result);

  const response = createSuccessResponse(msg.taskId, result);
  self.postMessage(response);
}

function transformRulesToIssues(rulesResult: any): any[] {
  const issues = [];

  for (const consequence of rulesResult?.consequences ?? []) {
    issues.push({
      id: `issue-${Date.now()}-${Math.random()}`,
      type: consequence.type || "quality",
      severity: consequence.severity || "info",
      message: consequence.message || "No message",
      range: { start: 0, end: 0 }, // TODO: Map to actual range
      ruleId: consequence.ruleId,
    });
  }

  return issues;
}

function createNextEditLocations(issues: any[]): any[] {
  return issues
    .filter((issue) => issue.severity === "error" || issue.severity === "warning")
    .map((issue, index) => ({
      id: `location-${index}`,
      position: issue.range.start,
      severity: issue.severity,
      type: issue.type,
      preview: issue.message,
      issueId: issue.id,
    }))
    .sort((a, b) => {
      // Sort by severity first, then position
      const severityOrder = { error: 0, warning: 1, info: 2, hint: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      return severityDiff !== 0 ? severityDiff : a.position - b.position;
    });
}

async function handleSuggest(msg: WorkerMessage): Promise<void> {
  // TODO: Implement suggestion generation
  const response = createSuccessResponse(msg.taskId, { suggestions: [] });
  self.postMessage(response);
}

function handleCacheInvalidate(msg: WorkerMessage): void {
  const { keys } = msg.payload;

  if (keys === "*") {
    cache.clear();
  } else if (Array.isArray(keys)) {
    for (const key of keys) {
      cache.delete(key);
    }
  }

  const response = createSuccessResponse(msg.taskId, { cleared: true });
  self.postMessage(response);
}
```

**Step 6: Run full tests**

Run: `cd libraries/auto-suggest && bun test`
Expected: PASS

**Step 7: Commit**

```bash
git add libraries/auto-suggest/src/workers/
git commit -m "feat(auto-suggest): implement full analysis pipeline with worker orchestration"
```

---

## Phase 4: IndexedDB Storage & Adaptive Ranking

### Task 8: Create IndexedDB Storage Layer

**Files:**
- Create: `libraries/auto-suggest/src/storage/indexed-db.ts`
- Create: `libraries/auto-suggest/src/storage/types.ts`
- Create: `libraries/auto-suggest/src/storage/indexed-db.test.ts`

**Step 1: Write the failing test**

Create `libraries/auto-suggest/src/storage/indexed-db.test.ts`:

```typescript
import { describe, expect, it, beforeEach } from "bun:test";
import { createStorage } from "./indexed-db";

describe("IndexedDB Storage", () => {
  let storage: any;

  beforeEach(async () => {
    storage = await createStorage("test-db");
  });

  it("should save and retrieve suggestion interaction", async () => {
    const interaction = {
      suggestionId: "test-1",
      action: "accept",
      timestamp: Date.now(),
    };

    await storage.saveSuggestionInteraction(interaction);
    const retrieved = await storage.getSuggestionInteractions("test-1");

    expect(retrieved.length).toBe(1);
    expect(retrieved[0].action).toBe("accept");
  });

  it("should track user preferences", async () => {
    await storage.savePreference("style.formal", false);
    const pref = await storage.getPreference("style.formal");

    expect(pref).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/auto-suggest && bun test src/storage/indexed-db.test.ts`
Expected: FAIL

**Step 3: Create storage types**

Create `libraries/auto-suggest/src/storage/types.ts`:

```typescript
import { z } from "zod";

export const SuggestionInteractionSchema = z.object({
  suggestionId: z.string(),
  action: z.enum(["accept", "reject", "ignore"]),
  timestamp: z.number(),
  context: z.object({
    suggestionType: z.string(),
    severity: z.string(),
    ruleId: z.string().optional(),
  }).optional(),
});
export type SuggestionInteraction = z.infer<typeof SuggestionInteractionSchema>;

export const UserPreferenceSchema = z.object({
  key: z.string(),
  value: z.any(),
  timestamp: z.number(),
});
export type UserPreference = z.infer<typeof UserPreferenceSchema>;

export const AnalyticsSummarySchema = z.object({
  totalSuggestions: z.number(),
  acceptedSuggestions: z.number(),
  rejectedSuggestions: z.number(),
  acceptanceRate: z.number(),
  byType: z.record(z.number()),
  bySeverity: z.record(z.number()),
});
export type AnalyticsSummary = z.infer<typeof AnalyticsSummarySchema>;
```

**Step 4: Create IndexedDB storage implementation**

Create `libraries/auto-suggest/src/storage/indexed-db.ts`:

```typescript
import type {
  SuggestionInteraction,
  UserPreference,
  AnalyticsSummary,
} from "./types";

export interface Storage {
  saveSuggestionInteraction(interaction: SuggestionInteraction): Promise<void>;
  getSuggestionInteractions(suggestionId?: string): Promise<SuggestionInteraction[]>;
  savePreference(key: string, value: any): Promise<void>;
  getPreference(key: string): Promise<any>;
  getAllPreferences(): Promise<Record<string, any>>;
  getAnalyticsSummary(): Promise<AnalyticsSummary>;
  clear(): Promise<void>;
}

export async function createStorage(dbName: string = "auto-suggest"): Promise<Storage> {
  const DB_VERSION = 1;

  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores
      if (!db.objectStoreNames.contains("interactions")) {
        const interactionStore = db.createObjectStore("interactions", {
          keyPath: "id",
          autoIncrement: true,
        });
        interactionStore.createIndex("suggestionId", "suggestionId", {
          unique: false,
        });
        interactionStore.createIndex("timestamp", "timestamp", {
          unique: false,
        });
      }

      if (!db.objectStoreNames.contains("preferences")) {
        db.createObjectStore("preferences", { keyPath: "key" });
      }
    };
  });

  async function saveSuggestionInteraction(
    interaction: SuggestionInteraction
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["interactions"], "readwrite");
      const store = transaction.objectStore("interactions");
      const request = store.add(interaction);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function getSuggestionInteractions(
    suggestionId?: string
  ): Promise<SuggestionInteraction[]> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["interactions"], "readonly");
      const store = transaction.objectStore("interactions");

      let request: IDBRequest;

      if (suggestionId) {
        const index = store.index("suggestionId");
        request = index.getAll(suggestionId);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function savePreference(key: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["preferences"], "readwrite");
      const store = transaction.objectStore("preferences");
      const request = store.put({
        key,
        value,
        timestamp: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function getPreference(key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["preferences"], "readonly");
      const store = transaction.objectStore("preferences");
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : undefined);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function getAllPreferences(): Promise<Record<string, any>> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["preferences"], "readonly");
      const store = transaction.objectStore("preferences");
      const request = store.getAll();

      request.onsuccess = () => {
        const prefs: Record<string, any> = {};
        for (const item of request.result) {
          prefs[item.key] = item.value;
        }
        resolve(prefs);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
    const interactions = await getSuggestionInteractions();

    const summary: AnalyticsSummary = {
      totalSuggestions: interactions.length,
      acceptedSuggestions: 0,
      rejectedSuggestions: 0,
      acceptanceRate: 0,
      byType: {},
      bySeverity: {},
    };

    for (const interaction of interactions) {
      if (interaction.action === "accept") {
        summary.acceptedSuggestions++;
      } else if (interaction.action === "reject") {
        summary.rejectedSuggestions++;
      }

      if (interaction.context) {
        // Count by type
        const type = interaction.context.suggestionType;
        summary.byType[type] = (summary.byType[type] || 0) + 1;

        // Count by severity
        const severity = interaction.context.severity;
        summary.bySeverity[severity] = (summary.bySeverity[severity] || 0) + 1;
      }
    }

    if (summary.totalSuggestions > 0) {
      summary.acceptanceRate =
        summary.acceptedSuggestions / summary.totalSuggestions;
    }

    return summary;
  }

  async function clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        ["interactions", "preferences"],
        "readwrite"
      );

      const interactionsStore = transaction.objectStore("interactions");
      const preferencesStore = transaction.objectStore("preferences");

      interactionsStore.clear();
      preferencesStore.clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  return {
    saveSuggestionInteraction,
    getSuggestionInteractions,
    savePreference,
    getPreference,
    getAllPreferences,
    getAnalyticsSummary,
    clear,
  };
}
```

**Step 5: Run test to verify it passes**

Run: `cd libraries/auto-suggest && bun test src/storage/indexed-db.test.ts`
Expected: PASS (Note: May need jsdom for IndexedDB support)

**Step 6: Commit**

```bash
git add libraries/auto-suggest/src/storage/
git commit -m "feat(auto-suggest): add IndexedDB storage for user interactions and preferences"
```

---

### Task 9: Create Adaptive Ranking System

**Files:**
- Create: `libraries/auto-suggest/src/ranking/adaptive.ts`
- Create: `libraries/auto-suggest/src/ranking/types.ts`
- Create: `libraries/auto-suggest/src/ranking/adaptive.test.ts`

**Step 1: Write the failing test**

Create `libraries/auto-suggest/src/ranking/adaptive.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { createAdaptiveRanker } from "./adaptive";
import type { Suggestion } from "../types";

describe("Adaptive Ranker", () => {
  it("should rank suggestions by base priority", () => {
    const ranker = createAdaptiveRanker();

    const suggestions: Suggestion[] = [
      {
        id: "1",
        type: "completion",
        text: "Complete text",
        insertAt: 0,
        confidence: 0.8,
        source: "ai",
      },
      {
        id: "2",
        type: "quality",
        text: "Fix quality",
        insertAt: 0,
        confidence: 0.9,
        source: "rules",
      },
    ];

    const ranked = ranker.rank(suggestions);

    expect(ranked.length).toBe(2);
    expect(ranked[0].confidence).toBeGreaterThanOrEqual(ranked[1].confidence);
  });

  it("should boost suggestions based on user history", async () => {
    const ranker = createAdaptiveRanker();

    // Record user accepting a specific suggestion type
    await ranker.recordInteraction({
      suggestionId: "test",
      action: "accept",
      timestamp: Date.now(),
      context: {
        suggestionType: "spelling",
        severity: "error",
      },
    });

    const suggestions: Suggestion[] = [
      {
        id: "3",
        type: "spelling",
        text: "Fix spelling",
        insertAt: 0,
        confidence: 0.7,
        source: "spelling",
      },
      {
        id: "4",
        type: "completion",
        text: "Complete",
        insertAt: 0,
        confidence: 0.8,
        source: "ai",
      },
    ];

    const ranked = ranker.rank(suggestions);

    // Spelling suggestion should be boosted
    expect(ranked[0].type).toBe("spelling");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/auto-suggest && bun test src/ranking/adaptive.test.ts`
Expected: FAIL

**Step 3: Create ranking types**

Create `libraries/auto-suggest/src/ranking/types.ts`:

```typescript
import { z } from "zod";

export const RankingWeightsSchema = z.object({
  rulePriority: z.number().default(0.3),
  confidence: z.number().default(0.3),
  userHistory: z.number().default(0.2),
  recency: z.number().default(0.1),
  severity: z.number().default(0.1),
});
export type RankingWeights = z.infer<typeof RankingWeightsSchema>;

export const RankedSuggestionSchema = z.object({
  suggestion: z.any(),
  score: z.number(),
  breakdown: z.object({
    rulePriorityScore: z.number(),
    confidenceScore: z.number(),
    userHistoryScore: z.number(),
    recencyScore: z.number(),
    severityScore: z.number(),
  }),
});
export type RankedSuggestion = z.infer<typeof RankedSuggestionSchema>;
```

**Step 4: Create adaptive ranker**

Create `libraries/auto-suggest/src/ranking/adaptive.ts`:

```typescript
import type { Suggestion, Issue } from "../types";
import type { SuggestionInteraction } from "../storage/types";
import type { RankingWeights } from "./types";

export interface AdaptiveRanker {
  rank<T extends Suggestion | Issue>(items: T[]): T[];
  recordInteraction(interaction: SuggestionInteraction): Promise<void>;
  updateWeights(weights: Partial<RankingWeights>): void;
  getAnalytics(): Promise<any>;
}

export function createAdaptiveRanker(
  weights: Partial<RankingWeights> = {}
): AdaptiveRanker {
  // Default weights
  const currentWeights: RankingWeights = {
    rulePriority: 0.3,
    confidence: 0.3,
    userHistory: 0.2,
    recency: 0.1,
    severity: 0.1,
    ...weights,
  };

  // User interaction history (in memory for now)
  const interactionHistory: SuggestionInteraction[] = [];
  const typeAcceptanceRate = new Map<string, number>();

  function rank<T extends Suggestion | Issue>(items: T[]): T[] {
    const scored = items.map((item) => ({
      item,
      score: calculateScore(item),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.map((s) => s.item);
  }

  function calculateScore(item: Suggestion | Issue): number {
    let score = 0;

    // Confidence score (0-1)
    const confidence = "confidence" in item ? item.confidence : 0.5;
    score += confidence * currentWeights.confidence;

    // Severity score (error=1, warning=0.75, info=0.5, hint=0.25)
    const severityMap = { error: 1, warning: 0.75, info: 0.5, hint: 0.25 };
    const severity = item.type in severityMap ? severityMap[item.type] : 0.5;
    score += severity * currentWeights.severity;

    // User history score
    const acceptanceRate = typeAcceptanceRate.get(item.type) ?? 0.5;
    score += acceptanceRate * currentWeights.userHistory;

    // Recency score (newer items slightly favored)
    const recencyScore = 1.0; // TODO: Implement based on timestamp
    score += recencyScore * currentWeights.recency;

    // Rule priority (if available)
    const rulePriority = "metadata" in item && item.metadata?.priority
      ? item.metadata.priority / 100
      : 0.5;
    score += rulePriority * currentWeights.rulePriority;

    return score;
  }

  async function recordInteraction(
    interaction: SuggestionInteraction
  ): Promise<void> {
    interactionHistory.push(interaction);

    // Update acceptance rates
    if (interaction.context) {
      const type = interaction.context.suggestionType;
      const interactions = interactionHistory.filter(
        (i) => i.context?.suggestionType === type
      );
      const accepted = interactions.filter((i) => i.action === "accept").length;
      const rate = accepted / interactions.length;

      typeAcceptanceRate.set(type, rate);
    }
  }

  function updateWeights(newWeights: Partial<RankingWeights>): void {
    Object.assign(currentWeights, newWeights);
  }

  async function getAnalytics(): Promise<any> {
    const summary = {
      totalInteractions: interactionHistory.length,
      acceptanceRateByType: Object.fromEntries(typeAcceptanceRate),
      currentWeights,
    };

    return summary;
  }

  return {
    rank,
    recordInteraction,
    updateWeights,
    getAnalytics,
  };
}
```

**Step 5: Run test to verify it passes**

Run: `cd libraries/auto-suggest && bun test src/ranking/adaptive.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add libraries/auto-suggest/src/ranking/
git commit -m "feat(auto-suggest): add adaptive ranking system with user history learning"
```

---

## Phase 5: LSP Integration

### Task 10: Create LSP Protocol Adapter

**Files:**
- Create: `libraries/auto-suggest/src/lsp/adapter.ts`
- Create: `libraries/auto-suggest/src/lsp/types.ts`
- Create: `libraries/auto-suggest/src/lsp/adapter.test.ts`

**Step 1: Write the failing test**

Create `libraries/auto-suggest/src/lsp/adapter.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { createLspAdapter } from "./adapter";
import type { Issue, Suggestion } from "../types";

describe("LSP Adapter", () => {
  it("should convert issues to diagnostics", () => {
    const adapter = createLspAdapter();

    const issues: Issue[] = [
      {
        id: "1",
        type: "spelling",
        severity: "error",
        message: "Spelling error",
        range: { start: 0, end: 5 },
      },
    ];

    const diagnostics = adapter.issuesToDiagnostics(issues);

    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0].severity).toBe(1); // DiagnosticSeverity.Error
    expect(diagnostics[0].message).toBe("Spelling error");
  });

  it("should convert suggestions to completion items", () => {
    const adapter = createLspAdapter();

    const suggestions: Suggestion[] = [
      {
        id: "1",
        type: "completion",
        text: "Hello world",
        insertAt: 0,
        confidence: 0.9,
        source: "ai",
      },
    ];

    const completions = adapter.suggestionsToCompletions(suggestions);

    expect(completions.length).toBe(1);
    expect(completions[0].label).toBe("Hello world");
    expect(completions[0].insertText).toBe("Hello world");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/auto-suggest && bun test src/lsp/adapter.test.ts`
Expected: FAIL

**Step 3: Create LSP types**

Create `libraries/auto-suggest/src/lsp/types.ts`:

```typescript
import { z } from "zod";

// LSP Protocol Types (subset)

export const DiagnosticSeveritySchema = z.enum(["Error", "Warning", "Information", "Hint"]);
export type DiagnosticSeverity = z.infer<typeof DiagnosticSeveritySchema>;

export const DiagnosticSchema = z.object({
  range: z.object({
    start: z.object({ line: z.number(), character: z.number() }),
    end: z.object({ line: z.number(), character: z.number() }),
  }),
  severity: z.number().min(1).max(4),
  message: z.string(),
  source: z.string().optional(),
  code: z.union([z.string(), z.number()]).optional(),
  data: z.any().optional(),
});
export type Diagnostic = z.infer<typeof DiagnosticSchema>;

export const CompletionItemKindSchema = z.number();
export type CompletionItemKind = z.infer<typeof CompletionItemKindSchema>;

export const CompletionItemSchema = z.object({
  label: z.string(),
  kind: CompletionItemKindSchema.optional(),
  detail: z.string().optional(),
  documentation: z.string().optional(),
  insertText: z.string().optional(),
  sortText: z.string().optional(),
  filterText: z.string().optional(),
  data: z.any().optional(),
});
export type CompletionItem = z.infer<typeof CompletionItemSchema>;

export const CodeActionKindSchema = z.enum(["quickfix", "refactor", "source"]);
export type CodeActionKind = z.infer<typeof CodeActionKindSchema>;

export const CodeActionSchema = z.object({
  title: z.string(),
  kind: CodeActionKindSchema.optional(),
  isPreferred: z.boolean().optional(),
  diagnostics: z.array(DiagnosticSchema).optional(),
  edit: z.any().optional(),
  data: z.any().optional(),
});
export type CodeAction = z.infer<typeof CodeActionSchema>;
```

**Step 4: Create LSP adapter**

Create `libraries/auto-suggest/src/lsp/adapter.ts`:

```typescript
import type { Issue, Suggestion, NextEditLocation } from "../types";
import type { Diagnostic, CompletionItem, CodeAction } from "./types";

export interface LspAdapter {
  issuesToDiagnostics(issues: Issue[]): Diagnostic[];
  suggestionsToCompletions(suggestions: Suggestion[]): CompletionItem[];
  nextEditLocationsToCodeActions(locations: NextEditLocation[]): CodeAction[];
  offsetToPosition(content: string, offset: number): { line: number; character: number };
  positionToOffset(content: string, line: number, character: number): number;
}

export function createLspAdapter(): LspAdapter {
  function issuesToDiagnostics(issues: Issue[]): Diagnostic[] {
    return issues.map((issue) => {
      const severityMap = {
        error: 1,
        warning: 2,
        info: 3,
        hint: 4,
      };

      return {
        range: {
          start: offsetToPosition("", issue.range.start),
          end: offsetToPosition("", issue.range.end),
        },
        severity: severityMap[issue.severity] || 3,
        message: issue.message,
        source: "contentta-suggest",
        code: issue.ruleId,
        data: {
          issueId: issue.id,
          type: issue.type,
          fix: issue.fix,
        },
      };
    });
  }

  function suggestionsToCompletions(suggestions: Suggestion[]): CompletionItem[] {
    return suggestions.map((suggestion, index) => {
      // Sort text to control ordering (higher confidence = lower sort value)
      const sortText = `${1000 - Math.floor(suggestion.confidence * 1000)}`.padStart(4, "0");

      return {
        label: suggestion.text,
        kind: 1, // CompletionItemKind.Text
        detail: `${suggestion.source} (${Math.floor(suggestion.confidence * 100)}%)`,
        insertText: suggestion.text,
        sortText,
        data: {
          suggestionId: suggestion.id,
          type: suggestion.type,
          source: suggestion.source,
        },
      };
    });
  }

  function nextEditLocationsToCodeActions(
    locations: NextEditLocation[]
  ): CodeAction[] {
    return locations.map((location) => ({
      title: location.preview,
      kind: "quickfix" as const,
      isPreferred: true,
      data: {
        locationId: location.id,
        position: location.position,
        issueId: location.issueId,
      },
    }));
  }

  function offsetToPosition(
    content: string,
    offset: number
  ): { line: number; character: number } {
    let line = 0;
    let character = 0;

    for (let i = 0; i < offset && i < content.length; i++) {
      if (content[i] === "\n") {
        line++;
        character = 0;
      } else {
        character++;
      }
    }

    return { line, character };
  }

  function positionToOffset(
    content: string,
    line: number,
    character: number
  ): number {
    let currentLine = 0;
    let offset = 0;

    for (let i = 0; i < content.length; i++) {
      if (currentLine === line && offset === character) {
        return i;
      }

      if (content[i] === "\n") {
        currentLine++;
        offset = 0;
      } else {
        offset++;
      }
    }

    return content.length;
  }

  return {
    issuesToDiagnostics,
    suggestionsToCompletions,
    nextEditLocationsToCodeActions,
    offsetToPosition,
    positionToOffset,
  };
}
```

**Step 5: Run test to verify it passes**

Run: `cd libraries/auto-suggest && bun test src/lsp/adapter.test.ts`
Expected: PASS

**Step 6: Create LSP index**

Create `libraries/auto-suggest/src/lsp/index.ts`:

```typescript
export * from "./types";
export * from "./adapter";
```

**Step 7: Update main index**

Update `libraries/auto-suggest/src/index.ts`:

```typescript
export * from "./types";
export * from "./engine";
export * from "./lsp";
```

**Step 8: Commit**

```bash
git add libraries/auto-suggest/src/lsp/
git commit -m "feat(auto-suggest): add LSP protocol adapter for diagnostics and completions"
```

---

## Phase 6: Integration & Final Touches

### Task 11: Update Engine to Use All Components

**Files:**
- Modify: `libraries/auto-suggest/src/engine.ts`
- Create: `libraries/auto-suggest/src/engine-integration.test.ts`

**Step 1: Write integration test**

Create `libraries/auto-suggest/src/engine-integration.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { createAutoSuggestEngine } from "./engine";

describe("AutoSuggestEngine Integration", () => {
  it("should perform full analysis with all components", async () => {
    const engine = createAutoSuggestEngine({
      enabledRulePacks: ["seo-blog"],
      adaptiveRanking: true,
    });

    const result = await engine.analyze({
      content: "# Test Article\n\nThis is a short test article.",
      metadata: {
        title: "Test Article",
        targetKeywords: ["test"],
      },
    });

    expect(result.issues).toBeDefined();
    expect(result.suggestions).toBeDefined();
    expect(result.nextEditLocations).toBeDefined();
    expect(result.metrics.wordCount).toBeGreaterThan(0);
  });

  it("should provide ranked suggestions at cursor position", async () => {
    const engine = createAutoSuggestEngine({});

    const suggestions = await engine.getSuggestions(
      "# Hello\n\nThis is a ",
      20
    );

    expect(Array.isArray(suggestions)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/auto-suggest && bun test src/engine-integration.test.ts`
Expected: FAIL

**Step 3: Update engine with full implementation**

Update `libraries/auto-suggest/src/engine.ts`:

```typescript
import type {
  AutoSuggestConfig,
  AnalysisInput,
  AnalysisResult,
  Issue,
  Suggestion,
  NextEditLocation,
} from "./types";
import { AutoSuggestConfigSchema } from "./types";
import { createAdaptiveRanker } from "./ranking/adaptive";
import type { WorkerMessage } from "./workers/messages";
import { createAnalysisMessage } from "./workers/messages";

export interface AutoSuggestEngine {
  analyze(input: AnalysisInput): Promise<AnalysisResult>;
  getSuggestions(content: string, cursorPosition: number): Promise<Suggestion[]>;
  getNextEditLocations(): NextEditLocation[];
  recordInteraction(interaction: any): Promise<void>;
  dispose(): void;
}

export function createAutoSuggestEngine(
  config: AutoSuggestConfig
): AutoSuggestEngine {
  const validConfig = AutoSuggestConfigSchema.parse(config);

  let cachedResult: AnalysisResult | null = null;
  let coordinatorWorker: Worker | null = null;
  let ranker = createAdaptiveRanker();

  // Initialize coordinator worker
  if (typeof Worker !== "undefined") {
    coordinatorWorker = new Worker(
      new URL("./workers/coordinator.worker.ts", import.meta.url)
    );
  }

  async function analyze(input: AnalysisInput): Promise<AnalysisResult> {
    if (!coordinatorWorker) {
      throw new Error("Worker not initialized");
    }

    const taskId = `analysis-${Date.now()}`;
    const message = createAnalysisMessage(taskId, {
      content: input.content,
      type: input.delta ? "incremental" : "full",
      delta: input.delta,
      metadata: input.metadata,
    });

    const result = await new Promise<AnalysisResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Analysis timeout"));
      }, 30000);

      coordinatorWorker!.onmessage = (event) => {
        clearTimeout(timeout);
        if (event.data.status === "error") {
          reject(new Error(event.data.error));
        } else {
          // Apply adaptive ranking to issues and suggestions
          const data = event.data.data;
          data.issues = ranker.rank(data.issues || []);
          data.suggestions = ranker.rank(data.suggestions || []);

          resolve({
            ...data,
            timestamp: Date.now(),
          });
        }
      };

      coordinatorWorker!.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };

      coordinatorWorker!.postMessage(message);
    });

    cachedResult = result;
    return result;
  }

  async function getSuggestions(
    content: string,
    cursorPosition: number
  ): Promise<Suggestion[]> {
    // TODO: Implement FIM completion
    // For now, return cached suggestions filtered by position
    if (!cachedResult) return [];

    return cachedResult.suggestions.filter(
      (s) => s.insertAt <= cursorPosition
    );
  }

  function getNextEditLocations(): NextEditLocation[] {
    if (!cachedResult) return [];
    return cachedResult.nextEditLocations;
  }

  async function recordInteraction(interaction: any): Promise<void> {
    await ranker.recordInteraction(interaction);
  }

  function dispose(): void {
    if (coordinatorWorker) {
      coordinatorWorker.postMessage({
        type: "terminate",
        taskId: "dispose",
        payload: {},
        timestamp: Date.now(),
      });
      coordinatorWorker = null;
    }
    cachedResult = null;
  }

  return {
    analyze,
    getSuggestions,
    getNextEditLocations,
    recordInteraction,
    dispose,
  };
}
```

**Step 4: Run integration test**

Run: `cd libraries/auto-suggest && bun test src/engine-integration.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add libraries/auto-suggest/src/engine.ts libraries/auto-suggest/src/engine-integration.test.ts
git commit -m "feat(auto-suggest): integrate all components into main engine"
```

---

### Task 12: Create Comprehensive README

**Files:**
- Create: `libraries/auto-suggest/README.md`

**Step 1: Write README**

Create `libraries/auto-suggest/README.md`:

```markdown
# @f-o-t/auto-suggest

Intelligent auto-suggest engine with dual modes (FIM completion + Next Edit Suggestion) for the Contentta CMS. Integrates rules engine, content analysis, spelling, thesaurus, and adaptive learning.

## Features

- **Dual Mode Operation**
  - **Mode 1: FIM Completion** - Ghost text at cursor (like GitHub Copilot)
  - **Mode 2: Next Edit Suggestion (NES)** - Predicts and navigates to next edit location

- **Multi-Source Suggestions**
  - AI-powered text completions
  - Rule-based quality improvements
  - Spelling and thesaurus suggestions
  - SEO and readability enhancements

- **Adaptive Ranking** - Learns from user interactions and personalizes suggestions

- **Worker Architecture** - Non-blocking analysis with Web Workers

- **LSP Integration** - Full Language Server Protocol support for any editor

- **Incremental Analysis** - Only re-analyzes changed content regions

## Installation

```bash
bun add @f-o-t/auto-suggest
```

## Quick Start

```typescript
import { createAutoSuggestEngine } from "@f-o-t/auto-suggest";

// Create engine
const engine = createAutoSuggestEngine({
  enabledRulePacks: ["seo-blog"],
  adaptiveRanking: true,
});

// Analyze content
const result = await engine.analyze({
  content: "# My Article\n\nContent here...",
  metadata: {
    title: "My Article",
    targetKeywords: ["example"],
  },
});

console.log(result.issues);              // Quality issues found
console.log(result.suggestions);         // Completions and fixes
console.log(result.nextEditLocations);   // NES navigation points
console.log(result.metrics);             // Content metrics

// Get suggestions at cursor
const suggestions = await engine.getSuggestions(content, cursorPosition);

// Get next edit locations for NES mode
const locations = engine.getNextEditLocations();
```

## LSP Integration

```typescript
import { createAutoSuggestEngine } from "@f-o-t/auto-suggest";
import { createLspAdapter } from "@f-o-t/auto-suggest/lsp";

const engine = createAutoSuggestEngine({});
const lsp = createLspAdapter();

// On document change
const result = await engine.analyze({ content });

// Convert to LSP diagnostics
const diagnostics = lsp.issuesToDiagnostics(result.issues);
connection.sendDiagnostics({ uri, diagnostics });

// On completion request
const suggestions = await engine.getSuggestions(content, position);
const completions = lsp.suggestionsToCompletions(suggestions);

// On code action request (NES)
const locations = engine.getNextEditLocations();
const actions = lsp.nextEditLocationsToCodeActions(locations);
```

## Configuration

```typescript
interface AutoSuggestConfig {
  enabledRulePacks?: string[];      // default: ["seo-blog"]
  customRules?: Rule[];             // Additional rules
  thesaurusEnabled?: boolean;       // default: true
  spellingEnabled?: boolean;        // default: true
  aiCompletionEnabled?: boolean;    // default: true
  adaptiveRanking?: boolean;        // default: true
  cacheEnabled?: boolean;           // default: true
}
```

## Architecture

```
Main Thread (UI)
       ↓
Main Coordinator Worker
       ↓
┌──────┴──────┬──────────┬─────────┐
│             │          │         │
Parse      Spelling  Analysis  Rules
Worker     Worker    Worker    Worker
```

## License

MIT
```

**Step 2: Commit**

```bash
git add libraries/auto-suggest/README.md
git commit -m "docs(auto-suggest): add comprehensive README with usage examples"
```

---

### Task 13: Add Thesaurus Data Loading

**Files:**
- Create: `libraries/thesaurus/src/data/loader.ts`
- Create: `libraries/thesaurus/src/data/en-common.ts`
- Create: `libraries/thesaurus/src/data/loader.test.ts`

**Step 1: Write test for data loader**

Create `libraries/thesaurus/src/data/loader.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { loadThesaurusData, getCommonWeakWords } from "./loader";

describe("Thesaurus Data Loader", () => {
  it("should load common weak words", () => {
    const weakWords = getCommonWeakWords();

    expect(weakWords.length).toBeGreaterThan(0);
    expect(weakWords.includes("very")).toBe(true);
  });

  it("should load basic thesaurus data", async () => {
    const data = await loadThesaurusData("en");

    expect(data.entries.length).toBeGreaterThan(0);
    expect(data.weakWords.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Create common English data**

Create `libraries/thesaurus/src/data/en-common.ts`:

```typescript
import type { ThesaurusEntry } from "../types";

export const COMMON_WEAK_WORDS = [
  "very",
  "really",
  "quite",
  "rather",
  "somewhat",
  "fairly",
  "pretty",
  "just",
  "actually",
  "basically",
  "literally",
];

export const COMMON_THESAURUS_ENTRIES: ThesaurusEntry[] = [
  {
    word: "good",
    synonyms: [
      "excellent",
      "great",
      "fine",
      "wonderful",
      "superb",
      { word: "satisfactory", style: "formal" },
      { word: "decent", style: "casual" },
    ],
    antonyms: ["bad", "poor", "terrible"],
    related: ["better", "best", "quality"],
  },
  {
    word: "bad",
    synonyms: [
      "poor",
      "terrible",
      "awful",
      "dreadful",
      { word: "substandard", style: "formal" },
      { word: "lousy", style: "casual" },
    ],
    antonyms: ["good", "excellent", "great"],
    related: ["worse", "worst"],
  },
  {
    word: "use",
    synonyms: [
      "employ",
      "apply",
      { word: "utilize", style: "formal" },
      { word: "leverage", style: "technical" },
    ],
    antonyms: ["discard", "abandon"],
    related: ["usage", "useful"],
  },
  {
    word: "help",
    synonyms: [
      "assist",
      "aid",
      "support",
      { word: "facilitate", style: "formal" },
    ],
    antonyms: ["hinder", "obstruct"],
    related: ["helpful", "helper"],
  },
  {
    word: "important",
    synonyms: [
      "significant",
      "crucial",
      "vital",
      "essential",
      { word: "critical", style: "formal" },
      { word: "key", style: "casual" },
    ],
    antonyms: ["unimportant", "trivial", "minor"],
    related: ["importance"],
  },
];
```

**Step 3: Create data loader**

Create `libraries/thesaurus/src/data/loader.ts`:

```typescript
import type { ThesaurusConfig } from "../types";
import { COMMON_WEAK_WORDS, COMMON_THESAURUS_ENTRIES } from "./en-common";

export function getCommonWeakWords(): string[] {
  return [...COMMON_WEAK_WORDS];
}

export async function loadThesaurusData(
  language: string = "en"
): Promise<ThesaurusConfig> {
  // For now, only support English
  if (language !== "en") {
    throw new Error(`Language ${language} not supported yet`);
  }

  return {
    entries: [...COMMON_THESAURUS_ENTRIES],
    weakWords: [...COMMON_WEAK_WORDS],
  };
}

export async function loadThesaurusFromUrl(
  url: string
): Promise<ThesaurusConfig> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load thesaurus: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}
```

**Step 4: Update thesaurus index to export loader**

Update `libraries/thesaurus/src/index.ts`:

```typescript
export * from "./types";
import type {
  ThesaurusConfig,
  ThesaurusEntry,
  SynonymEntry,
  SynonymOptions,
  WeakWordDetection,
} from "./types";

export interface Thesaurus {
  getSynonyms(word: string, options?: SynonymOptions): string[];
  getAntonyms(word: string): string[];
  getRelated(word: string): string[];
  detectWeakWords(text: string): WeakWordDetection[];
  hasWord(word: string): boolean;
}

export function createThesaurus(config: ThesaurusConfig): Thesaurus {
  const entries = new Map<string, ThesaurusEntry>();
  const weakWordsSet = new Set(config.weakWords ?? []);

  // Index entries by word
  for (const entry of config.entries ?? []) {
    entries.set(entry.word.toLowerCase(), entry);
  }

  function getSynonyms(word: string, options?: SynonymOptions): string[] {
    const entry = entries.get(word.toLowerCase());
    if (!entry) return [];

    const style = options?.style;
    const limit = options?.limit ?? 10;

    const synonyms: string[] = [];

    for (const syn of entry.synonyms) {
      if (typeof syn === "string") {
        if (!style || style === "general") {
          synonyms.push(syn);
        }
      } else {
        if (!style || !syn.style || syn.style === style || syn.style === "general") {
          synonyms.push(syn.word);
        }
      }
    }

    return synonyms.slice(0, limit);
  }

  function getAntonyms(word: string): string[] {
    const entry = entries.get(word.toLowerCase());
    return entry?.antonyms ?? [];
  }

  function getRelated(word: string): string[] {
    const entry = entries.get(word.toLowerCase());
    return entry?.related ?? [];
  }

  function detectWeakWords(text: string): WeakWordDetection[] {
    const detections: WeakWordDetection[] = [];
    const words = text.match(/\b\w+\b/g) ?? [];
    let offset = 0;

    for (const word of words) {
      const index = text.indexOf(word, offset);
      if (weakWordsSet.has(word.toLowerCase())) {
        // Get suggestions from thesaurus
        const suggestions = getSynonyms(word);

        detections.push({
          word,
          offset: index,
          suggestions,
        });
      }
      offset = index + word.length;
    }

    return detections;
  }

  function hasWord(word: string): boolean {
    return entries.has(word.toLowerCase());
  }

  return {
    getSynonyms,
    getAntonyms,
    getRelated,
    detectWeakWords,
    hasWord,
  };
}

// Re-export data loader
export { loadThesaurusData, loadThesaurusFromUrl, getCommonWeakWords } from "./data/loader";
```

**Step 5: Run tests**

Run: `cd libraries/thesaurus && bun test`
Expected: PASS

**Step 6: Commit**

```bash
git add libraries/thesaurus/src/data/
git commit -m "feat(thesaurus): add data loader with common English entries"
```

---

## Final Steps

### Task 14: Build and Test All Libraries

**Step 1: Build all libraries**

Run:
```bash
cd libraries/thesaurus && bun run build
cd ../suggestion-rules && bun run build
cd ../auto-suggest && bun run build
```

Expected: All build successfully

**Step 2: Run all tests**

Run:
```bash
cd libraries/thesaurus && bun test
cd ../suggestion-rules && bun test
cd ../auto-suggest && bun test
```

Expected: All tests pass

**Step 3: Commit**

```bash
git add .
git commit -m "build: build all auto-suggest libraries"
```

---

### Task 15: Create Final Documentation

**Files:**
- Create: `docs/auto-suggest-guide.md`

**Step 1: Write comprehensive guide**

Create `docs/auto-suggest-guide.md`:

```markdown
# Auto-Suggest Engine Guide

Complete guide for the Contentta CMS Auto-Suggest Engine with FIM and NES modes.

## Overview

The auto-suggest engine provides intelligent content suggestions through:

1. **FIM (Fill-In-Middle) Mode** - Real-time text completion at cursor
2. **NES (Next Edit Suggestion) Mode** - Smart navigation to next issue location

## Architecture

### Libraries

1. **@f-o-t/thesaurus** - Synonym detection and weak word analysis
2. **@f-o-t/suggestion-rules** - Pre-built rule packs (SEO, readability, etc.)
3. **@f-o-t/auto-suggest** - Main orchestration engine

### Worker Architecture

```
Main Thread
    ↓
Coordinator Worker
    ├── Parse Worker (markdown parsing)
    ├── Spelling Worker (spell check + thesaurus)
    ├── Analysis Worker (content analysis)
    └── Rules Worker (rules evaluation)
```

### Data Flow

1. User types in editor → LSP receives change
2. LSP sends delta to engine
3. Engine dispatches to coordinator worker
4. Coordinator runs specialized workers in parallel
5. Results aggregated and ranked adaptively
6. Suggestions returned to LSP
7. LSP shows diagnostics and completions

## LSP Integration

### Setup

```typescript
import { createAutoSuggestEngine } from "@f-o-t/auto-suggest";
import { createLspAdapter } from "@f-o-t/auto-suggest/lsp";

const engine = createAutoSuggestEngine({
  enabledRulePacks: ["seo-blog"],
  adaptiveRanking: true,
});

const lsp = createLspAdapter();
```

### Document Change Handler

```typescript
connection.onDidChangeTextDocument(async (params) => {
  const { uri, contentChanges } = params;
  const document = documents.get(uri);

  // Extract delta
  const change = contentChanges[0];
  const delta = {
    start: document.offsetAt(change.range.start),
    end: document.offsetAt(change.range.end),
    newText: change.text,
  };

  // Analyze with delta for incremental update
  const result = await engine.analyze({
    content: document.getText(),
    delta,
    metadata: {
      title: extractTitle(document),
      targetKeywords: extractKeywords(document),
    },
  });

  // Send diagnostics
  const diagnostics = lsp.issuesToDiagnostics(result.issues);
  connection.sendDiagnostics({ uri, diagnostics });
});
```

### Completion Provider (FIM Mode)

```typescript
connection.onCompletion(async (params) => {
  const document = documents.get(params.textDocument.uri);
  const offset = document.offsetAt(params.position);

  // Get suggestions at cursor
  const suggestions = await engine.getSuggestions(
    document.getText(),
    offset
  );

  // Convert to LSP format
  return lsp.suggestionsToCompletions(suggestions);
});
```

### Code Action Provider (NES Mode)

```typescript
connection.onCodeAction(async (params) => {
  // Get next edit locations
  const locations = engine.getNextEditLocations();

  // Convert to code actions
  return lsp.nextEditLocationsToCodeActions(locations);
});
```

## Adaptive Ranking

The engine learns from user interactions:

```typescript
// Record when user accepts/rejects suggestion
connection.onNotification("suggestion/interaction", async (params) => {
  await engine.recordInteraction({
    suggestionId: params.id,
    action: params.action, // "accept" | "reject" | "ignore"
    timestamp: Date.now(),
    context: {
      suggestionType: params.type,
      severity: params.severity,
    },
  });
});
```

## Custom Rule Packs

Create your own rule packs:

```typescript
import { rule, num, str, all } from "@f-o-t/rules-engine";

const customPack = {
  id: "technical-docs",
  name: "Technical Documentation",
  description: "Rules for technical documentation",
  version: "1.0.0",
  enabled: true,
  tags: ["technical", "docs"],
  rules: [
    rule()
      .named("Code Blocks Need Language")
      .when(num("codeBlocksWithoutLang", "gt", 0))
      .then("suggest_add_language", {
        type: "quality",
        severity: "warning",
        message: "Add language identifier to code blocks",
      })
      .withPriority(90)
      .build(),
  ],
};

// Register custom pack
import { registerRulePack } from "@f-o-t/suggestion-rules";
registerRulePack(customPack);
```

## Performance Optimization

### Incremental Analysis

Always provide delta for edits:

```typescript
await engine.analyze({
  content: fullContent,
  delta: {
    start: changeStart,
    end: changeEnd,
    newText: insertedText,
  },
});
```

### Debouncing

Debounce analysis requests:

```typescript
let debounceTimer: any;

function scheduleAnalysis(content: string) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    await engine.analyze({ content });
  }, 300); // 300ms delay
}
```

### Caching

Enable caching in config:

```typescript
const engine = createAutoSuggestEngine({
  cacheEnabled: true,
});
```

## Testing

Test your LSP integration:

```typescript
import { createAutoSuggestEngine } from "@f-o-t/auto-suggest";

const engine = createAutoSuggestEngine({});

// Test analysis
const result = await engine.analyze({
  content: "# Test\n\nContent",
});

expect(result.issues.length).toBeGreaterThan(0);
expect(result.metrics.wordCount).toBe(1);
```

## Troubleshooting

### Workers Not Loading

Ensure worker URLs are correct:

```typescript
const worker = new Worker(
  new URL("./workers/coordinator.worker.ts", import.meta.url)
);
```

### Slow Performance

- Enable incremental analysis
- Use debouncing
- Check worker parallelization
- Monitor with performance hooks

### Memory Leaks

Always dispose engine when done:

```typescript
connection.onShutdown(() => {
  engine.dispose();
});
```

## License

MIT
```

**Step 2: Commit and finish**

```bash
git add docs/auto-suggest-guide.md
git commit -m "docs: add comprehensive auto-suggest engine guide"
```

---

## Summary

This plan creates:

1. **@f-o-t/thesaurus** - Synonym and weak word detection
2. **@f-o-t/suggestion-rules** - Pre-built rule packs
3. **@f-o-t/auto-suggest** - Main engine with worker architecture

**Total Implementation Time:** ~15-20 hours

**Key Features:**
- ✅ Dual mode (FIM + NES)
- ✅ Worker-based architecture
- ✅ Adaptive ranking with learning
- ✅ IndexedDB persistence
- ✅ LSP protocol support
- ✅ Incremental analysis
- ✅ Rule engine integration
- ✅ Content analysis integration
- ✅ Spelling + thesaurus integration

**Next Steps:**
1. Extend thesaurus with full dictionary
2. Add AI completion integration
3. Build UI components for editors
4. Create VS Code extension
5. Add more rule packs (technical docs, marketing, etc.)
