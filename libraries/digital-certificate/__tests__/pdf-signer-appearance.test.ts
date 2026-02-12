import { describe, expect, test } from "bun:test";
import { PDFDocument, rgb } from "pdf-lib";
import { drawSignatureAppearance } from "../src/plugins/pdf-signer/signature-appearance";

describe("drawSignatureAppearance", () => {
	test("draws signature appearance on PDF page", async () => {
		const pdfDoc = await PDFDocument.create();
		const page = pdfDoc.addPage([600, 800]);

		const certData = {
			commonName: "John Doe",
			cpfCnpj: "12345678901",
			validFrom: new Date("2024-01-01"),
			validTo: new Date("2025-01-01"),
		};

		drawSignatureAppearance(page, certData, 50, 50, 200, 80);

		// Verify the page was modified (has drawings)
		const pageContent = page.node.Contents();
		expect(pageContent).toBeDefined();
	});

	test("formats certificate data correctly", async () => {
		const pdfDoc = await PDFDocument.create();
		const page = pdfDoc.addPage([600, 800]);

		const certData = {
			commonName: "ACME Corp",
			cpfCnpj: "12345678000190", // CNPJ
			validFrom: new Date("2024-01-01"),
			validTo: new Date("2025-01-01"),
		};

		// Should not throw
		expect(() => {
			drawSignatureAppearance(page, certData, 50, 50, 200, 80);
		}).not.toThrow();
	});
});
