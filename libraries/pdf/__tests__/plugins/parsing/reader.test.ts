import { describe, expect, test } from "bun:test";
import { PDFReader } from "../../../src/plugins/parsing/reader.ts";
import { PDFDocument } from "../../../src/plugins/generation/document.ts";

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

   test("extracts text from TJ arrays", () => {
      // Build a minimal PDF whose content stream uses the TJ operator
      const contentStream = "BT /F1 12 Tf [(Hello) -10 (World)] TJ ET";
      const streamBytes = new TextEncoder().encode(contentStream);

      const pdf = [
         "%PDF-1.7",
         "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
         "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
         `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj`,
         `4 0 obj << /Length ${streamBytes.length} >> stream`,
         contentStream,
         "endstream endobj",
         "",
      ].join("\n");

      // Build xref table
      const lines = pdf.split("\n");
      const offsets: number[] = [];
      let pos = 0;
      for (const line of lines) {
         if (/^\d+ 0 obj/.test(line)) {
            const objNum = parseInt(line.split(" ")[0]!, 10);
            offsets[objNum] = pos;
         }
         pos += line.length + 1; // +1 for \n
      }

      const xrefOffset = pdf.length;
      const xrefLines = [
         "xref",
         `0 ${offsets.length}`,
         "0000000000 65535 f ",
      ];
      for (let i = 1; i < offsets.length; i++) {
         xrefLines.push(`${String(offsets[i]!).padStart(10, "0")} 00000 n `);
      }
      xrefLines.push(
         "trailer << /Size 5 /Root 1 0 R >>",
         "startxref",
         String(xrefOffset),
         "%%EOF",
      );

      const fullPdf = pdf + xrefLines.join("\n");
      const bytes = new TextEncoder().encode(fullPdf);

      const reader = new PDFReader(bytes);
      const parsed = reader.parse();

      expect(parsed.pages[0].content).toContain("HelloWorld");
   });

   test("extracts text from quote operators", () => {
      const contentStream = "(Line one) Tj (Line two) '";
      const streamBytes = new TextEncoder().encode(contentStream);

      const pdf = [
         "%PDF-1.7",
         "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
         "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
         `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj`,
         `4 0 obj << /Length ${streamBytes.length} >> stream`,
         contentStream,
         "endstream endobj",
         "",
      ].join("\n");

      const lines = pdf.split("\n");
      const offsets: number[] = [];
      let pos = 0;
      for (const line of lines) {
         if (/^\d+ 0 obj/.test(line)) {
            const objNum = parseInt(line.split(" ")[0]!, 10);
            offsets[objNum] = pos;
         }
         pos += line.length + 1;
      }

      const xrefOffset = pdf.length;
      const xrefLines = [
         "xref",
         `0 ${offsets.length}`,
         "0000000000 65535 f ",
      ];
      for (let i = 1; i < offsets.length; i++) {
         xrefLines.push(`${String(offsets[i]!).padStart(10, "0")} 00000 n `);
      }
      xrefLines.push(
         "trailer << /Size 5 /Root 1 0 R >>",
         "startxref",
         String(xrefOffset),
         "%%EOF",
      );

      const fullPdf = pdf + xrefLines.join("\n");
      const bytes = new TextEncoder().encode(fullPdf);

      const reader = new PDFReader(bytes);
      const parsed = reader.parse();

      expect(parsed.pages[0].content).toContain("Line one");
      expect(parsed.pages[0].content).toContain("Line two");
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
