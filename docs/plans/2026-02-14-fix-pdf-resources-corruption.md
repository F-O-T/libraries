# Fix PDF Resources Corruption Bug

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix visual signature appearance corrupting page fonts by merging (not replacing) existing Resources when adding signature content.

**Architecture:** Add resource merging utilities to parser.ts, then update document.ts to resolve indirect Resources references and merge them with signature resources instead of replacing.

**Tech Stack:** TypeScript, Bun test framework, @f-o-t/pdf editing plugin

---

## Task 1: Add Resource Dictionary Parsing Utility

**Files:**
- Modify: `libraries/pdf/src/plugins/editing/parser.ts` (add new function after line 240)
- Test: `libraries/pdf/__tests__/plugins/editing/parser.test.ts`

**Step 1: Write failing test for parsing Resources dictionary**

Add to parser.test.ts:

```typescript
describe("parseResourcesDict", () => {
  test("extracts inline Resources dictionary", () => {
    const dictContent = `
      /Type /Page
      /Resources << /Font << /F1 10 0 R /F2 11 0 R >> /ProcSet [/PDF /Text] >>
    `;

    const result = parseResourcesDict(dictContent, new Uint8Array());

    expect(result).toEqual({
      "/Font": "<< /F1 10 0 R /F2 11 0 R >>",
      "/ProcSet": "[/PDF /Text]",
    });
  });

  test("resolves indirect Resources reference", () => {
    // Create a simple PDF with Resources as indirect object
    const pdfContent = `7 0 obj
<< /Font << /F1 10 0 R /F2 11 0 R >> /ProcSet [/PDF /Text] >>
endobj`;

    const dictContent = "/Type /Page /Resources 7 0 R";
    const pdfData = new TextEncoder().encode(pdfContent);

    const result = parseResourcesDict(dictContent, pdfData);

    expect(result).toEqual({
      "/Font": "<< /F1 10 0 R /F2 11 0 R >>",
      "/ProcSet": "[/PDF /Text]",
    });
  });

  test("returns empty object when no Resources present", () => {
    const dictContent = "/Type /Page /MediaBox [0 0 612 792]";

    const result = parseResourcesDict(dictContent, new Uint8Array());

    expect(result).toEqual({});
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/pdf && bun test parser.test.ts`
Expected: FAIL with "parseResourcesDict is not defined"

**Step 3: Implement parseResourcesDict function**

Add to parser.ts after line 240:

```typescript
/**
 * Parse a Resources dictionary from page content, handling both inline
 * dictionaries and indirect references.
 *
 * Returns a map of resource type names to their dictionary/array content strings.
 * Example: { "/Font": "<< /F1 10 0 R >>", "/ProcSet": "[/PDF /Text]" }
 */
export function parseResourcesDict(
	pageContent: string,
	pdfData: Uint8Array,
): Record<string, string> {
	const result: Record<string, string> = {};

	// Check for inline Resources dictionary
	const inlineMatch = pageContent.match(/\/Resources\s*<</)
	if (inlineMatch) {
		const resIdx = pageContent.indexOf("/Resources");
		const resStart = pageContent.indexOf("<<", resIdx);
		const resEnd = findMatchingDictEnd(pageContent, resStart);

		if (resEnd === -1) {
			throw new Error("Cannot find end of Resources dictionary");
		}

		const resContent = pageContent.slice(resStart + 2, resEnd);
		return parseResourceEntries(resContent);
	}

	// Check for indirect Resources reference
	const refMatch = pageContent.match(/\/Resources\s+(\d+)\s+\d+\s+R/);
	if (refMatch) {
		const objNum = parseInt(refMatch[1]!, 10);
		const objContent = extractObjectDictContent(pdfData, objNum);
		return parseResourceEntries(objContent);
	}

	// No Resources found
	return result;
}

/**
 * Parse individual resource entries from a Resources dictionary content string.
 *
 * Extracts top-level entries like /Font, /XObject, /ExtGState, etc.
 */
function parseResourceEntries(content: string): Record<string, string> {
	const result: Record<string, string> = {};

	// Resource entry names to extract
	const resourceTypes = [
		"/Font",
		"/XObject",
		"/ExtGState",
		"/ColorSpace",
		"/Pattern",
		"/Shading",
		"/ProcSet",
	];

	for (const resType of resourceTypes) {
		const idx = content.indexOf(resType);
		if (idx === -1) continue;

		// Find the value (either << dict >> or [ array ])
		let valueStart = idx + resType.length;
		while (valueStart < content.length && /\s/.test(content[valueStart]!)) {
			valueStart++;
		}

		if (content[valueStart] === "<" && content[valueStart + 1] === "<") {
			// Dictionary value
			const dictEnd = findMatchingDictEnd(content, valueStart);
			if (dictEnd !== -1) {
				result[resType] = content.slice(valueStart, dictEnd + 2);
			}
		} else if (content[valueStart] === "[") {
			// Array value
			const arrayEnd = content.indexOf("]", valueStart);
			if (arrayEnd !== -1) {
				result[resType] = content.slice(valueStart, arrayEnd + 1);
			}
		}
	}

	return result;
}
```

