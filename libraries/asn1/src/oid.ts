/**
 * Encode an OID dot-notation string to DER value bytes.
 *
 * The first two components are combined: 40 * c[0] + c[1].
 * Remaining components are encoded as base-128 VLQ.
 */
export function oidToBytes(dotNotation: string): Uint8Array {
   const components = dotNotation.split(".").map((s) => {
      const n = Number.parseInt(s, 10);
      if (Number.isNaN(n) || n < 0) {
         throw new Error(`Invalid OID component: ${s}`);
      }
      return n;
   });

   if (components.length < 2) {
      throw new Error("OID must have at least 2 components");
   }

   const first = components[0]!;
   const second = components[1]!;

   if (first > 2) {
      throw new Error(
         `Invalid first OID arc: ${first} (must be 0, 1, or 2)`,
      );
   }

   const result: number[] = [];

   // First two components combined
   result.push(40 * first + second);

   // Remaining components as base-128 VLQ
   for (let i = 2; i < components.length; i++) {
      encodeVlq(components[i]!, result);
   }

   return new Uint8Array(result);
}

/**
 * Decode DER OID value bytes to dot-notation string.
 */
export function bytesToOid(data: Uint8Array): string {
   if (data.length === 0) {
      throw new Error("Empty OID data");
   }

   const components: number[] = [];

   // Decode first byte into two components
   const firstByte = data[0]!;
   if (firstByte < 80) {
      components.push(Math.floor(firstByte / 40));
      components.push(firstByte % 40);
   } else {
      // First component is 2, second is firstByte - 80
      components.push(2);
      components.push(firstByte - 80);
   }

   // Decode remaining VLQ-encoded components
   let offset = 1;
   while (offset < data.length) {
      let value = 0;
      let byte: number;
      do {
         if (offset >= data.length) {
            throw new Error("Truncated VLQ in OID");
         }
         byte = data[offset]!;
         offset++;
         value = (value << 7) | (byte & 0x7f);
      } while (byte & 0x80);
      components.push(value);
   }

   return components.join(".");
}

function encodeVlq(value: number, out: number[]): void {
   if (value < 128) {
      out.push(value);
      return;
   }

   // Collect 7-bit groups from least significant to most significant
   const bytes: number[] = [];
   let v = value;
   while (v > 0) {
      bytes.unshift(v & 0x7f);
      v = v >>> 7;
   }

   // Set high bit on all but the last byte
   for (let i = 0; i < bytes.length - 1; i++) {
      const b = bytes[i];
      if (b !== undefined) {
         bytes[i] = b | 0x80;
      }
   }

   for (const b of bytes) {
      out.push(b);
   }
}
