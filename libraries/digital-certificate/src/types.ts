/**
 * Digital Certificate Types
 *
 * Types for Brazilian A1 digital certificate handling,
 * XML-DSig signing, and mTLS configuration.
 */

// =============================================================================
// Certificate Types
// =============================================================================

export interface CertificateSubject {
   commonName: string | null;
   organization: string | null;
   organizationalUnit: string | null;
   country: string | null;
   state: string | null;
   locality: string | null;
   /** Full raw subject string */
   raw: string;
}

export interface CertificateIssuer {
   commonName: string | null;
   organization: string | null;
   country: string | null;
   raw: string;
}

export interface CertificateValidity {
   notBefore: Date;
   notAfter: Date;
}

export interface BrazilianFields {
   /** CNPJ extracted from certificate (14 digits) */
   cnpj: string | null;
   /** CPF extracted from certificate (11 digits) */
   cpf: string | null;
}

export interface CertificateInfo {
   /** Certificate serial number */
   serialNumber: string;
   /** Subject (who the certificate was issued to) */
   subject: CertificateSubject;
   /** Issuer (who issued the certificate) */
   issuer: CertificateIssuer;
   /** Validity period */
   validity: CertificateValidity;
   /** SHA-256 fingerprint of the certificate */
   fingerprint: string;
   /** Whether the certificate is currently valid */
   isValid: boolean;
   /** Brazilian-specific fields (CNPJ, CPF) */
   brazilian: BrazilianFields;
   /** PEM-encoded certificate */
   certPem: string;
   /** PEM-encoded private key */
   keyPem: string;
   /** Raw PFX buffer */
   pfxBuffer: Buffer;
   /** PFX password */
   pfxPassword: string;
}

// =============================================================================
// Signing Types
// =============================================================================

export type SignatureAlgorithm = "sha1" | "sha256";

export interface SignOptions {
   /** The parsed certificate to use for signing */
   certificate: CertificateInfo;
   /** The URI of the element to sign (e.g., "#NFe123") */
   referenceUri: string;
   /** Hash algorithm for digest and signature (default: "sha256") */
   algorithm?: SignatureAlgorithm;
   /** Tag name of the element where Signature will be inserted.
    *  If not specified, the signature is appended to the root element. */
   signatureParent?: string;
   /** Whether to include the XML declaration in output (default: true) */
   includeDeclaration?: boolean;
}

// =============================================================================
// mTLS Types
// =============================================================================

export interface PemPair {
   cert: string;
   key: string;
}

export interface MtlsOptions {
   /** The parsed certificate to use */
   certificate: CertificateInfo;
   /** Additional CA certificates (PEM-encoded) */
   caCerts?: string[];
   /** Whether to reject unauthorized connections (default: true) */
   rejectUnauthorized?: boolean;
}
