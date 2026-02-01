import { describe, expect, test } from "bun:test";
import {
   createArray,
   createDictionary,
   createName,
   createRef,
   createStream,
   isArray,
   isDictionary,
   isName,
   isRef,
   isStream,
} from "../../src/core/objects.ts";

describe("PDF Objects", () => {
   test("createName creates PDF name", () => {
      const name = createName("Type");
      expect(name.type).toBe("name");
      expect(name.value).toBe("Type");
   });

   test("createRef creates PDF reference", () => {
      const ref = createRef(1, 0);
      expect(ref.objectNumber).toBe(1);
      expect(ref.generation).toBe(0);
   });

   test("createDictionary creates empty dictionary", () => {
      const dict = createDictionary();
      expect(typeof dict).toBe("object");
      expect(Object.keys(dict).length).toBe(0);
   });

   test("createDictionary with entries", () => {
      const dict = createDictionary({
         Type: createName("Page"),
         Parent: createRef(1, 0),
      });
      expect(dict.Type).toEqual(createName("Page"));
      expect(dict.Parent).toEqual(createRef(1, 0));
   });

   test("createArray creates PDF array", () => {
      const arr = createArray([1, 2, 3]);
      expect(arr).toEqual([1, 2, 3]);
   });

   test("createStream creates PDF stream", () => {
      const data = new Uint8Array([1, 2, 3]);
      const stream = createStream(data);
      expect(stream.data).toEqual(data);
      expect(typeof stream.dictionary).toBe("object");
   });

   test("isRef type guard", () => {
      expect(isRef(createRef(1, 0))).toBe(true);
      expect(isRef({ objectNumber: 1 })).toBe(false);
      expect(isRef(123)).toBe(false);
   });

   test("isName type guard", () => {
      expect(isName(createName("Test"))).toBe(true);
      expect(isName({ type: "other", value: "test" })).toBe(false);
      expect(isName("test")).toBe(false);
   });

   test("isDictionary type guard", () => {
      expect(isDictionary(createDictionary())).toBe(true);
      expect(isDictionary({})).toBe(true);
      expect(isDictionary(null)).toBe(false);
   });

   test("isStream type guard", () => {
      const stream = createStream(new Uint8Array([1, 2, 3]));
      expect(isStream(stream)).toBe(true);
      expect(isStream({ dictionary: {}, data: "not a uint8array" })).toBe(
         false,
      );
      expect(isStream({ dictionary: {} })).toBe(false);
      expect(isStream({})).toBe(false);
   });

   test("isArray type guard", () => {
      expect(isArray(createArray([1, 2, 3]))).toBe(true);
      expect(isArray([])).toBe(true);
      expect(isArray({})).toBe(false);
      expect(isArray("array")).toBe(false);
   });

   test("createRef validates object number", () => {
      expect(() => createRef(0)).toThrow("Object number must be positive");
      expect(() => createRef(-1)).toThrow("Object number must be positive");
   });

   test("createRef validates generation number", () => {
      expect(() => createRef(1, -1)).toThrow(
         "Generation number must be between 0 and 65535",
      );
      expect(() => createRef(1, 70000)).toThrow(
         "Generation number must be between 0 and 65535",
      );
   });

   test("isDictionary excludes other PDF objects", () => {
      expect(isDictionary(createRef(1, 0))).toBe(false);
      expect(isDictionary(createName("Test"))).toBe(false);
      expect(isDictionary(createStream(new Uint8Array([])))).toBe(false);
      expect(isDictionary(createArray([]))).toBe(false);
   });
});
