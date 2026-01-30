# DateTime Library Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a lightweight, Day.js-inspired datetime library with modern fluent API, Zod-first validation, and plugin architecture for the FOT ecosystem.

**Architecture:** Immutable DateTime wrapper around native JavaScript Date with plugin-based extensions. Core provides essential parsing, formatting (ISO), and basic math. Plugins add timezone, business days, advanced formatting, and relative time. All validation through Zod schemas like @f-o-t/condition-evaluator.

**Tech Stack:** TypeScript 5.9, Zod 4.3, Bun runtime, native JavaScript Date

---

## Phase 1: Project Setup & Core Structure

### Task 1: Initialize Library Structure

**Files:**
- Create: `libraries/datetime/package.json`
- Create: `libraries/datetime/tsconfig.json`
- Create: `libraries/datetime/bunup.config.ts`
- Create: `libraries/datetime/src/index.ts`
- Create: `libraries/datetime/README.md`

**Step 1: Create package.json**

```json
{
   "name": "@f-o-t/datetime",
   "version": "0.1.0",
   "description": "Lightweight datetime library with modern fluent API and Zod validation",
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
      "./plugins/*": {
         "bun": "./src/plugins/*/index.ts",
         "import": {
            "default": "./dist/plugins/*/index.js",
            "types": "./dist/plugins/*/index.d.ts"
         },
         "types": "./src/plugins/*/index.ts"
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
   "homepage": "https://github.com/F-O-T/montte-nx/blob/master/libraries/datetime",
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
   entry: ["src/index.ts", "src/plugins/*/index.ts"],
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
// Placeholder - will be populated in later tasks
export { DateTime } from "./core/datetime.ts";
export * from "./types.ts";
export * from "./schemas.ts";
export * from "./errors.ts";
```

**Step 5: Create minimal README.md**

```markdown
# @f-o-t/datetime

Lightweight datetime library with modern fluent API and Zod validation.

## Features

- Modern fluent API (`.addDays()`, `.addMonths()`)
- Zod-first validation
- Immutable operations
- Plugin-based architecture
- TypeScript-first
- Works with Bun and Node.js

## Installation

\`\`\`bash
bun add @f-o-t/datetime
\`\`\`

## Quick Start

\`\`\`typescript
import { datetime } from "@f-o-t/datetime";

const now = datetime();
const tomorrow = now.addDays(1);
const formatted = tomorrow.toISO();
\`\`\`

## Documentation

Coming soon.

## License

MIT
```

**Step 6: Commit**

```bash
git add libraries/datetime/
git commit -m "feat(datetime): initialize library structure

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Define Core Types and Schemas

**Files:**
- Create: `libraries/datetime/src/types.ts`
- Create: `libraries/datetime/src/schemas.ts`
- Create: `libraries/datetime/src/errors.ts`

**Step 1: Create types.ts**

```typescript
/**
 * Unit of time for arithmetic operations
 */
export type TimeUnit =
   | "millisecond"
   | "second"
   | "minute"
   | "hour"
   | "day"
   | "week"
   | "month"
   | "year";

/**
 * Date input types accepted by the library
 */
export type DateInput = Date | string | number | DateTime;

/**
 * Plugin interface for extending DateTime
 */
export type DateTimePlugin = {
   name: string;
   install: (dt: DateTimeClass) => void;
};

/**
 * DateTime configuration options
 */
export type DateTimeConfig = {
   /** Default timezone (used by plugins) */
   timezone?: string;
   /** Default locale (used by plugins) */
   locale?: string;
   /** Strict mode for parsing */
   strictMode?: boolean;
};

/**
 * Format options for string output
 */
export type FormatOptions = {
   /** Locale for formatting */
   locale?: string;
   /** Timezone for formatting */
   timezone?: string;
};

/**
 * Parse options
 */
export type ParseOptions = {
   /** Strict parsing mode */
   strict?: boolean;
   /** Format string for parsing */
   format?: string;
};

/**
 * DateTime class type (will be defined in core)
 */
export type DateTimeClass = typeof DateTime;

/**
 * DateTime instance type
 */
export type DateTime = InstanceType<DateTimeClass>;
```

**Step 2: Create schemas.ts**

```typescript
import { z } from "zod";

/**
 * Time unit schema
 */
export const TimeUnitSchema = z.enum([
   "millisecond",
   "second",
   "minute",
   "hour",
   "day",
   "week",
   "month",
   "year",
]);

/**
 * Date input schema - accepts Date, ISO string, timestamp, or DateTime
 */
export const DateInputSchema = z.union([
   z.date(),
   z.string().datetime(),
   z.number().int().nonnegative(),
   z.custom<DateTime>((val) => val instanceof DateTime),
]);

/**
 * Configuration schema
 */
export const DateTimeConfigSchema = z.object({
   timezone: z.string().optional(),
   locale: z.string().optional(),
   strictMode: z.boolean().default(false),
});

/**
 * Format options schema
 */
export const FormatOptionsSchema = z.object({
   locale: z.string().optional(),
   timezone: z.string().optional(),
});

/**
 * Parse options schema
 */
export const ParseOptionsSchema = z.object({
   strict: z.boolean().default(false),
   format: z.string().optional(),
});

/**
 * Plugin schema
 */
export const PluginSchema = z.object({
   name: z.string().min(1),
   install: z.function(),
});

/**
 * ISO 8601 date string schema
 */
export const ISODateSchema = z.string().datetime();

/**
 * ISO 8601 date-only string schema (YYYY-MM-DD)
 */
export const ISODateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * ISO 8601 time-only string schema (HH:mm:ss)
 */
export const ISOTimeOnlySchema = z
   .string()
   .regex(/^\d{2}:\d{2}:\d{2}(\.\d{3})?$/);
```

**Step 3: Create errors.ts**

```typescript
/**
 * Base error class for all datetime errors
 */
export class DateTimeError extends Error {
   constructor(message: string) {
      super(message);
      this.name = "DateTimeError";
   }
}

/**
 * Error thrown when date parsing fails
 */
export class InvalidDateError extends DateTimeError {
   constructor(
      public readonly input: unknown,
      reason?: string,
   ) {
      super(
         `Invalid date: ${JSON.stringify(input)}${reason ? ` (${reason})` : ""}`,
      );
      this.name = "InvalidDateError";
   }
}

/**
 * Error thrown when date format is invalid
 */
export class InvalidFormatError extends DateTimeError {
   constructor(
      public readonly format: string,
      reason?: string,
   ) {
      super(
         `Invalid format: ${format}${reason ? ` (${reason})` : ""}`,
      );
      this.name = "InvalidFormatError";
   }
}

/**
 * Error thrown when timezone is invalid or unsupported
 */
export class InvalidTimezoneError extends DateTimeError {
   constructor(public readonly timezone: string) {
      super(`Invalid timezone: ${timezone}`);
      this.name = "InvalidTimezoneError";
   }
}

/**
 * Error thrown when plugin operation fails
 */
export class PluginError extends DateTimeError {
   constructor(
      public readonly pluginName: string,
      reason: string,
   ) {
      super(`Plugin '${pluginName}' error: ${reason}`);
      this.name = "PluginError";
   }
}

/**
 * Error thrown when required plugin is missing
 */
export class MissingPluginError extends DateTimeError {
   constructor(
      public readonly pluginName: string,
      public readonly method: string,
   ) {
      super(
         `Method '${method}' requires plugin '${pluginName}' to be installed`,
      );
      this.name = "MissingPluginError";
   }
}
```

**Step 4: Write tests for schemas**

Create: `libraries/datetime/src/schemas.test.ts`

```typescript
import { describe, expect, test } from "bun:test";
import {
   DateInputSchema,
   DateTimeConfigSchema,
   FormatOptionsSchema,
   ISODateOnlySchema,
   ISODateSchema,
   ISOTimeOnlySchema,
   ParseOptionsSchema,
   PluginSchema,
   TimeUnitSchema,
} from "./schemas.ts";

describe("TimeUnitSchema", () => {
   test("accepts valid time units", () => {
      expect(TimeUnitSchema.parse("millisecond")).toBe("millisecond");
      expect(TimeUnitSchema.parse("second")).toBe("second");
      expect(TimeUnitSchema.parse("minute")).toBe("minute");
      expect(TimeUnitSchema.parse("hour")).toBe("hour");
      expect(TimeUnitSchema.parse("day")).toBe("day");
      expect(TimeUnitSchema.parse("week")).toBe("week");
      expect(TimeUnitSchema.parse("month")).toBe("month");
      expect(TimeUnitSchema.parse("year")).toBe("year");
   });

   test("rejects invalid time units", () => {
      expect(() => TimeUnitSchema.parse("invalid")).toThrow();
      expect(() => TimeUnitSchema.parse("days")).toThrow();
   });
});

describe("DateInputSchema", () => {
   test("accepts Date objects", () => {
      const date = new Date();
      expect(DateInputSchema.parse(date)).toBe(date);
   });

   test("accepts ISO strings", () => {
      const iso = "2026-01-30T10:00:00.000Z";
      expect(DateInputSchema.parse(iso)).toBe(iso);
   });

   test("accepts timestamps", () => {
      const timestamp = Date.now();
      expect(DateInputSchema.parse(timestamp)).toBe(timestamp);
   });

   test("rejects negative timestamps", () => {
      expect(() => DateInputSchema.parse(-1)).toThrow();
   });

   test("rejects invalid ISO strings", () => {
      expect(() => DateInputSchema.parse("not-a-date")).toThrow();
   });
});

describe("DateTimeConfigSchema", () => {
   test("accepts empty config", () => {
      expect(DateTimeConfigSchema.parse({})).toEqual({
         strictMode: false,
      });
   });

   test("accepts full config", () => {
      const config = {
         timezone: "America/New_York",
         locale: "en-US",
         strictMode: true,
      };
      expect(DateTimeConfigSchema.parse(config)).toEqual(config);
   });

   test("applies default strictMode", () => {
      const result = DateTimeConfigSchema.parse({ timezone: "UTC" });
      expect(result.strictMode).toBe(false);
   });
});

