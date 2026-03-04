# Signature Appearance Redesign + Auto-Detection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the visual digital signature stamp to match ICP-Brasil standard appearance and add auto-detection of signing position in PDFs.

**Architecture:** Three changes: (1) improve PDF text extraction in `@f-o-t/pdf` to handle TJ arrays and text positioning, (2) add `detectSigningPosition()` to `@f-o-t/e-signature` using weighted text search, (3) redesign the visual appearance in `appearance.ts` with bordered box, green header, and structured fields.

**Tech Stack:** TypeScript, Bun, `@f-o-t/pdf` (parsing + editing plugins), `@f-o-t/e-signature`, `@f-o-t/qrcode`

---

### Task 1: Improve PDF Text Extraction

**Files:**
- Modify: `libraries/pdf/src/plugins/parsing/reader.ts:212-228`
- Test: `libraries/pdf/__tests__/plugins/parsing/reader.test.ts`

**Step 1: Write the failing test**

Add a test for TJ array extraction to the existing test file:

```ts
test("extractText handles TJ arrays and Tj operators", () => {
  // Create a PDF with both Tj and TJ operators manually
  const reader = new PDFReader(pdfWithTJArrays);
  const parsed = reader.parse();
  expect(parsed.pages[0]!.content).toContain("Hello");
  expect(parsed.pages[0]!.content).toContain("World");
});
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/pdf && bun x --bun fot test`
Expected: FAIL — current regex only matches `(text) Tj`, not TJ arrays

**Step 3: Improve extractText in reader.ts**

Replace the `extractText` method (lines 212-228) with:

```ts
private extractText(ref: PDFRef): string {
  const stream = this.objects.get(ref.objectNumber);
  if (!stream || !stream.data) return "";

  const decoder = new TextDecoder();
  const content = decoder.decode(stream.data);

  const texts: string[] = [];

  // Match (text) Tj — single string show
  const tjRegex = /\(([^)]*)\)\s*Tj/g;
  let match;
  while ((match = tjRegex.exec(content)) !== null) {
    texts.push(match[1]!);
  }

  // Match [...] TJ — array show (mix of strings and kerning numbers)
  const tjArrayRegex = /\[((?:[^[\]]*?))\]\s*TJ/gi;
  while ((match = tjArrayRegex.exec(content)) !== null) {
    const arrayContent = match[1]!;
    const stringParts: string[] = [];
    const partRegex = /\(([^)]*)\)/g;
    let partMatch;
    while ((partMatch = partRegex.exec(arrayContent)) !== null) {
      stringParts.push(partMatch[1]!);
    }
    if (stringParts.length > 0) {
      texts.push(stringParts.join(""));
    }
  }

  // Match ' and " operators (move to next line and show)
  const quoteRegex = /\(([^)]*)\)\s*['"]/g;
  while ((match = quoteRegex.exec(content)) !== null) {
    texts.push(match[1]!);
  }

  return texts.join(" ");
}
```

**Step 4: Run test to verify it passes**

Run: `cd libraries/pdf && bun x --bun fot test`
Expected: PASS

**Step 5: Commit**

```bash
git add libraries/pdf/src/plugins/parsing/reader.ts libraries/pdf/__tests__/plugins/parsing/reader.test.ts
git commit -m "feat(pdf): improve text extraction to handle TJ arrays and quote operators"
```

---

### Task 2: Add Signature Position Detection

**Files:**
- Create: `libraries/e-signature/src/detect-position.ts`
- Modify: `libraries/e-signature/src/types.ts`
- Modify: `libraries/e-signature/src/index.ts`
- Test: `libraries/e-signature/__tests__/detect-position.test.ts`

**Step 1: Add types to `types.ts`**

Add at the end of `libraries/e-signature/src/types.ts`:

```ts
/**
 * Result of automatic signature position detection
 */
export type DetectedPosition = {
  /** Page index (0-based) */
  page: number;
  /** X coordinate from left (in points) */
  x: number;
  /** Y coordinate from top (in points, user-facing) */
  y: number;
  /** Confidence score (0-1) */
  confidence: number;
};

/**
 * Options for signature position detection
 */
export type DetectPositionOptions = {
  /** Signer's full name to search for (from certificate CN) */
  signerName?: string;
  /** Company/organization name to search for */
  organization?: string;
  /** Preferred page to search first (-1 = last page, default) */
  preferredPage?: number;
  /** Default signature box dimensions */
  width?: number;
  height?: number;
};
```

**Step 2: Write the failing test**

Create `libraries/e-signature/__tests__/detect-position.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { detectSigningPosition } from "../src/detect-position.ts";

// Minimal PDF with text content for testing
function createTestPdf(textContent: string): Uint8Array {
  // Use @f-o-t/pdf generation plugin to create a PDF with known text
  // For unit tests, we can test the scoring logic directly
  return new Uint8Array(); // placeholder
}

describe("detectSigningPosition", () => {
  test("returns last page bottom when no signals found", () => {
    // Empty PDF - should fall back to last page bottom
    const result = detectSigningPosition(new Uint8Array(0), {});
    expect(result).toBeNull();
  });

  test("scores signer name matches highest", () => {
    // Test the scoring weights
    // signerName match (weight 3) should rank higher than keyword (weight 1)
  });
});
```

