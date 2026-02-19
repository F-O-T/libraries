import {
   type Asn1Node,
   contextTag,
   decodeDer,
   encodeDer,
   integer,
   nullValue,
   octetString,
   oid,
   sequence,
   set,
} from "@f-o-t/asn1";
import { hash } from "./hash.ts";
import { parsePkcs8 } from "./primitives/rsa.ts";
import { signedDataOptionsSchema } from "./schemas.ts";
import type {
   CmsAttribute,
   HashAlgorithm,
   SignedDataOptions,
} from "./types.ts";

// Well-known OIDs
const OID = {
   data: "1.2.840.113549.1.7.1",
   signedData: "1.2.840.113549.1.7.2",
   contentType: "1.2.840.113549.1.9.3",
   messageDigest: "1.2.840.113549.1.9.4",
   sha256: "2.16.840.1.101.3.4.2.1",
   sha384: "2.16.840.1.101.3.4.2.2",
   sha512: "2.16.840.1.101.3.4.2.3",
   // RSA with hash
   sha256WithRSA: "1.2.840.113549.1.1.11",
   sha384WithRSA: "1.2.840.113549.1.1.12",
   sha512WithRSA: "1.2.840.113549.1.1.13",
   rsaEncryption: "1.2.840.113549.1.1.1",
   // ECDSA with hash
   ecdsaWithSha256: "1.2.840.10045.4.3.2",
   ecdsaWithSha384: "1.2.840.10045.4.3.3",
   ecdsaWithSha512: "1.2.840.10045.4.3.4",
};

export class CmsError extends Error {
   constructor(message: string) {
      super(message);
      this.name = "CmsError";
   }
}

/**
 * Create a CMS/PKCS#7 SignedData structure wrapped in a ContentInfo.
 *
 * Returns the DER-encoded ContentInfo.
 */
export async function createSignedData(
   options: SignedDataOptions,
): Promise<Uint8Array> {
   const parsed = signedDataOptionsSchema.parse(options);
   const {
      content,
      certificate,
      privateKey,
      chain = [],
      hashAlgorithm = "sha256",
      authenticatedAttributes = [],
      unauthenticatedAttributes = [],
      detached = true,
   } = parsed;

   // Detect key type to choose the right signature algorithm OID
   const keyInfo = parsePkcs8(privateKey);
   const isEc = keyInfo.type === "ec";

   const digestOid = hashAlgorithmToOid(hashAlgorithm);
   const signatureAlgOid = hashAlgorithmToSignatureOid(hashAlgorithm, isEc);

   // 1. Compute message digest
   const messageDigest = hash(hashAlgorithm, content);

   // 2. Build authenticated attributes
   const authAttrs = buildAuthenticatedAttributes(
      messageDigest,
      authenticatedAttributes,
   );

   // 3. DER-encode attrs with SET tag (0x31) for signing.
   //    The encoder sorts SET OF children per X.690 §11.6 (DER).
   const attrsDer = encodeDer(set(...authAttrs));

   // 4. Sign the DER-encoded attributes (using SubtleCrypto for performance)
   const signatureValue = await signData(attrsDer, privateKey, hashAlgorithm);

   // 5. Decode the sorted SET back so the signerInfo stores children
   //    in the same DER-sorted order that was signed. This is critical:
   //    verifiers reconstruct the SET from the [0] IMPLICIT encoding
   //    and the bytes must match what was signed.
   const sortedAttrsSet = decodeDer(attrsDer);

   // 6. Extract IssuerAndSerialNumber from certificate
   const issuerAndSerial = extractIssuerAndSerial(certificate);

   // 7. Build SignerInfo
   const signerInfoChildren: Asn1Node[] = [
      // version = 1
      integer(1),
      // issuerAndSerialNumber
      issuerAndSerial,
      // digestAlgorithm
      algorithmIdentifier(digestOid),
      // signedAttrs [0] IMPLICIT SET — replaces SET tag (0x31) with context [0] (0xA0)
      contextTag(0, [sortedAttrsSet], false),
      // signatureAlgorithm (ECDSA OIDs must NOT include NULL parameter per RFC 5758)
      algorithmIdentifier(signatureAlgOid, !ECDSA_OIDS.has(signatureAlgOid)),
      // signature OCTET STRING
      octetString(signatureValue),
   ];

   // Add unsigned attributes if present
   if (unauthenticatedAttributes.length > 0) {
      const unauthAttrs = unauthenticatedAttributes.map((attr) =>
         buildAttribute(attr.oid, attr.values),
      );
      signerInfoChildren.push(contextTag(1, [set(...unauthAttrs)], false));
   }

   const signerInfo = sequence(...signerInfoChildren);

   // 8. Build certificates [0] IMPLICIT SET OF Certificate
   const allCerts = [certificate, ...chain];
   const certNodes = allCerts.map((certDer) => decodeDer(certDer));
   const certsSet = set(...certNodes);

   // 9. Build EncapsulatedContentInfo
   const encapContentInfoChildren: Asn1Node[] = [oid(OID.data)];
   if (!detached) {
      // Include content as [0] EXPLICIT OCTET STRING
      encapContentInfoChildren.push(contextTag(0, [octetString(content)]));
   }
   const encapContentInfo = sequence(...encapContentInfoChildren);

   // 10. Assemble SignedData
   const signedData = sequence(
      // version = 1
      integer(1),
      // digestAlgorithms SET
      set(algorithmIdentifier(digestOid)),
      // encapContentInfo
      encapContentInfo,
      // certificates [0] IMPLICIT SET OF Certificate
      contextTag(0, [certsSet], false),
      // signerInfos SET
      set(signerInfo),
   );

   // 11. Wrap in ContentInfo
   const contentInfo = sequence(
      oid(OID.signedData),
      contextTag(0, [signedData]),
   );

   return encodeDer(contentInfo);
}

