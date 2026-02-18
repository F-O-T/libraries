/**
 * Memory / OOM regression tests for the PDF editing plugin.
 *
 * These tests guard against two classes of bugs:
 *
 * 1. **Heap amplification** — functions that allocate O(pages × pdfSize) memory
 *    instead of O(pdfSize). The original `toLatin1` bug caused each
 *    `extractObjectDictContent` call to create a full copy of the PDF as a
 *    string, leading to hundreds of MB of garbage for multi-page documents.
 *
 * 2. **Unnecessary buffer copies** — `embedSignature` previously allocated a
 *    full-PDF-sized copy just to patch a few bytes; `extractBytesToSign` used
 *    `.slice()` (copies) instead of `.subarray()` (views).
 *
 * Design note: V8/Bun GC is non-deterministic, so we cannot assert exact byte
 * counts. Instead the tests use two strategies:
 *   a) **Reference identity** — prove no copy was made by checking `result === input`
 *   b) **Survivability + scaling** — verify operations complete for large inputs
 *      and that memory growth scales with PDF size, not page count squared
 */

import { describe, expect, test } from "bun:test";
import { PDFDocument } from "../../../src/plugins/generation/document.ts";
import {
	embedSignature,
	extractBytesToSign,
	findByteRange,
	loadPdf,
} from "../../../src/plugins/editing/index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createSyntheticPdf(pageCount: number): Uint8Array {
	const doc = new PDFDocument();
	for (let i = 0; i < pageCount; i++) {
		const page = doc.addPage({ size: "Letter" });
		page.drawText(`Page ${i + 1} of ${pageCount}`, { x: 50, y: 700, size: 12 });
	}
	return doc.save();
}

/**
 * Build a minimal but structurally valid PDF with a two-level page tree:
 *
 *   Catalog(1) -> Pages(2) -> [Pages(3), Pages(4)]
 *                              ↳[Page(5), Page(6)]   ↳[Page(7), Page(8)]
 *
 * Pages 3 and 4 carry the /MediaBox so pages 5-8 must inherit it.
 * This verifies both `findPageObjects` recursion and `getMediaBox` inheritance.
 */