describe("FormatOptionsSchema", () => {
   test("accepts empty options", () => {
      expect(FormatOptionsSchema.parse({})).toEqual({});
   });

   test("accepts locale and timezone", () => {
      const opts = { locale: "en-US", timezone: "UTC" };
      expect(FormatOptionsSchema.parse(opts)).toEqual(opts);
   });
});

describe("ParseOptionsSchema", () => {
   test("applies default strict mode", () => {
      expect(ParseOptionsSchema.parse({})).toEqual({ strict: false });
   });

   test("accepts format string", () => {
      const opts = { format: "YYYY-MM-DD", strict: true };
      expect(ParseOptionsSchema.parse(opts)).toEqual(opts);
   });
});

describe("PluginSchema", () => {
   test("accepts valid plugin", () => {
      const plugin = {
         name: "test-plugin",
         install: () => {},
      };
      expect(PluginSchema.parse(plugin)).toEqual(plugin);
   });

   test("rejects plugin without name", () => {
      expect(() => PluginSchema.parse({ install: () => {} })).toThrow();
   });

   test("rejects plugin with empty name", () => {
      expect(() =>
         PluginSchema.parse({ name: "", install: () => {} }),
      ).toThrow();
   });
});

describe("ISODateSchema", () => {
   test("accepts valid ISO datetime strings", () => {
      expect(ISODateSchema.parse("2026-01-30T10:00:00.000Z")).toBe(
         "2026-01-30T10:00:00.000Z",
      );
   });

   test("rejects non-ISO strings", () => {
      expect(() => ISODateSchema.parse("2026-01-30")).toThrow();
      expect(() => ISODateSchema.parse("30/01/2026")).toThrow();
   });
});

describe("ISODateOnlySchema", () => {
   test("accepts valid date-only strings", () => {
      expect(ISODateOnlySchema.parse("2026-01-30")).toBe("2026-01-30");
   });

   test("rejects datetime strings", () => {
      expect(() =>
         ISODateOnlySchema.parse("2026-01-30T10:00:00Z"),
      ).toThrow();
   });

   test("rejects invalid formats", () => {
      expect(() => ISODateOnlySchema.parse("30-01-2026")).toThrow();
      expect(() => ISODateOnlySchema.parse("2026/01/30")).toThrow();
   });
});

describe("ISOTimeOnlySchema", () => {
   test("accepts valid time strings", () => {
      expect(ISOTimeOnlySchema.parse("10:30:45")).toBe("10:30:45");
      expect(ISOTimeOnlySchema.parse("10:30:45.123")).toBe("10:30:45.123");
   });

   test("rejects invalid time formats", () => {
      expect(() => ISOTimeOnlySchema.parse("10:30")).toThrow();
      expect(() => ISOTimeOnlySchema.parse("25:00:00")).toThrow();
   });
});
```

**Step 5: Run tests**

Run: `cd libraries/datetime && bun test`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add libraries/datetime/src/types.ts libraries/datetime/src/schemas.ts libraries/datetime/src/errors.ts libraries/datetime/src/schemas.test.ts
git commit -m "feat(datetime): add core types, schemas, and errors

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: Core DateTime Class

### Task 3: Implement Core DateTime Class

**Files:**
- Create: `libraries/datetime/src/core/datetime.ts`
- Create: `libraries/datetime/src/core/datetime.test.ts`

**Step 1: Write failing test for DateTime creation**

```typescript
import { describe, expect, test } from "bun:test";
import { DateTime } from "./datetime.ts";
import { InvalidDateError } from "../errors.ts";

describe("DateTime creation", () => {
   test("creates from current time", () => {
      const dt = new DateTime();
      expect(dt).toBeInstanceOf(DateTime);
      expect(dt.isValid()).toBe(true);
   });

   test("creates from Date object", () => {
      const date = new Date("2026-01-30T10:00:00.000Z");
      const dt = new DateTime(date);
      expect(dt.toDate()).toEqual(date);
   });

   test("creates from ISO string", () => {
      const dt = new DateTime("2026-01-30T10:00:00.000Z");
      expect(dt.toISO()).toBe("2026-01-30T10:00:00.000Z");
   });

   test("creates from timestamp", () => {
      const timestamp = 1738234800000; // 2026-01-30T10:00:00.000Z
      const dt = new DateTime(timestamp);
      expect(dt.valueOf()).toBe(timestamp);
   });

   test("throws on invalid input", () => {
      expect(() => new DateTime("invalid")).toThrow(InvalidDateError);
      expect(() => new DateTime(Number.NaN)).toThrow(InvalidDateError);
   });

   test("creates invalid DateTime for Invalid Date", () => {
      const dt = new DateTime(new Date("invalid"));
      expect(dt.isValid()).toBe(false);
   });
});
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/datetime && bun test src/core/datetime.test.ts`
Expected: FAIL - DateTime not defined

**Step 3: Implement minimal DateTime class**

```typescript
import { DateInputSchema } from "../schemas.ts";
import { InvalidDateError } from "../errors.ts";
import type { DateInput, DateTimePlugin } from "../types.ts";

/**
 * Immutable DateTime wrapper around JavaScript Date
 */
export class DateTime {
   private readonly _date: Date;
   private static plugins = new Map<string, DateTimePlugin>();

   /**
    * Create a new DateTime instance
    * @param input - Date, ISO string, timestamp, or DateTime
    */
   constructor(input?: DateInput) {
      if (input === undefined) {
         this._date = new Date();
         return;
      }

      // Validate input with Zod
      const validated = DateInputSchema.safeParse(input);
      if (!validated.success) {
         throw new InvalidDateError(input, validated.error.message);
      }

      // Convert to Date
      if (input instanceof DateTime) {
         this._date = new Date(input._date);
      } else if (input instanceof Date) {
         this._date = new Date(input);
      } else if (typeof input === "string") {
         this._date = new Date(input);
      } else {
         this._date = new Date(input);
      }

      // Check if date is valid
      if (Number.isNaN(this._date.getTime())) {
         // Create invalid DateTime but don't throw
         // This matches behavior of libraries like Day.js
      }
   }

   /**
    * Check if DateTime represents a valid date
    */
   isValid(): boolean {
      return !Number.isNaN(this._date.getTime());
   }

   /**
    * Get the underlying Date object (cloned for immutability)
    */
   toDate(): Date {
      return new Date(this._date);
   }

   /**
    * Get ISO 8601 string representation
    */
   toISO(): string {
      return this._date.toISOString();
   }

   /**
    * Get timestamp (milliseconds since epoch)
    */
   valueOf(): number {
      return this._date.getTime();
   }

   /**
    * Register a plugin
    */
   static extend(plugin: DateTimePlugin): void {
      if (DateTime.plugins.has(plugin.name)) {
         return; // Plugin already registered
      }
      DateTime.plugins.set(plugin.name, plugin);
      plugin.install(DateTime);
   }

   /**
    * Check if a plugin is registered
    */
   static hasPlugin(name: string): boolean {
      return DateTime.plugins.has(name);
   }

   /**
    * Get registered plugin
    */
   static getPlugin(name: string): DateTimePlugin | undefined {
      return DateTime.plugins.get(name);
   }
}
```

**Step 4: Run test to verify it passes**

Run: `cd libraries/datetime && bun test src/core/datetime.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add libraries/datetime/src/core/
git commit -m "feat(datetime): implement core DateTime class

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Add Basic Arithmetic Methods

**Files:**
- Modify: `libraries/datetime/src/core/datetime.ts`
- Modify: `libraries/datetime/src/core/datetime.test.ts`

**Step 1: Write failing tests for arithmetic**

Add to `datetime.test.ts`:

```typescript
describe("DateTime arithmetic", () => {
   test("addMilliseconds", () => {
      const dt = new DateTime("2026-01-30T10:00:00.000Z");
      const result = dt.addMilliseconds(500);
      expect(result.toISO()).toBe("2026-01-30T10:00:00.500Z");
      expect(dt.toISO()).toBe("2026-01-30T10:00:00.000Z"); // Immutable
   });

   test("addSeconds", () => {
      const dt = new DateTime("2026-01-30T10:00:00.000Z");
      const result = dt.addSeconds(30);
      expect(result.toISO()).toBe("2026-01-30T10:00:30.000Z");
   });

   test("addMinutes", () => {
      const dt = new DateTime("2026-01-30T10:00:00.000Z");
      const result = dt.addMinutes(15);
      expect(result.toISO()).toBe("2026-01-30T10:15:00.000Z");
   });

   test("addHours", () => {
      const dt = new DateTime("2026-01-30T10:00:00.000Z");
      const result = dt.addHours(2);
      expect(result.toISO()).toBe("2026-01-30T12:00:00.000Z");
   });

   test("addDays", () => {
      const dt = new DateTime("2026-01-30T10:00:00.000Z");
      const result = dt.addDays(5);
      expect(result.toISO()).toBe("2026-02-04T10:00:00.000Z");
   });

   test("addWeeks", () => {
      const dt = new DateTime("2026-01-30T10:00:00.000Z");
      const result = dt.addWeeks(2);
      expect(result.toISO()).toBe("2026-02-13T10:00:00.000Z");
   });

   test("addMonths", () => {
      const dt = new DateTime("2026-01-30T10:00:00.000Z");
      const result = dt.addMonths(1);
      // Jan 30 + 1 month = Feb 28 (Feb has 28 days in 2026)
      expect(result.toISO()).toBe("2026-02-28T10:00:00.000Z");
   });

   test("addYears", () => {
      const dt = new DateTime("2026-01-30T10:00:00.000Z");
      const result = dt.addYears(1);
      expect(result.toISO()).toBe("2027-01-30T10:00:00.000Z");
   });

   test("subtract with negative values", () => {
      const dt = new DateTime("2026-01-30T10:00:00.000Z");
      const result = dt.addDays(-5);
      expect(result.toISO()).toBe("2026-01-25T10:00:00.000Z");
   });
});

describe("DateTime subtract methods", () => {
   test("subtractDays", () => {
      const dt = new DateTime("2026-01-30T10:00:00.000Z");
      const result = dt.subtractDays(5);
      expect(result.toISO()).toBe("2026-01-25T10:00:00.000Z");
   });

   test("subtractMonths", () => {
      const dt = new DateTime("2026-03-30T10:00:00.000Z");
      const result = dt.subtractMonths(1);
      // Mar 30 - 1 month = Feb 28 (Feb has 28 days)
      expect(result.toISO()).toBe("2026-02-28T10:00:00.000Z");
   });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd libraries/datetime && bun test src/core/datetime.test.ts`