/**
 * Append unauthenticated attributes to an existing CMS SignedData DER without re-signing.
 *
 * Locates the first SignerInfo in the decoded tree and appends a [1] IMPLICIT
 * context tag (unauthAttrs), then re-encodes. The signature bytes are never
 * touched, so this is safe for non-deterministic algorithms (PSS, ECDSA).
 */
export function appendUnauthAttributes(
   signedDataDer: Uint8Array,
   attributes: CmsAttribute[],
): Uint8Array {
   if (attributes.length === 0) return signedDataDer;

   const contentInfo = decodeDer(signedDataDer);
   // ContentInfo: SEQUENCE { OID, [0] EXPLICIT { SignedData } }
   const signedDataNode = (
      (contentInfo.value as Asn1Node[])[1]!.value as Asn1Node[]
   )[0]!;
   // SignedData: version, digestAlgorithms, encapContentInfo, [0] certs (OPTIONAL), [1] crls (OPTIONAL), signerInfos
   // signerInfos is always the last child per RFC 5652 — using .at(-1) avoids assuming certificates/crls are present
   const signerInfosSet = (signedDataNode.value as Asn1Node[]).at(-1)!;
   const signerInfo = (signerInfosSet.value as Asn1Node[])[0]!;

   const unauthAttrs = attributes.map((attr) =>
      buildAttribute(attr.oid, attr.values),
   );

   const signerInfoChildren = signerInfo.value as Asn1Node[];
   const existingTag = signerInfoChildren.find(
      (n) => n.class === "context" && n.tag === 1,
   );
   if (existingTag) {
      // Merge into existing [1] SET
      const innerSet = (existingTag.value as Asn1Node[])[0]!;
      (innerSet.value as Asn1Node[]).push(...unauthAttrs);
   } else {
      signerInfoChildren.push(contextTag(1, [set(...unauthAttrs)], false));
   }

   return encodeDer(contentInfo);
}

// ---------------------------------------------------------------------------
// SubtleCrypto-based signing (async, non-blocking)
// ---------------------------------------------------------------------------

/**
 * Returns the SubtleCrypto instance if available (browser / modern Node / Bun),
 * or null in environments that don't expose it.
 */
function getSubtle(): SubtleCrypto | null {
   if (typeof globalThis.crypto?.subtle !== "undefined") {
      return globalThis.crypto.subtle;
   }
   return null;
}

/**
 * Map our HashAlgorithm to the SubtleCrypto hash name.
 */
function subtleHashName(alg: HashAlgorithm): string {
   switch (alg) {
      case "sha256":
         return "SHA-256";
      case "sha384":
         return "SHA-384";
      case "sha512":
         return "SHA-512";
   }
}

