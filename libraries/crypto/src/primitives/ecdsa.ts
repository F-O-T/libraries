/**
 * ECDSA signing — pure TypeScript (P-256 and P-384).
 *
 * Implements:
 *   - Jacobian projective coordinates for elliptic curve operations
 *   - RFC 6979 deterministic nonce generation (HMAC-DRBG)
 *   - DER-encoded signature output: SEQUENCE { INTEGER r, INTEGER s }
 *   - PKCS#8 EC private key parsing (via rsa.ts parsePkcs8)
 *
 * Zero runtime dependencies. Works in any JS environment.
 *
 * References:
 *   - FIPS 186-4 (ECDSA)
 *   - RFC 6979 (Deterministic Usage of DSA and ECDSA)
 *   - SEC 2: Recommended Elliptic Curve Domain Parameters
 */

import type { HashAlgorithm } from "../types.ts";
import { hmac } from "./hmac.ts";
import { parsePkcs8 } from "./rsa.ts";
import { sha256 } from "./sha256.ts";
import { sha384, sha512 } from "./sha512.ts";

// ---------------------------------------------------------------------------
// Curve parameters
// ---------------------------------------------------------------------------

interface CurveParams {
   /** Prime field modulus p */
   p: bigint;
   /** Curve coefficient a */
   a: bigint;
   /** Curve coefficient b */
   b: bigint;
   /** Base point x */
   Gx: bigint;
   /** Base point y */
   Gy: bigint;
   /** Order of the base point */
   n: bigint;
   /** Bit length of n */
   nBitLen: number;
   /** Byte length of scalars/coordinates */
   byteLen: number;
}

// P-256 (secp256r1, prime256v1) — FIPS 186-4 / SEC 2
const P256: CurveParams = {
   p: BigInt(
      "0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF",
   ),
   a: BigInt(
      "0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFC",
   ),
   b: BigInt(
      "0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B",
   ),
   Gx: BigInt(
      "0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296",
   ),
   Gy: BigInt(
      "0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5",
   ),
   n: BigInt(
      "0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551",
   ),
   nBitLen: 256,
   byteLen: 32,
};

// P-384 (secp384r1) — FIPS 186-4 / SEC 2
const P384: CurveParams = {
   p: BigInt(
      "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFF0000000000000000FFFFFFFF",
   ),
   a: BigInt(
      "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFF0000000000000000FFFFFFFC",
   ),
   b: BigInt(
      "0xB3312FA7E23EE7E4988E056BE3F82D19181D9C6EFE8141120314088F5013875AC656398D8A2ED19D2A85C8EDD3EC2AEF",
   ),
   Gx: BigInt(
      "0xAA87CA22BE8B05378EB1C71EF320AD746E1D3B628BA79B9859F741E082542A385502F25DBF55296C3A545E3872760AB7",
   ),
   Gy: BigInt(
      "0x3617DE4A96262C6F5D9E98BF9292DC29F8F41DBD289A147CE9DA3113B5F0B8C00A60B1CE1D7E819D7A431D7C90EA0E5F",
   ),
   n: BigInt(
      "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFC7634D81F4372DDF581A0DB248B0A77AECEC196ACCC52973",
   ),
   nBitLen: 384,
   byteLen: 48,
};

// Known curve OID bytes → CurveParams
// OID 1.2.840.10045.3.1.7  → P-256
const OID_P256 = new Uint8Array([
   0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
]);
// OID 1.3.132.0.34          → P-384
const OID_P384 = new Uint8Array([0x2b, 0x81, 0x04, 0x00, 0x22]);

function getCurve(oidBytes: Uint8Array | undefined): CurveParams {
   if (oidBytes) {
      if (
         oidBytes.length === OID_P256.length &&
         oidBytes.every((b, i) => b === OID_P256[i])
      ) {
         return P256;
      }
      if (
         oidBytes.length === OID_P384.length &&
         oidBytes.every((b, i) => b === OID_P384[i])
      ) {
         return P384;
      }
   }
   // Default to P-256 for 32-byte keys, P-384 for 48-byte keys
   throw new Error("ECDSA: unsupported or missing curve OID");
}

// ---------------------------------------------------------------------------
// Finite field arithmetic (mod p)
// ---------------------------------------------------------------------------