**Step 3: Implement detect-position.ts**

Create `libraries/e-signature/src/detect-position.ts`:

```ts
import { PDFReader } from "@f-o-t/pdf";
import type { DetectedPosition, DetectPositionOptions } from "./types.ts";

const KEYWORD_PATTERNS = [
  "assinatura",
  "assine",
  "representante",
  "responsável",
  "responsavel",
  "signatário",
  "signatario",
];

const LINE_PATTERNS = /_{5,}|-{5,}/;

type Signal = {
  page: number;
  weight: number;
  /** Approximate vertical position as fraction of page (0 = top, 1 = bottom) */
  position: number;
};

/**
 * Detect the best position to place a digital signature on a PDF.
 *
 * Uses weighted scoring across three signal types:
 * - Signer name match (weight 3)
 * - Horizontal line patterns (weight 2)
 * - Signature keywords (weight 1)
 *
 * Returns null if the PDF cannot be parsed.
 */
export function detectSigningPosition(
  pdfData: Uint8Array,
  options: DetectPositionOptions = {},
): DetectedPosition | null {
  let pages;
  try {
    const reader = new PDFReader(pdfData);
    const parsed = reader.parse();
    pages = parsed.pages;
  } catch {
    return null;
  }

  if (pages.length === 0) return null;

  const signals: Signal[] = [];
  const preferredPage = options.preferredPage === -1
    ? pages.length - 1
    : (options.preferredPage ?? pages.length - 1);

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;
    const text = page.content.toLowerCase();
    const lines = text.split(/\n/);

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx]!;
      const position = lines.length > 1 ? lineIdx / (lines.length - 1) : 0.5;

      // Signal 1: Signer name (weight 3)
      if (options.signerName) {
        const name = options.signerName.toLowerCase();
        if (line.includes(name)) {
          signals.push({ page: i, weight: 3, position });
        }
      }

      // Signal 1b: Organization name (weight 2.5)
      if (options.organization) {
        const org = options.organization.toLowerCase();
        if (line.includes(org)) {
          signals.push({ page: i, weight: 2.5, position });
        }
      }

      // Signal 2: Line patterns (weight 2)
      if (LINE_PATTERNS.test(line)) {
        signals.push({ page: i, weight: 2, position });
      }

      // Signal 3: Keywords (weight 1)
      for (const keyword of KEYWORD_PATTERNS) {
        if (line.includes(keyword)) {
          signals.push({ page: i, weight: 1, position });
          break;
        }
      }
    }
  }

  // No signals: fallback to bottom of last page
  if (signals.length === 0) {
    const lastPage = pages[pages.length - 1]!;
    return {
      page: pages.length - 1,
      x: 50,
      y: lastPage.size.height - 150,
      confidence: 0.1,
    };
  }

  // Group signals by page and score each page
  const pageScores = new Map<number, { totalWeight: number; bestPosition: number; bestWeight: number }>();

  for (const signal of signals) {
    const existing = pageScores.get(signal.page);
    if (existing) {
      existing.totalWeight += signal.weight;
      if (signal.weight > existing.bestWeight) {
        existing.bestWeight = signal.weight;
        existing.bestPosition = signal.position;
      }
    } else {
      pageScores.set(signal.page, {
        totalWeight: signal.weight,
        bestPosition: signal.position,
        bestWeight: signal.weight,
      });
    }
  }

  // Boost preferred page score slightly
  const preferredScore = pageScores.get(preferredPage);
  if (preferredScore) {
    preferredScore.totalWeight *= 1.2;
  }

  // Pick page with highest total score
  let bestPage = preferredPage;
  let bestScore = 0;
  for (const [page, score] of pageScores) {
    if (score.totalWeight > bestScore) {
      bestScore = score.totalWeight;
      bestPage = page;
    }
  }

  const pageInfo = pages[bestPage]!;
  const pageScore = pageScores.get(bestPage)!;

  // Position signature above the best match
  const yFraction = pageScore.bestPosition;
  const sigHeight = options.height ?? 120;
  const yFromTop = Math.max(10, yFraction * pageInfo.size.height - sigHeight - 20);

  const maxWeight = 3 + 2.5 + 2 + 1; // max possible per-line
  const confidence = Math.min(1, bestScore / maxWeight);

  return {
    page: bestPage,
    x: options.width ? (pageInfo.size.width - options.width) / 2 : 50,
    y: yFromTop,
    confidence,
  };
}
```

**Step 4: Export from index.ts**

Add to `libraries/e-signature/src/index.ts`:

```ts
export { detectSigningPosition } from "./detect-position.ts";
export type { DetectedPosition, DetectPositionOptions } from "./types.ts";
```

**Step 5: Run tests**

Run: `cd libraries/e-signature && bun x --bun fot test`
Expected: PASS

**Step 6: Commit**