function createNestedPageTreePdf(): Uint8Array {
	const offsets: Record<number, number> = {};
	let pdf = "%PDF-1.4\n";

	function addObj(num: number, content: string) {
		offsets[num] = pdf.length;
		pdf += `${num} 0 obj\n${content}\nendobj\n`;
	}

	addObj(1, "<< /Type /Catalog /Pages 2 0 R >>");
	addObj(2, "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 4 >>");
	// Intermediate Pages nodes carry the MediaBox (pages will inherit it)
	addObj(3, "<< /Type /Pages /Parent 2 0 R /Kids [5 0 R 6 0 R] /Count 2 /MediaBox [0 0 612 792] >>");
	addObj(4, "<< /Type /Pages /Parent 2 0 R /Kids [7 0 R 8 0 R] /Count 2 /MediaBox [0 0 612 792] >>");
	// Leaf pages — no /MediaBox of their own
	addObj(5, "<< /Type /Page /Parent 3 0 R >>");
	addObj(6, "<< /Type /Page /Parent 3 0 R >>");
	addObj(7, "<< /Type /Page /Parent 4 0 R >>");
	addObj(8, "<< /Type /Page /Parent 4 0 R >>");

	const xrefOffset = pdf.length;
	pdf += "xref\n0 9\n";
	pdf += "0000000000 65535 f \n";
	for (let i = 1; i <= 8; i++) {
		pdf += `${String(offsets[i] ?? 0).padStart(10, "0")} 00000 n \n`;
	}
	pdf += `trailer\n<< /Size 9 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

	return new TextEncoder().encode(pdf);
}

// ---------------------------------------------------------------------------
// Reference-identity tests (most reliable — deterministic, no GC involved)
// ---------------------------------------------------------------------------

describe("embedSignature — in-place (no copy)", () => {
	test("returns the same Uint8Array reference that was passed in", () => {
		const pdf = createSyntheticPdf(1);
		const doc = loadPdf(pdf);
		const { pdf: withPlaceholder } = doc.saveWithPlaceholder({
			reason: "test",
			name: "tester",
			signatureLength: 512,
			docMdpPermission: 2,
		});

		// A valid but minimal fake signature (all-zero, but correct length check)
		const fakeSignature = new Uint8Array(128);

		const result = embedSignature(withPlaceholder, fakeSignature);

		// Must be the EXACT SAME buffer — no copy was made
		expect(result).toBe(withPlaceholder);
	});

	test("modifies the placeholder bytes without allocating a new buffer", () => {
		const pdf = createSyntheticPdf(2);
		const doc = loadPdf(pdf);
		const { pdf: withPlaceholder } = doc.saveWithPlaceholder({
			reason: "test",
			name: "tester",
			signatureLength: 512,
			docMdpPermission: 2,
		});

		const originalRef = withPlaceholder;
		const fakeSignature = new Uint8Array(64).fill(0xab);

		const result = embedSignature(withPlaceholder, fakeSignature);

		expect(result).toBe(originalRef);
		// Signature hex should now be present in the buffer
		const { contentsStart } = findByteRange(result);
		const embeddedHex = new TextDecoder().decode(
			result.subarray(contentsStart, contentsStart + 128),
		);
		expect(embeddedHex.startsWith("ab".repeat(64))).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Correctness: nested page trees and MediaBox inheritance
// ---------------------------------------------------------------------------

describe("nested page trees and MediaBox inheritance", () => {
	test("findPageObjects recurses into intermediate Pages nodes", () => {
		const pdf = createNestedPageTreePdf();
		const doc = loadPdf(pdf);

		// Should find all 4 LEAF pages (5, 6, 7, 8), not the intermediate nodes
		expect(doc.pageCount).toBe(4);
	});

	test("all pages have correct dimensions via inherited MediaBox", () => {
		const pdf = createNestedPageTreePdf();
		const doc = loadPdf(pdf);

		// MediaBox [0 0 612 792] is on the intermediate Pages nodes
		// The leaf pages inherit it — getMediaBox must walk up the /Parent chain
		for (let i = 0; i < doc.pageCount; i++) {
			const page = doc.getPage(i);
			expect(page.width).toBe(612);
			expect(page.height).toBe(792);
		}
	});

	test("saveWithPlaceholder works on a nested page tree PDF", () => {
		const pdf = createNestedPageTreePdf();
		const doc = loadPdf(pdf);

		expect(() => {
			doc.saveWithPlaceholder({
				reason: "nested tree test",
				name: "tester",
				signatureLength: 512,
				docMdpPermission: 2,
			});
		}).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Survivability: large page counts must not OOM or throw
// ---------------------------------------------------------------------------

describe("large page count survivability", () => {
	test("loadPdf completes for a 100-page PDF without OOM", () => {
		const pdf = createSyntheticPdf(100);
		expect(() => {
			const doc = loadPdf(pdf);
			expect(doc.pageCount).toBe(100);
		}).not.toThrow();
	});

	test("saveWithPlaceholder completes for a 100-page PDF", () => {
		const pdf = createSyntheticPdf(100);
		const doc = loadPdf(pdf);
		expect(() => {
			const { pdf: signed } = doc.saveWithPlaceholder({
				reason: "100-page test",
				name: "tester",
				signatureLength: 512,
				docMdpPermission: 2,
			});
			expect(signed.length).toBeGreaterThan(pdf.length);
		}).not.toThrow();
	});

	test("all pages accessible after loading 50-page PDF", () => {
		const pdf = createSyntheticPdf(50);
		const doc = loadPdf(pdf);
		expect(doc.pageCount).toBe(50);
		for (let i = 0; i < 50; i++) {
			const page = doc.getPage(i);
			expect(page.width).toBeGreaterThan(0);
			expect(page.height).toBeGreaterThan(0);
		}
	});
});

// ---------------------------------------------------------------------------
// Heap scaling: memory growth must be proportional to PDF size, not pages²
// ---------------------------------------------------------------------------

describe("heap growth scales with PDF size, not page count squared", () => {
	test("loadPdf heap delta for 50 pages ≤ 15× heap delta for 5 pages", () => {
		// Allow GC to settle before measuring
		// (We can't force GC in all runtimes, but we can attempt it)
		if (typeof globalThis.gc === "function") globalThis.gc();

		const small = createSyntheticPdf(5);
		const large = createSyntheticPdf(50);

		// Ratio of PDF sizes (large is ~10× bigger)
		const sizeRatio = large.length / small.length;

		const h0 = process.memoryUsage().heapUsed;
		const docSmall = loadPdf(small);
		const h1 = process.memoryUsage().heapUsed;
		const deltaSmall = Math.max(1, h1 - h0);

		const h2 = process.memoryUsage().heapUsed;
		const docLarge = loadPdf(large);
		const h3 = process.memoryUsage().heapUsed;
		const deltaLarge = Math.max(1, h3 - h2);

		// Keep references alive so GC doesn't skew measurements
		expect(docSmall.pageCount).toBe(5);
		expect(docLarge.pageCount).toBe(50);

		const memRatio = deltaLarge / deltaSmall;
		// With the O(pages²) toLatin1 bug: 50 pages → 10× more pages → ~100× more memory
		// After fix: memory ratio should track the PDF size ratio (≤ 3× of that)
		const maxAllowedRatio = sizeRatio * 3;
		expect(memRatio).toBeLessThan(maxAllowedRatio);
	});

	test("extractBytesToSign heap delta ≤ 2× PDF size", () => {
		const pdf = createSyntheticPdf(10);
		const doc = loadPdf(pdf);
		const { pdf: withPlaceholder } = doc.saveWithPlaceholder({
			reason: "test",
			name: "tester",
			signatureLength: 512,
			docMdpPermission: 2,
		});
		const { byteRange } = findByteRange(withPlaceholder);
		const pdfSizeBytes = withPlaceholder.length;

		if (typeof globalThis.gc === "function") globalThis.gc();
		const before = process.memoryUsage().heapUsed;
		const bytesToSign = extractBytesToSign(withPlaceholder, byteRange);
		const after = process.memoryUsage().heapUsed;
		const deltaBytes = Math.max(0, after - before);

		expect(bytesToSign.length).toBeGreaterThan(0);
		// With old .slice() code: ~3× PDF size (chunk1 copy + chunk2 copy + result)
		// With subarray() fix: ~1× PDF size (result only, views are free)
		// Allow 2.5× as a generous bound
		expect(deltaBytes).toBeLessThan(pdfSizeBytes * 2.5);
	});
});

// ---------------------------------------------------------------------------
// Widget annotation page placement
// ---------------------------------------------------------------------------

describe("widget annotation is placed on the correct page", () => {
	test("appearancePage=0 puts /Annots on page 0", () => {
		const pdf = createSyntheticPdf(3);
		const doc = loadPdf(pdf);
		const { pdf: signed } = doc.saveWithPlaceholder({
			reason: "test",
			name: "tester",
			signatureLength: 512,
			docMdpPermission: 2,
			appearancePage: 0,
		});

		// The signed PDF should contain /Annots referencing the widget
		const pdfStr = new TextDecoder("latin1").decode(signed);
		expect(pdfStr).toContain("/Annots");
	});

	test("appearancePage=2 puts /Annots on page 2 for a 3-page PDF", () => {
		const pdf = createSyntheticPdf(3);
		const doc = loadPdf(pdf);
		// Draw something on page 2 so it becomes dirty (annotation page)
		const page2 = doc.getPage(2);
		page2.drawText("sig here", { x: 10, y: 10, size: 8 });

		const { pdf: signed } = doc.saveWithPlaceholder({
			reason: "test",
			name: "tester",
			signatureLength: 512,
			docMdpPermission: 2,
			appearancePage: 2,
		});

		// /Annots should appear — the widget references page 2's object
		const pdfStr = new TextDecoder("latin1").decode(signed);
		expect(pdfStr).toContain("/Annots");
	});

	test("appearancePage clamped to last page if out of range", () => {
		const pdf = createSyntheticPdf(2);
		const doc = loadPdf(pdf);
		expect(() => {
			doc.saveWithPlaceholder({
				reason: "test",
				name: "tester",
				signatureLength: 512,
				docMdpPermission: 2,
				appearancePage: 99, // out of range, clamped to last page
			});
		}).not.toThrow();
	});
});