/**
 * Convert an IEEE P1363 ECDSA signature (raw r||s bytes) to DER SEQUENCE { r, s }.
 * SubtleCrypto returns P1363 format; CMS requires DER.
 */
function p1363ToDer(p1363: Uint8Array): Uint8Array {
   const halfLen = p1363.length / 2;
   let r = p1363.subarray(0, halfLen);
   let s = p1363.subarray(halfLen);

   // Strip leading zeros, but ensure at most one leading 0x00 for sign
   while (r.length > 1 && r[0] === 0x00 && (r[1]! & 0x80) === 0) {
      r = r.subarray(1);
   }
   while (s.length > 1 && s[0] === 0x00 && (s[1]! & 0x80) === 0) {
      s = s.subarray(1);
   }

   // Add leading 0x00 if high bit set (positive integer encoding)
   const rEnc = r[0]! & 0x80 ? new Uint8Array([0x00, ...r]) : r;
   const sEnc = s[0]! & 0x80 ? new Uint8Array([0x00, ...s]) : s;

   const contentLen = 2 + rEnc.length + 2 + sEnc.length;
   const der = new Uint8Array(2 + contentLen);
   let off = 0;
   der[off++] = 0x30; // SEQUENCE
   der[off++] = contentLen;
   der[off++] = 0x02; // INTEGER r
   der[off++] = rEnc.length;
   der.set(rEnc, off);
   off += rEnc.length;
   der[off++] = 0x02; // INTEGER s
   der[off++] = sEnc.length;
   der.set(sEnc, off);
   return der;
}

/**
 * Sign data using SubtleCrypto (preferred: runs natively, non-blocking).
 * Falls back to pure-JS implementations when SubtleCrypto is unavailable.
 */
async function signData(
   data: Uint8Array,
   privateKeyDer: Uint8Array,
   hashAlgorithm: HashAlgorithm,
): Promise<Uint8Array> {
   const subtle = getSubtle();

   if (subtle) {
      try {
         const keyInfo = parsePkcs8(privateKeyDer);

         // Helper: ensure we hand SubtleCrypto a plain ArrayBuffer (not a shared or offset view)
         const toArrayBuffer = (u8: Uint8Array): ArrayBuffer =>
            u8.buffer.slice(
               u8.byteOffset,
               u8.byteOffset + u8.byteLength,
            ) as ArrayBuffer;

         if (keyInfo.type === "rsa") {
            // Import PKCS#8 RSA key and sign with RSASSA-PKCS1-v1_5
            const cryptoKey = await subtle.importKey(
               "pkcs8",
               toArrayBuffer(privateKeyDer),
               {
                  name: "RSASSA-PKCS1-v1_5",
                  hash: subtleHashName(hashAlgorithm),
               },
               false, // not extractable
               ["sign"],
            );
            const sig = await subtle.sign(
               "RSASSA-PKCS1-v1_5",
               cryptoKey,
               toArrayBuffer(data),
            );
            return new Uint8Array(sig);
         }

         if (keyInfo.type === "ec") {
            // Import PKCS#8 EC key and sign with ECDSA
            // Determine curve from the key's OID
            const curveOid = keyInfo.ecCurveOid;
            const namedCurve = ecCurveOidToSubtle(curveOid);

            const cryptoKey = await subtle.importKey(
               "pkcs8",
               toArrayBuffer(privateKeyDer),
               {
                  name: "ECDSA",
                  namedCurve,
               },
               false,
               ["sign"],
            );

            const sigP1363 = await subtle.sign(
               { name: "ECDSA", hash: subtleHashName(hashAlgorithm) },
               cryptoKey,
               toArrayBuffer(data),
            );

            // Convert IEEE P1363 → DER for CMS compatibility
            return p1363ToDer(new Uint8Array(sigP1363));
         }
      } catch {
         // Intentionally fall through to pure-JS fallback
      }
   }

   // Pure-JS fallback (no SubtleCrypto, or unsupported key type)
   return signDataPureJs(data, privateKeyDer, hashAlgorithm);
}

/**
 * Pure-JS fallback signing (heavy CPU work — only used when SubtleCrypto unavailable).
 */
