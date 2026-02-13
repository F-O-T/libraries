import { describe, expect, it } from "bun:test";
import { loadPdf, findByteRange, extractBytesToSign, embedSignature } from "../../../src/plugins/editing/index.ts";
import { PDFDocument } from "../../../src/plugins/generation/document.ts";

/**
 * Create a minimal valid PDF using the generation plugin
 */
function createMinimalPdf(): Uint8Array {
	const doc = new PDFDocument();
	const page = doc.addPage({ size: "Letter" });
	page.drawText("Test Document", { x: 50, y: 700, size: 16 });
	return doc.save();
}

/**
 * Create a minimal valid 1x1 red PNG (RGBA)
 */
function createMinimal1x1Png(): Uint8Array {
	// PNG file with a 1x1 red pixel (RGB, no alpha)
	// Built from spec: signature + IHDR + IDAT + IEND
	const png = new Uint8Array([
		// PNG Signature
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
		// IHDR chunk: length=13, "IHDR", width=1, height=1, bitDepth=8, colorType=2 (RGB)
		0x00, 0x00, 0x00, 0x0d, // chunk length
		0x49, 0x48, 0x44, 0x52, // "IHDR"
		0x00, 0x00, 0x00, 0x01, // width = 1
		0x00, 0x00, 0x00, 0x01, // height = 1
		0x08, // bit depth = 8
		0x02, // color type = 2 (RGB)
		0x00, // compression = 0
		0x00, // filter = 0
		0x00, // interlace = 0
		0x1e, 0x92, 0x6e, 0x05, // CRC
		// IDAT chunk: zlib-compressed filter byte (0) + RGB (FF 00 00) = red pixel
		0x00, 0x00, 0x00, 0x0c, // chunk length = 12
		0x49, 0x44, 0x41, 0x54, // "IDAT"
		// zlib compressed data for: filter=0, R=255, G=0, B=0
		0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x01, 0x01, 0x01, 0x00,
		0x18, 0xdd, 0x8d, 0xb4, // CRC
		// IEND chunk
		0x00, 0x00, 0x00, 0x00, // chunk length = 0
		0x49, 0x45, 0x4e, 0x44, // "IEND"
		0xae, 0x42, 0x60, 0x82, // CRC
	]);
	return png;
}

