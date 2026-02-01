import { describe, expect, test } from "bun:test";
import { PDFParser } from "../../../src/plugins/parsing/parser.ts";

describe("PDFParser", () => {
   test("parses numbers", () => {
      const parser = new PDFParser(new TextEncoder().encode("123"));
      expect(parser.parseValue()).toBe(123);
   });

   test("parses strings", () => {
      const parser = new PDFParser(new TextEncoder().encode("(Hello)"));
      expect(parser.parseValue()).toBe("Hello");
   });

   test("parses names", () => {
      const parser = new PDFParser(new TextEncoder().encode("/Type"));
      const value = parser.parseValue();
      expect(value).toEqual({ type: "name", value: "Type" });
   });

   test("parses booleans", () => {
      const parser = new PDFParser(new TextEncoder().encode("true"));
      expect(parser.parseValue()).toBe(true);
   });

   test("parses null", () => {
      const parser = new PDFParser(new TextEncoder().encode("null"));
      expect(parser.parseValue()).toBe(null);
   });

   test("parses arrays", () => {
      const parser = new PDFParser(new TextEncoder().encode("[1 2 3]"));
      const arr = parser.parseValue();
      expect(Array.isArray(arr)).toBe(true);
      expect(arr).toEqual([1, 2, 3]);
   });

   test("parses dictionaries", () => {
      const parser = new PDFParser(new TextEncoder().encode("<< /Type /Page >>"));
      const dict = parser.parseValue();
      expect(typeof dict).toBe("object");
      expect(dict.Type).toEqual({ type: "name", value: "Page" });
   });

   test("parses references", () => {
      const parser = new PDFParser(new TextEncoder().encode("1 0 R"));
      const ref = parser.parseValue();
      expect(ref).toEqual({ objectNumber: 1, generation: 0 });
   });

   test("parses indirect objects", () => {
      const parser = new PDFParser(new TextEncoder().encode("1 0 obj\n<< /Type /Page >>\nendobj"));
      const obj = parser.parseIndirectObject();
      expect(obj.ref).toEqual({ objectNumber: 1, generation: 0 });
      expect(obj.value.Type).toEqual({ type: "name", value: "Page" });
   });

   test("parses nested structures", () => {
      const parser = new PDFParser(new TextEncoder().encode("<< /Array [1 2 /Name] >>"));
      const dict = parser.parseValue();
      expect(Array.isArray(dict.Array)).toBe(true);
      expect(dict.Array[2]).toEqual({ type: "name", value: "Name" });
   });
});
