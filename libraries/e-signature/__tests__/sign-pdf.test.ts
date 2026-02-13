import { describe, expect, it, beforeAll } from "bun:test";
import { signPdf } from "../src/sign-pdf.ts";
import { PDFDocument } from "@f-o-t/pdf/plugins/generation";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const fixtureDir = join(import.meta.dir, "fixtures");
const p12Path = join(fixtureDir, "test.p12");

beforeAll(() => {
	if (!existsSync(fixtureDir)) {
		mkdirSync(fixtureDir, { recursive: true });
	}
	if (!existsSync(p12Path)) {
		const keyPath = join(fixtureDir, "key.pem");
		const certPath = join(fixtureDir, "cert.pem");

		execSync(
			`openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=Test/O=FOT"`,
			{ stdio: "pipe" },
		);

		try {
			execSync(
				`openssl pkcs12 -export -out "${p12Path}" -inkey "${keyPath}" -in "${certPath}" -password pass:test123 -legacy`,
				{ stdio: "pipe" },
			);
		} catch {
			execSync(
				`openssl pkcs12 -export -out "${p12Path}" -inkey "${keyPath}" -in "${certPath}" -password pass:test123`,
				{ stdio: "pipe" },
			);
		}
	}
});

function createTestPdf(): Uint8Array {
	const doc = new PDFDocument();
	doc.addPage({ width: 612, height: 792 });
	return doc.save();
}

async function loadP12(): Promise<Uint8Array> {
	return new Uint8Array(await Bun.file(p12Path).arrayBuffer());
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
