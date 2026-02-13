import {
  encodeDer,
  decodeDer,
  sequence,
  set,
  integer,
  oid,
  octetString,
  contextTag,
  nullValue,
  type Asn1Node,
} from "@f-o-t/asn1";
import { sign } from "node:crypto";
import type { SignedDataOptions, CmsAttribute, HashAlgorithm } from "./types.ts";
import { signedDataOptionsSchema } from "./schemas.ts";
import { hash } from "./hash.ts";

// Well-known OIDs
const OID = {
  data: "1.2.840.113549.1.7.1",
  signedData: "1.2.840.113549.1.7.2",
  contentType: "1.2.840.113549.1.9.3",
  messageDigest: "1.2.840.113549.1.9.4",
  sha256: "2.16.840.1.101.3.4.2.1",
  sha384: "2.16.840.1.101.3.4.2.2",
  sha512: "2.16.840.1.101.3.4.2.3",
  sha256WithRSA: "1.2.840.113549.1.1.11",
  sha384WithRSA: "1.2.840.113549.1.1.12",
  sha512WithRSA: "1.2.840.113549.1.1.13",
  rsaEncryption: "1.2.840.113549.1.1.1",
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
export function createSignedData(options: SignedDataOptions): Uint8Array {
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

  const digestOid = hashAlgorithmToOid(hashAlgorithm);
  const signatureAlgOid = hashAlgorithmToSignatureOid(hashAlgorithm);

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

  // 4. Sign the DER-encoded attributes
  const signatureValue = signData(attrsDer, privateKey, hashAlgorithm);

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
    // signatureAlgorithm
    algorithmIdentifier(signatureAlgOid),
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
    encapContentInfoChildren.push(
      contextTag(0, [octetString(content)]),
    );
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function algorithmIdentifier(algOid: string): Asn1Node {
  return sequence(oid(algOid), nullValue());
}

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

function signData(
  data: Uint8Array,
  privateKeyDer: Uint8Array,
  hashAlgorithm: HashAlgorithm,
): Uint8Array {
  const nodeAlgorithm = hashAlgorithm === "sha256"
    ? "sha256"
    : hashAlgorithm === "sha384"
      ? "sha384"
      : "sha512";

  const signature = sign(nodeAlgorithm, data, {
    key: Buffer.from(privateKeyDer),
    format: "der",
    type: "pkcs8",
  });

  return new Uint8Array(signature);
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

function hashAlgorithmToSignatureOid(alg: HashAlgorithm): string {
  switch (alg) {
    case "sha256":
      return OID.sha256WithRSA;
    case "sha384":
      return OID.sha384WithRSA;
    case "sha512":
      return OID.sha512WithRSA;
  }
}
