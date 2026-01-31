import { describe, expect, test } from "bun:test";
import { PDFReader } from "./reader.ts";
import { PDFDocument } from "../generation/document.ts";

describe("PDFReader", () => {
   test("reads generated PDF", () => {
      // Create a PDF
      const doc = new PDFDocument();
      const page = doc.addPage();
      page.drawText("Hello World", { x: 100, y: 700 });
      const bytes = doc.save();

      // Parse it
      const reader = new PDFReader(bytes);
      const parsed = reader.parse();

      expect(parsed.version).toBe("1.7");
      expect(parsed.catalog).toBeDefined();
      expect(parsed.pages.length).toBe(1);
   });

   test("extracts page size", () => {
      const doc = new PDFDocument();
      doc.addPage({ size: "Letter" });
      const bytes = doc.save();

      const reader = new PDFReader(bytes);
      const parsed = reader.parse();

      expect(parsed.pages[0].size.width).toBe(612);
      expect(parsed.pages[0].size.height).toBe(792);
   });

   test("extracts text content", () => {
      const doc = new PDFDocument();
      const page = doc.addPage();
      page.drawText("Test Text", { x: 100, y: 700 });
      const bytes = doc.save();

      const reader = new PDFReader(bytes);
      const parsed = reader.parse();

      expect(parsed.pages[0].content).toContain("Test Text");
   });

   test("handles multiple pages", () => {
      const doc = new PDFDocument();
      doc.addPage();
      doc.addPage();
      doc.addPage();
      const bytes = doc.save();

      const reader = new PDFReader(bytes);
      const parsed = reader.parse();

      expect(parsed.pages.length).toBe(3);
   });
});
