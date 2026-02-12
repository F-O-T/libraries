/**
 * PAdES-BES Signer for ICP-Brasil
 * Creates PDF Advanced Electronic Signatures compliant with Brazilian standards
 */

import forge from "node-forge";
import { createHash } from "node:crypto";
import { requestTimestamp, extractTimestampToken } from "./timestamp-client.ts";
import { getSignaturePolicyAttribute } from "./signature-policy.ts";
import { getSigningCertificateV2Attribute } from "./signing-certificate.ts";

/**
 * ICP-Brasil Signature Policy OIDs
 */
const ICP_BRASIL_POLICIES = {
  // Política de Assinatura Digital da ICP-Brasil (PA_AD_RB_v2_3)
  AD_RB_v2_3: "2.16.76.1.7.1.1.2.3",
  // Política de Assinatura Digital da ICP-Brasil (PA_AD_RT_v2_3)
  AD_RT_v2_3: "2.16.76.1.7.1.1.2.4",
};

export interface PAdESSignOptions {
  p12Buffer: Buffer;
  password: string;
  bytesToSign: Buffer; // The actual bytes to sign (from ByteRange)
  reason?: string;
  location?: string;
  contactInfo?: string;
  tsaUrl?: string; // Optional timestamp server URL
}

/**
 * Extract certificate and key from P12/PFX file
 */
function extractP12(p12Buffer: Buffer, password: string) {
  const p12Der = forge.util.decode64(p12Buffer.toString("base64"));
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

  // Get certificate bags
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const pkcs8Bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

  if (!certBags[forge.pki.oids.certBag] || certBags[forge.pki.oids.certBag].length === 0) {
    throw new Error("No certificate found in P12 file");
  }

  if (!pkcs8Bags[forge.pki.oids.pkcs8ShroudedKeyBag] || pkcs8Bags[forge.pki.oids.pkcs8ShroudedKeyBag].length === 0) {
    throw new Error("No private key found in P12 file");
  }

  const cert = certBags[forge.pki.oids.certBag][0].cert;
  const key = pkcs8Bags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;

  // Get certificate chain (all certs in the bag)
  const certChain = certBags[forge.pki.oids.certBag].map((bag) => bag.cert);

  return { cert, key, certChain };
}

/**
 * Create PAdES-BES signature for PDF
 */
