import type { Asn1Class, Asn1Node } from "./types.ts";

const CLASS_MAP: Asn1Class[] = [
   "universal",
   "application",
   "context",
   "private",
];

/**
 * Decode a DER-encoded ASN.1 structure.
 * Returns the first complete TLV from the data.
 */
export function decodeDer(data: Uint8Array): Asn1Node {
   if (data.length === 0) {
      throw new Error("Cannot decode empty data");
   }

   const [node] = decodeTlv(data, 0);

   return node;
}

/**
 * Decode a single TLV starting at the given offset.
 * Returns the decoded node and the offset after the TLV.
 */
function decodeTlv(data: Uint8Array, offset: number): [Asn1Node, number] {
   if (offset >= data.length) {
      throw new Error("Unexpected end of data while reading tag");
   }

   const startByte = data[offset]!;
   offset++;

   // Extract class (high 2 bits)
   const classBits = (startByte >> 6) & 0x03;
   const asn1Class = CLASS_MAP[classBits] ?? ("universal" as Asn1Class);

   // Extract constructed flag (bit 5)
   const constructed = (startByte & 0x20) !== 0;

   // Extract tag number (low 5 bits)
   let tag: number;
   const lowBits = startByte & 0x1f;

   if (lowBits === 0x1f) {
      // Long-form tag
      tag = 0;
      let byte: number;
      do {
         if (offset >= data.length) {
            throw new Error("Truncated long-form tag");
         }
         byte = data[offset]!;
         offset++;
         tag = (tag << 7) | (byte & 0x7f);
      } while (byte & 0x80);
   } else {
      tag = lowBits;
   }

   // Read length
   if (offset >= data.length) {
      throw new Error("Unexpected end of data while reading length");
   }

   const lengthByte = data[offset]!;
   offset++;
   let length: number;

   if (lengthByte === 0x80) {
      throw new Error("Indefinite length is not valid in DER encoding");
   }

   if (lengthByte < 0x80) {
      // Short form
      length = lengthByte;
   } else {
      // Long form
      const numLengthBytes = lengthByte & 0x7f;
      if (numLengthBytes === 0) {
         throw new Error("Invalid length encoding");
      }
      if (offset + numLengthBytes > data.length) {
         throw new Error("Truncated length encoding");
      }
      length = 0;
      for (let i = 0; i < numLengthBytes; i++) {
         length = (length << 8) | data[offset]!;
         offset++;
      }
   }

   // Read value
   if (offset + length > data.length) {
      throw new Error(
         `Truncated value: expected ${length} bytes but only ${data.length - offset} available`,
      );
   }

   const endOffset = offset + length;

   let value: Uint8Array | Asn1Node[];

   if (constructed) {
      // Recursively decode children
      const children: Asn1Node[] = [];
      let childOffset = offset;
      while (childOffset < endOffset) {
         const [child, nextOffset] = decodeTlv(data, childOffset);
         children.push(child);
         childOffset = nextOffset;
      }
      value = children;
   } else {
      value = new Uint8Array(data.subarray(offset, endOffset));
   }

   return [{ tag, constructed, class: asn1Class, value }, endOffset];
}
