import { describe, test, expect } from "bun:test";
import { parseResourcesDict } from "../../../src/plugins/editing/parser";

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

	test("handles nested arrays in ProcSet", () => {
		const dictContent = `
      /Type /Page
      /Resources << /ProcSet [[/PDF] [/Text] [/ImageC]] /Font << /F1 10 0 R >> >>
    `;

		const result = parseResourcesDict(dictContent, new Uint8Array());

		expect(result).toEqual({
			"/ProcSet": "[[/PDF] [/Text] [/ImageC]]",
			"/Font": "<< /F1 10 0 R >>",
		});
	});

	test("handles resource type name collision (e.g., /Font containing /FontFile)", () => {
		const dictContent = `
      /Type /Page
      /Resources << /Font << /F1 << /Type /Font /BaseFont /Helvetica /FontFile 20 0 R >> >> >>
    `;

		const result = parseResourcesDict(dictContent, new Uint8Array());

		// Should extract /Font at top level, not match /FontFile inside
		expect(result).toHaveProperty("/Font");
		expect(result["/Font"]).toContain("/FontFile");
		expect(result).not.toHaveProperty("/FontFile");
	});

	test("throws error for malformed dictionary (missing end)", () => {
		const dictContent = `
      /Type /Page
      /Resources << /Font << /F1 10 0 R
    `;

		expect(() => {
			parseResourcesDict(dictContent, new Uint8Array());
		}).toThrow("Cannot find end of Resources dictionary");
	});

	test("throws error for malformed resource entry in indirect object", () => {
		// Test error handling when indirect object is malformed
		const pdfContent = `7 0 obj
<< /Font << /F1 10 0 R >>
endobj`;

		const dictContent = "/Type /Page /Resources 7 0 R";
		const pdfData = new TextEncoder().encode(pdfContent);

		expect(() => {
			parseResourcesDict(dictContent, pdfData);
		}).toThrow("Cannot find dictionary end for object 7");
	});

	test("throws error for malformed array (missing end)", () => {
		const dictContent = `
      /Type /Page
      /Resources << /ProcSet [/PDF /Text >>
    `;

		expect(() => {
			parseResourcesDict(dictContent, new Uint8Array());
		}).toThrow("Cannot find end of /ProcSet array");
	});

	test("handles nested dictionaries in resources", () => {
		const dictContent = `
      /Type /Page
      /Resources << /ExtGState << /GS1 << /Type /ExtGState /CA 0.5 >> >> >>
    `;

		const result = parseResourcesDict(dictContent, new Uint8Array());

		expect(result).toEqual({
			"/ExtGState": "<< /GS1 << /Type /ExtGState /CA 0.5 >> >>",
		});
	});

	test("comprehensive edge case: all three fixes working together", () => {
		// This test verifies:
		// 1. Regex matching prevents /Font from matching /FontFile inside values
		// 2. Nested array handling works for complex ProcSet
		// 3. Proper error handling when malformed
		const dictContent = `
      /Type /Page
      /Resources <<
        /Font << /F1 << /Type /Font /BaseFont /Helvetica /FontFile 20 0 R >> >>
        /ProcSet [[/PDF] [/Text [/Nested]]]
        /XObject << /Img1 10 0 R >>
      >>
    `;

		const result = parseResourcesDict(dictContent, new Uint8Array());

		// Should extract /Font correctly without matching /FontFile
		expect(result).toHaveProperty("/Font");
		expect(result["/Font"]).toContain("/FontFile");
		
		// Should handle nested arrays in ProcSet
		expect(result).toHaveProperty("/ProcSet");
		expect(result["/ProcSet"]).toBe("[[/PDF] [/Text [/Nested]]]");
		
		// Should also get XObject
		expect(result).toHaveProperty("/XObject");
		expect(result["/XObject"]).toBe("<< /Img1 10 0 R >>");
	});
});
