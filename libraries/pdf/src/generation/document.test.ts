import { describe, expect, test } from "bun:test";
import { PDFDocument } from "./document.ts";

describe("PDFDocument", () => {
   test("creates document with default version", () => {
      const doc = new PDFDocument();
      expect(doc.version).toBe("1.7");
   });

   test("creates document with custom version", () => {
      const doc = new PDFDocument({ version: "1.4" });
      expect(doc.version).toBe("1.4");
   });

   test("generates valid PDF header", () => {
      const doc = new PDFDocument();
      const bytes = doc.save();
      const decoder = new TextDecoder();
      const header = decoder.decode(bytes.slice(0, 8));
      expect(header).toBe("%PDF-1.7");
   });

   test("has catalog object", () => {
      const doc = new PDFDocument();
      expect(doc.catalog).toBeDefined();
   });

   test("has pages object", () => {
      const doc = new PDFDocument();
      expect(doc.pages).toBeDefined();
   });
});
