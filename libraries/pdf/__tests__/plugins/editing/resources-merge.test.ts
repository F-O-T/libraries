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
		// Look for the last %%EOF (before the final one) to find incremental update start
		const allEofs: number[] = [];
		let eofIdx = 0;
		while ((eofIdx = savedStr.indexOf("%%EOF", eofIdx)) !== -1) {
			allEofs.push(eofIdx);
			eofIdx += 5;
		}
		const incrementalStart = allEofs[allEofs.length - 2]!;
		const incrementalUpdate = savedStr.slice(incrementalStart);

		// Extract page 3 object from incremental update
		const page3Start = incrementalUpdate.indexOf("\n3 0 obj\n");
		expect(page3Start).toBeGreaterThan(-1);
		const page3Section = incrementalUpdate.slice(page3Start);
		const endobjPos = page3Section.indexOf("endobj");
		const page3Content = page3Section.slice(0, endobjPos);

		// Extract just the dictionary content (between << and >>)
		const dictStart = page3Content.indexOf("<<");
		const dictEnd = page3Content.lastIndexOf(">>");
		const pageDict = page3Content.slice(dictStart + 2, dictEnd).trim();

		// Should have Resources inline now (not reference)
		expect(pageDict).toContain("/Resources <<");

		// Extract Resources content (need to handle nested dictionaries)
		const resFullStart = pageDict.indexOf("/Resources <<");
		let pos = resFullStart + "/Resources ".length;
		let depth = 0;
		let resEnd = -1;

		while (pos < pageDict.length) {
			if (pageDict.slice(pos, pos + 2) === "<<") {
				depth++;
				pos += 2;
			} else if (pageDict.slice(pos, pos + 2) === ">>") {
				depth--;
				if (depth === 0) {
					resEnd = pos;
					break;
				}
				pos += 2;
			} else {
				pos++;
			}
		}

		const resourcesContent = pageDict.slice(resFullStart + "/Resources ".length, resEnd + 2);

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

		// Find updated page 3 object in incremental update
		const allEofs: number[] = [];
		let eofIdx = 0;
		while ((eofIdx = savedStr.indexOf("%%EOF", eofIdx)) !== -1) {
			allEofs.push(eofIdx);
			eofIdx += 5;
		}
		const incrementalStart = allEofs[allEofs.length - 2]!;
		const incrementalUpdate = savedStr.slice(incrementalStart);

		// Extract page 3 object
		const page3Start = incrementalUpdate.indexOf("\n3 0 obj\n");
		expect(page3Start).toBeGreaterThan(-1);
		const page3Section = incrementalUpdate.slice(page3Start);
		const endobjPos = page3Section.indexOf("endobj");
		const page3Content = page3Section.slice(0, endobjPos);

		const dictStart = page3Content.indexOf("<<");
		const dictEnd = page3Content.lastIndexOf(">>");
		const resourcesContent = page3Content.slice(dictStart + 2, dictEnd).trim();

		expect(resourcesContent).toContain("/F1");
		expect(resourcesContent).toContain("/F2");
	});
});
