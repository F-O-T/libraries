# countPdfPages + Multi-Page Auto Signing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `countPdfPages()` to `@f-o-t/pdf` and make `appearance: "auto"` in `@f-o-t/e-signature` place signature stamps on ALL pages by default.

**Architecture:** `countPdfPages` is a lightweight standalone function that counts pages without full PDF loading — it reuses the editing plugin's `parsePdfStructure` internal via a thin wrapper. Multi-page auto signing expands the existing `"auto"` branch in `signPdf()` to generate one `SignatureAppearance` per page and feed them through the existing `appearances[]` pipeline.

**Tech Stack:** Bun, `@f-o-t/pdf` editing plugin parser, `@f-o-t/e-signature`

---

### Task 1: Add `countPdfPages()` to `@f-o-t/pdf`

**Files:**
- Create: `libraries/pdf/__tests__/count-pages.test.ts`
- Modify: `libraries/pdf/src/plugins/editing/index.ts`
- Modify: `libraries/pdf/src/index.ts`

**Step 1: Write the failing test**

```ts
// libraries/pdf/__tests__/count-pages.test.ts
import { describe, expect, it } from "bun:test";
import { PDFDocument } from "../src/plugins/generation/document.ts";
import { countPdfPages } from "../src/plugins/editing/index.ts";

function createPdf(pageCount: number): Uint8Array {
  const doc = new PDFDocument();
  for (let i = 0; i < pageCount; i++) {
    doc.addPage({ width: 612, height: 792 });
  }
  return doc.save();
}

describe("countPdfPages", () => {
  it("counts 1 page", () => {
    expect(countPdfPages(createPdf(1))).toBe(1);
  });

  it("counts 3 pages", () => {
    expect(countPdfPages(createPdf(3))).toBe(3);
  });

  it("counts 10 pages", () => {
    expect(countPdfPages(createPdf(10))).toBe(10);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/pdf && bun test __tests__/count-pages.test.ts`
Expected: FAIL — `countPdfPages` is not exported

**Step 3: Implement `countPdfPages`**

In `libraries/pdf/src/plugins/editing/index.ts`, add after the `loadPdf` function:

```ts
import { parsePdfStructure } from "./parser.ts";

/**
 * Count the number of pages in a PDF without fully loading it.
 *
 * @param data - The PDF file contents as a Uint8Array
 * @returns The number of pages in the PDF
 */
export function countPdfPages(data: Uint8Array): number {
  const pdfStr = new TextDecoder("latin1").decode(data);
  const structure = parsePdfStructure(pdfStr);
  return structure.pageNums.length;
}
```

