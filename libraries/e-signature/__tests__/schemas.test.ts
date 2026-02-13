import { describe, expect, it } from "bun:test";
import { pdfSignOptionsSchema } from "../src/schemas.ts";

describe("pdfSignOptionsSchema", () => {
	it("validates minimal valid options", () => {
		const result = pdfSignOptionsSchema.parse({
			certificate: {
				p12: new Uint8Array([0x30, 0x82]),
				password: "test",
			},
		});

		expect(result.certificate.password).toBe("test");
	});

	it("validates full options", () => {
		const result = pdfSignOptionsSchema.parse({
			certificate: {
				p12: new Uint8Array([0x30, 0x82]),
				password: "test",
				name: "Signer Name",
			},
			reason: "Approval",
			location: "Office",
			contactInfo: "test@example.com",
			policy: "pades-icp-brasil",
			timestamp: true,
			tsaUrl: "http://timestamp.example.com",
			appearance: {
				x: 50,
				y: 50,
				width: 300,
				height: 100,
				page: 0,
				showQrCode: true,
				showCertInfo: true,
			},
			qrCode: {
				data: "https://example.com",
				size: 150,
			},
			docMdpPermission: 2,
		});

		expect(result.policy).toBe("pades-icp-brasil");
		expect(result.docMdpPermission).toBe(2);
	});

	it("accepts appearance: false", () => {
		const result = pdfSignOptionsSchema.parse({
			certificate: {
				p12: new Uint8Array([0x30]),
				password: "",
			},
			appearance: false,
		});

		expect(result.appearance).toBe(false);
	});

	it("rejects empty p12", () => {
		expect(() =>
			pdfSignOptionsSchema.parse({
				certificate: {
					p12: new Uint8Array(0),
					password: "",
				},
			}),
		).toThrow();
	});

	it("rejects invalid policy", () => {
		expect(() =>
			pdfSignOptionsSchema.parse({
				certificate: {
					p12: new Uint8Array([0x30]),
					password: "",
				},
				policy: "invalid-policy",
			}),
		).toThrow();
	});

	it("rejects invalid docMdpPermission", () => {
		expect(() =>
			pdfSignOptionsSchema.parse({
				certificate: {
					p12: new Uint8Array([0x30]),
					password: "",
				},
				docMdpPermission: 4,
			}),
		).toThrow();
	});
});