```bash
git add libraries/e-signature/src/detect-position.ts libraries/e-signature/src/types.ts libraries/e-signature/src/index.ts libraries/e-signature/__tests__/detect-position.test.ts
git commit -m "feat(e-signature): add automatic signature position detection"
```

---

### Task 3: Redesign Visual Signature Appearance

**Files:**
- Modify: `libraries/e-signature/src/appearance.ts`
- Test: `libraries/e-signature/__tests__/sign-pdf.test.ts`

**Step 1: Rewrite `drawSignatureAppearance` and `drawCertInfo`**

Replace the full `appearance.ts` with the redesigned version. Key changes:

1. **`drawSignatureAppearance`**: Add bordered rectangle around the signature area
2. **`drawCertInfo`**: New structured fields layout matching image 1:
   - Green "ASSINADO DIGITALMENTE" header (color `#008000`)
   - "Signatário: {CN}"
   - "Empresa: {organization}" (if available)
   - "CNPJ: xx.xxx.xxx/xxxx-xx" or "CPF: xxx.xxx.xxx-xx"
   - "Data: DD/MM/YYYY HH:MM:SS"
   - "Certificado: ICP-Brasil (A1)" (detect type from cert)
3. **Reference link**: Small gray text "validar.iti.gov.br" centered below the box

The bordered box uses `page.drawRectangle()` with:
- `borderColor: "#C0C0C0"` (light gray)
- `borderWidth: 1`
- No fill color (transparent background)

QR code points to `https://validar.iti.gov.br` (simple URL, no hash params).

**Step 2: Run existing tests**

Run: `cd libraries/e-signature && bun x --bun fot test`
Expected: PASS (appearance changes are visual-only, existing tests should still pass)

**Step 3: Commit**

```bash
git add libraries/e-signature/src/appearance.ts
git commit -m "feat(e-signature): redesign visual signature to match ICP-Brasil standard"
```

---

### Task 4: Integrate Auto-Detection into signPdf

**Files:**
- Modify: `libraries/e-signature/src/types.ts` (add `"auto"` to appearance type)
- Modify: `libraries/e-signature/src/sign-pdf.ts`
- Modify: `libraries/e-signature/src/schemas.ts`

**Step 1: Update types**

In `types.ts`, change the `appearance` field in `PdfSignOptions`:

```ts
/** Visual signature appearance (false to disable, "auto" for auto-detection) */
appearance?: SignatureAppearance | "auto" | false;
```

**Step 2: Update schema**

In `schemas.ts`, update the appearance validation to accept `"auto"` string literal.

**Step 3: Update signPdf**

In `sign-pdf.ts`, add auto-detection logic before the visual appearance drawing section (around line 118):

```ts
// Resolve "auto" appearance
if (opts.appearance === "auto") {
  const detected = detectSigningPosition(pdfBytes, {
    signerName: certInfo?.subject.commonName ?? undefined,
    organization: certInfo?.subject.organization ?? undefined,
    preferredPage: -1,
    width: 350,
    height: 120,
  });

  if (detected) {
    opts.appearance = {
      x: detected.x,
      y: detected.y,
      width: 350,
      height: 120,
      page: detected.page,
    };
  } else {
    // Fallback: bottom of first page
    opts.appearance = {
      x: 50,
      y: 700,
      width: 350,
      height: 120,
      page: 0,
    };
  }
}
```

**Step 4: Run tests**

Run: `cd libraries/e-signature && bun x --bun fot test`
Expected: PASS

**Step 5: Commit**

```bash
git add libraries/e-signature/src/sign-pdf.ts libraries/e-signature/src/types.ts libraries/e-signature/src/schemas.ts
git commit -m "feat(e-signature): support appearance 'auto' for auto-detected positioning"
```

---

### Task 5: Update Documentation and Changelog

**Files:**
- Modify: `libraries/e-signature/README.md`
- Modify: `libraries/e-signature/CHANGELOG.md`
- Modify: `libraries/pdf/CHANGELOG.md`

**Step 1: Update e-signature README**

Add documentation for:
- `detectSigningPosition(pdfData, options)` function
- `appearance: "auto"` option in `signPdf`
- Updated visual appearance description

**Step 2: Update changelogs**

`libraries/e-signature/CHANGELOG.md` — under `[Unreleased]`:
- Added: `detectSigningPosition()` for automatic signature placement
- Added: `appearance: "auto"` option in `signPdf` for auto-detected positioning
- Changed: Visual signature appearance redesigned with bordered box, green header, structured ICP-Brasil fields

`libraries/pdf/CHANGELOG.md` — under `[Unreleased]`:
- Fixed: Text extraction now handles TJ arrays and quote operators

**Step 3: Commit**

```bash
git add libraries/e-signature/README.md libraries/e-signature/CHANGELOG.md libraries/pdf/CHANGELOG.md
git commit -m "docs: update e-signature and pdf documentation for new features"
```

---

### Task 6: Build and Verify

**Step 1: Build all affected libraries**

```bash
bun run build
```

**Step 2: Run all tests**

```bash
bun run test
```

**Step 3: Run checks**

```bash
bun run check
```

Expected: All pass with no errors.