**Step 4: Run test to verify it passes**

Run: `cd libraries/pdf && bun test parser.test.ts`
Expected: PASS (all parseResourcesDict tests pass)

**Step 5: Commit**

```bash
git add libraries/pdf/src/plugins/editing/parser.ts libraries/pdf/__tests__/plugins/editing/parser.test.ts
git commit -m "feat(pdf): add parseResourcesDict to handle inline and indirect Resources

- Parses inline Resources dictionaries
- Resolves indirect Resources object references
- Extracts individual resource type entries (/Font, /XObject, etc.)
- Returns structured map for merging"
```

---

## Task 2: Add Resource Merging Utility

**Files:**
- Modify: `libraries/pdf/src/plugins/editing/parser.ts` (add new function after parseResourcesDict)
- Test: `libraries/pdf/__tests__/plugins/editing/parser.test.ts`

**Step 1: Write failing test for merging Resources**

Add to parser.test.ts:

```typescript
describe("mergeResourcesDicts", () => {
  test("merges Font entries from both dictionaries", () => {
    const existing = {
      "/Font": "<< /F1 10 0 R /F2 11 0 R >>",
      "/ProcSet": "[/PDF /Text]",
    };

    const additions = {
      "/Font": "<< /SigF1 20 0 R >>",
      "/XObject": "<< /Im1 21 0 R >>",
    };

    const result = mergeResourcesDicts(existing, additions);

    expect(result["/Font"]).toContain("/F1 10 0 R");
    expect(result["/Font"]).toContain("/F2 11 0 R");
    expect(result["/Font"]).toContain("/SigF1 20 0 R");
    expect(result["/XObject"]).toBe("<< /Im1 21 0 R >>");
    expect(result["/ProcSet"]).toBe("[/PDF /Text]");
  });

  test("handles empty existing Resources", () => {
    const existing = {};
    const additions = {
      "/Font": "<< /F1 20 0 R >>",
    };

    const result = mergeResourcesDicts(existing, additions);

    expect(result["/Font"]).toBe("<< /F1 20 0 R >>");
  });

  test("preserves existing resources when no additions", () => {
    const existing = {
      "/Font": "<< /F1 10 0 R >>",
      "/ExtGState": "<< /Gs1 9 0 R >>",
    };
    const additions = {};

    const result = mergeResourcesDicts(existing, additions);

    expect(result).toEqual(existing);
  });

  test("merges ExtGState and ColorSpace entries", () => {
    const existing = {
      "/ExtGState": "<< /Gs1 9 0 R >>",
      "/ColorSpace": "<< /Cs1 8 0 R >>",
    };

    const additions = {
      "/ExtGState": "<< /Gs2 19 0 R >>",
    };

    const result = mergeResourcesDicts(existing, additions);

    expect(result["/ExtGState"]).toContain("/Gs1 9 0 R");
    expect(result["/ExtGState"]).toContain("/Gs2 19 0 R");
    expect(result["/ColorSpace"]).toBe("<< /Cs1 8 0 R >>");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd libraries/pdf && bun test parser.test.ts`