async function signDataPureJs(
   data: Uint8Array,
   privateKeyDer: Uint8Array,
   hashAlgorithm: HashAlgorithm,
): Promise<Uint8Array> {
   const { ecdsaSign } = await import("./primitives/ecdsa.ts");
   const { rsaSign } = await import("./primitives/rsa.ts");
   const keyInfo = parsePkcs8(privateKeyDer);
   if (keyInfo.type === "ec") {
      return ecdsaSign(privateKeyDer, hashAlgorithm, data);
   }
   return rsaSign(privateKeyDer, hashAlgorithm, data);
}

/**
 * Convert an EC curve OID byte array to a SubtleCrypto named curve string.
 */
function ecCurveOidToSubtle(oidBytes: Uint8Array | undefined): string {
   if (!oidBytes) return "P-256";

   // OID 1.2.840.10045.3.1.7 → P-256
   const OID_P256 = new Uint8Array([
      0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
   ]);
   // OID 1.3.132.0.34 → P-384
   const OID_P384 = new Uint8Array([0x2b, 0x81, 0x04, 0x00, 0x22]);

   if (
      oidBytes.length === OID_P384.length &&
      oidBytes.every((b, i) => b === OID_P384[i])
   ) {
      return "P-384";
   }
   if (
      oidBytes.length === OID_P256.length &&
      oidBytes.every((b, i) => b === OID_P256[i])
   ) {
      return "P-256";
   }

   // Default: try P-256
   return "P-256";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function algorithmIdentifier(algOid: string, includeNull = true): Asn1Node {
   if (includeNull) {
      return sequence(oid(algOid), nullValue());
   }
   return sequence(oid(algOid));
}

const ECDSA_OIDS = new Set([
   OID.ecdsaWithSha256,
   OID.ecdsaWithSha384,
   OID.ecdsaWithSha512,
]);

function buildAttribute(attrOid: string, values: Uint8Array[]): Asn1Node {
   // Each value is already DER-encoded; decode it to an Asn1Node
   const valueNodes = values.map((v) => decodeDer(v));
   return sequence(oid(attrOid), set(...valueNodes));
}

function buildAuthenticatedAttributes(
   messageDigest: Uint8Array,
   customAttributes: CmsAttribute[],
): Asn1Node[] {
   const attrs: Asn1Node[] = [];

   // contentType
   attrs.push(sequence(oid(OID.contentType), set(oid(OID.data))));

   // messageDigest
   attrs.push(
      sequence(oid(OID.messageDigest), set(octetString(messageDigest))),
   );

   // Custom authenticated attributes
   for (const attr of customAttributes) {
      attrs.push(buildAttribute(attr.oid, attr.values));
   }

   return attrs;
}

function extractIssuerAndSerial(certDer: Uint8Array): Asn1Node {
   const cert = decodeDer(certDer);
   const tbsCert = (cert.value as Asn1Node[])[0]!; // TBSCertificate
   const tbs = tbsCert.value as Asn1Node[];

   // version is [0] EXPLICIT, so tbs[0] may be version context tag
   let idx = 0;
   if (tbs[0]!.class === "context" && tbs[0]!.tag === 0) {
      idx = 1;
   }

   // TBSCertificate: version?, serialNumber, signature, issuer, validity, subject, ...
   const serialNumber = tbs[idx]!; // INTEGER
   const issuer = tbs[idx + 2]!; // Name SEQUENCE (after serial, after signatureAlgo)

   return sequence(issuer, serialNumber);
}

function hashAlgorithmToOid(alg: HashAlgorithm): string {
   switch (alg) {
      case "sha256":
         return OID.sha256;
      case "sha384":
         return OID.sha384;
      case "sha512":
         return OID.sha512;
   }
}

function hashAlgorithmToSignatureOid(
   alg: HashAlgorithm,
   isEc: boolean,
): string {
   if (isEc) {
      switch (alg) {
         case "sha256":
            return OID.ecdsaWithSha256;
         case "sha384":
            return OID.ecdsaWithSha384;
         case "sha512":
            return OID.ecdsaWithSha512;
      }
   }
   switch (alg) {
      case "sha256":
         return OID.sha256WithRSA;
      case "sha384":
         return OID.sha384WithRSA;
      case "sha512":
         return OID.sha512WithRSA;
   }
}
