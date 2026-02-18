import { describe, expect, it } from "bun:test";
import {
   boolean as asn1Boolean,
   bitString,
   contextTag,
   generalizedTime,
   ia5String,
   integer,
   nullValue,
   octetString,
   oid,
   printableString,
   sequence,
   set,
   utcTime,
   utf8String,
} from "../src/builders.ts";
import { encodeDer } from "../src/encoder.ts";

describe("builders", () => {
   it("integer handles BigInt", () => {
      const node = integer(BigInt("256"));
      const encoded = encodeDer(node);
      expect(encoded).toEqual(new Uint8Array([0x02, 0x02, 0x01, 0x00]));
   });

   it("bitString prepends unused-bits byte", () => {
      const data = new Uint8Array([0xff]);
      const node = bitString(data);
      const encoded = encodeDer(node);
      // tag(03) + len(02) + unused(00) + data(FF)
      expect(encoded).toEqual(new Uint8Array([0x03, 0x02, 0x00, 0xff]));
   });

   it("utcTime formats correctly", () => {
      const date = new Date("2026-02-13T12:00:00Z");
      const node = utcTime(date);
      const encoded = encodeDer(node);
      const value = new TextDecoder().decode(encoded.slice(2));
      expect(value).toBe("260213120000Z");
   });

   it("generalizedTime formats correctly", () => {
      const date = new Date("2026-02-13T12:00:00Z");
      const node = generalizedTime(date);
      const encoded = encodeDer(node);
      const value = new TextDecoder().decode(encoded.slice(2));
      expect(value).toBe("20260213120000Z");
   });

   it("contextTag explicit wraps children", () => {
      const node = contextTag(0, [integer(42)], true);
      const encoded = encodeDer(node);
      // A0 03 02 01 2A
      expect(encoded[0]).toBe(0xa0);
      expect(encoded[1]).toBe(0x03);
      expect(encoded[2]).toBe(0x02); // inner INTEGER tag
   });

   it("contextTag implicit replaces tag", () => {
      const node = contextTag(0, [integer(42)], false);
      const encoded = encodeDer(node);
      // 80 01 2A (context class, primitive, tag 0, value from integer)
      expect(encoded[0]).toBe(0x80);
      expect(encoded[1]).toBe(0x01);
      expect(encoded[2]).toBe(0x2a);
   });

   it("set creates constructed SET", () => {
      const node = set(integer(1), integer(2));
      const encoded = encodeDer(node);
      expect(encoded[0]).toBe(0x31); // SET tag
   });

   it("utf8String encodes correctly", () => {
      const node = utf8String("hello");
      const encoded = encodeDer(node);
      expect(encoded[0]).toBe(0x0c);
      expect(encoded[1]).toBe(5);
      expect(new TextDecoder().decode(encoded.slice(2))).toBe("hello");
   });

   it("ia5String encodes correctly", () => {
      const node = ia5String("test@example.com");
      const encoded = encodeDer(node);
      expect(encoded[0]).toBe(0x16);
   });

   it("printableString encodes correctly", () => {
      const node = printableString("US");
      const encoded = encodeDer(node);
      expect(encoded[0]).toBe(0x13);
      expect(encoded[1]).toBe(2);
   });
});
