import {
   createDecipheriv,
   createHash,
   createHmac,
   pbkdf2Sync,
} from "node:crypto";
import { type Asn1Node, bytesToOid, decodeDer, encodeDer } from "@f-o-t/asn1";
import type { Pkcs12Result } from "./types.ts";

// OIDs
const OID_DATA = "1.2.840.113549.1.7.1";
const OID_ENCRYPTED_DATA = "1.2.840.113549.1.7.6";
const OID_CERT_BAG = "1.2.840.113549.1.12.10.1.3";
const OID_PKCS8_SHROUDED_KEY_BAG = "1.2.840.113549.1.12.10.1.2";
const OID_X509_CERT = "1.2.840.113549.1.9.22.1";
const OID_PBE_SHA_3DES = "1.2.840.113549.1.12.1.3";
const OID_PBE_SHA_RC2_40 = "1.2.840.113549.1.12.1.6";
const OID_PBE_SHA_RC2_128 = "1.2.840.113549.1.12.1.5";
const OID_PBE_SHA_2DES = "1.2.840.113549.1.12.1.4";
const OID_PBES2 = "1.2.840.113549.1.5.13";
const OID_PBKDF2 = "1.2.840.113549.1.5.12";
const OID_AES_128_CBC = "2.16.840.1.101.3.4.1.2";
const OID_AES_192_CBC = "2.16.840.1.101.3.4.1.22";
const OID_AES_256_CBC = "2.16.840.1.101.3.4.1.42";
const OID_DES_EDE3_CBC = "1.2.840.113549.3.7";
const OID_HMAC_SHA1 = "1.2.840.113549.2.7";
const OID_HMAC_SHA256 = "1.2.840.113549.2.9";
const OID_HMAC_SHA384 = "1.2.840.113549.2.10";
const OID_HMAC_SHA512 = "1.2.840.113549.2.11";
const OID_SHA1 = "1.3.14.3.2.26";
const OID_SHA256 = "2.16.840.1.101.3.4.2.1";
const OID_SHA384 = "2.16.840.1.101.3.4.2.2";
const OID_SHA512 = "2.16.840.1.101.3.4.2.3";

export class Pkcs12Error extends Error {
   constructor(message: string) {
      super(message);
      this.name = "Pkcs12Error";
   }
}

