import { sha256 } from "./primitives/sha256.ts";
import { sha384, sha512 } from "./primitives/sha512.ts";
import type { HashAlgorithm } from "./types.ts";

export function hash(algorithm: HashAlgorithm, data: Uint8Array): Uint8Array {
   switch (algorithm) {
      case "sha256":
         return sha256(data);
      case "sha384":
         return sha384(data);
      case "sha512":
         return sha512(data);
   }
}
