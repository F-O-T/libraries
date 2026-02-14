# @f-o-t/digital-certificate

Brazilian A1 digital certificate handling with XML/PDF signing and mTLS support.

[![npm version](https://img.shields.io/npm/v/@f-o-t/digital-certificate.svg)](https://www.npmjs.com/package/@f-o-t/digital-certificate)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Certificate Management**: Parse and validate Brazilian A1 digital certificates (.pfx/.p12)
- **Brazilian Standards**: Extract CNPJ/CPF from certificate fields
- **Type Safety**: Full TypeScript support with Zod schema validation
- **XML Digital Signatures**: Sign XML documents with XML-DSig (via plugin)
- **PDF Signing**: Sign PDF documents with visual signatures and QR codes (via plugin)
- **Mutual TLS**: Create mTLS contexts for secure HTTPS connections (via plugin)
- **Pure JavaScript**: No system dependencies — PKCS#12 parsing via `@f-o-t/crypto`
- **Validity Checking**: Built-in certificate expiry validation
- **Framework Agnostic**: Works with any JavaScript/TypeScript project

## Installation

```bash
# npm
npm install @f-o-t/digital-certificate

# bun
bun add @f-o-t/digital-certificate

# yarn
yarn add @f-o-t/digital-certificate

# pnpm
pnpm add @f-o-t/digital-certificate
```

**Requirements:**
- For XML signing: `@f-o-t/xml` (automatically included)

## Quick Start

```typescript
import { parseCertificate, isCertificateValid, daysUntilExpiry } from "@f-o-t/digital-certificate";
import { readFileSync } from "fs";

// Load certificate file
const pfxBuffer = readFileSync("certificate.pfx");
const password = "your-certificate-password";

// Parse certificate
const cert = parseCertificate(pfxBuffer, password);

// Check validity
console.log("Valid:", isCertificateValid(cert));
console.log("Days until expiry:", daysUntilExpiry(cert));

// Access certificate information
console.log("Common Name:", cert.subject.commonName);
console.log("Organization:", cert.subject.organization);
console.log("CNPJ:", cert.brazilian.cnpj);
console.log("CPF:", cert.brazilian.cpf);
console.log("Valid from:", cert.validity.notBefore);
console.log("Valid until:", cert.validity.notAfter);
console.log("Fingerprint:", cert.fingerprint);
```

## Core API

### Certificate Parsing

Parse .pfx/.p12 certificate files:

```typescript
import { parseCertificate } from "@f-o-t/digital-certificate";

const cert = parseCertificate(pfxBuffer, password);

// Certificate structure
console.log(cert.serialNumber);        // Certificate serial number
console.log(cert.subject);             // Subject information
console.log(cert.issuer);              // Issuer information
console.log(cert.validity);            // Validity period
console.log(cert.fingerprint);         // SHA-256 fingerprint
console.log(cert.isValid);             // Current validity status
console.log(cert.brazilian);           // Brazilian-specific fields
console.log(cert.certPem);             // Certificate in PEM format
console.log(cert.keyPem);              // Private key in PEM format
console.log(cert.pfxBuffer);           // Original PFX buffer
console.log(cert.pfxPassword);         // PFX password
```

### Subject Information

Access subject (certificate holder) details:

```typescript
const { subject } = cert;

console.log(subject.commonName);           // CN - Common Name
console.log(subject.organization);         // O - Organization
console.log(subject.organizationalUnit);   // OU - Organizational Unit
console.log(subject.country);              // C - Country
console.log(subject.state);                // ST - State
console.log(subject.locality);             // L - Locality
console.log(subject.raw);                  // Raw DN string
```

### Issuer Information

Access issuer (CA) details:

```typescript
const { issuer } = cert;

console.log(issuer.commonName);      // CN - CA name
console.log(issuer.organization);    // O - CA organization
console.log(issuer.country);         // C - CA country
console.log(issuer.raw);             // Raw DN string
```

### Brazilian-Specific Fields

Extract CNPJ/CPF from certificate:

```typescript
const { brazilian } = cert;

// Company certificate
if (brazilian.cnpj) {
  console.log("CNPJ:", brazilian.cnpj);  // e.g., "12345678000190"
}

// Individual certificate
if (brazilian.cpf) {
  console.log("CPF:", brazilian.cpf);  // e.g., "12345678900"
}
```

### Validity Checking

Check certificate validity:

```typescript
import { isCertificateValid, daysUntilExpiry } from "@f-o-t/digital-certificate";

// Check if currently valid
const isValid = isCertificateValid(cert);

// Get days until expiry (negative if expired)
const days = daysUntilExpiry(cert);

if (days < 0) {
  console.log(`Certificate expired ${Math.abs(days)} days ago`);
} else if (days < 30) {
  console.log(`Certificate expires in ${days} days - renewal recommended`);
} else {
  console.log(`Certificate valid for ${days} more days`);
}

// Access validity dates directly
console.log("Valid from:", cert.validity.notBefore);
console.log("Valid until:", cert.validity.notAfter);
```

### PEM Extraction

Get PEM-formatted certificate and key:

```typescript
import { getPemPair } from "@f-o-t/digital-certificate";

// Extract PEM pair
const { cert: certPem, key: keyPem } = getPemPair(cert);

// Use with custom HTTP clients
import https from "https";

const agent = new https.Agent({
  cert: certPem,
  key: keyPem
});

// Make authenticated request
https.get("https://api.example.com", { agent }, (res) => {
  // Handle response
});
```

## Type System

Full TypeScript support:

```typescript
import type {
  CertificateInfo,
  CertificateSubject,
  CertificateIssuer,
  CertificateValidity,
  BrazilianFields,
  PemPair,
  SignatureAlgorithm
} from "@f-o-t/digital-certificate";

// Certificate information
const certInfo: CertificateInfo = {
  serialNumber: "1234567890",
  subject: {
    commonName: "Company Name",
    organization: "Company Inc",
    organizationalUnit: "IT Department",
    country: "BR",
    state: "SP",
    locality: "São Paulo",
    raw: "CN=Company Name,O=Company Inc,..."
  },
  issuer: {
    commonName: "CA Name",
    organization: "Certificate Authority",
    country: "BR",
    raw: "CN=CA Name,O=Certificate Authority,..."
  },
  validity: {
    notBefore: new Date("2024-01-01"),
    notAfter: new Date("2025-01-01")
  },
  fingerprint: "abcdef...",
  isValid: true,
  brazilian: {
    cnpj: "12345678000190",
    cpf: null
  },
  certPem: "-----BEGIN CERTIFICATE-----...",
  keyPem: "-----BEGIN PRIVATE KEY-----...",
  pfxBuffer: Buffer.from([]),
  pfxPassword: "password"
};
```

## Zod Schemas

Validate certificate-related data:

```typescript
import {
  signatureAlgorithmSchema,
  signOptionsSchema,
  mtlsOptionsSchema
} from "@f-o-t/digital-certificate";

// Validate signature algorithm
const algorithm = signatureAlgorithmSchema.parse("RSA-SHA256");

// Available algorithms: "RSA-SHA1", "RSA-SHA256"
```

## Utilities

Low-level utilities for working with certificates:

```typescript
import {
  extractCnpj,
  extractCpf,
  parseDistinguishedName,
  pemToBase64,
  BRAZILIAN_OIDS,
  DIGEST_ALGORITHMS,
  SIGNATURE_ALGORITHMS,
  TRANSFORM_ALGORITHMS,
  XMLDSIG_NS,
  EXC_C14N_NS
} from "@f-o-t/digital-certificate";

// Extract CNPJ from text
const cnpj = extractCnpj("serialNumber=12345678000190");
// "12345678000190"

// Extract CPF from text
const cpf = extractCpf("CN=John Doe:12345678900");
// "12345678900"

// Parse distinguished name
const dn = parseDistinguishedName("CN=Company,O=Inc,C=BR");
// { CN: "Company", O: "Inc", C: "BR" }

// Convert PEM to base64
const base64 = pemToBase64(certPem);

// Brazilian OIDs
console.log(BRAZILIAN_OIDS.CNPJ);  // "2.16.76.1.3.3"
console.log(BRAZILIAN_OIDS.CPF);   // "2.16.76.1.3.1"

// Algorithm constants
console.log(DIGEST_ALGORITHMS["RSA-SHA256"]);     // "http://www.w3.org/2001/04/xmlenc#sha256"
console.log(SIGNATURE_ALGORITHMS["RSA-SHA256"]); // "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"
```

## Plugins

### XML Digital Signatures

Sign XML documents with XML-DSig:

```typescript
import { parseCertificate } from "@f-o-t/digital-certificate";
import { signXml } from "@f-o-t/digital-certificate/plugins/xml-signer";
import { parseXml } from "@f-o-t/xml";

// Parse certificate
const cert = parseCertificate(pfxBuffer, password);

// Parse XML document
const doc = parseXml(`
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe12345678901234567890123456789012345678901234">
      <ide>
        <cUF>35</cUF>
        <nNF>123</nNF>
      </ide>
    </infNFe>
  </NFe>
`);

// Sign XML
const signedXml = signXml(doc, cert, {
  algorithm: "RSA-SHA256",
  referenceUri: "#NFe12345678901234567890123456789012345678901234",
  transforms: ["enveloped-signature", "c14n"]
});

console.log(signedXml);  // XML with <Signature> element
```

**Features:**
- Enveloped signatures (inside the signed document)
- RSA-SHA1 and RSA-SHA256 algorithms
- Exclusive C14N canonicalization
- Reference URI support for partial document signing
- Compatible with Brazilian fiscal XML standards (NF-e, NFS-e, etc.)

**Sign options:**

```typescript
import type { SignOptions } from "@f-o-t/digital-certificate";

const options: SignOptions = {
  algorithm: "RSA-SHA256",           // or "RSA-SHA1"
  referenceUri: "#elementId",        // URI to signed element
  transforms: [                      // Optional transforms
    "enveloped-signature",
    "c14n"
  ]
};
```

### Mutual TLS (mTLS)

Create mTLS contexts for HTTPS connections:

```typescript
import { parseCertificate } from "@f-o-t/digital-certificate";
import { createMtlsContext, createMtlsAgent } from "@f-o-t/digital-certificate/plugins/mtls";
import https from "https";

// Parse certificate
const cert = parseCertificate(pfxBuffer, password);

// Create mTLS context
const context = createMtlsContext(cert);
// Returns: { cert: string, key: string, passphrase?: string, pfx?: Buffer }

// Create HTTPS agent
const agent = createMtlsAgent(cert, {
  rejectUnauthorized: true,  // Verify server certificate
  ca: [caCertPem]           // Optional CA certificates
});

// Use with https module
https.get("https://api.sefaz.sp.gov.br/ws/nfe", { agent }, (res) => {
  let data = "";
  res.on("data", (chunk) => data += chunk);
  res.on("end", () => console.log(data));
});

// Use with fetch (Node.js 18+)
const response = await fetch("https://api.example.com", {
  // @ts-ignore - dispatcher not yet typed
  dispatcher: agent
});
```

**Create custom agent:**

```typescript
import https from "https";

const agent = new https.Agent({
  cert: cert.certPem,
  key: cert.keyPem,
  rejectUnauthorized: true,
  // Additional options
  keepAlive: true,
  maxSockets: 10
});
```

### PDF Signing

Sign PDF documents with visual signatures:

```typescript
import { parseCertificate } from "@f-o-t/digital-certificate";
import { signPdf } from "@f-o-t/digital-certificate/plugins/pdf-signer";
import { readFileSync, writeFileSync } from "fs";

// Parse certificate
const cert = parseCertificate(pfxBuffer, password);

// Load PDF
const pdfBuffer = readFileSync("document.pdf");

// Sign PDF with visual signature
const signedPdf = await signPdf(pdfBuffer, cert, {
  reason: "Document approval",
  location: "São Paulo, Brazil",
  contactInfo: "contact@example.com",

  // Visual signature options
  appearance: {
    page: 0,                    // First page (0-indexed)
    x: 50,                      // X position
    y: 50,                      // Y position
    width: 200,                 // Signature box width
    height: 100,                // Signature box height

    // Signature content
    signerName: "Company Name",
    signerInfo: "CNPJ: 12.345.678/0001-90",
    timestamp: new Date(),

    // Optional QR code
    qrCode: {
      data: "https://verify.example.com/doc/123",
      size: 80
    }
  }
});

// Save signed PDF
writeFileSync("document-signed.pdf", signedPdf);
```

**PDF signing options:**

```typescript
interface PdfSignOptions {
  reason?: string;           // Reason for signing
  location?: string;         // Location where signed
  contactInfo?: string;      // Contact information

  appearance?: {
    page: number;            // Page number (0-indexed)
    x: number;               // X coordinate
    y: number;               // Y coordinate
    width: number;           // Width of signature box
    height: number;          // Height of signature box

    signerName?: string;     // Name to display
    signerInfo?: string;     // Additional info
    timestamp?: Date;        // Signature timestamp

    qrCode?: {
      data: string;          // QR code content
      size?: number;         // QR code size (default: 100)
    };
  };
}
```

**Features:**
- PKCS#7 digital signatures
- Visual signature appearance
- QR code generation for verification
- Multiple signature support
- Compatible with Adobe Reader and other PDF viewers
- Preserves existing PDF content and metadata

## Advanced Usage

### Certificate Chain Validation

```typescript
import { parseCertificate, isCertificateValid } from "@f-o-t/digital-certificate";

// Parse certificate
const cert = parseCertificate(pfxBuffer, password);

// Basic validation
if (!isCertificateValid(cert)) {
  throw new Error("Certificate is expired or not yet valid");
}

// Check expiry threshold
const days = daysUntilExpiry(cert);
if (days < 30) {
  console.warn(`Certificate expires soon: ${days} days remaining`);
}

// Verify certificate fields
if (!cert.brazilian.cnpj && !cert.brazilian.cpf) {
  throw new Error("Not a Brazilian certificate");
}
```

### Working with Multiple Certificates

```typescript
import { parseCertificate, isCertificateValid } from "@f-o-t/digital-certificate";

// Load and validate multiple certificates
const certificates = [
  { file: "cert1.pfx", password: "pass1" },
  { file: "cert2.pfx", password: "pass2" }
].map(({ file, password }) => {
  const buffer = readFileSync(file);
  return parseCertificate(buffer, password);
});

// Find valid certificates
const validCerts = certificates.filter(isCertificateValid);

// Find certificate by CNPJ
function findByCnpj(cnpj: string) {
  return validCerts.find(cert => cert.brazilian.cnpj === cnpj);
}

// Find certificate expiring soonest
const expiringFirst = [...validCerts].sort((a, b) =>
  daysUntilExpiry(a) - daysUntilExpiry(b)
)[0];
```

### Batch XML Signing

```typescript
import { signXml } from "@f-o-t/digital-certificate/plugins/xml-signer";

// Sign multiple XML documents
const xmlDocuments = [doc1, doc2, doc3];

const signedDocuments = xmlDocuments.map(doc =>
  signXml(doc, cert, {
    algorithm: "RSA-SHA256",
    referenceUri: `#${doc.root?.attributes.find(a => a.name === "Id")?.value}`
  })
);
```

### Custom HTTPS Client with mTLS

```typescript
import { createMtlsAgent } from "@f-o-t/digital-certificate/plugins/mtls";
import axios from "axios";