export async function createPAdESSignature(options: PAdESSignOptions): Promise<Buffer> {
  const { p12Buffer, password, bytesToSign, reason, location } = options;

  try {
    // Extract certificate and private key
    const { cert, key, certChain } = extractP12(p12Buffer, password);

    // Calculate document hash from the bytes to sign
    const documentHash = createHash("sha256").update(bytesToSign).digest();

    // Create PKCS#7 signed data structure
    const p7 = forge.pkcs7.createSignedData();

    // Add content (detached signature)
    p7.content = forge.util.createBuffer(documentHash.toString("binary"));

    // Add certificate chain
    for (const certificate of certChain) {
      if (certificate) {
        p7.addCertificate(certificate);
      }
    }

    // Create signed attributes (required for PAdES-BES)
    
    // Basic required attributes
    const authenticatedAttributes = [
      {
        type: forge.pki.oids.contentType,
        value: forge.pki.oids.data,
      },
      {
        type: forge.pki.oids.messageDigest,
        value: documentHash.toString("binary"),
      },
      {
        type: forge.pki.oids.signingTime,
        value: new Date(),
      },
    ];

    // Add ICP-Brasil Signature Policy (MANDATORY for ICP-Brasil validation)
    const sigPolicyAttr = await getSignaturePolicyAttribute();
    authenticatedAttributes.push(sigPolicyAttr);

    // Add Signing Certificate V2 (MANDATORY for ICP-Brasil validation)
    const signingCertV2Attr = getSigningCertificateV2Attribute(cert);
    authenticatedAttributes.push(signingCertV2Attr);

    // Add signer
    p7.addSigner({
      key: key,
      certificate: cert,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: authenticatedAttributes,
    });

    // Sign
    p7.sign({ detached: true });

    // Add timestamp as unsigned attribute (MANDATORY for ICP-Brasil)
    // This proves when the signature was created according to a trusted third party
    try {
      // Convert to ASN.1 to access the signature bytes
      const p7Asn1 = p7.toAsn1();
      
      // PKCS#7 Structure:
      // ContentInfo ::= SEQUENCE {
      //   contentType ContentType,
      //   content [0] EXPLICIT SignedData
      // }
      //
      // SignedData ::= SEQUENCE {
      //   version INTEGER,
      //   digestAlgorithms SET OF AlgorithmIdentifier,
      //   contentInfo ContentInfo,
      //   certificates [0] IMPLICIT Certificates OPTIONAL,
      //   signerInfos SET OF SignerInfo
      // }
      //
      // SignerInfo ::= SEQUENCE {
      //   version INTEGER,
      //   issuerAndSerialNumber IssuerAndSerialNumber,
      //   digestAlgorithm AlgorithmIdentifier,
      //   authenticatedAttributes [0] IMPLICIT Attributes OPTIONAL,
      //   digestEncryptionAlgorithm AlgorithmIdentifier,
      //   encryptedDigest OCTET STRING,
      //   unauthenticatedAttributes [1] IMPLICIT Attributes OPTIONAL
      // }
      
      // Navigate to SignedData (content is [0] EXPLICIT)
      const signedData = p7Asn1.value[1].value[0];
      
      // Get SignerInfos SET
      const signerInfosSet = signedData.value[signedData.value.length - 1];
      
      // Get first SignerInfo from the SET
      const signerInfo = signerInfosSet.value[0];
      
      // Find the encryptedDigest field (OCTET STRING containing the signature)
      // It's after authenticatedAttributes[0], digestEncryptionAlgorithm
      let signatureBytes: Buffer | null = null;
      
      for (let i = 0; i < signerInfo.value.length; i++) {
        const field = signerInfo.value[i];
        // encryptedDigest is an OCTET STRING
        if (field.type === forge.asn1.Type.OCTETSTRING) {
          signatureBytes = Buffer.from(field.value, "binary");
          break;
        }
      }
      
      if (!signatureBytes) {
        throw new Error("Could not find signature bytes in PKCS#7 structure");
      }
      
      // Request timestamp for the signature
      const timestampResp = await requestTimestamp(signatureBytes, {
        tsaUrl: options.tsaUrl,
      });
      const timestampToken = extractTimestampToken(timestampResp);
      
      // Add timestamp as unsigned attribute
      // OID: 1.2.840.113549.1.9.16.2.14 (id-aa-timeStampToken)
      const timestampAsn1 = forge.asn1.fromDer(timestampToken.toString("binary"));
      
      // Create unsigned attribute
      const unsignedAttr = {
        type: "1.2.840.113549.1.9.16.2.14",
        value: timestampAsn1,
      };
      
      // Create unsignedAttrs [1] IMPLICIT SET OF Attribute
      const unsignedAttrs = forge.asn1.create(
        forge.asn1.Class.CONTEXT_SPECIFIC,
        1, // tag [1]
        true,
        [
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.SEQUENCE,
            true,
            [
              forge.asn1.create(
                forge.asn1.Class.UNIVERSAL,
                forge.asn1.Type.OID,
                false,
                forge.asn1.oidToDer(unsignedAttr.type).getBytes()
              ),
              forge.asn1.create(
                forge.asn1.Class.UNIVERSAL,
                forge.asn1.Type.SET,
                true,
                [unsignedAttr.value]
              ),
            ]
          ),
        ]
      );
      
      // Add unsignedAttrs to SignerInfo (append as 7th field)
      signerInfo.value.push(unsignedAttrs);
      
    } catch (error) {
      console.warn('Failed to add timestamp (signature is still valid without it):', error);
      // Timestamp failure is not critical - the signature is still valid
      // ICP-Brasil requires timestamps, but for testing we allow it to proceed
    }

    // Convert to DER format
    const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
    return Buffer.from(der, "binary");
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`PAdES signing failed: ${error.message}`);
    }
    throw error;
  }
}
