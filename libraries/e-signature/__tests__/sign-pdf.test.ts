import { describe, expect, it } from "bun:test";
import { signPdf } from "../src/sign-pdf.ts";
import { PDFDocument } from "@f-o-t/pdf/plugins/generation";

function createTestPdf(): Uint8Array {
	const doc = new PDFDocument();
	doc.addPage({ width: 612, height: 792 });
	return doc.save();
}

async function loadP12(): Promise<Uint8Array> {
	const file = Bun.file(
		"/home/yorizel/Documents/fot-libraries/libraries/crypto/__tests__/fixtures/test.p12",
	);
	return new Uint8Array(await file.arrayBuffer());
}

describe("signPdf", () => {
	it("signs a PDF without appearance", async () => {
		const pdf = createTestPdf();
		const p12 = await loadP12();

		const result = await signPdf(pdf, {
			certificate: { p12, password: "test123" },
			appearance: false,
		});

		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.length).toBeGreaterThan(pdf.length);
	});

	it("includes PKCS#7 signature markers in output", async () => {
		const pdf = createTestPdf();
		const p12 = await loadP12();

		const result = await signPdf(pdf, {
			certificate: { p12, password: "test123" },
			appearance: false,
		});

		const pdfStr = new TextDecoder("latin1").decode(result);
		expect(pdfStr).toContain("/SubFilter /adbe.pkcs7.detached");
		expect(pdfStr).toContain("/ByteRange");
	});

	it("signs a PDF with visual appearance and cert info", async () => {
		const pdf = createTestPdf();
		const p12 = await loadP12();

		const result = await signPdf(pdf, {
			certificate: { p12, password: "test123" },
			reason: "Test signing",
			location: "Test Location",
			appearance: {
				x: 50,
				y: 50,
				width: 300,
				height: 100,
				page: 0,
				showCertInfo: true,
			},
		});

		expect(result).toBeInstanceOf(Uint8Array);
		expect(result.length).toBeGreaterThan(pdf.length);
	});

	it("includes reason and location in signature dictionary", async () => {
		const pdf = createTestPdf();
		const p12 = await loadP12();

		const result = await signPdf(pdf, {
			certificate: { p12, password: "test123" },
			reason: "Approval",
			location: "Office",
			contactInfo: "test@example.com",
			appearance: false,
		});

		const pdfStr = new TextDecoder("latin1").decode(result);
		expect(pdfStr).toContain("Approval");
		expect(pdfStr).toContain("Office");
		expect(pdfStr).toContain("test@example.com");
	});

	it("rejects invalid certificate data", async () => {
		const pdf = createTestPdf();
		const badP12 = new Uint8Array([0x00, 0x01, 0x02]);

		await expect(
			signPdf(pdf, {
				certificate: { p12: badP12, password: "wrong" },
				appearance: false,
			}),
		).rejects.toThrow();
	});

	it("rejects empty P12 data", async () => {
		const pdf = createTestPdf();

		await expect(
			signPdf(pdf, {
				certificate: { p12: new Uint8Array(0), password: "" },
				appearance: false,
			}),
		).rejects.toThrow();
	});
});