function modp(x: bigint, p: bigint): bigint {
   return ((x % p) + p) % p;
}

function modInv(a: bigint, m: bigint): bigint {
   // Extended Euclidean algorithm
   let [old_r, r] = [a, m];
   let [old_s, s] = [1n, 0n];
   while (r !== 0n) {
      const q = old_r / r;
      [old_r, r] = [r, old_r - q * r];
      [old_s, s] = [s, old_s - q * s];
   }
   return modp(old_s, m);
}

// ---------------------------------------------------------------------------
// Jacobian projective point arithmetic
// ---------------------------------------------------------------------------

// A point in Jacobian coordinates: (X : Y : Z) represents affine (X/Z², Y/Z³)
// The point at infinity is represented as Z = 0n.

interface JacobianPoint {
   X: bigint;
   Y: bigint;
   Z: bigint;
}

const INFINITY: JacobianPoint = { X: 0n, Y: 1n, Z: 0n };

function fromAffine(x: bigint, y: bigint): JacobianPoint {
   return { X: x, Y: y, Z: 1n };
}

function toAffine(pt: JacobianPoint, p: bigint): { x: bigint; y: bigint } {
   if (pt.Z === 0n) throw new Error("ECDSA: point at infinity");
   const z2 = modp(pt.Z * pt.Z, p);
   const z3 = modp(pt.Z * z2, p);
   const zInv2 = modInv(z2, p);
   const zInv3 = modInv(z3, p);
   return {
      x: modp(pt.X * zInv2, p),
      y: modp(pt.Y * zInv3, p),
   };
}

/** Jacobian point doubling: 2P (for a=-3 curves like P-256/P-384) */
function jacobianDouble(pt: JacobianPoint, curve: CurveParams): JacobianPoint {
   const { p } = curve;
   if (pt.Z === 0n) return INFINITY;

   const { X, Y, Z } = pt;

   const Y2 = modp(Y * Y, p);
   const S = modp(4n * X * Y2, p);
   const Z2 = modp(Z * Z, p);
   // For a = p - 3: 3*(X-Z²)*(X+Z²) = 3*X² - 3*Z⁴, which equals 3*(X²-Z⁴)
   // a = -3 mod p, so 3*X² + a*Z⁴ = 3*X² - 3*Z⁴ = 3*(X²-Z⁴) = 3*(X-Z²)*(X+Z²)
   const M = modp(3n * modp(X * X, p) + curve.a * modp(Z2 * Z2, p), p);
   const X3 = modp(M * M - 2n * S, p);
   const Y3 = modp(M * (S - X3) - 8n * Y2 * Y2, p);
   const Z3 = modp(2n * Y * Z, p);

   return { X: X3, Y: Y3, Z: Z3 };
}

/** Jacobian point addition: P + Q */
function jacobianAdd(
   P: JacobianPoint,
   Q: JacobianPoint,
   curve: CurveParams,
): JacobianPoint {
   const { p } = curve;

   if (P.Z === 0n) return Q;
   if (Q.Z === 0n) return P;

   const Z1Z1 = modp(P.Z * P.Z, p);
   const Z2Z2 = modp(Q.Z * Q.Z, p);
   const U1 = modp(P.X * Z2Z2, p);
   const U2 = modp(Q.X * Z1Z1, p);
   const S1 = modp(P.Y * Q.Z * Z2Z2, p);
   const S2 = modp(Q.Y * P.Z * Z1Z1, p);
   const H = modp(U2 - U1, p);
   const R = modp(S2 - S1, p);

   if (H === 0n) {
      if (R === 0n) {
         // P == Q, use doubling
         return jacobianDouble(P, curve);
      }
      // P == -Q, point at infinity
      return INFINITY;
   }

   const H2 = modp(H * H, p);
   const H3 = modp(H * H2, p);
   const U1H2 = modp(U1 * H2, p);
   const X3 = modp(R * R - H3 - 2n * U1H2, p);
   const Y3 = modp(R * (U1H2 - X3) - S1 * H3, p);
   const Z3 = modp(H * P.Z * Q.Z, p);

   return { X: X3, Y: Y3, Z: Z3 };
}

