import { describe, expect, it } from "bun:test";
import { PDFDocument } from "@f-o-t/pdf/plugins/generation";
import { detectSigningPosition } from "../src/detect-position.ts";

function createBlankPdf(): Uint8Array {
   const doc = new PDFDocument();
   doc.addPage({ width: 612, height: 792 });
   return doc.save();
}

function createPdfWithText(text: string): Uint8Array {
   const doc = new PDFDocument();
   const page = doc.addPage({ width: 612, height: 792 });
   page.drawText(text, { x: 50, y: 700, size: 12 });
   return doc.save();
}

function createMultiPagePdf(texts: string[]): Uint8Array {
   const doc = new PDFDocument();
   for (const text of texts) {
      const page = doc.addPage({ width: 612, height: 792 });
      page.drawText(text, { x: 50, y: 700, size: 12 });
   }
   return doc.save();
}

describe("detectSigningPosition", () => {
   it("returns null for invalid PDF data", () => {
      const result = detectSigningPosition(new Uint8Array([1, 2, 3]));
      expect(result).toBeNull();
   });

   it("returns fallback position for blank PDF (no signals)", () => {
      const pdf = createBlankPdf();
      const result = detectSigningPosition(pdf);
      expect(result).not.toBeNull();
      expect(result?.page).toBe(0);
      // Centered horizontally: (595 - 260) / 2 = 167.5
      expect(result?.x).toBe(167.5);
      expect(result?.y).toBeGreaterThan(500);
      expect(result?.confidence).toBe(0.1);
   });

   it("returns a DetectedPosition with correct shape", () => {
      const pdf = createPdfWithText("Assinatura do representante");
      const result = detectSigningPosition(pdf);
      expect(result).not.toBeNull();
      expect(typeof result?.page).toBe("number");
      expect(typeof result?.x).toBe("number");
      expect(typeof result?.y).toBe("number");
      expect(typeof result?.confidence).toBe("number");
      expect(result?.confidence).toBeGreaterThan(0.1);
   });

   it("boosts confidence when signer name is found", () => {
      const pdf = createPdfWithText("João da Silva assinatura");
      const withName = detectSigningPosition(pdf, {
         signerName: "João da Silva",
      });
      const withoutName = detectSigningPosition(pdf);
      expect(withName).not.toBeNull();
      expect(withoutName).not.toBeNull();
      expect(withName?.confidence).toBeGreaterThanOrEqual(
         withoutName?.confidence ?? 0,
      );
   });

   it("defaults to last page when preferredPage is -1", () => {
      const pdf = createMultiPagePdf(["Página 1", "Página 2 assinatura"]);
      const result = detectSigningPosition(pdf, { preferredPage: -1 });
      expect(result).not.toBeNull();
      expect(result?.page).toBe(1);
   });

   it("centers x when width option is provided", () => {
      const pdf = createPdfWithText("assinatura");
      const result = detectSigningPosition(pdf, { width: 200 });
      expect(result).not.toBeNull();
      expect(result?.x).toBeGreaterThan(100);
      expect(result?.x).toBeLessThan(300);
   });

   it("returns fallback for PDF with no matching text", () => {
      const pdf = createPdfWithText("Hello World nothing relevant here");
      const result = detectSigningPosition(pdf);
      expect(result).not.toBeNull();
      expect(result?.confidence).toBe(0.1);
      expect(result?.y).toBeGreaterThan(500);
   });
});