Expected: FAIL with "mergeResourcesDicts is not defined"

**Step 3: Implement mergeResourcesDicts function**

Add to parser.ts after parseResourcesDict:

```typescript
/**
 * Merge two Resources dictionaries, combining entries from both.
 *
 * For dictionary-type entries like /Font, /XObject, extracts individual
 * name-reference pairs and combines them. For array-type entries like
 * /ProcSet, uses the existing value (no merge needed).
 *
 * @param existing - Parsed Resources from original page
 * @param additions - New Resources to add (from signature appearance)
 * @returns Merged Resources dictionary entries
 */
export function mergeResourcesDicts(
	existing: Record<string, string>,
	additions: Record<string, string>,
): Record<string, string> {
	const result = { ...existing };

	for (const [resType, addValue] of Object.entries(additions)) {
		if (!result[resType]) {
			// No existing entry for this type, just add it
			result[resType] = addValue;
			continue;
		}

		const existingValue = result[resType]!;

		// Arrays (like /ProcSet) - keep existing, don't merge
		if (existingValue.startsWith("[")) {
			continue;
		}

		// Dictionaries - merge entries
		if (existingValue.startsWith("<<")) {
			result[resType] = mergeDictEntries(existingValue, addValue);
		}
	}

	return result;
}

/**
 * Merge two PDF dictionary strings by combining their name-reference pairs.
 *
 * Example:
 *   existing: "<< /F1 10 0 R /F2 11 0 R >>"
 *   additions: "<< /SigF1 20 0 R >>"
 *   result: "<< /F1 10 0 R /F2 11 0 R /SigF1 20 0 R >>"
 */
function mergeDictEntries(existing: string, additions: string): string {
	// Extract entries from both dictionaries
	const existingEntries = extractDictEntries(existing);
	const additionEntries = extractDictEntries(additions);

	// Combine (additions override existing if same key)
	const merged = { ...existingEntries, ...additionEntries };

	// Rebuild dictionary string
	const entries = Object.entries(merged)
		.map(([name, ref]) => `${name} ${ref}`)
		.join(" ");

	return `<< ${entries} >>`;
}

/**
 * Extract name-reference pairs from a PDF dictionary string.
 *
 * Example: "<< /F1 10 0 R /F2 11 0 R >>"
 * Returns: { "/F1": "10 0 R", "/F2": "11 0 R" }
 */
function extractDictEntries(dict: string): Record<string, string> {
	const entries: Record<string, string> = {};

	// Remove outer << >>
	const inner = dict.replace(/^<<\s*/, "").replace(/\s*>>$/, "");

	// Match /Name objNum gen R patterns
	const regex = /(\/\w+)\s+(\d+\s+\d+\s+R)/g;
	let match: RegExpExecArray | null;

	while ((match = regex.exec(inner)) !== null) {
		entries[match[1]!] = match[2]!;
	}

	return entries;
}
```

**Step 4: Run test to verify it passes**

Run: `cd libraries/pdf && bun test parser.test.ts`
Expected: PASS (all mergeResourcesDicts tests pass)

**Step 5: Commit**

```bash
git add libraries/pdf/src/plugins/editing/parser.ts libraries/pdf/__tests__/plugins/editing/parser.test.ts
git commit -m "feat(pdf): add mergeResourcesDicts to combine Resources entries

- Merges dictionary entries (/Font, /XObject, /ExtGState)
- Preserves array entries (/ProcSet)
- Handles missing entries gracefully
- Supports combining multiple resource types"
```

---

## Task 3: Update document.ts to Use Resource Merging