export function parsePkcs12(data: Uint8Array, password: string): Pkcs12Result {
   let pfx: Asn1Node;
   try {
      pfx = decodeDer(data);
   } catch {
      throw new Pkcs12Error("Invalid PKCS#12 data: unable to decode ASN.1");
   }

   const pfxChildren = expectSequence(pfx, "PFX");

   // PFX version must be 3
   const version = readInteger(pfxChildren[0]!);
   if (version !== 3n) {
      throw new Pkcs12Error(`Unsupported PFX version: ${version}`);
   }

   // authSafe is a ContentInfo (PKCS#7 Data)
   const authSafe = expectSequence(pfxChildren[1]!, "authSafe ContentInfo");
   const authSafeOid = readOid(authSafe[0]!);
   if (authSafeOid !== OID_DATA) {
      throw new Pkcs12Error(
         `Expected data ContentInfo in authSafe, got OID ${authSafeOid}`,
      );
   }

   // Extract the OCTET STRING content from [0] EXPLICIT
   const authSafeContent = unwrapContextTag(authSafe[1]!, 0);
   let authSafeData: Uint8Array;
   if (authSafeContent.tag === 4 && !authSafeContent.constructed) {
      authSafeData = authSafeContent.value as Uint8Array;
   } else {
      throw new Pkcs12Error("Expected OCTET STRING for authSafe content");
   }

   // Verify MAC if present
   if (pfxChildren.length >= 3) {
      verifyMac(pfxChildren[2]!, authSafeData, password);
   }

   // Parse AuthenticatedSafe (SEQUENCE OF ContentInfo)
   const authenticatedSafe = decodeDer(authSafeData);
   const safeContents = expectSequence(authenticatedSafe, "AuthenticatedSafe");

   const certificates: Uint8Array[] = [];
   let privateKey: Uint8Array | null = null;

   for (const contentInfo of safeContents) {
      const ciChildren = expectSequence(contentInfo, "ContentInfo");
      const ciOid = readOid(ciChildren[0]!);

      if (ciOid === OID_DATA) {
         // plaintext SafeContents inside OCTET STRING
         const content = unwrapContextTag(ciChildren[1]!, 0);
         const octetData = content.value as Uint8Array;
         const bags = parseSafeBags(decodeDer(octetData));
         for (const bag of bags) {
            if (bag.type === "cert") {
               certificates.push(bag.data);
            } else if (bag.type === "key") {
               if (!privateKey) {
                  privateKey = decryptShroudedKeyBag(bag.data, password);
               }
            }
         }
      } else if (ciOid === OID_ENCRYPTED_DATA) {
         // EncryptedData — typically holds certificates
         const content = unwrapContextTag(ciChildren[1]!, 0);
         const decryptedData = decryptEncryptedData(content, password);
         const bags = parseSafeBags(decodeDer(decryptedData));
         for (const bag of bags) {
            if (bag.type === "cert") {
               certificates.push(bag.data);
            } else if (bag.type === "key") {
               if (!privateKey) {
                  privateKey = decryptShroudedKeyBag(bag.data, password);
               }
            }
         }
      }
   }

   if (certificates.length === 0) {
      throw new Pkcs12Error("No certificate found in PKCS#12 file");
   }

   if (!privateKey) {
      throw new Pkcs12Error("No private key found in PKCS#12 file");
   }

   // The first certificate is the end-entity certificate;
   // the rest form the chain
   const [certificate, ...chain] = certificates;

   return {
      certificate: certificate!,
      privateKey,
      chain,
   };
}

// ---------------------------------------------------------------------------
// MAC verification
// ---------------------------------------------------------------------------

function verifyMac(
   macDataNode: Asn1Node,
   authSafeData: Uint8Array,
   password: string,
): void {
   const macFields = expectSequence(macDataNode, "MacData");

   // DigestInfo: SEQUENCE { algorithm, digest }
   const digestInfo = expectSequence(macFields[0]!, "DigestInfo");
   const algorithmSeq = expectSequence(digestInfo[0]!, "AlgorithmIdentifier");
   const macAlgOid = readOid(algorithmSeq[0]!);
   const expectedDigest = digestInfo[1]!.value as Uint8Array;

   // macSalt
   const macSalt = macFields[1]!.value as Uint8Array;

   // iterations (default 1 if not present)
   let iterations = 1;
   if (macFields.length >= 3) {
      iterations = Number(readInteger(macFields[2]!));
   }

   const hashAlg = mapHashOidToName(macAlgOid);
   const hashLen =
      hashAlg === "sha1"
         ? 20
         : hashAlg === "sha256"
           ? 32
           : hashAlg === "sha384"
             ? 48
             : 64;

   // Derive MAC key using PKCS#12 KDF with purpose=3 (MAC)
   const macKey = pkcs12Kdf(password, macSalt, iterations, 3, hashLen, hashAlg);

   // Compute HMAC
   const hmac = createHmac(hashAlg, Buffer.from(macKey));
   hmac.update(Buffer.from(authSafeData));
   const computedDigest = new Uint8Array(hmac.digest());

   // Constant-time comparison
   if (computedDigest.length !== expectedDigest.length) {
      throw new Pkcs12Error(
         "PKCS#12 MAC verification failed (wrong password?)",
      );
   }
   let diff = 0;
   for (let i = 0; i < computedDigest.length; i++) {
      diff |= computedDigest[i]! ^ expectedDigest[i]!;
   }
   if (diff !== 0) {
      throw new Pkcs12Error(
         "PKCS#12 MAC verification failed (wrong password?)",
      );
   }
}

// ---------------------------------------------------------------------------
// PKCS#12 Key Derivation Function (RFC 7292 Appendix B)
// ---------------------------------------------------------------------------

