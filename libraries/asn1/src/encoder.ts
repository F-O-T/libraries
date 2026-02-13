import type { Asn1Node } from "./types.ts";

const CLASS_BITS: Record<string, number> = {
   universal: 0x00,
   application: 0x40,
   context: 0x80,
   private: 0xc0,
};

/**
 * Encode an ASN.1 node to DER format.
 */
export function encodeDer(node: Asn1Node): Uint8Array {
   const tagBytes = encodeTag(node);
   const valueBytes = encodeValue(node);
   const lengthBytes = encodeLength(valueBytes.length);

   const result = new Uint8Array(
      tagBytes.length + lengthBytes.length + valueBytes.length,
   );
   let offset = 0;
   result.set(tagBytes, offset);
   offset += tagBytes.length;
   result.set(lengthBytes, offset);
   offset += lengthBytes.length;
   result.set(valueBytes, offset);

   return result;
}

function encodeTag(node: Asn1Node): Uint8Array {
   const classBits = CLASS_BITS[node.class] ?? 0;
   const constructedBit = node.constructed ? 0x20 : 0;

   if (node.tag < 31) {
      return new Uint8Array([classBits | constructedBit | node.tag]);
   }

   // Long-form tag: low 5 bits = 0x1F, then tag number in base-128 VLQ
   const firstByte = classBits | constructedBit | 0x1f;
   const vlqBytes = encodeTagVlq(node.tag);
   const result = new Uint8Array(1 + vlqBytes.length);
   result[0] = firstByte;
   result.set(vlqBytes, 1);
   return result;
}

function encodeTagVlq(tag: number): Uint8Array {
   if (tag < 128) {
      return new Uint8Array([tag]);
   }

   const bytes: number[] = [];
   let v = tag;
   while (v > 0) {
      bytes.unshift(v & 0x7f);
      v = v >>> 7;
   }

   // Set high bit on all but last byte
   for (let i = 0; i < bytes.length - 1; i++) {
      const b = bytes[i];
      if (b !== undefined) {
         bytes[i] = b | 0x80;
      }
   }

   return new Uint8Array(bytes);
}

function encodeLength(length: number): Uint8Array {
   if (length < 128) {
      return new Uint8Array([length]);
   }

   // Determine how many bytes needed for the length value
   const lengthBytes: number[] = [];
   let v = length;
   while (v > 0) {
      lengthBytes.unshift(v & 0xff);
      v = v >>> 8;
   }

   const result = new Uint8Array(1 + lengthBytes.length);
   result[0] = 0x80 | lengthBytes.length;
   for (let i = 0; i < lengthBytes.length; i++) {
      result[i + 1] = lengthBytes[i]!;
   }
   return result;
}

function encodeValue(node: Asn1Node): Uint8Array {
   if (node.constructed && Array.isArray(node.value)) {
      // Recursively encode children
      let childBuffers = node.value.map((child) => encodeDer(child));

      // DER: SET OF elements must be sorted by encoded value (X.690 §11.6)
      if (node.class === "universal" && node.tag === 0x11) {
         childBuffers = childBuffers.slice().sort(compareDerBytes);
      }

      const totalLength = childBuffers.reduce(
         (sum, buf) => sum + buf.length,
         0,
      );
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const buf of childBuffers) {
         result.set(buf, offset);
         offset += buf.length;
      }
      return result;
   }

   // Primitive: value is Uint8Array
   return node.value as Uint8Array;
}

/**
 * Compare two DER-encoded byte arrays lexicographically.
 * Used for DER SET OF sorting per X.690 §11.6.
 */
function compareDerBytes(a: Uint8Array, b: Uint8Array): number {
   const minLen = Math.min(a.length, b.length);
   for (let i = 0; i < minLen; i++) {
      if (a[i]! !== b[i]!) return a[i]! - b[i]!;
   }
   return a.length - b.length;
}
