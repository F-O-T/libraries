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

   test("can draw text on page", () => {
      const doc = new PDFDocument();
      const page = doc.addPage();
      page.drawText("Hello PDF!", { x: 100, y: 700 });
      expect(page.contentStream.length).toBeGreaterThan(0);
   });

   test("can draw graphics on page", () => {
      const doc = new PDFDocument();
      const page = doc.addPage();
      page.drawRectangle({ x: 50, y: 50, width: 100, height: 100 });
      page.drawLine({ x1: 0, y1: 0, x2: 100, y2: 100 });
      expect(page.contentStream.length).toBeGreaterThan(0);
   });

   test("stores content stream in objects", () => {
      const doc = new PDFDocument();
      const page = doc.addPage();
      page.drawText("Test", { x: 100, y: 700 });
      
      // Content stream should be stored
      const contentStreamRef = page.getContentStreamRef();
      const obj = (doc as any).objects.get(contentStreamRef.objectNumber);
      expect(obj).toBeDefined();
      expect(obj.data).toBeInstanceOf(Uint8Array);
   });

   test("generates complete PDF", () => {
      const doc = new PDFDocument();
      const page = doc.addPage();
      page.drawText("Hello World", { x: 100, y: 700 });
      
      const bytes = doc.save();
      const decoder = new TextDecoder();
      const content = decoder.decode(bytes);
      
      // Check PDF structure
      expect(content).toContain("%PDF-1.7");
      expect(content).toContain("xref");
      expect(content).toContain("trailer");
      expect(content).toContain("startxref");
      expect(content).toContain("%%EOF");
   });

   test("PDF contains page content", () => {
      const doc = new PDFDocument();
      const page = doc.addPage();
      page.drawText("Test PDF", { x: 50, y: 750 });
      page.drawRectangle({ x: 100, y: 100, width: 200, height: 150 });
      
      const bytes = doc.save();
      const content = new TextDecoder().decode(bytes);
      
      expect(content).toContain("(Test PDF)");
      expect(content).toContain("100 100 200 150 re");
   });

   test("can save PDF to file", async () => {
      const doc = new PDFDocument({ version: "1.7" });
      const page = doc.addPage({ size: "Letter" });
      page.drawText("File Test", { x: 100, y: 700, size: 16 });
      
      const bytes = doc.save();
      
      // Verify it's valid PDF
      const content = new TextDecoder().decode(bytes.slice(0, 100));
      expect(content.startsWith("%PDF-1.7")).toBe(true);
   });
});