function pkcs12Kdf(
   password: string,
   salt: Uint8Array,
   iterations: number,
   purpose: number, // 1=key, 2=iv, 3=mac
   keyLen: number,
   hashAlgorithm = "sha1",
): Uint8Array {
   // v = hash block size (64 for SHA-1, SHA-256; 128 for SHA-384, SHA-512)
   const v =
      hashAlgorithm === "sha384" || hashAlgorithm === "sha512" ? 128 : 64;
   // u = hash output length
   const u =
      hashAlgorithm === "sha1"
         ? 20
         : hashAlgorithm === "sha256"
           ? 32
           : hashAlgorithm === "sha384"
             ? 48
             : 64;

   // D = purpose byte repeated v times
   const D = new Uint8Array(v);
   D.fill(purpose);

   // Convert password to BMPString (UTF-16BE + 0x00 0x00 terminator)
   const bmpPassword = passwordToBmpString(password);

   // Pad salt to v-byte boundary
   const S = padToMultiple(salt, v);
   // Pad password to v-byte boundary
   const P = padToMultiple(bmpPassword, v);

   // I = S || P
   const I = new Uint8Array(S.length + P.length);
   I.set(S, 0);
   I.set(P, S.length);

   const result = new Uint8Array(keyLen);
   let resultOffset = 0;

   while (resultOffset < keyLen) {
      // Hash D || I
      let A = hashBytes(hashAlgorithm, concat(D, I));

      // Iterate
      for (let i = 1; i < iterations; i++) {
         A = hashBytes(hashAlgorithm, A);
      }

      // Copy output
      const remaining = keyLen - resultOffset;
      const toCopy = Math.min(remaining, A.length);
      result.set(A.subarray(0, toCopy), resultOffset);
      resultOffset += toCopy;

      if (resultOffset >= keyLen) break;

      // Increment I: for each v-byte block of I, add A (repeated to v bytes) + 1
      const B = padToMultiple(A, v);
      for (let j = 0; j < I.length; j += v) {
         let carry = 1;
         for (let k = v - 1; k >= 0; k--) {
            const sum = I[j + k]! + B[k]! + carry;
            I[j + k] = sum & 0xff;
            carry = sum >>> 8;
         }
      }
   }

   return result;
}

function passwordToBmpString(password: string): Uint8Array {
   // BMP encoding: each character as 2 bytes (UTF-16BE), plus 0x00 0x00 terminator
   if (password.length === 0) {
      // Empty password is encoded as just the null terminator
      return new Uint8Array([0x00, 0x00]);
   }
   const result = new Uint8Array(password.length * 2 + 2);
   for (let i = 0; i < password.length; i++) {
      const code = password.charCodeAt(i);
      result[i * 2] = (code >>> 8) & 0xff;
      result[i * 2 + 1] = code & 0xff;
   }
   // Null terminator already 0x00 0x00 from Uint8Array initialization
   return result;
}

function padToMultiple(data: Uint8Array, blockSize: number): Uint8Array {
   if (data.length === 0) {
      return new Uint8Array(0);
   }
   const padded = new Uint8Array(
      Math.ceil(data.length / blockSize) * blockSize,
   );
   for (let i = 0; i < padded.length; i++) {
      padded[i] = data[i % data.length]!;
   }
   return padded;
}

function hashBytes(algorithm: string, data: Uint8Array): Uint8Array {
   const h = createHash(algorithm);
   h.update(data);
   return new Uint8Array(h.digest());
}

function concat(...arrays: Uint8Array[]): Uint8Array {
   const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
   const result = new Uint8Array(totalLength);
   let offset = 0;
   for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
   }
   return result;
}

// ---------------------------------------------------------------------------
// PBE Decryption
// ---------------------------------------------------------------------------