Expected: FAIL - methods not defined

**Step 3: Implement arithmetic methods**

Add to `DateTime` class in `datetime.ts`:

```typescript
   /**
    * Add milliseconds
    */
   addMilliseconds(amount: number): DateTime {
      const newDate = new Date(this._date);
      newDate.setMilliseconds(newDate.getMilliseconds() + amount);
      return new DateTime(newDate);
   }

   /**
    * Add seconds
    */
   addSeconds(amount: number): DateTime {
      return this.addMilliseconds(amount * 1000);
   }

   /**
    * Add minutes
    */
   addMinutes(amount: number): DateTime {
      return this.addMilliseconds(amount * 60 * 1000);
   }

   /**
    * Add hours
    */
   addHours(amount: number): DateTime {
      return this.addMilliseconds(amount * 60 * 60 * 1000);
   }

   /**
    * Add days
    */
   addDays(amount: number): DateTime {
      const newDate = new Date(this._date);
      newDate.setDate(newDate.getDate() + amount);
      return new DateTime(newDate);
   }

   /**
    * Add weeks
    */
   addWeeks(amount: number): DateTime {
      return this.addDays(amount * 7);
   }

   /**
    * Add months
    */
   addMonths(amount: number): DateTime {
      const newDate = new Date(this._date);
      newDate.setMonth(newDate.getMonth() + amount);
      return new DateTime(newDate);
   }

   /**
    * Add years
    */
   addYears(amount: number): DateTime {
      const newDate = new Date(this._date);
      newDate.setFullYear(newDate.getFullYear() + amount);
      return new DateTime(newDate);
   }

   /**
    * Subtract milliseconds
    */
   subtractMilliseconds(amount: number): DateTime {
      return this.addMilliseconds(-amount);
   }

   /**
    * Subtract seconds
    */
   subtractSeconds(amount: number): DateTime {
      return this.addSeconds(-amount);
   }

   /**
    * Subtract minutes
    */
   subtractMinutes(amount: number): DateTime {
      return this.addMinutes(-amount);
   }

   /**
    * Subtract hours
    */
   subtractHours(amount: number): DateTime {
      return this.addHours(-amount);
   }

   /**
    * Subtract days
    */
   subtractDays(amount: number): DateTime {
      return this.addDays(-amount);
   }

   /**
    * Subtract weeks
    */
   subtractWeeks(amount: number): DateTime {
      return this.addWeeks(-amount);
   }

   /**
    * Subtract months
    */
   subtractMonths(amount: number): DateTime {
      return this.addMonths(-amount);
   }

   /**
    * Subtract years
    */
   subtractYears(amount: number): DateTime {
      return this.addYears(-amount);
   }
```

**Step 4: Run tests**

Run: `cd libraries/datetime && bun test src/core/datetime.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add libraries/datetime/src/core/
git commit -m "feat(datetime): add arithmetic methods (add/subtract)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Add Comparison Methods

**Files:**
- Modify: `libraries/datetime/src/core/datetime.ts`
- Modify: `libraries/datetime/src/core/datetime.test.ts`

**Step 1: Write failing tests**

Add to `datetime.test.ts`:

```typescript
describe("DateTime comparison", () => {
   const dt1 = new DateTime("2026-01-30T10:00:00.000Z");
   const dt2 = new DateTime("2026-01-30T12:00:00.000Z");
   const dt3 = new DateTime("2026-01-30T10:00:00.000Z");

   test("isBefore", () => {
      expect(dt1.isBefore(dt2)).toBe(true);
      expect(dt2.isBefore(dt1)).toBe(false);
      expect(dt1.isBefore(dt3)).toBe(false);
   });

   test("isAfter", () => {
      expect(dt2.isAfter(dt1)).toBe(true);
      expect(dt1.isAfter(dt2)).toBe(false);
      expect(dt1.isAfter(dt3)).toBe(false);
   });

   test("isSame", () => {
      expect(dt1.isSame(dt3)).toBe(true);
      expect(dt1.isSame(dt2)).toBe(false);
   });

   test("isSameOrBefore", () => {
      expect(dt1.isSameOrBefore(dt2)).toBe(true);
      expect(dt1.isSameOrBefore(dt3)).toBe(true);
      expect(dt2.isSameOrBefore(dt1)).toBe(false);
   });

   test("isSameOrAfter", () => {
      expect(dt2.isSameOrAfter(dt1)).toBe(true);
      expect(dt1.isSameOrAfter(dt3)).toBe(true);
      expect(dt1.isSameOrAfter(dt2)).toBe(false);
   });

   test("isBetween", () => {
      const start = new DateTime("2026-01-30T09:00:00.000Z");
      const end = new DateTime("2026-01-30T11:00:00.000Z");
      expect(dt1.isBetween(start, end)).toBe(true);
      expect(dt2.isBetween(start, end)).toBe(false);
   });

   test("isBetween with inclusive bounds", () => {
      const start = new DateTime("2026-01-30T10:00:00.000Z");
      const end = new DateTime("2026-01-30T12:00:00.000Z");
      expect(dt1.isBetween(start, end, true)).toBe(true);
      expect(dt2.isBetween(start, end, true)).toBe(true);
   });
});
```

**Step 2: Run tests**

Run: `cd libraries/datetime && bun test src/core/datetime.test.ts`
Expected: FAIL - methods not defined

**Step 3: Implement comparison methods**

Add to `DateTime` class:

```typescript
   /**
    * Check if this datetime is before another
    */
   isBefore(other: DateTime): boolean {
      return this.valueOf() < other.valueOf();
   }

   /**
    * Check if this datetime is after another
    */
   isAfter(other: DateTime): boolean {
      return this.valueOf() > other.valueOf();
   }

   /**
    * Check if this datetime is the same as another
    */
   isSame(other: DateTime): boolean {
      return this.valueOf() === other.valueOf();
   }

   /**
    * Check if this datetime is same or before another
    */
   isSameOrBefore(other: DateTime): boolean {
      return this.valueOf() <= other.valueOf();
   }

   /**
    * Check if this datetime is same or after another
    */
   isSameOrAfter(other: DateTime): boolean {
      return this.valueOf() >= other.valueOf();
   }

   /**
    * Check if this datetime is between two others
    * @param start - Start datetime
    * @param end - End datetime
    * @param inclusive - Include boundaries (default: false)
    */
   isBetween(start: DateTime, end: DateTime, inclusive = false): boolean {
      const value = this.valueOf();
      const startValue = start.valueOf();
      const endValue = end.valueOf();

      if (inclusive) {
         return value >= startValue && value <= endValue;
      }
      return value > startValue && value < endValue;
   }
```

**Step 4: Run tests**

Run: `cd libraries/datetime && bun test src/core/datetime.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add libraries/datetime/src/core/
git commit -m "feat(datetime): add comparison methods

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Add Getter Methods

**Files:**
- Modify: `libraries/datetime/src/core/datetime.ts`
- Modify: `libraries/datetime/src/core/datetime.test.ts`

**Step 1: Write failing tests**

Add to `datetime.test.ts`:

```typescript
describe("DateTime getters", () => {
   const dt = new DateTime("2026-01-30T10:30:45.123Z");

   test("year", () => {
      expect(dt.year()).toBe(2026);
   });

   test("month (0-indexed)", () => {
      expect(dt.month()).toBe(0); // January is 0
   });

   test("date (day of month)", () => {
      expect(dt.date()).toBe(30);
   });

   test("day (day of week)", () => {
      expect(dt.day()).toBe(5); // Friday
   });

   test("hour", () => {
      expect(dt.hour()).toBe(10);
   });

   test("minute", () => {
      expect(dt.minute()).toBe(30);
   });

   test("second", () => {
      expect(dt.second()).toBe(45);
   });

   test("millisecond", () => {
      expect(dt.millisecond()).toBe(123);
   });
});
```

**Step 2: Run tests**

Run: `cd libraries/datetime && bun test src/core/datetime.test.ts`
Expected: FAIL

**Step 3: Implement getters**

Add to `DateTime` class:

```typescript
   /**
    * Get year
    */
   year(): number {
      return this._date.getUTCFullYear();
   }

   /**
    * Get month (0-indexed, 0 = January)
    */
   month(): number {
      return this._date.getUTCMonth();
   }

   /**
    * Get day of month (1-31)
    */
   date(): number {
      return this._date.getUTCDate();
   }

   /**
    * Get day of week (0-6, 0 = Sunday)
    */
   day(): number {
      return this._date.getUTCDay();
   }

   /**
    * Get hour (0-23)
    */
   hour(): number {
      return this._date.getUTCHours();
   }

   /**
    * Get minute (0-59)
    */
   minute(): number {
      return this._date.getUTCMinutes();
   }

   /**
    * Get second (0-59)
    */
   second(): number {
      return this._date.getUTCSeconds();
   }

   /**
    * Get millisecond (0-999)
    */
   millisecond(): number {
      return this._date.getUTCMilliseconds();
   }
```

**Step 4: Run tests**