**Files:**
- Modify: `libraries/pdf/src/plugins/editing/document.ts:273-302`

**Step 1: Import new parser utilities**

At top of document.ts, update the import from parser:

```typescript
import {
	parsePdfStructure,
	getMediaBox,
	extractObjectDictContent,
	parseResourcesDict,
	mergeResourcesDicts,
} from "./parser.ts";
```

**Step 2: Replace resource handling logic**

Replace lines 259-302 in document.ts with:

```typescript
			// Build signature's new resources
			const newResourceParts: string[] = [];
			newResourceParts.push(`/Font << /F1 ${this.fontObjNum} 0 R >>`);

			// Image resources
			const imageRefs = page.dirty ? (page as PdfPageImpl).getImageRefs() : new Map<string, number>();
			if (imageRefs.size > 0) {
				const xobjEntries = Array.from(imageRefs.entries())
					.map(([name, objNum]) => `/${name} ${objNum} 0 R`)
					.join(" ");
				newResourceParts.push(`/XObject << ${xobjEntries} >>`);
			}

			const newResources: Record<string, string> = {};
			for (const part of newResourceParts) {
				const [resType, ...rest] = part.split(/\s+/);
				if (resType) {
					newResources[resType] = rest.join(" ");
				}
			}

			// Parse existing Resources from page
			const existingResources = parseResourcesDict(pageContent, this.originalData);

			// Merge existing with new
			const mergedResources = mergeResourcesDicts(existingResources, newResources);

			// Build merged Resources dictionary string
			const resourceEntries = Object.entries(mergedResources)
				.map(([name, value]) => `${name} ${value}`)
				.join("\n");

			// Update page content with merged Resources
			if (pageContent.match(/\/Resources\s*<</)) {
				// Replace existing inline Resources
				const resIdx = pageContent.indexOf("/Resources");
				const resStart = pageContent.indexOf("<<", resIdx);
				if (resStart !== -1) {
					const resEnd = findMatchingDictEndInContent(pageContent, resStart);
					if (resEnd !== -1) {
						pageContent =
							pageContent.slice(0, resStart) +
							`<< ${resourceEntries} >>` +
							pageContent.slice(resEnd + 2);
					}
				}
			} else if (pageContent.match(/\/Resources\s+\d+\s+\d+\s+R/)) {
				// Replace indirect reference with merged inline dictionary
				pageContent = pageContent.replace(
					/\/Resources\s+\d+\s+\d+\s+R/,
					`/Resources << ${resourceEntries} >>`,
				);
			} else {
				// No resources at all — add them
				pageContent += `\n/Resources << ${resourceEntries} >>`;
			}
```

**Step 3: Run existing tests**

Run: `cd libraries/pdf && bun test`
Expected: All existing tests still pass

**Step 4: Commit**

```bash
git add libraries/pdf/src/plugins/editing/document.ts
git commit -m "fix(pdf): merge Resources instead of replacing when adding signature

- Parse existing Resources (inline or indirect reference)
- Merge with signature resources preserving all original fonts
- Fixes corruption of PDFs from @react-pdf/renderer with CIDFont fonts
- Resolves issue where visual signature destroyed document fonts"
```

---

## Task 4: Add Integration Test with react-pdf-like PDF

**Files:**
- Create: `libraries/pdf/__tests__/plugins/editing/resources-merge.test.ts`

**Step 1: Write integration test**

Create resources-merge.test.ts:

