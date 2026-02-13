import { describe, expect, it } from "bun:test";
import { encodeDer } from "../src/encoder.ts";
import {
   sequence,
   integer,
   boolean as asn1Boolean,
   nullValue,
   octetString,
   oid,
} from "../src/builders.ts";

describe("encodeDer", () => {
   it("encodes NULL", () => {
      const result = encodeDer(nullValue());
      expect(result).toEqual(new Uint8Array([0x05, 0x00]));
   });

   it("encodes BOOLEAN true", () => {
      const result = encodeDer(asn1Boolean(true));
      expect(result).toEqual(new Uint8Array([0x01, 0x01, 0xff]));
   });

   it("encodes BOOLEAN false", () => {
      const result = encodeDer(asn1Boolean(false));
      expect(result).toEqual(new Uint8Array([0x01, 0x01, 0x00]));
   });

   it("encodes INTEGER 0", () => {
      const result = encodeDer(integer(0));
      expect(result).toEqual(new Uint8Array([0x02, 0x01, 0x00]));
   });

   it("encodes INTEGER 127", () => {
      const result = encodeDer(integer(127));
      expect(result).toEqual(new Uint8Array([0x02, 0x01, 0x7f]));
   });

   it("encodes INTEGER 128 (needs leading zero)", () => {
      const result = encodeDer(integer(128));
      expect(result).toEqual(new Uint8Array([0x02, 0x02, 0x00, 0x80]));
   });

   it("encodes INTEGER -128", () => {
      const result = encodeDer(integer(-128));
      expect(result).toEqual(new Uint8Array([0x02, 0x01, 0x80]));
   });

   it("encodes INTEGER -1", () => {
      const result = encodeDer(integer(-1));
      expect(result).toEqual(new Uint8Array([0x02, 0x01, 0xff]));
   });

   it("encodes empty SEQUENCE", () => {
      const result = encodeDer(sequence());
      expect(result).toEqual(new Uint8Array([0x30, 0x00]));
   });

   it("encodes nested SEQUENCE", () => {
      const node = sequence(integer(1), asn1Boolean(true));
      const result = encodeDer(node);
      // SEQUENCE { INTEGER 1, BOOLEAN TRUE }
      // 30 06 02 01 01 01 01 FF
      expect(result).toEqual(
         new Uint8Array([0x30, 0x06, 0x02, 0x01, 0x01, 0x01, 0x01, 0xff]),
      );
   });

   it("encodes long-form length", () => {
      // Create an OCTET STRING with 200 bytes (requires long-form length)
      const data = new Uint8Array(200);
      const result = encodeDer(octetString(data));
      expect(result[0]).toBe(0x04); // tag
      expect(result[1]).toBe(0x81); // long form, 1 length byte
      expect(result[2]).toBe(200); // length
      expect(result.length).toBe(203); // tag + length(2) + value(200)
   });
});