describe("loadPdf", () => {
	it("loads a PDF and reports page count", () => {
		const pdf = createMinimalPdf();
		const doc = loadPdf(pdf);
		expect(doc.pageCount).toBeGreaterThan(0);
	});

	it("gets page dimensions", () => {
		const pdf = createMinimalPdf();
		const doc = loadPdf(pdf);
		const page = doc.getPage(0);
		// US Letter: 612 x 792
		expect(page.width).toBe(612);
		expect(page.height).toBe(792);
	});

	it("throws on out-of-range page index", () => {
		const pdf = createMinimalPdf();
		const doc = loadPdf(pdf);
		expect(() => doc.getPage(99)).toThrow("out of range");
		expect(() => doc.getPage(-1)).toThrow("out of range");
	});

	it("draws text on a page and saves", () => {
		const pdf = createMinimalPdf();
		const doc = loadPdf(pdf);
		const page = doc.getPage(0);
		page.drawText("Hello, World!", { x: 50, y: 700, size: 16 });
		const result = doc.save();
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.length).toBeGreaterThan(pdf.length);
	});

	it("saved PDF contains incremental update structure", () => {
		const pdf = createMinimalPdf();
		const doc = loadPdf(pdf);
		const page = doc.getPage(0);
		page.drawText("Incremental test", { x: 50, y: 700 });
		const result = doc.save();

		const text = new TextDecoder("latin1").decode(result);
		// Should contain original %%EOF plus new trailer
		const eofCount = text.split("%%EOF").length - 1;
		expect(eofCount).toBeGreaterThanOrEqual(2); // original + incremental
		expect(text).toContain("/Prev "); // incremental trailer has /Prev
	});

	it("draws a rectangle on a page", () => {
		const pdf = createMinimalPdf();
		const doc = loadPdf(pdf);
		const page = doc.getPage(0);
		page.drawRectangle({
			x: 50,
			y: 50,
			width: 200,
			height: 100,
			color: "#CCCCCC",
		});
		const result = doc.save();
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.length).toBeGreaterThan(pdf.length);

		// Check that rectangle operators are in the output
		const text = new TextDecoder("latin1").decode(result);
		expect(text).toContain("50 50 200 100 re");
	});

	it("draws a rectangle with border", () => {
		const pdf = createMinimalPdf();
		const doc = loadPdf(pdf);
		const page = doc.getPage(0);
		page.drawRectangle({
			x: 10,
			y: 10,
			width: 100,
			height: 50,
			color: "#FF0000",
			borderColor: "#0000FF",
			borderWidth: 2,
		});
		const result = doc.save();
		const text = new TextDecoder("latin1").decode(result);
		// Both fill and stroke colour should be set
		expect(text).toContain("rg"); // fill colour
		expect(text).toContain("RG"); // stroke colour
		expect(text).toContain("B"); // fill and stroke operator
	});

	it("embeds PNG and draws image", () => {
		const pdf = createMinimalPdf();
		const doc = loadPdf(pdf);
		const minimalPng = createMinimal1x1Png();
		const image = doc.embedPng(minimalPng);

		expect(image.width).toBe(1);
		expect(image.height).toBe(1);

		const page = doc.getPage(0);
		page.drawImage(image, { x: 50, y: 50, width: 100, height: 100 });
		const result = doc.save();
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.length).toBeGreaterThan(pdf.length);

		const text = new TextDecoder("latin1").decode(result);
		expect(text).toContain("/Subtype /Image");
		expect(text).toContain("Do"); // image draw operator
	});

	it("draws text with colour", () => {
		const pdf = createMinimalPdf();
		const doc = loadPdf(pdf);
		const page = doc.getPage(0);
		page.drawText("Coloured", { x: 50, y: 700, color: "#FF0000" });
		const result = doc.save();
		const text = new TextDecoder("latin1").decode(result);
		expect(text).toContain("1.000 0.000 0.000 rg"); // red fill
		expect(text).toContain("(Coloured) Tj");
	});

	it("saves without changes (no incremental update needed)", () => {
		const pdf = createMinimalPdf();
		const doc = loadPdf(pdf);
		// No drawing operations — save should still work
		const result = doc.save();
		expect(result).toBeInstanceOf(Uint8Array);
		// Should be essentially the same size (only original bytes, no appended objects)
		// Actually incremental update is always appended but with no dirty pages
		// there are no new content streams
		expect(result.length).toBeGreaterThanOrEqual(pdf.length);
	});
});

describe("saveWithPlaceholder", () => {
	it("saves with signature placeholder", () => {
		const pdf = createMinimalPdf();
		const doc = loadPdf(pdf);
		const { pdf: signedPdf, byteRange } = doc.saveWithPlaceholder({
			reason: "Test",
			name: "Test Signer",
		});
		expect(signedPdf).toBeInstanceOf(Uint8Array);
		expect(byteRange).toHaveLength(4);
		expect(byteRange[0]).toBe(0);
		expect(byteRange[2]).toBeGreaterThan(byteRange[1]);
	});

	it("placeholder contains signature dictionary", () => {
		const pdf = createMinimalPdf();
		const doc = loadPdf(pdf);
		const { pdf: signedPdf } = doc.saveWithPlaceholder({
			reason: "Approval",
			name: "John Doe",
			location: "New York",
			contactInfo: "john@example.com",
		});

		const text = new TextDecoder("latin1").decode(signedPdf);
		expect(text).toContain("/Type /Sig");
		expect(text).toContain("/Filter /Adobe.PPKLite");
		expect(text).toContain("/SubFilter /adbe.pkcs7.detached");
		expect(text).toContain("/ByteRange [");
		expect(text).toContain("/Contents <");
		expect(text).toContain("(Approval)");
		expect(text).toContain("(John Doe)");
		expect(text).toContain("(New York)");
		expect(text).toContain("(john@example.com)");
	});

	it("placeholder has AcroForm and widget annotation", () => {
		const pdf = createMinimalPdf();
		const doc = loadPdf(pdf);
		const { pdf: signedPdf } = doc.saveWithPlaceholder({});

		const text = new TextDecoder("latin1").decode(signedPdf);
		expect(text).toContain("/Type /AcroForm");
		expect(text).toContain("/SigFlags 3");
		expect(text).toContain("/Subtype /Widget");
		expect(text).toContain("/FT /Sig");
	});

	it("byte range values are consistent", () => {
		const pdf = createMinimalPdf();
		const doc = loadPdf(pdf);
		const { pdf: signedPdf, byteRange } = doc.saveWithPlaceholder({});

		// byteRange[0] + byteRange[1] should be before byteRange[2]
		expect(byteRange[0] + byteRange[1]).toBeLessThan(byteRange[2]);
		// byteRange[2] + byteRange[3] should equal PDF length
		expect(byteRange[2] + byteRange[3]).toBe(signedPdf.length);
	});
});