Run: `cd libraries/datetime && bun test src/core/datetime.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add libraries/datetime/src/core/
git commit -m "feat(datetime): add getter methods for date components

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 7: Add Setter Methods

**Files:**
- Modify: `libraries/datetime/src/core/datetime.ts`
- Modify: `libraries/datetime/src/core/datetime.test.ts`

**Step 1: Write failing tests**

Add to `datetime.test.ts`:

```typescript
describe("DateTime setters", () => {
   const dt = new DateTime("2026-01-30T10:30:45.123Z");

   test("setYear returns new instance", () => {
      const result = dt.setYear(2027);
      expect(result.year()).toBe(2027);
      expect(dt.year()).toBe(2026); // Immutable
   });

   test("setMonth", () => {
      const result = dt.setMonth(5); // June
      expect(result.month()).toBe(5);
      expect(result.date()).toBe(30);
   });

   test("setDate", () => {
      const result = dt.setDate(15);
      expect(result.date()).toBe(15);
   });

   test("setHour", () => {
      const result = dt.setHour(14);
      expect(result.hour()).toBe(14);
   });

   test("setMinute", () => {
      const result = dt.setMinute(45);
      expect(result.minute()).toBe(45);
   });

   test("setSecond", () => {
      const result = dt.setSecond(30);
      expect(result.second()).toBe(30);
   });

   test("setMillisecond", () => {
      const result = dt.setMillisecond(500);
      expect(result.millisecond()).toBe(500);
   });
});
```

**Step 2: Run tests**

Run: `cd libraries/datetime && bun test src/core/datetime.test.ts`
Expected: FAIL

**Step 3: Implement setters**

Add to `DateTime` class:

```typescript
   /**
    * Set year (returns new DateTime)
    */
   setYear(year: number): DateTime {
      const newDate = new Date(this._date);
      newDate.setUTCFullYear(year);
      return new DateTime(newDate);
   }

   /**
    * Set month (0-indexed, returns new DateTime)
    */
   setMonth(month: number): DateTime {
      const newDate = new Date(this._date);
      newDate.setUTCMonth(month);
      return new DateTime(newDate);
   }

   /**
    * Set date (day of month, returns new DateTime)
    */
   setDate(date: number): DateTime {
      const newDate = new Date(this._date);
      newDate.setUTCDate(date);
      return new DateTime(newDate);
   }

   /**
    * Set hour (returns new DateTime)
    */
   setHour(hour: number): DateTime {
      const newDate = new Date(this._date);
      newDate.setUTCHours(hour);
      return new DateTime(newDate);
   }

   /**
    * Set minute (returns new DateTime)
    */
   setMinute(minute: number): DateTime {
      const newDate = new Date(this._date);
      newDate.setUTCMinutes(minute);
      return new DateTime(newDate);
   }

   /**
    * Set second (returns new DateTime)
    */
   setSecond(second: number): DateTime {
      const newDate = new Date(this._date);
      newDate.setUTCSeconds(second);
      return new DateTime(newDate);
   }

   /**
    * Set millisecond (returns new DateTime)
    */
   setMillisecond(millisecond: number): DateTime {
      const newDate = new Date(this._date);
      newDate.setUTCMilliseconds(millisecond);
      return new DateTime(newDate);
   }
```

**Step 4: Run tests**

Run: `cd libraries/datetime && bun test src/core/datetime.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add libraries/datetime/src/core/
git commit -m "feat(datetime): add setter methods (immutable)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 8: Add Start/End of Unit Methods

**Files:**
- Modify: `libraries/datetime/src/core/datetime.ts`
- Modify: `libraries/datetime/src/core/datetime.test.ts`

**Step 1: Write failing tests**

Add to `datetime.test.ts`:

```typescript
describe("DateTime start/end of unit", () => {
   const dt = new DateTime("2026-01-30T10:30:45.123Z");

   test("startOfDay", () => {
      const result = dt.startOfDay();
      expect(result.toISO()).toBe("2026-01-30T00:00:00.000Z");
   });

   test("endOfDay", () => {
      const result = dt.endOfDay();
      expect(result.toISO()).toBe("2026-01-30T23:59:59.999Z");
   });

   test("startOfMonth", () => {
      const result = dt.startOfMonth();
      expect(result.toISO()).toBe("2026-01-01T00:00:00.000Z");
   });

   test("endOfMonth", () => {
      const result = dt.endOfMonth();
      expect(result.toISO()).toBe("2026-01-31T23:59:59.999Z");
   });

   test("startOfYear", () => {
      const result = dt.startOfYear();
      expect(result.toISO()).toBe("2026-01-01T00:00:00.000Z");
   });

   test("endOfYear", () => {
      const result = dt.endOfYear();
      expect(result.toISO()).toBe("2026-12-31T23:59:59.999Z");
   });

   test("startOfWeek (Sunday)", () => {
      const result = dt.startOfWeek();
      expect(result.toISO()).toBe("2026-01-25T00:00:00.000Z"); // Sunday
   });

   test("endOfWeek (Saturday)", () => {
      const result = dt.endOfWeek();
      expect(result.toISO()).toBe("2026-01-31T23:59:59.999Z"); // Saturday
   });

   test("startOfHour", () => {
      const result = dt.startOfHour();
      expect(result.toISO()).toBe("2026-01-30T10:00:00.000Z");
   });

   test("endOfHour", () => {
      const result = dt.endOfHour();
      expect(result.toISO()).toBe("2026-01-30T10:59:59.999Z");
   });
});
```

**Step 2: Run tests**

Run: `cd libraries/datetime && bun test src/core/datetime.test.ts`
Expected: FAIL

**Step 3: Implement start/end methods**

Add to `DateTime` class:

```typescript
   /**
    * Get start of day (00:00:00.000)
    */
   startOfDay(): DateTime {
      return this.setHour(0)
         .setMinute(0)
         .setSecond(0)
         .setMillisecond(0);
   }

   /**
    * Get end of day (23:59:59.999)
    */
   endOfDay(): DateTime {
      return this.setHour(23)
         .setMinute(59)
         .setSecond(59)
         .setMillisecond(999);
   }

   /**
    * Get start of month (first day at 00:00:00.000)
    */
   startOfMonth(): DateTime {
      return this.setDate(1).startOfDay();
   }

   /**
    * Get end of month (last day at 23:59:59.999)
    */
   endOfMonth(): DateTime {
      const newDate = new Date(this._date);
      newDate.setUTCMonth(newDate.getUTCMonth() + 1, 0);
      return new DateTime(newDate).endOfDay();
   }

   /**
    * Get start of year (Jan 1 at 00:00:00.000)
    */
   startOfYear(): DateTime {
      return this.setMonth(0).setDate(1).startOfDay();
   }

   /**
    * Get end of year (Dec 31 at 23:59:59.999)
    */
   endOfYear(): DateTime {
      return this.setMonth(11).setDate(31).endOfDay();
   }

   /**
    * Get start of week (Sunday at 00:00:00.000)
    */
   startOfWeek(): DateTime {
      const dayOfWeek = this.day();
      return this.subtractDays(dayOfWeek).startOfDay();
   }

   /**
    * Get end of week (Saturday at 23:59:59.999)
    */
   endOfWeek(): DateTime {
      const dayOfWeek = this.day();
      return this.addDays(6 - dayOfWeek).endOfDay();
   }

   /**
    * Get start of hour (XX:00:00.000)
    */
   startOfHour(): DateTime {
      return this.setMinute(0).setSecond(0).setMillisecond(0);
   }

   /**
    * Get end of hour (XX:59:59.999)
    */
   endOfHour(): DateTime {
      return this.setMinute(59).setSecond(59).setMillisecond(999);
   }
```

**Step 4: Run tests**

Run: `cd libraries/datetime && bun test src/core/datetime.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add libraries/datetime/src/core/
git commit -m "feat(datetime): add start/end of unit methods

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 9: Add Difference and Duration Methods

**Files:**
- Modify: `libraries/datetime/src/core/datetime.ts`
- Modify: `libraries/datetime/src/core/datetime.test.ts`

**Step 1: Write failing tests**

Add to `datetime.test.ts`:

```typescript
describe("DateTime difference", () => {
   const dt1 = new DateTime("2026-01-30T10:00:00.000Z");
   const dt2 = new DateTime("2026-02-05T14:30:45.500Z");

   test("diff in milliseconds", () => {
      const diff = dt2.diff(dt1, "millisecond");
      expect(diff).toBe(540645500);
   });

   test("diff in seconds", () => {
      const diff = dt2.diff(dt1, "second");
      expect(diff).toBe(540645);
   });

   test("diff in minutes", () => {
      const diff = dt2.diff(dt1, "minute");
      expect(diff).toBe(9010);
   });

   test("diff in hours", () => {
      const diff = dt2.diff(dt1, "hour");
      expect(diff).toBe(150);
   });

   test("diff in days", () => {
      const diff = dt2.diff(dt1, "day");
      expect(diff).toBe(6);
   });

   test("negative diff", () => {
      const diff = dt1.diff(dt2, "day");
      expect(diff).toBe(-6);
   });
});
```

**Step 2: Run tests**

Run: `cd libraries/datetime && bun test src/core/datetime.test.ts`
Expected: FAIL

**Step 3: Implement diff method**

Add to `DateTime` class:

```typescript
   /**
    * Get difference from another datetime
    * @param other - DateTime to compare with
    * @param unit - Unit of measurement
    * @returns Difference as a number
    */
   diff(other: DateTime, unit: TimeUnit = "millisecond"): number {
      const diffMs = this.valueOf() - other.valueOf();

      switch (unit) {
         case "millisecond":
            return diffMs;
         case "second":
            return Math.floor(diffMs / 1000);
         case "minute":
            return Math.floor(diffMs / (1000 * 60));
         case "hour":
            return Math.floor(diffMs / (1000 * 60 * 60));
         case "day":
            return Math.floor(diffMs / (1000 * 60 * 60 * 24));
         case "week":
            return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
         case "month": {
            const years =
               this.year() - other.year();
            const months =
               this.month() - other.month();
            return years * 12 + months;
         }
         case "year":
            return this.year() - other.year();
         default:
            return diffMs;
      }
   }
```

**Step 4: Run tests**

Run: `cd libraries/datetime && bun test src/core/datetime.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add libraries/datetime/src/core/
git commit -m "feat(datetime): add diff method for calculating differences

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 10: Add Factory Function and Update Exports