```typescript
/**
 * Integration test for Resources merging when adding visual signature
 *
 * Tests the fix for: visual appearance overwrites page Resources,
 * corrupting PDF fonts (especially CIDFont from react-pdf/renderer)
 */
import { describe, test, expect } from "bun:test";
import { loadPdf } from "../../../src/plugins/editing/index.ts";

describe("Resources merging with visual signature", () => {
	test("preserves original fonts when Resources is indirect reference", () => {
		// Minimal PDF with Resources as indirect object (like react-pdf generates)
		const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources 5 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F2 12 Tf
50 800 Td
(Hello World) Tj
ET
endstream
endobj
5 0 obj
<< /Font << /F1 6 0 R /F2 7 0 R /F5 8 0 R >> /ProcSet [/PDF /Text] /ExtGState << /Gs1 9 0 R >> >>
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
7 0 obj
<< /Type /Font /Subtype /Type0 /BaseFont /AAAAAA+Sora-Medium /Encoding /Identity-H /DescendantFonts [10 0 R] >>
endobj
8 0 obj
<< /Type /Font /Subtype /Type0 /BaseFont /AAAAAB+Sora-Bold /Encoding /Identity-H /DescendantFonts [11 0 R] >>
endobj
9 0 obj
<< /Type /ExtGState /ca 1 >>
endobj
10 0 obj
<< /Type /Font /Subtype /CIDFontType2 /BaseFont /AAAAAA+Sora-Medium /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> >>
endobj
11 0 obj
<< /Type /Font /Subtype /CIDFontType2 /BaseFont /AAAAAB+Sora-Bold /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> >>
endobj
xref
0 12
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000229 00000 n
0000000321 00000 n
0000000445 00000 n
0000000523 00000 n
0000000646 00000 n
0000000766 00000 n
0000000817 00000 n
0000000962 00000 n
trailer
<< /Size 12 /Root 1 0 R >>
startxref
1104
%%EOF`;

		const pdfBytes = new TextEncoder().encode(pdfContent);

		// Load PDF and add visual signature
		const doc = loadPdf(pdfBytes);
		const page = doc.getPage(0);

		// Draw signature text (uses Helvetica)
		page.drawText("SIGNED", { x: 50, y: 50, size: 10 });

		// Save and verify Resources were merged
		const savedPdf = doc.save();
		const savedStr = new TextDecoder("latin1").decode(savedPdf);

		// Find updated page 3 object in incremental update
		const page3Match = savedStr.match(/3 0 obj\s*<<([^]*?)>>\s*endobj/);
		expect(page3Match).toBeDefined();

		const pageDict = page3Match![1]!;

		// Should have Resources inline now (not reference)
		expect(pageDict).toContain("/Resources <<");

		// Extract Resources content
		const resStart = pageDict.indexOf("/Resources <<") + "/Resources ".length;
		const resEnd = pageDict.indexOf(">>", resStart);
		const resourcesContent = pageDict.slice(resStart, resEnd + 2);

		// Should contain ALL original fonts plus signature font
		expect(resourcesContent).toContain("/F1"); // Original Helvetica
		expect(resourcesContent).toContain("/F2"); // Original Sora-Medium
		expect(resourcesContent).toContain("/F5"); // Original Sora-Bold

		// Should preserve other resource types
		expect(resourcesContent).toContain("/ProcSet");
		expect(resourcesContent).toContain("/ExtGState");
	});

	test("preserves fonts when Resources is inline dictionary", () => {
		// PDF with inline Resources dictionary
		const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 595 842]
/Contents 4 0 R
/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >>
>>
endobj
4 0 obj
<< /Length 20 >>
stream
BT /F2 12 Tf ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>
endobj
xref
0 7
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000284 00000 n
0000000352 00000 n
0000000430 00000 n
trailer
<< /Size 7 /Root 1 0 R >>
startxref
510
%%EOF`;

		const pdfBytes = new TextEncoder().encode(pdfContent);
		const doc = loadPdf(pdfBytes);
		const page = doc.getPage(0);

		page.drawText("SIGNED", { x: 50, y: 50, size: 10 });

		const savedPdf = doc.save();
		const savedStr = new TextDecoder("latin1").decode(savedPdf);

		// Verify both original fonts preserved
		const page3Match = savedStr.match(/3 0 obj\s*<<([^]*?)>>\s*endobj/);
		const resourcesContent = page3Match![1]!;

		expect(resourcesContent).toContain("/F1");
		expect(resourcesContent).toContain("/F2");
	});
});
```

**Step 2: Run test to verify it passes**

Run: `cd libraries/pdf && bun test resources-merge.test.ts`
Expected: PASS (both integration tests pass)

**Step 3: Commit**

```bash
git add libraries/pdf/__tests__/plugins/editing/resources-merge.test.ts
git commit -m "test(pdf): add integration tests for Resources merging

- Test indirect Resources reference preservation
- Test inline Resources dictionary preservation
- Verify original fonts (F1, F2, F5) survive signature
- Verify ProcSet and ExtGState preserved
- Covers react-pdf/renderer PDF structure"
```

---

## Task 5: Update e-signature README

**Files:**
- Modify: `libraries/e-signature/README.md`

**Step 1: Update Known Issues section**

Find and remove or update the "Known Issues" section (if it exists) that mentions font corruption:

Remove:
```markdown
## Known Issues

- Visual appearances may corrupt fonts in PDFs with embedded CIDFont fonts (e.g., from @react-pdf/renderer)
```

Or add to Features section:
```markdown
## Features

- ✅ Visual signature appearances preserve all original page fonts and resources
- ✅ Works with PDFs from @react-pdf/renderer with CIDFont fonts
```

**Step 2: Commit**

```bash
git add libraries/e-signature/README.md
git commit -m "docs(e-signature): remove font corruption known issue

Fixed by merging Resources instead of replacing them."
```

---

## Task 6: Update CHANGELOG

**Files:**
- Modify: `libraries/pdf/CHANGELOG.md`
- Modify: `libraries/e-signature/CHANGELOG.md`

**Step 1: Update pdf CHANGELOG**

Add under `[Unreleased]` in libraries/pdf/CHANGELOG.md:

```markdown
## [Unreleased]

### Fixed
- Visual signature appearances now merge with existing page Resources instead of replacing them, preserving all original fonts and resource types
- Fixed corruption of PDFs with CIDFont fonts (common in @react-pdf/renderer) when adding visual signature
- Fixed indirect Resources references being replaced instead of resolved and merged
```

**Step 2: Update e-signature CHANGELOG**

Add under `[Unreleased]` in libraries/e-signature/CHANGELOG.md:

```markdown
## [Unreleased]

### Fixed
- Visual signature appearances no longer corrupt document fonts (fixed in @f-o-t/pdf dependency)
- PDFs from @react-pdf/renderer with CIDFont fonts now render correctly after signing with visual appearance
```

**Step 3: Commit**

```bash
git add libraries/pdf/CHANGELOG.md libraries/e-signature/CHANGELOG.md
git commit -m "docs: update CHANGELOGs for Resources merging fix

Document the fix for visual signature corrupting fonts."
```

---

## Verification Checklist

After all tasks complete:

- [ ] Run `cd libraries/pdf && bun test` - all tests pass
- [ ] Run `cd libraries/e-signature && bun test` - all tests pass
- [ ] Manually test signing a react-pdf PDF with visual appearance
- [ ] Verify fonts render correctly in signed PDF (use PDF viewer)
- [ ] Check that QR code and signature text display properly
- [ ] Verify original document text is still readable

## Alternative Approach Consideration

The plan above fixes the bug by merging Resources. The user's bug report also mentioned an **alternative approach**: render the visual appearance as a **Form XObject** in the annotation's `/AP` dictionary instead of modifying page content.

**Pros of Form XObject approach:**
- Never touches page Resources or Contents
- Cleaner separation (signature appearance is self-contained)
- Follows PDF spec for widget annotations (ISO 32000-1, Section 12.5.5)
- Zero risk of corrupting existing document

**Cons:**
- Requires rewriting appearance rendering logic
- More complex (need to understand Form XObject + annotation AP)
- Current approach works fine once Resources merging is fixed

**Recommendation:** Implement the Resources merging fix first (this plan). If issues persist or new edge cases emerge, consider the Form XObject refactor as a future enhancement.
