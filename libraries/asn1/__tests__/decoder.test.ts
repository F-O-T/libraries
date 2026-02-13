import { describe, expect, it } from "bun:test";
import { decodeDer } from "../src/decoder.ts";
import { encodeDer } from "../src/encoder.ts";
import {
   sequence,
   integer,
   boolean as asn1Boolean,
   nullValue,
   oid,
   octetString,
   utf8String,
} from "../src/builders.ts";

describe("decodeDer", () => {
   it("decodes NULL", () => {
      const node = decodeDer(new Uint8Array([0x05, 0x00]));
      expect(node.tag).toBe(5);
      expect(node.class).toBe("universal");
      expect(node.constructed).toBe(false);
      expect(node.value).toEqual(new Uint8Array([]));
   });

   it("decodes BOOLEAN true", () => {
      const node = decodeDer(new Uint8Array([0x01, 0x01, 0xff]));
      expect(node.tag).toBe(1);
      expect(node.value).toEqual(new Uint8Array([0xff]));
   });

   it("decodes INTEGER", () => {
      const node = decodeDer(new Uint8Array([0x02, 0x01, 0x7f]));
      expect(node.tag).toBe(2);
      expect(node.value).toEqual(new Uint8Array([0x7f]));
   });

   it("decodes SEQUENCE", () => {
      const data = new Uint8Array([
         0x30, 0x06, 0x02, 0x01, 0x01, 0x01, 0x01, 0xff,
      ]);
      const node = decodeDer(data);
      expect(node.tag).toBe(0x10);
      expect(node.constructed).toBe(true);
      expect(node.class).toBe("universal");
      const children = node.value as any[];
      expect(children.length).toBe(2);
      expect(children[0].tag).toBe(2); // INTEGER
      expect(children[1].tag).toBe(1); // BOOLEAN
   });

   it("decodes context-specific tag", () => {
      // [0] EXPLICIT containing INTEGER 42
      const data = new Uint8Array([0xa0, 0x03, 0x02, 0x01, 0x2a]);
      const node = decodeDer(data);
      expect(node.tag).toBe(0);
      expect(node.class).toBe("context");
      expect(node.constructed).toBe(true);
   });

   it("throws on truncated data", () => {
      expect(() => decodeDer(new Uint8Array([0x02, 0x05, 0x01]))).toThrow();
   });

   it("throws on empty data", () => {
      expect(() => decodeDer(new Uint8Array([]))).toThrow();
   });
});

describe("round-trip", () => {
   it("encode then decode preserves structure", () => {
      const original = sequence(
         integer(42),
         asn1Boolean(true),
         nullValue(),
         utf8String("hello"),
         oid("1.2.840.113549.1.1.11"),
      );
      const encoded = encodeDer(original);
      const decoded = decodeDer(encoded);
      const reEncoded = encodeDer(decoded);
      expect(reEncoded).toEqual(encoded);
   });

   it("handles deeply nested structures", () => {
      const node = sequence(
         sequence(sequence(integer(1)), integer(2)),
         integer(3),
      );
      const encoded = encodeDer(node);
      const decoded = decodeDer(encoded);
      const reEncoded = encodeDer(decoded);
      expect(reEncoded).toEqual(encoded);
   });
});