function decryptPbe(
   encryptedData: Uint8Array,
   algorithmOid: string,
   algorithmParams: Asn1Node,
   password: string,
): Uint8Array {
   if (algorithmOid === OID_PBES2) {
      return decryptPbes2(encryptedData, algorithmParams, password);
   }

   // Legacy PBE (PKCS#12 specific)
   const params = expectSequence(algorithmParams, "PBE parameters");
   const salt = params[0]!.value as Uint8Array;
   const iterations = Number(readInteger(params[1]!));

   let keyLen: number;
   let ivLen: number;
   let cipherName: string;

   switch (algorithmOid) {
      case OID_PBE_SHA_3DES: // pbeWithSHAAnd3-KeyTripleDES-CBC
         keyLen = 24;
         ivLen = 8;
         cipherName = "des-ede3-cbc";
         break;
      case OID_PBE_SHA_2DES: // pbeWithSHAAnd2-KeyTripleDES-CBC
         keyLen = 24;
         ivLen = 8;
         cipherName = "des-ede3-cbc";
         break;
      case OID_PBE_SHA_RC2_128: // pbeWithSHAAnd128BitRC2-CBC
         keyLen = 16;
         ivLen = 8;
         cipherName = "rc2-cbc";
         break;
      case OID_PBE_SHA_RC2_40: // pbeWithSHAAnd40BitRC2-CBC
         keyLen = 5;
         ivLen = 8;
         cipherName = "rc2-40-cbc";
         break;
      default:
         throw new Pkcs12Error(`Unsupported PBE algorithm: ${algorithmOid}`);
   }

   const key = pkcs12Kdf(password, salt, iterations, 1, keyLen, "sha1");
   const iv = pkcs12Kdf(password, salt, iterations, 2, ivLen, "sha1");

   return decryptCipher(cipherName, key, iv, encryptedData);
}

function decryptPbes2(
   encryptedData: Uint8Array,
   params: Asn1Node,
   password: string,
): Uint8Array {
   // PBES2-params ::= SEQUENCE { keyDerivationFunc, encryptionScheme }
   const pbes2Params = expectSequence(params, "PBES2-params");
   const kdfInfo = expectSequence(pbes2Params[0]!, "KeyDerivationFunc");
   const encScheme = expectSequence(pbes2Params[1]!, "EncryptionScheme");

   const kdfOid = readOid(kdfInfo[0]!);
   if (kdfOid !== OID_PBKDF2) {
      throw new Pkcs12Error(`Unsupported KDF: ${kdfOid}`);
   }

   // PBKDF2-params ::= SEQUENCE { salt, iterationCount, keyLength?, prf? }
   const pbkdf2Params = expectSequence(kdfInfo[1]!, "PBKDF2-params");
   const salt = pbkdf2Params[0]!.value as Uint8Array;
   const iterations = Number(readInteger(pbkdf2Params[1]!));

   // Determine PRF (default: HMAC-SHA1)
   let prfAlg = "sha1";
   // keyLength may be present at index 2 (INTEGER), prf at index 2 or 3 (SEQUENCE)
   for (let i = 2; i < pbkdf2Params.length; i++) {
      const param = pbkdf2Params[i]!;
      if (param.tag === 0x10 && param.constructed) {
         // This is AlgorithmIdentifier for PRF
         const prfOid = readOid((param.value as Asn1Node[])[0]!);
         prfAlg = mapHmacOidToHash(prfOid);
      }
   }

   // Determine encryption scheme
   const encOid = readOid(encScheme[0]!);
   let cipherName: string;
   let keyLen: number;

   switch (encOid) {
      case OID_AES_128_CBC:
         cipherName = "aes-128-cbc";
         keyLen = 16;
         break;
      case OID_AES_192_CBC:
         cipherName = "aes-192-cbc";
         keyLen = 24;
         break;
      case OID_AES_256_CBC:
         cipherName = "aes-256-cbc";
         keyLen = 32;
         break;
      case OID_DES_EDE3_CBC:
         cipherName = "des-ede3-cbc";
         keyLen = 24;
         break;
      default:
         throw new Pkcs12Error(`Unsupported encryption scheme: ${encOid}`);
   }

   const iv = encScheme[1]!.value as Uint8Array;

   // Derive key using PBKDF2
   const key = new Uint8Array(
      pbkdf2Sync(password, Buffer.from(salt), iterations, keyLen, prfAlg),
   );

   return decryptCipher(cipherName, key, iv, encryptedData);
}

