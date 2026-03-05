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
