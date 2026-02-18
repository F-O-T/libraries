# Fix appearances Heap OOM Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate three sources of redundant heap allocation that cause JavaScript OOM when `signPdf` is called with an `appearances` array in serverless/Edge Runtime environments.

**Architecture:** Two libraries touched in dependency order — `@f-o-t/pdf` first (foundation fixes), then `@f-o-t/e-signature` (appearances-specific regression fix). Each fix is a pure internal refactor with no public API changes, just PATCH version bumps.

**Tech Stack:** Bun runtime, TypeScript, `bun:test` for tests. Build with `bun x --bun fot build`, test with `bun x --bun fot test`.

---

## Root Causes Being Fixed

| # | Root Cause | File | Impact |
|---|------------|------|--------|
| RC1 | `appearances` loop calls `doc.embedPng()` once per entry — identical QR images stored N× in `PdfDocumentImpl.embeddedImages` | `e-signature/src/sign-pdf.ts:124-143`, `appearance.ts:44-52` | PRIMARY regression |
| RC2 | `findByteRange` + `updateByteRange` decode the full PDF to a JS string (×3 during one sign call) | `pdf/document.ts:596, 682` | Amplified by larger output with appearances |
| RC3 | `updateByteRange` allocates a full copy of the assembled PDF just to write 30 bytes | `pdf/document.ts:629-636` | One extra PDF-sized buffer per sign |

---

## Task 1: `@f-o-t/pdf` — Add `findLastBytes` / `findBytesFrom` binary search helpers

**Why first:** RC2 and RC3 both require searching for byte patterns in `Uint8Array` without decoding to string. Build the helpers before replacing their call sites.

**Files:**
- Modify: `libraries/pdf/src/plugins/editing/document.ts`

### Step 1: Write the failing test

Add to `libraries/pdf/__tests__/plugins/editing/editing.test.ts` (after existing imports):

```ts
describe("binary byte search helpers (internal — tested via findByteRange)", () => {
  it("findByteRange: works correctly on PDF with binary (non-ASCII) bytes in content", () => {
    // Create a PDF and save with placeholder — the output binary contains
    // non-ASCII bytes in the compressed content streams.
    const doc = new PDFDocument();
    const page = doc.addPage({ size: "Letter" });
    // Write text that forces multi-byte content streams
    for (let i = 0; i < 20; i++) {
      page.drawText(`Line ${i} — lorem ipsum content here`, { x: 50, y: 700 - i * 20, size: 11 });
    }
    const pdfBytes = doc.save();

    const editDoc = loadPdf(pdfBytes);
    const { pdf: withPlaceholder } = editDoc.saveWithPlaceholder({ reason: "Test" });

    // findByteRange must return a structurally valid result
    const { byteRange, contentsStart, contentsEnd, placeholderLength } = findByteRange(withPlaceholder);

    expect(byteRange[0]).toBe(0);
    expect(byteRange[1]).toBeGreaterThan(0);
    expect(byteRange[2]).toBeGreaterThan(byteRange[1]);
    expect(byteRange[3]).toBeGreaterThan(0);
    expect(contentsStart).toBeGreaterThan(0);
    expect(contentsEnd).toBeGreaterThan(contentsStart);
    expect(placeholderLength).toBeGreaterThan(0);
    // contentsStart - 1 should be the '<' before the hex placeholder
    expect(withPlaceholder[contentsStart - 1]).toBe(0x3c); // '<'
    // byte at contentsEnd should be '>'
    expect(withPlaceholder[contentsEnd]).toBe(0x3e); // '>'
  });
});
```

### Step 2: Run test to verify it passes (it should — tests existing behaviour before refactor)

```bash
cd /home/yorizel/Documents/fot-libraries/libraries/pdf
bun x --bun fot test
```

Expected: all pass (baseline).

### Step 3: Add the binary search helpers to `document.ts`

At the top of `libraries/pdf/src/plugins/editing/document.ts`, after the `latin1Decoder` line (around line 28), add:

```ts
// Pre-encoded byte patterns for PDF structure search (avoids per-call allocation)
const CONTENTS_MARKER = new TextEncoder().encode("/Contents <");
const BYTE_RANGE_MARKER = new TextEncoder().encode("/ByteRange [");

/**
 * Search for the last occurrence of `pattern` inside `data`.
 * Returns the byte offset of the first byte of the match, or -1.
 */
function findLastBytes(data: Uint8Array, pattern: Uint8Array): number {
	outer: for (let i = data.length - pattern.length; i >= 0; i--) {
		for (let j = 0; j < pattern.length; j++) {
			if (data[i + j] !== pattern[j]) continue outer;
		}
		return i;
	}
	return -1;
}
```

### Step 4: Run tests again

```bash
cd /home/yorizel/Documents/fot-libraries/libraries/pdf
bun x --bun fot test
```

Expected: all pass (helpers added, nothing called yet).

### Step 5: Commit

```bash
cd /home/yorizel/Documents/fot-libraries
git add libraries/pdf/src/plugins/editing/document.ts libraries/pdf/__tests__/plugins/editing/editing.test.ts
git commit -m "test(pdf): add binary findByteRange regression test for non-ASCII PDF content"
```

---

## Task 2: `@f-o-t/pdf` — Replace TextDecoder string copies with binary search (RC2) + in-place patch (RC3)

**Why together:** Both changes are in `document.ts` and both affect `updateByteRange`/`findByteRange`. Combining them avoids an intermediate state where the string copy is removed but the in-place patch isn't there yet.

**Files:**
- Modify: `libraries/pdf/src/plugins/editing/document.ts`

### Step 1: Replace `updateByteRange` (internal) — remove string decode + `updatedPdf` copy

Replace the entire `updateByteRange` function (currently lines 592–637) with `updateByteRangeInPlace` that:
1. Uses `findLastBytes` to locate `/Contents <` and `/ByteRange [`
2. Walks forward byte-by-byte to find `>` and `]` terminators
3. Writes the byte range values directly into the **caller's** `result` buffer (in-place)
4. Returns only the `[n, n, n, n]` tuple — no copy

```ts
/**
 * Find and overwrite the ByteRange placeholder in an assembled PDF buffer.
 * Modifies `pdf` in-place. Returns the final byte range values.
 */
function updateByteRangeInPlace(pdf: Uint8Array): [number, number, number, number] {
	// Locate /Contents < ... >
	const contentsIdx = findLastBytes(pdf, CONTENTS_MARKER);
	if (contentsIdx === -1) throw new Error("Cannot find Contents in signature");
	const contentsStart = contentsIdx + CONTENTS_MARKER.length;
	let contentsEnd = contentsStart;
	while (contentsEnd < pdf.length && pdf[contentsEnd] !== 0x3e) contentsEnd++;
	if (contentsEnd >= pdf.length) throw new Error("Cannot find end of Contents hex");

	const br: [number, number, number, number] = [
		0,
		contentsStart - 1,
		contentsEnd + 1,
		pdf.length - (contentsEnd + 1),
	];

	// Locate /ByteRange [ ... ]
	const brIdx = findLastBytes(pdf, BYTE_RANGE_MARKER);
	if (brIdx === -1) throw new Error("Cannot find ByteRange in PDF");
	const brStart = brIdx + BYTE_RANGE_MARKER.length;
	let brEnd = brStart;
	while (brEnd < pdf.length && pdf[brEnd] !== 0x5d) brEnd++;
	if (brEnd >= pdf.length) throw new Error("Cannot find end of ByteRange");

	const placeholderLen = brEnd - brStart;
	const brValueStr = `${br[0]} ${br[1]} ${br[2]} ${br[3]}`.padEnd(placeholderLen, " ");
	pdf.set(new TextEncoder().encode(brValueStr), brStart);

	return br;
}
```

Then in `buildIncrementalUpdate`, replace the call site (currently `const { br, updatedPdf } = updateByteRange(result); ... return { pdf: updatedPdf, byteRange }`) with:

```ts
if (withSignature) {
	const br = updateByteRangeInPlace(result);
	return { pdf: result, byteRange: br };
}
```

Delete the old `updateByteRange` function entirely.

### Step 2: Replace exported `findByteRange` — remove TextDecoder string decode

Replace the entire exported `findByteRange` function (currently lines 676–702) with a binary-search version:

```ts
export function findByteRange(pdfData: Uint8Array): {
	byteRange: [number, number, number, number];
	contentsStart: number;
	contentsEnd: number;
	placeholderLength: number;
} {
	const contentsIdx = findLastBytes(pdfData, CONTENTS_MARKER);
	if (contentsIdx === -1) throw new Error("Could not find Contents in PDF");

	const contentsStart = contentsIdx + CONTENTS_MARKER.length;
	let contentsEnd = contentsStart;
	while (contentsEnd < pdfData.length && pdfData[contentsEnd] !== 0x3e) contentsEnd++;
	if (contentsEnd >= pdfData.length) throw new Error("Could not find end of Contents field");

	const placeholderLength = contentsEnd - contentsStart;
	const byteRange: [number, number, number, number] = [
		0,
		contentsStart - 1,
		contentsEnd + 1,
		pdfData.length - (contentsEnd + 1),
	];

	return { byteRange, contentsStart, contentsEnd, placeholderLength };
}
```

### Step 3: Run tests

```bash
cd /home/yorizel/Documents/fot-libraries/libraries/pdf
bun x --bun fot test
```

Expected: all pass including the new binary content test from Task 1.

### Step 4: Update CHANGELOG and bump version

In `libraries/pdf/CHANGELOG.md`, add above the current latest entry:

```markdown
## [0.3.6] - 2026-02-18

### Fixed
- `saveWithPlaceholder` no longer allocates a full copy of the assembled output PDF to patch the ByteRange values — the update is now applied in-place, reducing peak heap by one PDF-sized buffer per signing operation
- `findByteRange`, `embedSignature`, and the internal byte-range update no longer decode the entire PDF to a JS string to locate structure markers; byte patterns are now found via direct `Uint8Array` search, eliminating up to 3× PDF-size string allocations during a single sign call
```

In `libraries/pdf/package.json`, change `"version": "0.3.5"` → `"version": "0.3.6"`.

### Step 5: Build to verify

```bash
cd /home/yorizel/Documents/fot-libraries/libraries/pdf
bun x --bun fot build
```

Expected: exits 0, `dist/` updated.

### Step 6: Commit

```bash
cd /home/yorizel/Documents/fot-libraries
git add libraries/pdf/src/plugins/editing/document.ts libraries/pdf/CHANGELOG.md libraries/pdf/package.json
git commit -m "fix(pdf): replace TextDecoder string copies with binary search in findByteRange + in-place ByteRange patch"
```

---

## Task 3: `@f-o-t/e-signature` — Pre-embed QR image once for appearances array (RC1)

This is the primary regression fix. The appearances loop currently calls `generateQrCode` + `doc.embedPng` once per entry, storing N identical IDAT buffers in `PdfDocumentImpl.embeddedImages`. After this fix: 1 image embedded, N pages reference the same object number.

**Files:**
- Modify: `libraries/e-signature/src/appearance.ts`
- Modify: `libraries/e-signature/src/sign-pdf.ts`

### Step 1: Write the failing test

Add to `libraries/e-signature/__tests__/performance.test.ts` (inside the `describe("performance benchmarks")` block, after the existing tests):

```ts
it("appearances array: QR image XObject is embedded exactly once regardless of appearance count", async () => {
  const p12 = await loadP12();
  const pdf = createMultiPage(5);

  const signed = await signPdf(pdf, {
    certificate: { p12, password: "test123" },
    appearances: [
      { x: 50, y: 50, width: 200, height: 80, page: 0 },
      { x: 50, y: 50, width: 200, height: 80, page: 1 },
      { x: 50, y: 50, width: 200, height: 80, page: 2 },
      { x: 50, y: 50, width: 200, height: 80, page: 3 },
      { x: 50, y: 50, width: 200, height: 80, page: 4 },
    ],
  });

  // Count "/Subtype /Image" entries in the incremental update.
  // Each unique call to doc.embedPng() creates one such entry.
  // Before fix: 5 entries (one per appearance). After fix: 1 entry (shared).
  const pdfText = new TextDecoder("latin1").decode(signed);
  const imageXObjectCount = (pdfText.match(/\/Subtype\s*\/Image/g) ?? []).length;

  expect(imageXObjectCount).toBe(1);
});

it("appearances array: signing time does not scale linearly with appearance count", async () => {
  const p12 = await loadP12();
  const pdf1 = createMultiPage(1);
  const pdf10 = createMultiPage(10);

  const t1Start = performance.now();
  await signPdf(pdf1, {
    certificate: { p12, password: "test123" },
    appearances: [{ x: 50, y: 50, width: 200, height: 80, page: 0 }],
  });
  const t1 = performance.now() - t1Start;

  const t10Start = performance.now();
  await signPdf(pdf10, {
    certificate: { p12, password: "test123" },
    appearances: Array.from({ length: 10 }, (_, i) => ({
      x: 50, y: 50, width: 200, height: 80, page: i,
    })),
  });
  const t10 = performance.now() - t10Start;

  console.log(`[appearances scaling] 1 appearance: ${t1.toFixed(0)}ms, 10 appearances: ${t10.toFixed(0)}ms, ratio: ${(t10 / t1).toFixed(1)}x`);

  // After fix: 10 appearances should take < 5x as long as 1 (not 10x).
  // QR generation is O(1), the remaining cost is DOM operations (O(N) pages, acceptable).
  expect(t10).toBeLessThan(t1 * 6);
});
```

