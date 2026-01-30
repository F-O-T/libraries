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

   test("can add page to document", () => {
      const doc = new PDFDocument();
      const page = doc.addPage();
      expect(page).toBeDefined();
      expect(page.ref.objectNumber).toBe(3); // After catalog and pages
   });

   test("can add multiple pages", () => {
      const doc = new PDFDocument();
      doc.addPage();
      doc.addPage({ size: "Letter" });
      doc.addPage({ size: { width: 500, height: 700 } });
      // Should have 3 pages
      const pagesDict = (doc as any).objects.get(doc.pages.objectNumber);
      expect(pagesDict.Count).toBe(3);
   });
});