**Files:**
- Create: `libraries/datetime/src/core/factory.ts`
- Create: `libraries/datetime/src/core/factory.test.ts`
- Modify: `libraries/datetime/src/index.ts`

**Step 1: Write failing tests**

Create `factory.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { datetime } from "./factory.ts";

describe("datetime factory", () => {
   test("creates DateTime without arguments", () => {
      const dt = datetime();
      expect(dt.isValid()).toBe(true);
   });

   test("creates DateTime from string", () => {
      const dt = datetime("2026-01-30T10:00:00.000Z");
      expect(dt.toISO()).toBe("2026-01-30T10:00:00.000Z");
   });

   test("creates DateTime from Date", () => {
      const date = new Date("2026-01-30T10:00:00.000Z");
      const dt = datetime(date);
      expect(dt.toDate()).toEqual(date);
   });

   test("creates DateTime from timestamp", () => {
      const timestamp = 1738234800000;
      const dt = datetime(timestamp);
      expect(dt.valueOf()).toBe(timestamp);
   });

   test("creates DateTime from another DateTime", () => {
      const dt1 = datetime("2026-01-30T10:00:00.000Z");
      const dt2 = datetime(dt1);
      expect(dt2.isSame(dt1)).toBe(true);
   });
});
```

**Step 2: Run tests**

Run: `cd libraries/datetime && bun test src/core/factory.test.ts`
Expected: FAIL

**Step 3: Implement factory function**

Create `factory.ts`:

```typescript
import { DateTime } from "./datetime.ts";
import type { DateInput } from "../types.ts";

/**
 * Factory function to create DateTime instances
 * @param input - Date, ISO string, timestamp, DateTime, or undefined for current time
 * @returns DateTime instance
 */
export function datetime(input?: DateInput): DateTime {
   return new DateTime(input);
}
```

**Step 4: Run tests**

Run: `cd libraries/datetime && bun test src/core/factory.test.ts`
Expected: All tests PASS

**Step 5: Update main exports**

Modify `src/index.ts`:

```typescript
// Core
export { DateTime } from "./core/datetime.ts";
export { datetime } from "./core/factory.ts";

// Types
export type {
   TimeUnit,
   DateInput,
   DateTimePlugin,
   DateTimeConfig,
   FormatOptions,
   ParseOptions,
} from "./types.ts";

// Schemas
export {
   TimeUnitSchema,
   DateInputSchema,
   DateTimeConfigSchema,
   FormatOptionsSchema,
   ParseOptionsSchema,
   PluginSchema,
   ISODateSchema,
   ISODateOnlySchema,
   ISOTimeOnlySchema,
} from "./schemas.ts";

// Errors
export {
   DateTimeError,
   InvalidDateError,
   InvalidFormatError,
   InvalidTimezoneError,
   PluginError,
   MissingPluginError,
} from "./errors.ts";
```

**Step 6: Run all tests**

Run: `cd libraries/datetime && bun test`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add libraries/datetime/src/
git commit -m "feat(datetime): add factory function and update exports

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: Plugin System & Core Plugins

### Task 11: Create Plugin Base Infrastructure

**Files:**
- Create: `libraries/datetime/src/plugins/plugin-base.ts`
- Create: `libraries/datetime/src/plugins/index.ts`

**Step 1: Create plugin base types**

Create `plugin-base.ts`:

```typescript
import type { DateTimePlugin } from "../types.ts";

/**
 * Helper to create a plugin
 */
export function createPlugin(
   name: string,
   install: DateTimePlugin["install"],
): DateTimePlugin {
   return { name, install };
}

/**
 * Base class for plugins (optional, for convenience)
 */
export abstract class BasePlugin implements DateTimePlugin {
   abstract name: string;
   abstract install: DateTimePlugin["install"];
}
```

**Step 2: Create plugin index**

Create `plugins/index.ts`:

```typescript
export { createPlugin } from "./plugin-base.ts";
export type { DateTimePlugin } from "../types.ts";

// Plugins will be exported as they are created
```

**Step 3: Commit**

```bash
git add libraries/datetime/src/plugins/
git commit -m "feat(datetime): add plugin infrastructure

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 12: Implement Timezone Plugin

**Files:**
- Create: `libraries/datetime/src/plugins/timezone/index.ts`
- Create: `libraries/datetime/src/plugins/timezone/timezone.test.ts`
- Create: `libraries/datetime/src/plugins/timezone/types.ts`

**Step 1: Write failing tests**

Create `timezone.test.ts`:

```typescript
import { describe, expect, test, beforeAll } from "bun:test";
import { DateTime } from "../../core/datetime.ts";
import { timezonePlugin } from "./index.ts";

beforeAll(() => {
   DateTime.extend(timezonePlugin);
});

describe("Timezone plugin", () => {
   test("plugin is registered", () => {
      expect(DateTime.hasPlugin("timezone")).toBe(true);
   });

   test("tz() converts to timezone", () => {
      const dt = new DateTime("2026-01-30T10:00:00.000Z");
      const nyTime = dt.tz("America/New_York");
      expect(nyTime).toBeInstanceOf(DateTime);
   });

   test("toTimezone() formats in timezone", () => {
      const dt = new DateTime("2026-01-30T10:00:00.000Z");
      const formatted = dt.toTimezone("America/New_York");
      // EST is UTC-5
      expect(formatted).toContain("05:00:00");
   });

   test("utc() returns UTC datetime", () => {
      const dt = new DateTime("2026-01-30T10:00:00.000Z");
      const utc = dt.utc();
      expect(utc.toISO()).toBe("2026-01-30T10:00:00.000Z");
   });

   test("local() returns local datetime", () => {
      const dt = new DateTime("2026-01-30T10:00:00.000Z");
      const local = dt.local();
      expect(local).toBeInstanceOf(DateTime);
   });
});
```

**Step 2: Run tests**

Run: `cd libraries/datetime && bun test src/plugins/timezone/`
Expected: FAIL - plugin not defined

**Step 3: Create types**

Create `types.ts`:

```typescript
import type { DateTime } from "../../core/datetime.ts";

/**
 * Extended DateTime interface with timezone methods
 */
export interface DateTimeWithTimezone extends DateTime {
   tz(timezone: string): DateTime;
   toTimezone(timezone: string): string;
   utc(): DateTime;
   local(): DateTime;
}
```

**Step 4: Implement timezone plugin**

Create `index.ts`:

```typescript
import { createPlugin } from "../plugin-base.ts";
import { DateTime } from "../../core/datetime.ts";
import { MissingPluginError } from "../../errors.ts";
import type { DateTimeClass } from "../../types.ts";

/**
 * Timezone plugin - adds timezone conversion methods
 */
export const timezonePlugin = createPlugin("timezone", (dt: DateTimeClass) => {
   /**
    * Convert to a specific timezone (returns new DateTime with same instant)
    */
   dt.prototype.tz = function (timezone: string): DateTime {
      // For now, just validate and return a clone
      // Full implementation would adjust the internal date
      try {
         Intl.DateTimeFormat(undefined, { timeZone: timezone });
      } catch {
         throw new Error(`Invalid timezone: ${timezone}`);
      }
      return new DateTime(this.toDate());
   };

   /**
    * Format datetime in a specific timezone
    */
   dt.prototype.toTimezone = function (timezone: string): string {
      try {
         return this.toDate().toLocaleString("en-US", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
         });
      } catch {
         throw new Error(`Invalid timezone: ${timezone}`);
      }
   };

   /**
    * Get UTC datetime
    */
   dt.prototype.utc = function (): DateTime {
      return new DateTime(this.toDate());
   };

   /**
    * Get local datetime
    */
   dt.prototype.local = function (): DateTime {
      return new DateTime(this.toDate());
   };
});

// Augment DateTime type
declare module "../../core/datetime.ts" {
   interface DateTime {
      tz(timezone: string): DateTime;
      toTimezone(timezone: string): string;
      utc(): DateTime;
      local(): DateTime;
   }
}
```

**Step 5: Run tests**

Run: `cd libraries/datetime && bun test src/plugins/timezone/`
Expected: All tests PASS

**Step 6: Update plugin exports**

Modify `src/plugins/index.ts`:

```typescript
export { createPlugin } from "./plugin-base.ts";
export type { DateTimePlugin } from "../types.ts";

// Plugins
export { timezonePlugin } from "./timezone/index.ts";
```

**Step 7: Commit**

```bash
git add libraries/datetime/src/plugins/timezone/
git commit -m "feat(datetime): add timezone plugin

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 13: Implement Business Days Plugin

**Files:**
- Create: `libraries/datetime/src/plugins/business-days/index.ts`
- Create: `libraries/datetime/src/plugins/business-days/business-days.test.ts`
- Create: `libraries/datetime/src/plugins/business-days/types.ts`

**Step 1: Write failing tests**

Create `business-days.test.ts`:

```typescript
import { describe, expect, test, beforeAll } from "bun:test";
import { DateTime } from "../../core/datetime.ts";
import { businessDaysPlugin } from "./index.ts";

beforeAll(() => {
   DateTime.extend(businessDaysPlugin);
});

describe("Business Days plugin", () => {
   test("plugin is registered", () => {
      expect(DateTime.hasPlugin("businessDays")).toBe(true);
   });

   test("isWeekday detects weekdays", () => {
      const friday = new DateTime("2026-01-30T10:00:00.000Z"); // Friday
      const saturday = new DateTime("2026-01-31T10:00:00.000Z"); // Saturday
      const sunday = new DateTime("2026-02-01T10:00:00.000Z"); // Sunday

      expect(friday.isWeekday()).toBe(true);
      expect(saturday.isWeekday()).toBe(false);
      expect(sunday.isWeekday()).toBe(false);
   });

   test("isWeekend detects weekends", () => {
      const friday = new DateTime("2026-01-30T10:00:00.000Z");
      const saturday = new DateTime("2026-01-31T10:00:00.000Z");

      expect(friday.isWeekend()).toBe(false);
      expect(saturday.isWeekend()).toBe(true);
   });

   test("addBusinessDays skips weekends", () => {
      const friday = new DateTime("2026-01-30T10:00:00.000Z");
      const result = friday.addBusinessDays(1);
      // Friday + 1 business day = Monday
      expect(result.toISO()).toBe("2026-02-02T10:00:00.000Z");
   });

   test("addBusinessDays with multiple days", () => {
      const friday = new DateTime("2026-01-30T10:00:00.000Z");
      const result = friday.addBusinessDays(5);
      // Friday + 5 business days = Friday next week
      expect(result.toISO()).toBe("2026-02-06T10:00:00.000Z");
   });

   test("subtractBusinessDays", () => {
      const monday = new DateTime("2026-02-02T10:00:00.000Z");
      const result = monday.subtractBusinessDays(1);
      // Monday - 1 business day = Friday
      expect(result.toISO()).toBe("2026-01-30T10:00:00.000Z");
   });

   test("diffBusinessDays", () => {
      const friday = new DateTime("2026-01-30T10:00:00.000Z");
      const nextFriday = new DateTime("2026-02-06T10:00:00.000Z");
      const diff = nextFriday.diffBusinessDays(friday);
      expect(diff).toBe(5);
   });
});
```

**Step 2: Run tests**

Run: `cd libraries/datetime && bun test src/plugins/business-days/`
Expected: FAIL

**Step 3: Create types**

Create `types.ts`:

```typescript
import type { DateTime } from "../../core/datetime.ts";

export type Holiday = Date | string;

export interface BusinessDaysConfig {
   holidays?: Holiday[];
   workWeek?: number[]; // Days of week that are work days (0-6)
}

export interface DateTimeWithBusinessDays extends DateTime {
   isWeekday(): boolean;
   isWeekend(): boolean;
   addBusinessDays(days: number): DateTime;
   subtractBusinessDays(days: number): DateTime;
   diffBusinessDays(other: DateTime): number;
}
```

**Step 4: Implement business days plugin**

Create `index.ts`:

```typescript
import { createPlugin } from "../plugin-base.ts";
import { DateTime } from "../../core/datetime.ts";
import type { DateTimeClass } from "../../types.ts";

/**
 * Business days plugin - adds business day calculations
 */
export const businessDaysPlugin = createPlugin(
   "businessDays",
   (dt: DateTimeClass) => {
      /**
       * Check if datetime is a weekday (Monday-Friday)
       */
      dt.prototype.isWeekday = function (): boolean {
         const day = this.day();
         return day !== 0 && day !== 6; // Not Sunday or Saturday
      };

      /**
       * Check if datetime is a weekend (Saturday-Sunday)
       */
      dt.prototype.isWeekend = function (): boolean {
         return !this.isWeekday();
      };

      /**
       * Add business days (skips weekends)
       */
      dt.prototype.addBusinessDays = function (days: number): DateTime {
         let result: DateTime = this;
         let remaining = Math.abs(days);
         const direction = days >= 0 ? 1 : -1;

         while (remaining > 0) {
            result = result.addDays(direction);
            if (result.isWeekday()) {
               remaining--;
            }
         }

         return result;
      };

      /**
       * Subtract business days (skips weekends)
       */
      dt.prototype.subtractBusinessDays = function (days: number): DateTime {
         return this.addBusinessDays(-days);
      };

      /**
       * Calculate difference in business days
       */
      dt.prototype.diffBusinessDays = function (other: DateTime): number {
         let count = 0;
         let current = other;
         const isForward = this.isAfter(other);

         if (isForward) {
            while (current.isBefore(this)) {
               current = current.addDays(1);
               if (current.isWeekday() && current.isSameOrBefore(this)) {
                  count++;
               }
            }
         } else {
            while (current.isAfter(this)) {
               current = current.subtractDays(1);
               if (current.isWeekday() && current.isSameOrAfter(this)) {
                  count--;
               }
            }
         }

         return count;
      };
   },
);

// Augment DateTime type
declare module "../../core/datetime.ts" {
   interface DateTime {
      isWeekday(): boolean;
      isWeekend(): boolean;
      addBusinessDays(days: number): DateTime;
      subtractBusinessDays(days: number): DateTime;
      diffBusinessDays(other: DateTime): number;
   }
}
```

**Step 5: Run tests**

Run: `cd libraries/datetime && bun test src/plugins/business-days/`
Expected: All tests PASS

**Step 6: Update plugin exports**

Modify `src/plugins/index.ts`:

```typescript
export { createPlugin } from "./plugin-base.ts";
export type { DateTimePlugin } from "../types.ts";

// Plugins
export { timezonePlugin } from "./timezone/index.ts";
export { businessDaysPlugin } from "./business-days/index.ts";
```

**Step 7: Commit**

```bash
git add libraries/datetime/src/plugins/business-days/
git commit -m "feat(datetime): add business days plugin

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 14: Implement Formatting Plugin

**Files:**
- Create: `libraries/datetime/src/plugins/format/index.ts`
- Create: `libraries/datetime/src/plugins/format/format.test.ts`
- Create: `libraries/datetime/src/plugins/format/tokens.ts`

**Step 1: Write failing tests**

Create `format.test.ts`:

```typescript
import { describe, expect, test, beforeAll } from "bun:test";
import { DateTime } from "../../core/datetime.ts";
import { formatPlugin } from "./index.ts";

beforeAll(() => {
   DateTime.extend(formatPlugin);
});

describe("Format plugin", () => {
   const dt = new DateTime("2026-01-30T10:30:45.123Z");

   test("plugin is registered", () => {
      expect(DateTime.hasPlugin("format")).toBe(true);
   });

   test("format with YYYY-MM-DD", () => {
      expect(dt.format("YYYY-MM-DD")).toBe("2026-01-30");
   });

   test("format with YYYY/MM/DD", () => {
      expect(dt.format("YYYY/MM/DD")).toBe("2026/01/30");
   });

   test("format with full datetime", () => {
      expect(dt.format("YYYY-MM-DD HH:mm:ss")).toBe("2026-01-30 10:30:45");
   });

   test("format with milliseconds", () => {
      expect(dt.format("YYYY-MM-DD HH:mm:ss.SSS")).toBe(
         "2026-01-30 10:30:45.123",
      );
   });

   test("format with 12-hour time", () => {
      const afternoon = new DateTime("2026-01-30T14:30:00.000Z");
      expect(afternoon.format("hh:mm A")).toBe("02:30 PM");
   });

   test("format with month name", () => {
      expect(dt.format("MMMM DD, YYYY")).toBe("January 30, 2026");
   });

   test("format with short month", () => {
      expect(dt.format("MMM DD, YYYY")).toBe("Jan 30, 2026");
   });

   test("format with day of week", () => {
      expect(dt.format("dddd, MMMM DD, YYYY")).toBe("Friday, January 30, 2026");
   });

   test("format with short day", () => {
      expect(dt.format("ddd MMM DD")).toBe("Fri Jan 30");
   });
});
```

**Step 2: Run tests**

Run: `cd libraries/datetime && bun test src/plugins/format/`
Expected: FAIL

**Step 3: Create tokens mapping**

Create `tokens.ts`:

```typescript
import type { DateTime } from "../../core/datetime.ts";

export type FormatToken = {
   regex: RegExp;
   fn: (dt: DateTime) => string;
};

const MONTH_NAMES = [
   "January",
   "February",
   "March",
   "April",
   "May",
   "June",
   "July",
   "August",
   "September",
   "October",
   "November",
   "December",
];

const MONTH_NAMES_SHORT = [
   "Jan",
   "Feb",
   "Mar",
   "Apr",
   "May",
   "Jun",
   "Jul",
   "Aug",
   "Sep",
   "Oct",
   "Nov",
   "Dec",
];

const DAY_NAMES = [
   "Sunday",
   "Monday",
   "Tuesday",
   "Wednesday",
   "Thursday",
   "Friday",
   "Saturday",
];

const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (num: number, length = 2): string =>
   String(num).padStart(length, "0");

/**
 * Format tokens for datetime formatting
 */
export const FORMAT_TOKENS: FormatToken[] = [
   {
      regex: /YYYY/g,
      fn: (dt) => String(dt.year()),
   },
   {
      regex: /YY/g,
      fn: (dt) => String(dt.year()).slice(-2),
   },
   {
      regex: /MMMM/g,
      fn: (dt) => MONTH_NAMES[dt.month()] ?? "",
   },
   {
      regex: /MMM/g,
      fn: (dt) => MONTH_NAMES_SHORT[dt.month()] ?? "",
   },
   {
      regex: /MM/g,
      fn: (dt) => pad(dt.month() + 1),
   },
   {
      regex: /M/g,
      fn: (dt) => String(dt.month() + 1),
   },
   {
      regex: /DD/g,
      fn: (dt) => pad(dt.date()),
   },
   {
      regex: /D/g,
      fn: (dt) => String(dt.date()),
   },
   {
      regex: /dddd/g,
      fn: (dt) => DAY_NAMES[dt.day()] ?? "",
   },
   {
      regex: /ddd/g,
      fn: (dt) => DAY_NAMES_SHORT[dt.day()] ?? "",
   },
   {
      regex: /HH/g,
      fn: (dt) => pad(dt.hour()),
   },
   {
      regex: /H/g,
      fn: (dt) => String(dt.hour()),
   },
   {
      regex: /hh/g,
      fn: (dt) => {
         const h = dt.hour();
         return pad(h === 0 ? 12 : h > 12 ? h - 12 : h);
      },
   },
   {
      regex: /h/g,
      fn: (dt) => {
         const h = dt.hour();
         return String(h === 0 ? 12 : h > 12 ? h - 12 : h);
      },
   },
   {
      regex: /mm/g,
      fn: (dt) => pad(dt.minute()),
   },
   {
      regex: /m/g,
      fn: (dt) => String(dt.minute()),
   },
   {
      regex: /ss/g,
      fn: (dt) => pad(dt.second()),
   },
   {
      regex: /s/g,
      fn: (dt) => String(dt.second()),
   },
   {
      regex: /SSS/g,
      fn: (dt) => pad(dt.millisecond(), 3),
   },
   {
      regex: /A/g,
      fn: (dt) => (dt.hour() >= 12 ? "PM" : "AM"),
   },
   {
      regex: /a/g,
      fn: (dt) => (dt.hour() >= 12 ? "pm" : "am"),
   },
];
```

**Step 4: Implement format plugin**

Create `index.ts`:

```typescript
import { createPlugin } from "../plugin-base.ts";
import { DateTime } from "../../core/datetime.ts";
import type { DateTimeClass } from "../../types.ts";
import { FORMAT_TOKENS } from "./tokens.ts";