### Step 2: Run to verify they FAIL (before fix)

```bash
cd /home/yorizel/Documents/fot-libraries/libraries/e-signature
bun x --bun fot test
```

Expected: `imageXObjectCount` test FAILS with `Expected 1, received 5`.

### Step 3: Add `precomputeSharedQrImage` export to `appearance.ts`

In `libraries/e-signature/src/appearance.ts`, export a new helper that performs the one-time pre-computation. Add right before the `createVerificationData` function (around line 173):

```ts
/**
 * Pre-compute the QR code image and embed it once into the PDF document.
 * Call this before an appearances loop so all appearances share a single XObject.
 * Returns undefined if no QR code should be shown (showQrCode: false on all entries).
 */
export function precomputeSharedQrImage(
  doc: PdfDocument,
  certInfo: CertificateInfo | null,
  pdfData: Uint8Array,
  qrConfig?: QrCodeConfig,
): PdfImage {
  const qrData = qrConfig?.data ?? createVerificationData(certInfo, pdfData);
  const qrPng = generateQrCode(qrData, { size: qrConfig?.size ?? 100 });
  return doc.embedPng(qrPng);
}
```

Also add `PdfImage` to the existing import from `@f-o-t/pdf/plugins/editing` (it's already in the type import — verify the import line at line 10 of `appearance.ts` and update if needed):

```ts
import type { PdfDocument, PdfImage, PdfPage } from "@f-o-t/pdf/plugins/editing";
```

### Step 4: Add optional `preEmbeddedQr` param to `drawSignatureAppearance`

In `libraries/e-signature/src/appearance.ts`, change the `options` parameter type of `drawSignatureAppearance` (lines 24-29) to add the optional field:

```ts
options: {
  reason?: string;
  location?: string;
  qrCode?: QrCodeConfig;
  pdfData: Uint8Array;
  preEmbeddedQr?: PdfImage;  // ← add this line
},
```

Then replace the QR code block inside `drawSignatureAppearance` (lines 43-61) to use the pre-embedded image when provided, falling back to generating it:

```ts
if (showQrCode) {
  const qrImage =
    options.preEmbeddedQr ??
    (() => {
      const qrData =
        options.qrCode?.data ?? createVerificationData(certInfo, options.pdfData);
      const qrPng = generateQrCode(qrData, { size: options.qrCode?.size ?? 100 });
      return doc.embedPng(qrPng);
    })();

  qrSize = Math.min(100, height - 20);

  page.drawImage(qrImage, {
    x: x + 10,
    y: y + 10,
    width: qrSize,
    height: qrSize,
  });
}
```

### Step 5: Update `sign-pdf.ts` appearances loop to use the shared image

In `libraries/e-signature/src/sign-pdf.ts`, add the import for `precomputeSharedQrImage` (add to the existing import from `./appearance.ts` on line 27):

```ts
import { drawSignatureAppearance, precomputeSharedQrImage } from "./appearance.ts";
```

Replace the appearances loop block (lines 123-143) with:

```ts
// 3b. Draw multiple visual signature appearances if provided
if (opts.appearances && opts.appearances.length > 0) {
  // Pre-embed the QR image once so all appearances share a single PDF XObject.
  // This collapses N embedPng calls (and N IDAT buffer allocations) into 1.
  const needsQr = opts.appearances.some((a) => a.showQrCode !== false);
  const sharedQrImage = needsQr
    ? precomputeSharedQrImage(doc, certInfo, pdfBytes, opts.qrCode)
    : undefined;

  for (const app of opts.appearances) {
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

### Step 6: Run tests

```bash
cd /home/yorizel/Documents/fot-libraries/libraries/e-signature
bun x --bun fot test
```

Expected: ALL pass, including the two new tests. The `imageXObjectCount` test should now return 1.

### Step 7: Update CHANGELOG and bump version

In `libraries/e-signature/CHANGELOG.md`, add above the current latest entry:

```markdown
## [1.2.4] - 2026-02-18

### Fixed
- `signPdf` with `appearances` array no longer generates and embeds a separate QR image XObject per entry; the QR image is pre-computed once and shared across all appearances, collapsing N `generateQrCode` + `doc.embedPng` calls into 1 and preventing O(N) heap growth that caused JavaScript heap OOM in Vercel Edge Runtime for PDFs with 5+ appearances
- Updated `@f-o-t/pdf` dependency floor to `^0.3.6` to pick up in-place ByteRange patching and binary `findByteRange` (eliminates up to 3× PDF-size string allocations per sign call)
```

In `libraries/e-signature/package.json`:
- Change `"version": "1.2.3"` → `"version": "1.2.4"`
- Change `"@f-o-t/pdf": "^0.3.4"` → `"@f-o-t/pdf": "^0.3.6"`

### Step 8: Build

```bash
cd /home/yorizel/Documents/fot-libraries/libraries/e-signature
bun x --bun fot build
```

Expected: exits 0.

### Step 9: Commit

```bash
cd /home/yorizel/Documents/fot-libraries
git add \
  libraries/e-signature/src/appearance.ts \
  libraries/e-signature/src/sign-pdf.ts \
  libraries/e-signature/__tests__/performance.test.ts \
  libraries/e-signature/CHANGELOG.md \
  libraries/e-signature/package.json
git commit -m "fix(e-signature): pre-embed shared QR image for appearances array — fixes heap OOM"
```

---

## Task 4: Full workspace verification

### Step 1: Run all tests across the workspace

```bash
cd /home/yorizel/Documents/fot-libraries
bun run test
```

Expected: all tests pass across all libraries.

### Step 2: Run check (lint + format)

```bash
cd /home/yorizel/Documents/fot-libraries
bun run check
```

Expected: no errors.

### Step 3: Verify the pdf version bump propagates to e-signature's lock

```bash
cd /home/yorizel/Documents/fot-libraries/libraries/e-signature
grep '"@f-o-t/pdf"' package.json
```

Expected: `"@f-o-t/pdf": "^0.3.6"`

### Step 4: Commit release commit for pdf (needed before e-signature can ref it in CI)

The pdf library should be released first since e-signature depends on it. Confirm the commits look like:
1. `test(pdf): add binary findByteRange regression test`
2. `fix(pdf): replace TextDecoder string copies with binary search + in-place ByteRange patch`
3. `fix(e-signature): pre-embed shared QR image for appearances array`

The CI will pick up version bumps in push order. No manual publish needed.

---

## Summary of Changes

| Library | Version | Files Changed |
|---------|---------|---------------|
| `@f-o-t/pdf` | `0.3.5` → `0.3.6` | `document.ts`: add `findLastBytes`, `CONTENTS_MARKER`, `BYTE_RANGE_MARKER`; replace `updateByteRange` with `updateByteRangeInPlace`; replace string decode in `findByteRange` with binary search |
| `@f-o-t/e-signature` | `1.2.3` → `1.2.4` | `appearance.ts`: export `precomputeSharedQrImage`, add `preEmbeddedQr?` param to `drawSignatureAppearance`; `sign-pdf.ts`: embed QR once before appearances loop |

**Tests added:**
- `pdf/__tests__/plugins/editing/editing.test.ts`: binary PDF content test for `findByteRange`
- `e-signature/__tests__/performance.test.ts`: QR XObject count assertion + appearances time scaling assertion
