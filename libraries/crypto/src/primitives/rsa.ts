/**
 * RSA PKCS#1 v1.5 signing — pure TypeScript.
 *
 * Implements:
 *   - PKCS#8 PrivateKeyInfo / OneAsymmetricKey parsing (RSA and EC detection)
 *   - RSA private key parsing (RFC 3447 RSAPrivateKey)
 *   - BigInt modular exponentiation with CRT optimization
 *   - PKCS#1 v1.5 DigestInfo encoding and signing
 *
 * Zero runtime dependencies. Works in any JS environment.
 */

import type { HashAlgorithm } from "../types.ts";
import { sha256 } from "./sha256.ts";
import { sha384, sha512 } from "./sha512.ts";

// ---- ASN.1 DER DigestInfo prefixes for PKCS#1 v1.5 (RFC 3447 §9.2) ----
// T = DER SEQUENCE { AlgorithmIdentifier { OID, NULL }, OCTET STRING header }
// before the actual hash value bytes.
//
// SHA-256: OID 2.16.840.1.101.3.4.2.1
// SHA-384: OID 2.16.840.1.101.3.4.2.2
// SHA-512: OID 2.16.840.1.101.3.4.2.3
const T: Record<HashAlgorithm, Uint8Array> = {
   sha256: new Uint8Array([
      0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03,
      0x04, 0x02, 0x01, 0x05, 0x00, 0x04, 0x20,
   ]),
   sha384: new Uint8Array([
      0x30, 0x41, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03,
      0x04, 0x02, 0x02, 0x05, 0x00, 0x04, 0x30,
   ]),
   sha512: new Uint8Array([
      0x30, 0x51, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03,
      0x04, 0x02, 0x03, 0x05, 0x00, 0x04, 0x40,
   ]),
};

// OID rsaEncryption: 1.2.840.113549.1.1.1
const OID_RSA_ENCRYPTION = new Uint8Array([
   0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
]);

// OID ecPublicKey: 1.2.840.10045.2.1
const OID_EC_PUBLIC_KEY = new Uint8Array([
   0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
]);

// ---- Simple DER reader ----

interface DerTlv {
   tag: number;
   length: number;
   valueOffset: number;
   totalLength: number;
}

function readTlv(der: Uint8Array, offset: number): DerTlv {
   const tag = der[offset]!;
   let lenOffset = offset + 1;
   let length: number;

   const firstByte = der[lenOffset]!;
   if (firstByte < 0x80) {
      length = firstByte;
      lenOffset += 1;
   } else {
      const numBytes = firstByte & 0x7f;
      length = 0;
      for (let i = 0; i < numBytes; i++) {
         length = (length << 8) | der[lenOffset + 1 + i]!;
      }
      lenOffset += 1 + numBytes;
   }

   return {
      tag,
      length,
      valueOffset: lenOffset,
      totalLength: lenOffset - offset + length,
   };
}

function bytesToBigInt(bytes: Uint8Array): bigint {
   let result = 0n;
   for (const b of bytes) {
      result = (result << 8n) | BigInt(b);
   }
   return result;
}

function bigIntToBytes(n: bigint, length: number): Uint8Array {
   const result = new Uint8Array(length);
   let tmp = n;
   for (let i = length - 1; i >= 0; i--) {
      result[i] = Number(tmp & 0xffn);
      tmp >>= 8n;
   }
   return result;
}

/** Parse a DER INTEGER (skipping potential leading 0x00 sign byte) */
function parseDerInteger(der: Uint8Array, offset: number): bigint {
   const tlv = readTlv(der, offset);
   if ((tlv.tag & 0x1f) !== 0x02) {
      throw new Error(
         `RSA: expected INTEGER tag 0x02, got 0x${tlv.tag.toString(16)}`,
      );
   }
   let bytes = der.subarray(tlv.valueOffset, tlv.valueOffset + tlv.length);
   // Strip leading 0x00 sign byte for positive integers
   if (bytes[0] === 0x00) bytes = bytes.subarray(1);
   return bytesToBigInt(bytes);
}

/** Get next TLV offset after the TLV at `offset` */
function nextTlvOffset(der: Uint8Array, offset: number): number {
   const tlv = readTlv(der, offset);
   return offset + tlv.totalLength;
}

// ---- RSAPrivateKey parsing (RFC 3447) ----

interface RsaPrivateKey {
   n: bigint;
   e: bigint;
   d: bigint;
   p: bigint;
   q: bigint;
   dp: bigint;
   dq: bigint;
   qInv: bigint;
   bitLength: number;
}

