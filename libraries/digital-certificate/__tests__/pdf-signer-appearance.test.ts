import { describe, expect, test } from "bun:test";
import { PDFDocument } from "pdf-lib";
import { drawSignatureAppearance } from "../src/plugins/pdf-signer/signature-appearance";
import { generateQRCode } from "../src/plugins/pdf-signer/qr-generator";
import type { CertificateInfo, SignaturePlacement } from "../src/types";

describe("drawSignatureAppearance", () => {
	test("draws signature appearance with QR code on PDF page", async () => {
		const pdfDoc = await PDFDocument.create();
		const page = pdfDoc.addPage([600, 800]);

		const cert: CertificateInfo = {
			serialNumber: "123456",
			subject: {
				commonName: "John Doe",
				organization: null,
				organizationalUnit: null,
				country: "BR",
				state: null,
				locality: null,
				raw: "CN=John Doe,C=BR",
			},
			issuer: {
				commonName: "Test CA",
				organization: null,
				country: "BR",
				raw: "CN=Test CA,C=BR",
			},
			validity: {
				notBefore: new Date("2024-01-01"),
				notAfter: new Date("2025-01-01"),
			},
			fingerprint: "abc123",
			isValid: true,
			brazilian: {
				cnpj: null,
				cpf: "12345678901",
			},
			certPem: "-----BEGIN CERTIFICATE-----\n...",
			keyPem: "-----BEGIN PRIVATE KEY-----\n...",
			pfxBuffer: Buffer.from([]),
			pfxPassword: "test",
		};

		const qrData = `CERT:${cert.fingerprint}\nDOC:test-hash\nTIME:2024-01-01`;
		const qrCodeBuffer = await generateQRCode(qrData);

		const placement: SignaturePlacement = {
			page: 1,
			x: 50,
			y: 50,
			width: 200,
			height: 80,
		};

		await drawSignatureAppearance(page, cert, qrCodeBuffer, placement);

		// Verify the page was modified (has drawings)
		const pageContent = page.node.Contents();
		expect(pageContent).toBeDefined();
	});
});