/** Scalar multiplication: k * P using double-and-add */
function scalarMul(
   k: bigint,
   P: JacobianPoint,
   curve: CurveParams,
): JacobianPoint {
   let result = INFINITY;
   let addend = P;
   let scalar = k;

   while (scalar > 0n) {
      if (scalar & 1n) {
         result = jacobianAdd(result, addend, curve);
      }
      addend = jacobianDouble(addend, curve);
      scalar >>= 1n;
   }

   return result;
}

// ---------------------------------------------------------------------------
// Byte conversion helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// RFC 6979 deterministic k generation (HMAC-DRBG)
// ---------------------------------------------------------------------------

type HmacAlg = "sha256" | "sha384" | "sha512";

function rfc6979K(
   privateKeyBytes: Uint8Array, // scalar, big-endian, qLen bytes
   messageHash: Uint8Array, // H(m), hLen bytes
   curve: CurveParams,
   hmacAlg: HmacAlg,
): bigint {
   const qLen = curve.byteLen;
   const n = curve.n;

   // 1. h1 = H(m), already computed
   const h1 = messageHash;

   // bits2octets(h1): truncate or extend h1 to qLen bytes
   // See RFC 6979 §2.3.4
   function bits2int(bits: Uint8Array): bigint {
      let v = bytesToBigInt(bits);
      const vBitLen = bits.length * 8;
      if (vBitLen > curve.nBitLen) {
         v >>= BigInt(vBitLen - curve.nBitLen);
      }
      return v;
   }

   function int2octets(x: bigint): Uint8Array {
      return bigIntToBytes(((x % n) + n) % n, qLen);
   }

   function bits2octets(bits: Uint8Array): Uint8Array {
      const z1 = bits2int(bits);
      const z2 = (((z1 - n) % n) + n) % n < z1 ? z1 - n : z1;
      return int2octets(z2 < 0n ? z1 : z2);
   }

   // Pad privateKey to qLen
   const x = bigIntToBytes(bytesToBigInt(privateKeyBytes), qLen);
   const bx = new Uint8Array(qLen + qLen);
   bx.set(x);
   bx.set(bits2octets(h1), qLen);

   // Initialize V and K
   let V = new Uint8Array(messageHash.length).fill(0x01);
   let K = new Uint8Array(messageHash.length).fill(0x00);

   // K = HMAC_K(V || 0x00 || bx)
   const m0 = new Uint8Array(V.length + 1 + bx.length);
   m0.set(V);
   m0[V.length] = 0x00;
   m0.set(bx, V.length + 1);
   K = new Uint8Array(hmac(hmacAlg, K, m0));

   // V = HMAC_K(V)
   V = new Uint8Array(hmac(hmacAlg, K, V));

   // K = HMAC_K(V || 0x01 || bx)
   const m1 = new Uint8Array(V.length + 1 + bx.length);
   m1.set(V);
   m1[V.length] = 0x01;
   m1.set(bx, V.length + 1);
   K = new Uint8Array(hmac(hmacAlg, K, m1));

   // V = HMAC_K(V)
   V = new Uint8Array(hmac(hmacAlg, K, V));

   // Generate k
   for (let attempt = 0; attempt < 1000; attempt++) {
      let T = new Uint8Array(0);

      while (T.length < qLen) {
         V = new Uint8Array(hmac(hmacAlg, K, V));
         const newT = new Uint8Array(T.length + V.length);
         newT.set(T);
         newT.set(V, T.length);
         T = newT;
      }

      const k = bits2int(T.subarray(0, qLen));
      if (k >= 1n && k < n) {
         return k;
      }

      // Retry
      const mr = new Uint8Array(V.length + 1);
      mr.set(V);
      mr[V.length] = 0x00;
      K = new Uint8Array(hmac(hmacAlg, K, mr));
      V = new Uint8Array(hmac(hmacAlg, K, V));
   }

   throw new Error("RFC 6979: failed to generate valid k after 1000 attempts");
}

// ---------------------------------------------------------------------------
// DER encoding for ECDSA signature { r, s }
// ---------------------------------------------------------------------------

