import { describe, expect, test } from "bun:test";
import { hashPdfDocument } from "../src/plugins/pdf-signer/pdf-handler";

describe("PDF Handler", () => {
  test("hashPdfDocument - hashes PDF content correctly", () => {
    const pdfContent = Buffer.from("%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n%%EOF");
    const hash = hashPdfDocument(pdfContent);

    expect(hash).toBeInstanceOf(Buffer);
    expect(hash.length).toBe(32); // SHA-256 = 32 bytes
  });

  test("hashPdfDocument - produces consistent hashes", () => {
    const pdfContent = Buffer.from("%PDF-1.4\nTest content");
    const hash1 = hashPdfDocument(pdfContent);
    const hash2 = hashPdfDocument(pdfContent);

    expect(hash1.equals(hash2)).toBe(true);
  });

  test("hashPdfDocument - produces different hashes for different content", () => {
    const pdf1 = Buffer.from("%PDF-1.4\nContent A");
    const pdf2 = Buffer.from("%PDF-1.4\nContent B");

    const hash1 = hashPdfDocument(pdf1);
    const hash2 = hashPdfDocument(pdf2);

    expect(hash1.equals(hash2)).toBe(false);
  });

  test("hashPdfDocument - handles empty PDF", () => {
    const emptyPdf = Buffer.from("");
    const hash = hashPdfDocument(emptyPdf);

    expect(hash).toBeInstanceOf(Buffer);
    expect(hash.length).toBe(32);
  });
});
