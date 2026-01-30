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
});