function parseRsaPrivateKey(der: Uint8Array): RsaPrivateKey {
   // RSAPrivateKey ::= SEQUENCE { version, n, e, d, p, q, dp, dq, qInv }
   const seqTlv = readTlv(der, 0);
   if ((seqTlv.tag & 0x1f) !== 0x10) {
      throw new Error("RSA: invalid RSAPrivateKey — expected SEQUENCE");
   }

   let offset = seqTlv.valueOffset;
   // version (should be 0)
   offset = nextTlvOffset(der, offset);

   const n = parseDerInteger(der, offset);
   offset = nextTlvOffset(der, offset);

   const e = parseDerInteger(der, offset);
   offset = nextTlvOffset(der, offset);

   const d = parseDerInteger(der, offset);
   offset = nextTlvOffset(der, offset);

   const p = parseDerInteger(der, offset);
   offset = nextTlvOffset(der, offset);

   const q = parseDerInteger(der, offset);
   offset = nextTlvOffset(der, offset);

   const dp = parseDerInteger(der, offset);
   offset = nextTlvOffset(der, offset);

   const dq = parseDerInteger(der, offset);
   offset = nextTlvOffset(der, offset);

   const qInv = parseDerInteger(der, offset);

   // Determine bit length from n
   let bitLength = 0;
   let tmp = n;
   while (tmp > 0n) {
      bitLength++;
      tmp >>= 1n;
   }
   // Round up to nearest byte multiple
   bitLength = Math.ceil(bitLength / 8) * 8;

   return { n, e, d, p, q, dp, dq, qInv, bitLength };
}

// ---- PKCS#8 parsing ----

export type KeyType = "rsa" | "ec";

export interface ParsedPrivateKey {
   type: KeyType;
   /** For RSA: the parsed RSAPrivateKey struct */
   rsa?: RsaPrivateKey;
   /** For EC: the raw EC private key scalar bytes */
   ecPrivateKeyBytes?: Uint8Array;
   /** For EC: the OID bytes of the named curve parameter */
   ecCurveOid?: Uint8Array;
}

/**
 * Parse a PKCS#8 PrivateKeyInfo or OneAsymmetricKey DER structure.
 * Detects whether the key is RSA or EC.
 */
export function parsePkcs8(der: Uint8Array): ParsedPrivateKey {
   // PrivateKeyInfo ::= SEQUENCE { version INTEGER, privateKeyAlgorithm AlgorithmIdentifier, privateKey OCTET STRING }
   const seqTlv = readTlv(der, 0);
   if ((seqTlv.tag & 0x1f) !== 0x10) {
      throw new Error("PKCS#8: expected SEQUENCE at top level");
   }

   let offset = seqTlv.valueOffset;
   // Skip version INTEGER
   offset = nextTlvOffset(der, offset);

   // AlgorithmIdentifier SEQUENCE
   const algTlv = readTlv(der, offset);
   if ((algTlv.tag & 0x1f) !== 0x10) {
      throw new Error("PKCS#8: expected AlgorithmIdentifier SEQUENCE");
   }

   const algContent = der.subarray(
      algTlv.valueOffset,
      algTlv.valueOffset + algTlv.length,
   );
   // First element of AlgorithmIdentifier is the algorithm OID
   const oidTlv = readTlv(algContent, 0);
   if ((oidTlv.tag & 0x1f) !== 0x06) {
      throw new Error("PKCS#8: expected OID in AlgorithmIdentifier");
   }
   const algOidBytes = algContent.subarray(
      oidTlv.valueOffset,
      oidTlv.valueOffset + oidTlv.length,
   );

   // Detect algorithm
   const isRsa =
      algOidBytes.length === OID_RSA_ENCRYPTION.length &&
      algOidBytes.every((b, i) => b === OID_RSA_ENCRYPTION[i]);
   const isEc =
      algOidBytes.length === OID_EC_PUBLIC_KEY.length &&
      algOidBytes.every((b, i) => b === OID_EC_PUBLIC_KEY[i]);

   offset = nextTlvOffset(der, offset);

   // privateKey OCTET STRING
   const pkTlv = readTlv(der, offset);
   if ((pkTlv.tag & 0x1f) !== 0x04) {
      throw new Error("PKCS#8: expected OCTET STRING for privateKey");
   }
   const pkBytes = der.subarray(
      pkTlv.valueOffset,
      pkTlv.valueOffset + pkTlv.length,
   );

   if (isRsa) {
      return { type: "rsa", rsa: parseRsaPrivateKey(pkBytes) };
   }

   if (isEc) {
      // ECPrivateKey ::= SEQUENCE { version, privateKey OCTET STRING, [0] namedCurve, [1] publicKey }
      const ecSeqTlv = readTlv(pkBytes, 0);
      let ecOffset = ecSeqTlv.valueOffset;
      // Skip version
      ecOffset = nextTlvOffset(pkBytes, ecOffset);
      // privateKey OCTET STRING
      const ecKeyTlv = readTlv(pkBytes, ecOffset);
      const ecPrivateKeyBytes = pkBytes.subarray(
         ecKeyTlv.valueOffset,
         ecKeyTlv.valueOffset + ecKeyTlv.length,
      );

      // Get curve OID from AlgorithmIdentifier parameters (after the algorithm OID)
      let ecCurveOid: Uint8Array | undefined;
      const algParamsOffset = oidTlv.valueOffset + oidTlv.length;
      if (algParamsOffset < algContent.length) {
         const curveOidTlv = readTlv(algContent, algParamsOffset);
         if ((curveOidTlv.tag & 0x1f) === 0x06) {
            ecCurveOid = algContent.subarray(
               curveOidTlv.valueOffset,
               curveOidTlv.valueOffset + curveOidTlv.length,
            );
         }
      }

      return { type: "ec", ecPrivateKeyBytes, ecCurveOid };
   }

   throw new Error(
      `PKCS#8: unsupported algorithm OID: ${Array.from(algOidBytes)
         .map((b) => b.toString(16))
         .join(":")}`,
   );
}