function decryptCipher(
   cipherName: string,
   key: Uint8Array,
   iv: Uint8Array,
   encryptedData: Uint8Array,
): Uint8Array {
   const decipher = createDecipheriv(
      cipherName,
      Buffer.from(key),
      Buffer.from(iv),
   );
   decipher.setAutoPadding(true);

   const chunks: Buffer[] = [];
   chunks.push(decipher.update(Buffer.from(encryptedData)));
   chunks.push(decipher.final());

   return new Uint8Array(Buffer.concat(chunks));
}

// ---------------------------------------------------------------------------
// EncryptedData decryption
// ---------------------------------------------------------------------------

function decryptEncryptedData(
   encryptedDataNode: Asn1Node,
   password: string,
): Uint8Array {
   // EncryptedData ::= SEQUENCE { version, EncryptedContentInfo }
   const edChildren = expectSequence(encryptedDataNode, "EncryptedData");

   // EncryptedContentInfo ::= SEQUENCE { contentType, contentEncryptionAlgorithm, [0] encryptedContent }
   const eci = expectSequence(edChildren[1]!, "EncryptedContentInfo");

   // contentEncryptionAlgorithm ::= SEQUENCE { algorithm OID, parameters }
   const algSeq = expectSequence(eci[1]!, "AlgorithmIdentifier");
   const algOid = readOid(algSeq[0]!);
   const algParams = algSeq[1]!;

   // [0] IMPLICIT encryptedContent — OCTET STRING data
   const encryptedContentNode = eci[2]!;
   let encryptedContent: Uint8Array;

   if (
      encryptedContentNode.class === "context" &&
      encryptedContentNode.tag === 0
   ) {
      if (
         encryptedContentNode.constructed &&
         Array.isArray(encryptedContentNode.value)
      ) {
         // Constructed OCTET STRING: concatenate all child OCTET STRINGs
         const parts: Uint8Array[] = [];
         for (const child of encryptedContentNode.value) {
            parts.push(child.value as Uint8Array);
         }
         encryptedContent = concat(...parts);
      } else {
         encryptedContent = encryptedContentNode.value as Uint8Array;
      }
   } else {
      throw new Pkcs12Error("Expected [0] IMPLICIT encrypted content");
   }

   return decryptPbe(encryptedContent, algOid, algParams, password);
}

// ---------------------------------------------------------------------------
// SafeBag parsing
// ---------------------------------------------------------------------------

type SafeBag =
   | { type: "cert"; data: Uint8Array }
   | { type: "key"; data: Uint8Array };

function parseSafeBags(safeContents: Asn1Node): SafeBag[] {
   const bags: SafeBag[] = [];
   const children = expectSequence(safeContents, "SafeContents");

   for (const bagNode of children) {
      const bagFields = expectSequence(bagNode, "SafeBag");
      const bagId = readOid(bagFields[0]!);
      const bagValue = unwrapContextTag(bagFields[1]!, 0);

      if (bagId === OID_CERT_BAG) {
         const cert = extractCertFromBag(bagValue);
         if (cert) bags.push({ type: "cert", data: cert });
      } else if (bagId === OID_PKCS8_SHROUDED_KEY_BAG) {
         // Store the raw EncryptedPrivateKeyInfo for later decryption
         bags.push({ type: "key", data: reEncode(bagValue) });
      }
   }

   return bags;
}

function extractCertFromBag(certBagNode: Asn1Node): Uint8Array | null {
   // CertBag ::= SEQUENCE { certId, certValue [0] EXPLICIT }
   const fields = expectSequence(certBagNode, "CertBag");
   const certId = readOid(fields[0]!);

   if (certId !== OID_X509_CERT) {
      return null;
   }

   // certValue is [0] EXPLICIT wrapping an OCTET STRING containing the DER cert
   const certValue = unwrapContextTag(fields[1]!, 0);
   return certValue.value as Uint8Array;
}

