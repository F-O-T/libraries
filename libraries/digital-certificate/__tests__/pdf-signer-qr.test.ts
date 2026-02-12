import { describe, expect, test } from "bun:test";
import {
	createVerificationData,
	generateQRCode,
} from "../src/plugins/pdf-signer/qr-generator";

describe("QR Code Generator", () => {
	test("generates QR code as PNG buffer", async () => {
		const data = "test-data";
		const qrBuffer = await generateQRCode(data);

		expect(qrBuffer).toBeInstanceOf(Buffer);
		expect(qrBuffer.length).toBeGreaterThan(0);
		// Check PNG signature
		expect(qrBuffer.slice(0, 8)).toEqual(
			Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		);
	});

	test("creates verification data string", () => {
		const cert = {
			subject: "CN=Test User",
			issuer: "CN=Test CA",
			serialNumber: "123456",
			validFrom: "2024-01-01",
			validTo: "2025-01-01",
		};
		const documentHash = "abc123";

		const verificationData = createVerificationData(cert, documentHash);

		expect(verificationData).toContain("Subject: CN=Test User");
		expect(verificationData).toContain("Issuer: CN=Test CA");
		expect(verificationData).toContain("Serial: 123456");
		expect(verificationData).toContain("Document Hash: abc123");
	});

	test("generates QR code with verification data", async () => {
		const cert = {
			subject: "CN=Test",
			issuer: "CN=CA",
			serialNumber: "999",
			validFrom: "2024-01-01",
			validTo: "2025-01-01",
		};
		const hash = "hash123";

		const data = createVerificationData(cert, hash);
		const qr = await generateQRCode(data);

		expect(qr).toBeInstanceOf(Buffer);
		expect(qr.length).toBeGreaterThan(0);
	});
});