// Create axios instance with mTLS
const client = axios.create({
  httpsAgent: createMtlsAgent(cert, {
    rejectUnauthorized: true
  }),
  timeout: 30000
});

// Make authenticated requests
const response = await client.post("https://api.sefaz.sp.gov.br/ws/nfe", xmlData, {
  headers: { "Content-Type": "application/xml" }
});
```

## Best Practices

### 1. Secure Certificate Storage

```typescript
// Don't commit certificates or passwords to version control
// Use environment variables or secure vaults

const pfxPath = process.env.CERTIFICATE_PATH;
const password = process.env.CERTIFICATE_PASSWORD;

if (!pfxPath || !password) {
  throw new Error("Certificate configuration missing");
}

const cert = parseCertificate(
  readFileSync(pfxPath),
  password
);
```

### 2. Cache Parsed Certificates

```typescript
// Parse once, reuse many times
let cachedCert: CertificateInfo | null = null;

function getCertificate(): CertificateInfo {
  if (!cachedCert) {
    cachedCert = parseCertificate(pfxBuffer, password);
  }

  // Verify still valid
  if (!isCertificateValid(cachedCert)) {
    throw new Error("Certificate expired");
  }

  return cachedCert;
}
```

### 3. Monitor Certificate Expiry

```typescript
import { daysUntilExpiry } from "@f-o-t/digital-certificate";