/**
 * Format plugin - adds advanced formatting
 */
export const formatPlugin = createPlugin("format", (dt: DateTimeClass) => {
   /**
    * Format datetime with custom format string
    * @param formatStr - Format string (e.g., "YYYY-MM-DD HH:mm:ss")
    */
   dt.prototype.format = function (formatStr: string): string {
      let result = formatStr;

      for (const token of FORMAT_TOKENS) {
         result = result.replace(token.regex, () => token.fn(this));
      }

      return result;
   };
});

// Augment DateTime type
declare module "../../core/datetime.ts" {
   interface DateTime {
      format(formatStr: string): string;
   }
}
```

**Step 5: Run tests**

Run: `cd libraries/datetime && bun test src/plugins/format/`
Expected: All tests PASS

**Step 6: Update plugin exports**

Modify `src/plugins/index.ts`:

```typescript
export { createPlugin } from "./plugin-base.ts";
export type { DateTimePlugin } from "../types.ts";

// Plugins
export { timezonePlugin } from "./timezone/index.ts";
export { businessDaysPlugin } from "./business-days/index.ts";
export { formatPlugin } from "./format/index.ts";
```

**Step 7: Commit**

```bash
git add libraries/datetime/src/plugins/format/
git commit -m "feat(datetime): add format plugin with custom tokens

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 15: Implement Relative Time Plugin

**Files:**
- Create: `libraries/datetime/src/plugins/relative-time/index.ts`
- Create: `libraries/datetime/src/plugins/relative-time/relative-time.test.ts`

**Step 1: Write failing tests**

Create `relative-time.test.ts`:

```typescript
import { describe, expect, test, beforeAll } from "bun:test";
import { DateTime } from "../../core/datetime.ts";
import { relativeTimePlugin } from "./index.ts";

beforeAll(() => {
   DateTime.extend(relativeTimePlugin);
});

describe("Relative Time plugin", () => {
   test("plugin is registered", () => {
      expect(DateTime.hasPlugin("relativeTime")).toBe(true);
   });

   test("fromNow - seconds ago", () => {
      const dt = new DateTime().subtractSeconds(30);
      expect(dt.fromNow()).toBe("30 seconds ago");
   });

   test("fromNow - minutes ago", () => {
      const dt = new DateTime().subtractMinutes(5);
      expect(dt.fromNow()).toBe("5 minutes ago");
   });

   test("fromNow - hours ago", () => {
      const dt = new DateTime().subtractHours(3);
      expect(dt.fromNow()).toBe("3 hours ago");
   });

   test("fromNow - days ago", () => {
      const dt = new DateTime().subtractDays(2);
      expect(dt.fromNow()).toBe("2 days ago");
   });

   test("fromNow - in the future", () => {
      const dt = new DateTime().addHours(2);
      expect(dt.fromNow()).toBe("in 2 hours");
   });

   test("toNow - reverse direction", () => {
      const dt = new DateTime().subtractHours(2);
      expect(dt.toNow()).toBe("in 2 hours");
   });

   test("from - custom reference", () => {
      const dt1 = new DateTime("2026-01-30T10:00:00.000Z");
      const dt2 = new DateTime("2026-01-30T12:00:00.000Z");
      expect(dt2.from(dt1)).toBe("in 2 hours");
   });
});
```

**Step 2: Run tests**

Run: `cd libraries/datetime && bun test src/plugins/relative-time/`
Expected: FAIL

**Step 3: Implement relative time plugin**

Create `index.ts`:

```typescript
import { createPlugin } from "../plugin-base.ts";
import { DateTime } from "../../core/datetime.ts";
import type { DateTimeClass } from "../../types.ts";

const THRESHOLDS = [
   { unit: "year", seconds: 31536000 },
   { unit: "month", seconds: 2592000 },
   { unit: "week", seconds: 604800 },
   { unit: "day", seconds: 86400 },
   { unit: "hour", seconds: 3600 },
   { unit: "minute", seconds: 60 },
   { unit: "second", seconds: 1 },
] as const;

function formatRelative(seconds: number, isPast: boolean): string {
   const absSeconds = Math.abs(seconds);

   for (const { unit, seconds: threshold } of THRESHOLDS) {
      if (absSeconds >= threshold) {
         const value = Math.floor(absSeconds / threshold);
         const plural = value !== 1 ? "s" : "";
         if (isPast) {
            return `${value} ${unit}${plural} ago`;
         }
         return `in ${value} ${unit}${plural}`;
      }
   }

   return "just now";
}

/**
 * Relative time plugin - adds "time ago" formatting
 */
export const relativeTimePlugin = createPlugin(
   "relativeTime",
   (dt: DateTimeClass) => {
      /**
       * Get relative time from now
       */
      dt.prototype.fromNow = function (): string {
         const now = new DateTime();
         const diffSeconds = this.diff(now, "second");
         return formatRelative(diffSeconds, diffSeconds < 0);
      };

      /**
       * Get relative time to now (reverse direction)
       */
      dt.prototype.toNow = function (): string {
         const now = new DateTime();
         const diffSeconds = now.diff(this, "second");
         return formatRelative(diffSeconds, diffSeconds < 0);
      };

      /**
       * Get relative time from another datetime
       */
      dt.prototype.from = function (other: DateTime): string {
         const diffSeconds = this.diff(other, "second");
         return formatRelative(diffSeconds, diffSeconds < 0);
      };

      /**
       * Get relative time to another datetime
       */
      dt.prototype.to = function (other: DateTime): string {
         const diffSeconds = other.diff(this, "second");
         return formatRelative(diffSeconds, diffSeconds < 0);
      };
   },
);

// Augment DateTime type
declare module "../../core/datetime.ts" {
   interface DateTime {
      fromNow(): string;
      toNow(): string;
      from(other: DateTime): string;
      to(other: DateTime): string;
   }
}
```

**Step 4: Run tests**

Run: `cd libraries/datetime && bun test src/plugins/relative-time/`
Expected: All tests PASS

**Step 5: Update plugin exports**

Modify `src/plugins/index.ts`:

```typescript
export { createPlugin } from "./plugin-base.ts";
export type { DateTimePlugin } from "../types.ts";

// Plugins
export { timezonePlugin } from "./timezone/index.ts";
export { businessDaysPlugin } from "./business-days/index.ts";
export { formatPlugin } from "./format/index.ts";
export { relativeTimePlugin } from "./relative-time/index.ts";
```

**Step 6: Commit**

```bash
git add libraries/datetime/src/plugins/relative-time/
git commit -m "feat(datetime): add relative time plugin

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 4: Documentation & Publishing

### Task 16: Write Comprehensive README

**Files:**
- Modify: `libraries/datetime/README.md`

**Step 1: Write comprehensive README**

Replace content in `README.md`:

```markdown
# @f-o-t/datetime

Lightweight datetime library with modern fluent API, Zod-first validation, and plugin architecture.