In `libraries/pdf/src/index.ts`, the editing plugin is NOT re-exported at root level (it's at `./plugins/editing`). Add a top-level re-export so `countPdfPages` is available from the main entry point:

```ts
// At end of libraries/pdf/src/index.ts
export { countPdfPages } from "./plugins/editing/index.ts";
```

**Step 4: Run test to verify it passes**

Run: `cd libraries/pdf && bun test __tests__/count-pages.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add libraries/pdf/src/plugins/editing/index.ts libraries/pdf/src/index.ts libraries/pdf/__tests__/count-pages.test.ts
git commit -m "feat(pdf): add countPdfPages() for lightweight page counting"
```

---

### Task 2: Update `signPdf()` for multi-page auto signing

**Files:**
- Modify: `libraries/e-signature/src/sign-pdf.ts`

**Step 1: Modify the `"auto"` branch in `signPdf()`**

In `libraries/e-signature/src/sign-pdf.ts`, replace the block at lines 118–151 (the `if (opts.appearance === "auto")` section) with logic that generates one appearance per page:

```ts
   // Resolve "auto" appearance — stamp on ALL pages
   let resolvedAppearance: Exclude<typeof opts.appearance, "auto"> | undefined;
   let autoAppearances: SignatureAppearance[] | undefined;

   if (opts.appearance === "auto") {
      const width = 350;
      const height = 120;

      // Try to detect best position on a representative page
      const detected = detectSigningPosition(pdfBytes, {
         signerName: certInfo?.subject.commonName ?? undefined,
         organization: certInfo?.subject.organization ?? undefined,
         preferredPage: -1,
         width,
         height,
      });

      const baseX = detected?.x ?? 50;
      const baseY = detected?.y ?? 700;

      // Generate one appearance per page
      autoAppearances = [];
      for (let i = 0; i < doc.pageCount; i++) {
         autoAppearances.push({
            x: baseX,
            y: baseY,
            width,
            height,
            page: i,
         });
      }

      // Clear single appearance — we use appearances[] instead
      resolvedAppearance = false;
   } else {
      resolvedAppearance = opts.appearance === false ? false : opts.appearance;
   }
```

Then update the `appearances` rendering block (lines 173–203) to merge `autoAppearances` with any user-provided `opts.appearances`:

```ts
   // 3b. Draw multiple visual signature appearances
   const allAppearances = [
      ...(autoAppearances ?? []),
      ...(opts.appearances ?? []),
   ];

   if (allAppearances.length > 0) {
      const needsQr = allAppearances.some((a) => a.showQrCode !== false);
      const sharedQrImage = needsQr
         ? precomputeSharedQrImage(doc, certInfo, pdfBytes, opts.qrCode)
         : undefined;

      for (const app of allAppearances) {
         const pageIndex = app.page ?? 0;

         if (pageIndex < 0 || pageIndex >= doc.pageCount) {
            throw new PdfSignError(
               `Invalid page index ${pageIndex} in appearances. PDF has ${doc.pageCount} pages.`,
            );
         }

         const page = doc.getPage(pageIndex);

         drawSignatureAppearance(doc, page, app, certInfo, {
            reason: opts.reason,
            location: opts.location,
            qrCode: opts.qrCode,
            pdfData: pdfBytes,
            preEmbeddedQr: sharedQrImage,
         });
      }
   }
```

**Step 2: Run existing tests**

Run: `cd libraries/e-signature && bun test __tests__/sign-pdf.test.ts`
Expected: PASS (existing tests should still pass since they don't use `"auto"`)

**Step 3: Commit**

```bash
git add libraries/e-signature/src/sign-pdf.ts
git commit -m "feat(e-signature): auto appearance now stamps all pages"
```

---

### Task 3: Add test for multi-page auto signing

**Files:**
- Modify: `libraries/e-signature/__tests__/sign-pdf.test.ts`

**Step 1: Add multi-page auto signing test**

Add to the existing `describe("signPdf")` block:

```ts
it("appearance auto stamps every page of a multi-page PDF", async () => {
   const doc = new PDFDocument();
   doc.addPage({ width: 612, height: 792 });
   doc.addPage({ width: 612, height: 792 });
   doc.addPage({ width: 612, height: 792 });
   const pdf = doc.save();
   const p12 = await loadP12();

   const signed = await signPdf(pdf, {
      certificate: { p12, password: "test123" },
      appearance: "auto",
   });

   // Verify signed PDF is larger than original (appearances were drawn)
   expect(signed.length).toBeGreaterThan(pdf.length);

   // Load the signed PDF and verify all 3 pages were modified
   // (each page dict should have our font resource /F1)
   const text = new TextDecoder("latin1").decode(signed);
   const f1Matches = text.match(/\/F1\s+\d+\s+\d+\s+R/g);
   // At least 3 /F1 refs — one per page that got a signature appearance
   expect(f1Matches!.length).toBeGreaterThanOrEqual(3);
});
```

**Step 2: Run the test**

Run: `cd libraries/e-signature && bun test __tests__/sign-pdf.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add libraries/e-signature/__tests__/sign-pdf.test.ts
git commit -m "test(e-signature): add multi-page auto signing test"
```

---

### Task 4: Version bumps, CHANGELOG, README updates

**Files:**
- Modify: `libraries/pdf/package.json` — bump `0.3.10` → `0.4.0` (new feature)
- Modify: `libraries/pdf/CHANGELOG.md` — add `[0.4.0]` section
- Modify: `libraries/pdf/README.md` — document `countPdfPages()`
- Modify: `libraries/e-signature/package.json` — bump dep `@f-o-t/pdf` to `^0.4.0`, bump version `1.3.1` → `1.4.0`
- Modify: `libraries/e-signature/CHANGELOG.md` — add `[1.4.0]` section
- Modify: `libraries/e-signature/README.md` — document multi-page auto behavior

**Step 1: Update `@f-o-t/pdf`**

`libraries/pdf/CHANGELOG.md` — prepend:
```markdown
## [0.4.0] - 2026-03-04

### Added
- `countPdfPages(data)` — lightweight page count without full PDF loading, exported from both main entry and `plugins/editing`
```

`libraries/pdf/package.json` — change `"version": "0.3.10"` to `"version": "0.4.0"`

**Step 2: Update `@f-o-t/e-signature`**

`libraries/e-signature/CHANGELOG.md` — prepend:
```markdown
## [1.4.0] - 2026-03-04

### Changed
- `appearance: "auto"` now places a signature stamp on every page of the PDF (previously only placed on one page)
- Bump `@f-o-t/pdf` dependency to `^0.4.0`
```

`libraries/e-signature/package.json`:
- Change `"version": "1.3.1"` to `"version": "1.4.0"`
- Change `"@f-o-t/pdf": "^0.3.10"` to `"@f-o-t/pdf": "^0.4.0"`

**Step 3: Update READMEs** (add relevant sections documenting the new APIs)

**Step 4: Run full build + test**

```bash
cd /home/yorizel/Documents/fot-libraries
bun run build && bun run test
```

**Step 5: Commit**

```bash
git add libraries/pdf/package.json libraries/pdf/CHANGELOG.md libraries/pdf/README.md \
       libraries/e-signature/package.json libraries/e-signature/CHANGELOG.md libraries/e-signature/README.md
git commit -m "chore: release @f-o-t/pdf@0.4.0 and @f-o-t/e-signature@1.4.0"
```
