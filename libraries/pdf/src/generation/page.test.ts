import { describe, expect, test } from "bun:test";
import { createRef } from "../core/objects.ts";
import { PDFPage } from "./page.ts";

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
      expect(content).toMatch(/\/F\d+ 24 Tf/); // Font reference with size
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

   test("can draw rectangle", () => {
      const page = new PDFPage(createRef(1, 0));
      page.drawRectangle({
         x: 100,
         y: 100,
         width: 200,
         height: 150,
      });
      expect(page.contentStream.length).toBeGreaterThan(0);
   });

   test("draws filled rectangle", () => {
      const page = new PDFPage(createRef(1, 0));
      page.drawRectangle({
         x: 50,
         y: 50,
         width: 100,
         height: 100,
         fill: { type: "rgb", r: 0, g: 0, b: 1 },
      });
      const content = page.contentStream.join("\n");
      expect(content).toContain("0 0 1 rg"); // Fill color
      expect(content).toContain("f"); // Fill operator
   });

   test("draws stroked rectangle", () => {
      const page = new PDFPage(createRef(1, 0));
      page.drawRectangle({
         x: 50,
         y: 50,
         width: 100,
         height: 100,
         stroke: { type: "rgb", r: 1, g: 0, b: 0 },
         lineWidth: 2,
      });
      const content = page.contentStream.join("\n");
      expect(content).toContain("1 0 0 RG"); // Stroke color
      expect(content).toContain("2 w"); // Line width
      expect(content).toContain("S"); // Stroke operator
   });

   test("can draw line", () => {
      const page = new PDFPage(createRef(1, 0));
      page.drawLine({
         x1: 50,
         y1: 50,
         x2: 200,
         y2: 200,
      });
      const content = page.contentStream.join("\n");
      expect(content).toContain("50 50 m"); // Move to
      expect(content).toContain("200 200 l"); // Line to
      expect(content).toContain("S"); // Stroke
   });

   test("draws line with color and width", () => {
      const page = new PDFPage(createRef(1, 0));
      page.drawLine({
         x1: 0,
         y1: 0,
         x2: 100,
         y2: 100,
         color: { type: "gray", gray: 0.5 },
         lineWidth: 3,
      });
      const content = page.contentStream.join("\n");
      expect(content).toContain("0.5 G"); // Gray stroke color
      expect(content).toContain("3 w"); // Line width
   });

   test("rejects invalid fonts", () => {
      const page = new PDFPage(createRef(1, 0));
      expect(() =>
         page.drawText("Test", { x: 0, y: 0, font: "InvalidFont" as any }),
      ).toThrow("not a standard PDF font");
   });

   test("uses correct font reference names", () => {
      const page = new PDFPage(createRef(1, 0));
      page.drawText("Test", { x: 0, y: 0, font: "Times-Bold" });
      const content = page.contentStream.join("\n");
      expect(content).toMatch(/\/F\d+ 12 Tf/); // Font reference with number
   });
});