describe("signature utilities", () => {
	it("findByteRange locates the signature placeholder", () => {
		const pdf = createMinimalPdf();
		const doc = loadPdf(pdf);
		const { pdf: signedPdf } = doc.saveWithPlaceholder({});

		const result = findByteRange(signedPdf);
		expect(result.byteRange).toHaveLength(4);
		expect(result.byteRange[0]).toBe(0);
		expect(result.placeholderLength).toBeGreaterThan(0);
	});

	it("extractBytesToSign returns correct data length", () => {
		const pdf = createMinimalPdf();
		const doc = loadPdf(pdf);
		const { pdf: signedPdf, byteRange } = doc.saveWithPlaceholder({});

		const bytesToSign = extractBytesToSign(signedPdf, byteRange);
		expect(bytesToSign.length).toBe(byteRange[1] + byteRange[3]);
	});

	it("embedSignature replaces placeholder", () => {
		const pdf = createMinimalPdf();
		const doc = loadPdf(pdf);
		const { pdf: signedPdf } = doc.saveWithPlaceholder({
			signatureLength: 128,
		});

		// Create a fake signature
		const fakeSignature = new Uint8Array(64);
		for (let i = 0; i < fakeSignature.length; i++) {
			fakeSignature[i] = i & 0xff;
		}

		const finalPdf = embedSignature(signedPdf, fakeSignature);
		expect(finalPdf).toBeInstanceOf(Uint8Array);
		expect(finalPdf.length).toBe(signedPdf.length);

		// The signature hex should be in the final PDF
		const text = new TextDecoder("latin1").decode(finalPdf);
		expect(text).toContain("000102030405"); // start of the fake sig hex
	});
});

describe("round-trip: generate -> load -> edit -> save", () => {
	it("can load a generated PDF, edit it, and save", () => {
		// Step 1: Generate a PDF
		const genDoc = new PDFDocument();
		const genPage = genDoc.addPage({ size: "A4" });
		genPage.drawText("Original content", { x: 50, y: 800 });
		genPage.drawRectangle({ x: 100, y: 100, width: 400, height: 300 });
		const originalPdf = genDoc.save();

		// Step 2: Load and edit
		const editDoc = loadPdf(originalPdf);
		expect(editDoc.pageCount).toBe(1);

		const page = editDoc.getPage(0);
		// A4: 595 x 842
		expect(page.width).toBe(595);
		expect(page.height).toBe(842);

		page.drawText("Added by editing plugin", { x: 50, y: 750, size: 14 });

		// Step 3: Save
		const editedPdf = editDoc.save();
		expect(editedPdf.length).toBeGreaterThan(originalPdf.length);

		// Step 4: Verify the edited PDF can be loaded again
		const reloaded = loadPdf(editedPdf);
		expect(reloaded.pageCount).toBe(1);
	});
});