function encodeAsn1Int(n: bigint): Uint8Array {
   // Compute minimum byte length needed
   let hexLen = n.toString(16).length;
   if (hexLen % 2 !== 0) hexLen += 1;
   let bytes = bigIntToBytes(n, Math.max(1, hexLen / 2));
   // Remove unnecessary leading zero bytes, but keep at least 1 byte
   let start = 0;
   while (start < bytes.length - 1 && bytes[start] === 0) start++;
   bytes = new Uint8Array(
      bytes.buffer,
      bytes.byteOffset + start,
      bytes.length - start,
   );
   // Prepend 0x00 if high bit set (ensures positive integer encoding)
   if (bytes[0]! & 0x80) {
      const padded = new Uint8Array(bytes.length + 1);
      padded[0] = 0x00;
      padded.set(bytes, 1);
      bytes = padded;
   }
   return bytes;
}

function encodeDerSignature(r: bigint, s: bigint): Uint8Array {
   const rBytes = encodeAsn1Int(r);
   const sBytes = encodeAsn1Int(s);

   // SEQUENCE { INTEGER r, INTEGER s }
   const contentLen = 2 + rBytes.length + 2 + sBytes.length;
   const der = new Uint8Array(2 + contentLen);
   let offset = 0;

   der[offset++] = 0x30; // SEQUENCE
   der[offset++] = contentLen;
   der[offset++] = 0x02; // INTEGER
   der[offset++] = rBytes.length;
   der.set(rBytes, offset);
   offset += rBytes.length;
   der[offset++] = 0x02; // INTEGER
   der[offset++] = sBytes.length;
   der.set(sBytes, offset);

   return der;
}

// ---------------------------------------------------------------------------
// Hash dispatch
// ---------------------------------------------------------------------------

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

function hmacAlgForHash(alg: HashAlgorithm): HmacAlg {
   switch (alg) {
      case "sha256":
         return "sha256";
      case "sha384":
         return "sha384";
      case "sha512":
         return "sha512";
   }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sign `data` using ECDSA (P-256 or P-384) with RFC 6979 deterministic k.
 *
 * @param privateKeyDer - PKCS#8 DER-encoded EC private key
 * @param hashAlg       - Hash algorithm (sha256 for P-256, sha384 for P-384)
 * @param data          - Data to sign (will be hashed)
 * @returns DER-encoded signature: SEQUENCE { INTEGER r, INTEGER s }
 */
export function ecdsaSign(
   privateKeyDer: Uint8Array,
   hashAlg: HashAlgorithm,
   data: Uint8Array,
): Uint8Array {
   const parsed = parsePkcs8(privateKeyDer);
   if (parsed.type !== "ec" || !parsed.ecPrivateKeyBytes) {
      throw new Error("ECDSA: key is not an EC private key");
   }

   const curve = getCurve(parsed.ecCurveOid);
   const G = fromAffine(curve.Gx, curve.Gy);
   const d = bytesToBigInt(parsed.ecPrivateKeyBytes);

   if (d <= 0n || d >= curve.n) {
      throw new Error("ECDSA: private key scalar out of range");
   }

   // 1. Hash the message
   const msgHash = hashData(hashAlg, data);

   // 2. Generate deterministic k per RFC 6979
   const k = rfc6979K(
      parsed.ecPrivateKeyBytes,
      msgHash,
      curve,
      hmacAlgForHash(hashAlg),
   );

   // 3. R = k * G; r = R.x mod n
   const R = scalarMul(k, G, curve);
   const { x: rx } = toAffine(R, curve.p);
   const r = ((rx % curve.n) + curve.n) % curve.n;
   if (r === 0n) throw new Error("ECDSA: r is zero, retry with different k");

   // 4. e = bits2int(msgHash) truncated to nBitLen bits
   let e = bytesToBigInt(msgHash);
   const hBitLen = msgHash.length * 8;
   if (hBitLen > curve.nBitLen) {
      e >>= BigInt(hBitLen - curve.nBitLen);
   }

   // 5. s = k^-1 * (e + r * d) mod n
   const kInv = modInv(k, curve.n);
   const s = modp(kInv * modp(e + r * d, curve.n), curve.n);
   if (s === 0n) throw new Error("ECDSA: s is zero, retry with different k");

   // 6. Encode as DER SEQUENCE { INTEGER r, INTEGER s }
   return encodeDerSignature(r, s);
}
