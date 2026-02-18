import { oidToBytes } from "./oid.ts";
import type { Asn1Node } from "./types.ts";

/**
 * Create a SEQUENCE node (tag 0x10, constructed).
 */
export function sequence(...children: Asn1Node[]): Asn1Node {
   return { tag: 0x10, constructed: true, class: "universal", value: children };
}

/**
 * Create a SET node (tag 0x11, constructed).
 */
export function set(...children: Asn1Node[]): Asn1Node {
   return { tag: 0x11, constructed: true, class: "universal", value: children };
}

/**
 * Create an INTEGER node (tag 0x02).
 * Handles both number and bigint values.
 * Encodes in minimal two's complement form.
 */
export function integer(value: number | bigint): Asn1Node {
   let bytes: Uint8Array;

   if (typeof value === "bigint") {
      bytes = bigintToTwosComplement(value);
   } else {
      bytes = numberToTwosComplement(value);
   }

   return { tag: 0x02, constructed: false, class: "universal", value: bytes };
}

/**
 * Create an OID node (tag 0x06).
 */
export function oid(dotNotation: string): Asn1Node {
   const bytes = oidToBytes(dotNotation);
   return { tag: 0x06, constructed: false, class: "universal", value: bytes };
}

/**
 * Create an OCTET STRING node (tag 0x04).
 */
export function octetString(data: Uint8Array): Asn1Node {
   return { tag: 0x04, constructed: false, class: "universal", value: data };
}

/**
 * Create a BIT STRING node (tag 0x03).
 * Prepends the unused-bits byte to the data.
 */
export function bitString(data: Uint8Array, unusedBits = 0): Asn1Node {
   const value = new Uint8Array(1 + data.length);
   value[0] = unusedBits;
   value.set(data, 1);
   return { tag: 0x03, constructed: false, class: "universal", value };
}

/**
 * Create a UTF8String node (tag 0x0C).
 */
export function utf8String(value: string): Asn1Node {
   const bytes = new TextEncoder().encode(value);
   return { tag: 0x0c, constructed: false, class: "universal", value: bytes };
}

/**
 * Create an IA5String node (tag 0x16).
 */
export function ia5String(value: string): Asn1Node {
   const bytes = new TextEncoder().encode(value);
   return { tag: 0x16, constructed: false, class: "universal", value: bytes };
}

/**
 * Create a PrintableString node (tag 0x13).
 */
export function printableString(value: string): Asn1Node {
   const bytes = new TextEncoder().encode(value);
   return { tag: 0x13, constructed: false, class: "universal", value: bytes };
}

/**
 * Create a BOOLEAN node (tag 0x01).
 * DER: true = 0xFF, false = 0x00.
 */
export function boolean(value: boolean): Asn1Node {
   return {
      tag: 0x01,
      constructed: false,
      class: "universal",
      value: new Uint8Array([value ? 0xff : 0x00]),
   };
}

/**
 * Create a NULL node (tag 0x05).
 */
export function nullValue(): Asn1Node {
   return {
      tag: 0x05,
      constructed: false,
      class: "universal",
      value: new Uint8Array(0),
   };
}

/**
 * Create a UTCTime node (tag 0x17).
 * Format: YYMMDDHHmmssZ (2-digit year).
 */
export function utcTime(date: Date): Asn1Node {
   const year = String(date.getUTCFullYear() % 100).padStart(2, "0");
   const month = String(date.getUTCMonth() + 1).padStart(2, "0");
   const day = String(date.getUTCDate()).padStart(2, "0");
   const hours = String(date.getUTCHours()).padStart(2, "0");
   const minutes = String(date.getUTCMinutes()).padStart(2, "0");
   const seconds = String(date.getUTCSeconds()).padStart(2, "0");
   const str = `${year}${month}${day}${hours}${minutes}${seconds}Z`;
   const bytes = new TextEncoder().encode(str);
   return { tag: 0x17, constructed: false, class: "universal", value: bytes };
}

/**
 * Create a GeneralizedTime node (tag 0x18).
 * Format: YYYYMMDDHHmmssZ (4-digit year).
 */
