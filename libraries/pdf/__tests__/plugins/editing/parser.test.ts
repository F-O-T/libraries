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
});