// ---- Modular exponentiation ----

/** Compute base^exp mod m using binary method (right-to-left) */
function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
   if (mod === 1n) return 0n;
   let result = 1n;
   base = base % mod;
   while (exp > 0n) {
      if (exp & 1n) result = (result * base) % mod;
      exp >>= 1n;
      base = (base * base) % mod;
   }
   return result;
}

/** RSA signing with CRT optimization */
function rsaSignCrt(m: bigint, key: RsaPrivateKey): bigint {
   // sp = m^dp mod p
   const sp = modPow(m % key.p, key.dp, key.p);
   // sq = m^dq mod q
   const sq = modPow(m % key.q, key.dq, key.q);
   // h = qInv * (sp - sq) mod p
   const h = (key.qInv * ((sp - sq + key.p) % key.p)) % key.p;
   // s = sq + q * h
   return sq + key.q * h;
}

// ---- PKCS#1 v1.5 RSA signing ----

/**
 * Hash the data with the specified algorithm.
 */
function hashData(alg: HashAlgorithm, data: Uint8Array): Uint8Array {
   switch (alg) {
      case "sha256":
         return sha256(data);
      case "sha384":
         return sha384(data);
      case "sha512":
         return sha512(data);
   }
}

/**
 * Sign `data` using RSA PKCS#1 v1.5.
 *
 * @param privateKeyDer - PKCS#8 DER-encoded private key
 * @param hashAlg       - Hash algorithm
 * @param data          - Data to sign (will be hashed)
 * @returns RSA signature as Uint8Array (same length as RSA modulus)
 */
export function rsaSign(
   privateKeyDer: Uint8Array,
   hashAlg: HashAlgorithm,
   data: Uint8Array,
): Uint8Array {
   const parsed = parsePkcs8(privateKeyDer);
   if (parsed.type !== "rsa" || !parsed.rsa) {
      throw new Error("RSA: key is not an RSA private key");
   }
   const key = parsed.rsa;

   // 1. Hash the data
   const digest = hashData(hashAlg, data);

   // 2. Build DigestInfo = T || digest
   const tPrefix = T[hashAlg];
   const digestInfo = new Uint8Array(tPrefix.length + digest.length);
   digestInfo.set(tPrefix);
   digestInfo.set(digest, tPrefix.length);

   // 3. PKCS#1 v1.5 padding: 0x00 0x01 [0xff...] 0x00 digestInfo
   const emLen = key.bitLength / 8; // in bytes
   if (digestInfo.length > emLen - 11) {
      throw new Error("RSA: message too long for key size");
   }
   const paddingLen = emLen - digestInfo.length - 3;

   const em = new Uint8Array(emLen);
   em[0] = 0x00;
   em[1] = 0x01;
   em.fill(0xff, 2, 2 + paddingLen);
   em[2 + paddingLen] = 0x00;
   em.set(digestInfo, 3 + paddingLen);

   // 4. RSA private key operation: s = em^d mod n (using CRT)
   const mInt = bytesToBigInt(em);
   const sInt = rsaSignCrt(mInt, key);

   // 5. Output signature as big-endian bytes, padded to key size
   return bigIntToBytes(sInt, emLen);
}