[![npm version](https://img.shields.io/npm/v/@f-o-t/datetime.svg)](https://www.npmjs.com/package/@f-o-t/datetime)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Modern Fluent API**: Chainable methods with clear naming (`.addDays()`, `.addMonths()`)
- **Zod-First**: Complete validation with exported schemas
- **Immutable**: All operations return new instances
- **Plugin Architecture**: Extend with timezone, business days, formatting, and more
- **TypeScript-First**: Full type safety with strict mode
- **Zero Config**: Sensible defaults, explicit when needed
- **Framework Agnostic**: Works with Bun, Node.js, and browsers

## Installation

```bash
# bun
bun add @f-o-t/datetime

# npm
npm install @f-o-t/datetime

# yarn
yarn add @f-o-t/datetime

# pnpm
pnpm add @f-o-t/datetime
```

## Quick Start

```typescript
import { datetime } from "@f-o-t/datetime";

// Create datetime
const now = datetime();
const specific = datetime("2026-01-30T10:00:00.000Z");

// Arithmetic
const tomorrow = now.addDays(1);
const nextWeek = now.addWeeks(1);
const nextMonth = now.addMonths(1);

// Comparison
if (tomorrow.isAfter(now)) {
   console.log("Tomorrow comes after today!");
}

// Formatting
console.log(now.toISO()); // "2026-01-30T10:00:00.000Z"
```

## Core API

### Creating DateTimes

```typescript
import { datetime, DateTime } from "@f-o-t/datetime";

// Factory function (recommended)
const dt1 = datetime(); // Current time
const dt2 = datetime("2026-01-30T10:00:00.000Z"); // ISO string
const dt3 = datetime(1738234800000); // Timestamp
const dt4 = datetime(new Date()); // Date object

// Class constructor
const dt5 = new DateTime("2026-01-30T10:00:00.000Z");
```

### Arithmetic Operations

```typescript
const dt = datetime("2026-01-30T10:00:00.000Z");

// Add
dt.addMilliseconds(500);
dt.addSeconds(30);
dt.addMinutes(15);
dt.addHours(2);
dt.addDays(5);
dt.addWeeks(2);
dt.addMonths(1);
dt.addYears(1);

// Subtract
dt.subtractDays(5);
dt.subtractMonths(1);
dt.subtractYears(1);
```

### Comparison

```typescript
const dt1 = datetime("2026-01-30T10:00:00.000Z");
const dt2 = datetime("2026-01-30T12:00:00.000Z");

dt1.isBefore(dt2); // true
dt1.isAfter(dt2); // false
dt1.isSame(dt2); // false
dt1.isSameOrBefore(dt2); // true
dt1.isSameOrAfter(dt2); // false
dt1.isBetween(start, end); // boolean
dt1.isBetween(start, end, true); // inclusive
```

### Getters

```typescript
const dt = datetime("2026-01-30T10:30:45.123Z");

dt.year(); // 2026
dt.month(); // 0 (January, 0-indexed)
dt.date(); // 30 (day of month)
dt.day(); // 5 (Friday, 0 = Sunday)
dt.hour(); // 10
dt.minute(); // 30
dt.second(); // 45
dt.millisecond(); // 123
```

### Setters

```typescript
const dt = datetime("2026-01-30T10:00:00.000Z");

dt.setYear(2027);
dt.setMonth(5); // June (0-indexed)
dt.setDate(15);
dt.setHour(14);
dt.setMinute(30);
dt.setSecond(45);
dt.setMillisecond(123);
```

### Start/End of Unit

```typescript
const dt = datetime("2026-01-30T10:30:45.123Z");

dt.startOfDay(); // 2026-01-30T00:00:00.000Z
dt.endOfDay(); // 2026-01-30T23:59:59.999Z
dt.startOfMonth(); // 2026-01-01T00:00:00.000Z
dt.endOfMonth(); // 2026-01-31T23:59:59.999Z
dt.startOfYear(); // 2026-01-01T00:00:00.000Z
dt.endOfYear(); // 2026-12-31T23:59:59.999Z
dt.startOfWeek(); // Sunday 00:00:00
dt.endOfWeek(); // Saturday 23:59:59
dt.startOfHour(); // XX:00:00.000
dt.endOfHour(); // XX:59:59.999
```

### Difference

```typescript
const dt1 = datetime("2026-01-30T10:00:00.000Z");
const dt2 = datetime("2026-02-05T14:30:00.000Z");

dt2.diff(dt1, "millisecond");
dt2.diff(dt1, "second");
dt2.diff(dt1, "minute");
dt2.diff(dt1, "hour");
dt2.diff(dt1, "day");
dt2.diff(dt1, "week");
dt2.diff(dt1, "month");
dt2.diff(dt1, "year");
```

### Output

```typescript
const dt = datetime("2026-01-30T10:00:00.000Z");

dt.toISO(); // "2026-01-30T10:00:00.000Z"
dt.toDate(); // Date object
dt.valueOf(); // 1738234800000 (timestamp)
dt.isValid(); // true
```

## Plugins

### Timezone Plugin

```typescript
import { DateTime } from "@f-o-t/datetime";
import { timezonePlugin } from "@f-o-t/datetime/plugins/timezone";

// Register plugin
DateTime.extend(timezonePlugin);

// Use timezone methods
const dt = datetime("2026-01-30T10:00:00.000Z");
const nyTime = dt.tz("America/New_York");
const formatted = dt.toTimezone("America/New_York");
const utc = dt.utc();
const local = dt.local();
```

### Business Days Plugin

```typescript
import { DateTime } from "@f-o-t/datetime";
import { businessDaysPlugin } from "@f-o-t/datetime/plugins/business-days";

// Register plugin
DateTime.extend(businessDaysPlugin);

// Use business day methods
const dt = datetime("2026-01-30T10:00:00.000Z"); // Friday

dt.isWeekday(); // true
dt.isWeekend(); // false
dt.addBusinessDays(1); // Monday
dt.subtractBusinessDays(1); // Thursday
dt.diffBusinessDays(other); // number
```

### Format Plugin

```typescript
import { DateTime } from "@f-o-t/datetime";
import { formatPlugin } from "@f-o-t/datetime/plugins/format";

// Register plugin
DateTime.extend(formatPlugin);

// Format with custom patterns
const dt = datetime("2026-01-30T10:30:45.123Z");

dt.format("YYYY-MM-DD"); // "2026-01-30"
dt.format("YYYY/MM/DD HH:mm:ss"); // "2026/01/30 10:30:45"
dt.format("MMMM DD, YYYY"); // "January 30, 2026"
dt.format("dddd, MMMM DD"); // "Friday, January 30"
dt.format("hh:mm A"); // "10:30 AM"
```

**Format Tokens:**
- `YYYY` - 4-digit year
- `YY` - 2-digit year
- `MMMM` - Full month name
- `MMM` - Short month name
- `MM` - 2-digit month
- `M` - Month number
- `DD` - 2-digit day
- `D` - Day number
- `dddd` - Full day name
- `ddd` - Short day name
- `HH` - 24-hour (00-23)
- `hh` - 12-hour (01-12)
- `mm` - Minutes
- `ss` - Seconds
- `SSS` - Milliseconds
- `A` - AM/PM
- `a` - am/pm

### Relative Time Plugin

```typescript
import { DateTime } from "@f-o-t/datetime";
import { relativeTimePlugin } from "@f-o-t/datetime/plugins/relative-time";

// Register plugin
DateTime.extend(relativeTimePlugin);

// Relative time strings
const dt = datetime().subtractHours(2);

dt.fromNow(); // "2 hours ago"
dt.toNow(); // "in 2 hours"
dt.from(other); // "2 hours ago" (from other)
dt.to(other); // "in 2 hours" (to other)
```

## Zod Schemas

All schemas are exported for validation:

```typescript
import {
   DateInputSchema,
   TimeUnitSchema,
   DateTimeConfigSchema,
   FormatOptionsSchema,
   ISODateSchema,
   ISODateOnlySchema,
   ISOTimeOnlySchema,
} from "@f-o-t/datetime";

// Validate input
const result = DateInputSchema.safeParse("2026-01-30T10:00:00.000Z");

// Validate time unit
TimeUnitSchema.parse("day"); // ✓

// Validate ISO formats
ISODateSchema.parse("2026-01-30T10:00:00.000Z"); // ✓
ISODateOnlySchema.parse("2026-01-30"); // ✓
ISOTimeOnlySchema.parse("10:30:45"); // ✓
```

## Error Handling

```typescript
import {
   DateTimeError,
   InvalidDateError,
   InvalidFormatError,
   InvalidTimezoneError,
   PluginError,
   MissingPluginError,
} from "@f-o-t/datetime";

try {
   const dt = datetime("invalid");
} catch (error) {
   if (error instanceof InvalidDateError) {
      console.log("Invalid date input");
   }
}

// Check validity
const dt = datetime("invalid");
if (!dt.isValid()) {
   console.log("Invalid datetime");
}
```

## TypeScript

Full TypeScript support with exported types:

```typescript
import type {
   DateTime,
   DateInput,
   TimeUnit,
   DateTimePlugin,
   DateTimeConfig,
   FormatOptions,
} from "@f-o-t/datetime";
```

## Creating Custom Plugins

```typescript
import { createPlugin, DateTime } from "@f-o-t/datetime";

const myPlugin = createPlugin("myPlugin", (dt) => {
   dt.prototype.myMethod = function () {
      // Implementation
      return this;
   };
});

// Register
DateTime.extend(myPlugin);

// Use
const dt = datetime();
dt.myMethod();
```

## Best Practices

1. **Always check validity**
   ```typescript
   const dt = datetime(userInput);
   if (!dt.isValid()) {
      // Handle invalid date
   }
   ```

2. **Use Zod schemas for API validation**
   ```typescript
   import { DateInputSchema } from "@f-o-t/datetime";
   const validated = DateInputSchema.parse(input);
   ```

3. **Leverage immutability**
   ```typescript
   const original = datetime();
   const modified = original.addDays(1);
   // original is unchanged
   ```

4. **Register plugins once at app startup**
   ```typescript
   // app.ts
   import { DateTime } from "@f-o-t/datetime";
   import { timezonePlugin, formatPlugin } from "@f-o-t/datetime/plugins";

   DateTime.extend(timezonePlugin);
   DateTime.extend(formatPlugin);
   ```

## License

MIT - see [LICENSE](../../LICENSE.md)

## Links

- [GitHub Repository](https://github.com/F-O-T/montte-nx)
- [Issue Tracker](https://github.com/F-O-T/montte-nx/issues)
- [NPM Package](https://www.npmjs.com/package/@f-o-t/datetime)
```

**Step 2: Commit**

```bash
git add libraries/datetime/README.md
git commit -m "docs(datetime): write comprehensive README

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 17: Build and Test

**Step 1: Run all tests**

Run: `cd libraries/datetime && bun test`
Expected: All tests PASS

**Step 2: Run typecheck**

Run: `cd libraries/datetime && bun run typecheck`
Expected: No errors

**Step 3: Build library**

Run: `cd libraries/datetime && bun run build`
Expected: Successful build, dist/ folder created

**Step 4: Check exports**

Run: `cd libraries/datetime && bun run build && ls -la dist/`
Expected: See index.js, index.d.ts, and plugins/ folder

**Step 5: Commit**

```bash
git add -A
git commit -m "build(datetime): verify build and tests pass

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Next Steps: PDF Library

The PDF library implementation plan will be created separately as it's significantly larger in scope. The DateTime library establishes the patterns for:

1. Zod-first validation
2. Plugin architecture
3. Immutable operations
4. TypeScript-strict development
5. Comprehensive testing

These patterns will be applied to the PDF library, which will include:

- Phase 1: PDF primitives and object model
- Phase 2: Generation engine (text, graphics, fonts)
- Phase 3: Parsing engine (text extraction, metadata)
- Phase 4: Advanced features (images, forms, annotations)
- Phase 5: Digital signatures (integration with @f-o-t/digital-certificate)
- Phase 6: Encryption and security

Would you like me to create the PDF library implementation plan next?

---

## Summary

This plan provides:
- Complete step-by-step implementation for @f-o-t/datetime
- TDD approach with tests before implementation
- Zod-based validation throughout
- Plugin architecture matching your ecosystem
- Modern fluent API design
- Full TypeScript support
- Comprehensive documentation

Each task is broken into 2-5 minute steps with exact file paths, code, commands, and expected outputs.
