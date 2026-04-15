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

   let indefinite = false;

   if (lengthByte === 0x80) {
      // BER indefinite length — only valid for constructed encodings
      indefinite = true;
      length = 0; // determined at parse time
   } else if (lengthByte < 0x80) {
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

   let value: Uint8Array | Asn1Node[];

   if (indefinite) {
      // Scan children until end-of-content octets (00 00)
      if (!constructed) {
         throw new Error("Indefinite length on primitive encoding is invalid");
      }
      const children: Asn1Node[] = [];
      let childOffset = offset;
      while (true) {
         if (childOffset + 1 >= data.length) {
            throw new Error("Truncated indefinite-length encoding: missing end-of-content");
         }
         // End-of-content: tag 0x00, length 0x00
         if (data[childOffset] === 0x00 && data[childOffset + 1] === 0x00) {
            childOffset += 2;
            break;
         }
         const [child, nextOffset] = decodeTlv(data, childOffset);
         children.push(child);
         childOffset = nextOffset;
      }
      return [{ tag, constructed, class: asn1Class, value: children }, childOffset];
   }

   // Read value
   if (offset + length > data.length) {
      throw new Error(
         `Truncated value: expected ${length} bytes but only ${data.length - offset} available`,
      );
   }

   const endOffset = offset + length;

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
