import { describe, test, expect } from "bun:test";
import { parseResourcesDict, mergeResourcesDicts } from "../../../src/plugins/editing/parser";

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

	test("additions override existing for duplicate keys", () => {
		const existing = {
			"/Font": "<< /F1 10 0 R /F2 11 0 R >>",
		};
		const additions = {
			"/Font": "<< /F1 20 0 R >>", // Same /F1, different object
		};

		const result = mergeResourcesDicts(existing, additions);

		expect(result["/Font"]).toContain("/F1 20 0 R"); // New version
		expect(result["/Font"]).not.toContain("/F1 10 0 R"); // Old version gone
		expect(result["/Font"]).toContain("/F2 11 0 R"); // F2 preserved
	});

	test("handles PDF names with hyphens, dots, and special characters", () => {
		const existing = {
			"/Font": "<< /F-Bold 10 0 R /Times.Roman 11 0 R >>",
		};
		const additions = {
			"/Font": "<< /Helvetica-Oblique 20 0 R /Name#20With#20Spaces 21 0 R >>",
		};

		const result = mergeResourcesDicts(existing, additions);

		// All names should be preserved
		expect(result["/Font"]).toContain("/F-Bold 10 0 R");
		expect(result["/Font"]).toContain("/Times.Roman 11 0 R");
		expect(result["/Font"]).toContain("/Helvetica-Oblique 20 0 R");
		expect(result["/Font"]).toContain("/Name#20With#20Spaces 21 0 R");
	});

	test("throws error for unexpected resource format", () => {
		const existing = {
			"/Font": "10 0 R", // Invalid: should be array or dict, not bare reference
		};
		const additions = {
			"/Font": "<< /F1 20 0 R >>",
		};

		expect(() => {
			mergeResourcesDicts(existing, additions);
		}).toThrow("Unexpected resource format for /Font: 10 0 R");
	});
});