export function generalizedTime(date: Date): Asn1Node {
   const year = String(date.getUTCFullYear()).padStart(4, "0");
   const month = String(date.getUTCMonth() + 1).padStart(2, "0");
   const day = String(date.getUTCDate()).padStart(2, "0");
   const hours = String(date.getUTCHours()).padStart(2, "0");
   const minutes = String(date.getUTCMinutes()).padStart(2, "0");
   const seconds = String(date.getUTCSeconds()).padStart(2, "0");
   const str = `${year}${month}${day}${hours}${minutes}${seconds}Z`;
   const bytes = new TextEncoder().encode(str);
   return { tag: 0x18, constructed: false, class: "universal", value: bytes };
}

/**
 * Create a context-specific tagged node.
 *
 * If explicit (default): wraps children in a constructed context tag.
 * If implicit: replaces the tag of the single child, preserving its value bytes.
 */
export function contextTag(
   tag: number,
   children: Asn1Node[],
   explicit = true,
): Asn1Node {
   if (explicit) {
      return {
         tag,
         constructed: true,
         class: "context",
         value: children,
      };
   }

   // Implicit: take the single child's value bytes directly
   if (children.length !== 1) {
      throw new Error("Implicit context tag requires exactly one child node");
   }

   const child = children[0]!;

   // For implicit tagging, we use the child's primitive value bytes
   // If the child is constructed, we need to preserve that
   if (child.constructed && Array.isArray(child.value)) {
      return {
         tag,
         constructed: true,
         class: "context",
         value: child.value,
      };
   }

   return {
      tag,
      constructed: false,
      class: "context",
      value: child.value as Uint8Array,
   };
}

// --- Internal helpers ---

function numberToTwosComplement(value: number): Uint8Array {
   if (value === 0) {
      return new Uint8Array([0x00]);
   }

   if (value > 0) {
      return positiveToBytes(value);
   }

   // Negative: compute two's complement
   return negativeToBytes(value);
}

function positiveToBytes(value: number): Uint8Array {
   const bytes: number[] = [];
   let v = value;
   while (v > 0) {
      bytes.unshift(v & 0xff);
      v = v >>> 8;
   }

   // If high bit is set, prepend 0x00 for positive number
   if (bytes.length > 0 && bytes[0]! & 0x80) {
      bytes.unshift(0x00);
   }

   return new Uint8Array(bytes);
}

function negativeToBytes(value: number): Uint8Array {
   // Determine the number of bytes needed
   let numBytes = 1;
   let min = -128;
   while (value < min) {
      numBytes++;
      min = -(1 << (numBytes * 8 - 1));
   }

   const bytes = new Uint8Array(numBytes);
   // Convert to two's complement by using unsigned representation
   let v = value;
   for (let i = numBytes - 1; i >= 0; i--) {
      bytes[i] = v & 0xff;
      v = Math.floor(v / 256); // Use floor division to handle sign extension
   }

   return bytes;
}

function bigintToTwosComplement(value: bigint): Uint8Array {
   if (value === 0n) {
      return new Uint8Array([0x00]);
   }

   if (value > 0n) {
      const bytes: number[] = [];
      let v = value;
      while (v > 0n) {
         bytes.unshift(Number(v & 0xffn));
         v = v >> 8n;
      }
      // Prepend 0x00 if high bit set
      if (bytes.length > 0 && bytes[0]! & 0x80) {
         bytes.unshift(0x00);
      }
      return new Uint8Array(bytes);
   }

   // Negative bigint: find minimum byte count, then compute two's complement
   let numBytes = 1;
   let min = -128n;
   while (value < min) {
      numBytes++;
      min = -(1n << BigInt(numBytes * 8 - 1));
   }

   // Compute the two's complement: (2^(numBytes*8)) + value
   const modulus = 1n << BigInt(numBytes * 8);
   let unsigned = modulus + value;

   const bytes = new Uint8Array(numBytes);
   for (let i = numBytes - 1; i >= 0; i--) {
      bytes[i] = Number(unsigned & 0xffn);
      unsigned = unsigned >> 8n;
   }

   return bytes;
}
