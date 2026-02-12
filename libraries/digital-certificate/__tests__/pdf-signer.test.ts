import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { signPdf } from "../src/plugins/pdf-signer";
import type { SignPdfOptions } from "../src/plugins/pdf-signer/types";

describe("PDF Signer", () => {
  const testPdfPath = join(__dirname, "fixtures", "sample.pdf");
  const testPdf = readFileSync(testPdfPath);

  const mockCertificate = {
    cert: Buffer.from("mock-cert"),
    key: Buffer.from("mock-key"),
  };

  it("should sign PDF with default options", async () => {
    const options: SignPdfOptions = {
      certificate: mockCertificate,
      reason: "Testing",
      location: "Test Lab",
      contactInfo: "test@example.com",
    };

    const signedPdf = await signPdf(testPdf, options);

    expect(signedPdf).toBeInstanceOf(Buffer);
    expect(signedPdf.length).toBeGreaterThan(testPdf.length);
    expect(signedPdf.toString().includes("/ByteRange")).toBe(true);
  });

  it("should sign PDF with QR code", async () => {
    const options: SignPdfOptions = {
      certificate: mockCertificate,
      reason: "Testing with QR",
      location: "Test Lab",
      contactInfo: "test@example.com",
      qrCode: {
        data: "https://verify.example.com/doc123",
        size: 100,
      },
    };

    const signedPdf = await signPdf(testPdf, options);

    expect(signedPdf).toBeInstanceOf(Buffer);
    expect(signedPdf.length).toBeGreaterThan(testPdf.length);
  });

  it("should sign PDF with custom signature appearance", async () => {
    const options: SignPdfOptions = {
      certificate: mockCertificate,
      reason: "Custom appearance test",
      location: "Test Lab",
      contactInfo: "test@example.com",
      appearance: {
        page: 0,
        x: 100,
        y: 100,
        width: 300,
        height: 100,
      },
    };

    const signedPdf = await signPdf(testPdf, options);

    expect(signedPdf).toBeInstanceOf(Buffer);
    expect(signedPdf.length).toBeGreaterThan(testPdf.length);
  });

  it("should sign PDF with both QR code and custom appearance", async () => {
    const options: SignPdfOptions = {
      certificate: mockCertificate,
      reason: "Full featured test",
      location: "Test Lab",
      contactInfo: "test@example.com",
      qrCode: {
        data: "https://verify.example.com/doc456",
        size: 80,
      },
      appearance: {
        page: 0,
        x: 50,
        y: 50,
        width: 400,
        height: 120,
      },
    };

    const signedPdf = await signPdf(testPdf, options);

    expect(signedPdf).toBeInstanceOf(Buffer);
    expect(signedPdf.length).toBeGreaterThan(testPdf.length);
  });

  it("should handle invalid PDF gracefully", async () => {
    const invalidPdf = Buffer.from("not a pdf");

    const options: SignPdfOptions = {
      certificate: mockCertificate,
      reason: "Testing error handling",
      location: "Test Lab",
      contactInfo: "test@example.com",
    };

    await expect(signPdf(invalidPdf, options)).rejects.toThrow();
  });
});
