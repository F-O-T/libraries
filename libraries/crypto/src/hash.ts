import { createHash } from "node:crypto";
import type { HashAlgorithm } from "./types.ts";

export function hash(algorithm: HashAlgorithm, data: Uint8Array): Uint8Array {
   const h = createHash(algorithm);
   h.update(data);
   return new Uint8Array(h.digest());
}
