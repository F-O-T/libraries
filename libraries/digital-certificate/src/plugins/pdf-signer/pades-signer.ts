/**
 * PAdES-BES Signer for ICP-Brasil
 * Creates PDF Advanced Electronic Signatures compliant with Brazilian standards
 */

import forge from "node-forge";
import { createHash } from "node:crypto";

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
  pdfBuffer: Buffer;
  reason?: string;
  location?: string;
  contactInfo?: string;
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
export function createPAdESSignature(options: PAdESSignOptions): Buffer {
  const { p12Buffer, password, pdfBuffer, reason, location } = options;

  try {
    // Extract certificate and private key
    console.log('Extracting P12...');
    const { cert, key, certChain } = extractP12(p12Buffer, password);
    console.log('P12 extracted successfully');

    // Calculate document hash
    const documentHash = createHash("sha256").update(pdfBuffer).digest();

    // Create PKCS#7 signed data structure
    console.log('Creating PKCS#7 signed data...');
    const p7 = forge.pkcs7.createSignedData();

    // Add content (detached signature)
    p7.content = forge.util.createBuffer(documentHash.toString("binary"));

    // Add certificate chain
    console.log('Adding certificate chain...');
    for (const certificate of certChain) {
      if (certificate) {
        p7.addCertificate(certificate);
      }
    }

    // Create signed attributes (required for PAdES-BES)
    console.log('Creating authenticated attributes...');
    
    // Simplified - let node-forge handle the encoding
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

    console.log('Adding signer...');
    // Add signer
    p7.addSigner({
      key: key,
      certificate: cert,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: authenticatedAttributes,
    });

    console.log('Signing...');
    // Sign
    p7.sign({ detached: true });

    console.log('Converting to DER...');
    // Convert to DER format
    const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
    return Buffer.from(der, "binary");
  } catch (error) {
    console.error('Error in createPAdESSignature:', error);
    if (error instanceof Error) {
      throw new Error(`PAdES signing failed: ${error.message}\nStack: ${error.stack}`);
    }
    throw error;
  }
}
