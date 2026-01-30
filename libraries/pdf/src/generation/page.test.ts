import { describe, expect, test } from "bun:test";
import { PDFPage } from "./page.ts";
import { createRef } from "../core/objects.ts";

describe("PDFPage", () => {
   test("creates page with default A4 size", () => {
      const page = new PDFPage(createRef(1, 0));
      expect(page.ref.objectNumber).toBe(1);
      expect(page.size).toBe("A4");
   });

   test("creates page with custom size", () => {
      const page = new PDFPage(createRef(1, 0), { size: "Letter" });
      expect(page.size).toBe("Letter");
   });

   test("creates page with custom dimensions", () => {
      const page = new PDFPage(createRef(1, 0), {
         size: { width: 500, height: 700 },
      });
      expect(page.size).toEqual({ width: 500, height: 700 });
   });

   test("generates page dictionary", () => {
      const parentRef = createRef(2, 0);
      const page = new PDFPage(createRef(3, 0), { parent: parentRef });
      const dict = page.toDictionary();

      expect(dict.Type).toEqual({ type: "name", value: "Page" });
      expect(dict.Parent).toEqual(parentRef);
      expect(dict.MediaBox).toBeDefined();
      expect(dict.Contents).toBeDefined();
      expect(dict.Resources).toBeDefined();
   });

   test("has content stream", () => {
      const page = new PDFPage(createRef(1, 0));
      expect(page.contentStream).toBeDefined();
   });

   test("can draw text", () => {
      const page = new PDFPage(createRef(1, 0));
      page.drawText("Hello World", { x: 50, y: 750 });
      expect(page.contentStream.length).toBeGreaterThan(0);
   });

   test("draws text with default font", () => {
      const page = new PDFPage(createRef(1, 0));
      page.drawText("Test", { x: 100, y: 700 });
      const content = page.contentStream.join("\n");
      expect(content).toContain("BT"); // Begin text
      expect(content).toContain("ET"); // End text
      expect(content).toContain("100 700 Td"); // Position
      expect(content).toContain("(Test) Tj"); // Show text
   });

   test("draws text with custom font and size", () => {
      const page = new PDFPage(createRef(1, 0));
      page.drawText("Test", { x: 50, y: 50, font: "Helvetica-Bold", size: 24 });
      const content = page.contentStream.join("\n");
      expect(content).toContain("/Helvetica-Bold");
      expect(content).toContain("24 Tf"); // Font size
   });

   test("draws text with color", () => {
      const page = new PDFPage(createRef(1, 0));
      page.drawText("Red", {
         x: 100,
         y: 100,
         color: { type: "rgb", r: 1, g: 0, b: 0 },
      });
      const content = page.contentStream.join("\n");
      expect(content).toContain("1 0 0 rg"); // RGB color
   });
});