// Check expiry regularly
function checkCertificateExpiry(cert: CertificateInfo) {
  const days = daysUntilExpiry(cert);

  if (days < 0) {
    throw new Error("Certificate expired");
  }

  if (days < 30) {
    console.warn(`Certificate expires in ${days} days - renewal required`);
    // Send alert, email, etc.
  }
}

// Run daily
setInterval(() => checkCertificateExpiry(cert), 24 * 60 * 60 * 1000);
```

### 4. Handle Parsing Errors Gracefully

```typescript
try {
  const cert = parseCertificate(pfxBuffer, password);
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes("password")) {
      console.error("Invalid certificate password");
    } else if (error.message.includes("PFX")) {
      console.error("Invalid PFX file");
    } else {
      console.error("Certificate parsing failed:", error.message);
    }
  }
  throw error;
}
```

### 5. Validate Before Signing

```typescript
import { signXml } from "@f-o-t/digital-certificate/plugins/xml-signer";
import { isCertificateValid } from "@f-o-t/digital-certificate";

function safeSignXml(doc: XmlDocument, cert: CertificateInfo) {
  // Validate certificate first
  if (!isCertificateValid(cert)) {
    throw new Error("Cannot sign with expired certificate");
  }

  // Check expiry threshold
  if (daysUntilExpiry(cert) < 7) {
    console.warn("Certificate expires soon - consider renewing");
  }

  // Proceed with signing
  return signXml(doc, cert, {
    algorithm: "RSA-SHA256"
  });
}
```

## Error Handling

```typescript
try {
  const cert = parseCertificate(pfxBuffer, password);

  if (!isCertificateValid(cert)) {
    throw new Error(`Certificate expired on ${cert.validity.notAfter}`);
  }

  // Use certificate...
} catch (error) {
  if (error instanceof Error) {
    console.error("Certificate error:", error.message);

    // Handle specific error cases
    if (error.message.includes("wrong password")) {
      // Handle authentication error
    } else if (error.message.includes("OpenSSL")) {
      // Handle OpenSSL errors
    }
  }
}
```

## Performance

Optimized for production use:

- **Parse certificate**: < 100ms
- **Sign XML (1KB)**: < 50ms
- **Sign PDF (1MB)**: < 500ms
- **Create mTLS agent**: < 10ms

All benchmarks run on modern hardware with Bun runtime.

## Contributing

Contributions are welcome! Please check the repository for guidelines.

## License

MIT License - see LICENSE file for details.

## Links

- [GitHub Repository](https://github.com/F-O-T/libraries)
- [Issue Tracker](https://github.com/F-O-T/libraries/issues)
- [NPM Package](https://www.npmjs.com/package/@f-o-t/digital-certificate)
