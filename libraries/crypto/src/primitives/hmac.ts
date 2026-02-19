/**
 * HMAC pure TypeScript implementation (RFC 2104).
 *
 * Supports SHA-1, SHA-256, SHA-384, and SHA-512 as the underlying hash.
 * Zero runtime dependencies. Works in any JS environment.
 */

import { sha1 } from "./sha1.ts";
import { sha256 } from "./sha256.ts";
import { sha384, sha512 } from "./sha512.ts";

export type HmacHashAlgorithm = "sha1" | "sha256" | "sha384" | "sha512";

/**
 * Returns the block size (in bytes) for the given hash algorithm.
 * SHA-1/SHA-256: 64 bytes; SHA-384/SHA-512: 128 bytes.
 */
function blockSize(alg: HmacHashAlgorithm): number {
   return alg === "sha384" || alg === "sha512" ? 128 : 64;
}

/**
 * Dispatch to the appropriate hash function.
 */
function hashFn(alg: HmacHashAlgorithm, data: Uint8Array): Uint8Array {
   switch (alg) {
      case "sha1":
         return sha1(data);
      case "sha256":
         return sha256(data);
      case "sha384":
         return sha384(data);
      case "sha512":
         return sha512(data);
   }
}

/**
 * Compute HMAC(key, data) using the specified hash algorithm.
 *
 * @param alg  - Hash algorithm: 'sha1' | 'sha256' | 'sha384' | 'sha512'
 * @param key  - Secret key (any length)
 * @param data - Message data
 * @returns HMAC digest as Uint8Array (same length as hash output)
 */
export function hmac(
   alg: HmacHashAlgorithm,
   key: Uint8Array,
   data: Uint8Array,
): Uint8Array {
   const B = blockSize(alg);

   // Step 1: If key > block size, hash it; if shorter, pad with zeros.
   let k: Uint8Array;
   if (key.length > B) {
      k = hashFn(alg, key);
   } else {
      k = new Uint8Array(B);
      k.set(key);
   }

   // Step 2: ipad = k XOR 0x36, opad = k XOR 0x5c
   const ipad = new Uint8Array(B);
   const opad = new Uint8Array(B);
   for (let i = 0; i < B; i++) {
      ipad[i] = k[i]! ^ 0x36;
      opad[i] = k[i]! ^ 0x5c;
   }

   // Step 3: inner = H(ipad || data)
   const inner = new Uint8Array(B + data.length);
   inner.set(ipad);
   inner.set(data, B);
   const innerHash = hashFn(alg, inner);

   // Step 4: outer = H(opad || inner)
   const outer = new Uint8Array(B + innerHash.length);
   outer.set(opad);
   outer.set(innerHash, B);

   return hashFn(alg, outer);
}