function decryptShroudedKeyBag(
   encryptedKeyInfoDer: Uint8Array,
   password: string,
): Uint8Array {
   // EncryptedPrivateKeyInfo ::= SEQUENCE { encryptionAlgorithm, encryptedData }
   const node = decodeDer(encryptedKeyInfoDer);
   const fields = expectSequence(node, "EncryptedPrivateKeyInfo");

   const algSeq = expectSequence(fields[0]!, "AlgorithmIdentifier");
   const algOid = readOid(algSeq[0]!);
   const algParams = algSeq[1]!;

   const encryptedData = fields[1]!.value as Uint8Array;

   const decryptedPkcs8 = decryptPbe(
      encryptedData,
      algOid,
      algParams,
      password,
   );

   // The decrypted data is a PKCS#8 PrivateKeyInfo DER structure
   // Validate it starts with SEQUENCE
   if (decryptedPkcs8[0] !== 0x30) {
      throw new Pkcs12Error(
         "Decrypted private key is not valid PKCS#8 (wrong password?)",
      );
   }

   return decryptedPkcs8;
}

// ---------------------------------------------------------------------------
// ASN.1 helpers
// ---------------------------------------------------------------------------

function expectSequence(node: Asn1Node, label: string): Asn1Node[] {
   if (!node.constructed || !Array.isArray(node.value)) {
      throw new Pkcs12Error(
         `Expected constructed SEQUENCE for ${label}, got tag 0x${node.tag.toString(16)}`,
      );
   }
   return node.value;
}

function readOid(node: Asn1Node): string {
   if (node.tag !== 6 || node.constructed) {
      throw new Pkcs12Error(`Expected OID, got tag 0x${node.tag.toString(16)}`);
   }
   return bytesToOid(node.value as Uint8Array);
}

function readInteger(node: Asn1Node): bigint {
   if (node.tag !== 2 || node.constructed) {
      throw new Pkcs12Error(
         `Expected INTEGER, got tag 0x${node.tag.toString(16)}`,
      );
   }
   const bytes = node.value as Uint8Array;
   if (bytes.length === 0) return 0n;

   // Two's complement
   let value = bytes[0]! & 0x80 ? -1n : 0n;
   for (const b of bytes) {
      value = (value << 8n) | BigInt(b);
   }
   return value;
}

function unwrapContextTag(node: Asn1Node, expectedTag: number): Asn1Node {
   if (node.class !== "context" || node.tag !== expectedTag) {
      throw new Pkcs12Error(
         `Expected context tag [${expectedTag}], got ${node.class} tag ${node.tag}`,
      );
   }
   if (node.constructed && Array.isArray(node.value)) {
      if (node.value.length === 1) {
         return node.value[0]!;
      }
      // If multiple children, return the node itself (the caller can deal with it)
      return node;
   }
   // Implicit tagging: raw bytes, parse them as ASN.1
   return decodeDer(node.value as Uint8Array);
}

function reEncode(node: Asn1Node): Uint8Array {
   return encodeDer(node);
}

function mapHashOidToName(oidStr: string): string {
   switch (oidStr) {
      case OID_SHA1:
         return "sha1";
      case OID_SHA256:
         return "sha256";
      case OID_SHA384:
         return "sha384";
      case OID_SHA512:
         return "sha512";
      default:
         return "sha1"; // Default for PKCS#12
   }
}

function mapHmacOidToHash(oidStr: string): string {
   switch (oidStr) {
      case OID_HMAC_SHA1:
         return "sha1";
      case OID_HMAC_SHA256:
         return "sha256";
      case OID_HMAC_SHA384:
         return "sha384";
      case OID_HMAC_SHA512:
         return "sha512";
      default:
         return "sha1";
   }
}
