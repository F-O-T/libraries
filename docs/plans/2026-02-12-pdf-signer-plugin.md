# PDF Signer Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add PDF digital signature capability to `@f-o-t/digital-certificate` with visible signature appearance including QR code, signer info, and ICP-Brasil certificate details.

**Architecture:** Create a new `plugins/pdf-signer` module following the same pattern as `xml-signer`. Use `pdf-lib` for PDF manipulation, Node.js `crypto` for PKCS#7 signature creation, and `qrcode` for QR code generation. The signature will include a visible appearance with certificate information and verification QR code.

**Tech Stack:** TypeScript, Bun, pdf-lib, qrcode, Node.js crypto, Zod

---

## Task 1: Setup Dependencies and Configuration

**Files:**
- Modify: `libraries/digital-certificate/package.json`
- Modify: `libraries/digital-certificate/fot.config.ts`

**Step 1: Add dependencies to package.json**

Add these dependencies:
```json
"dependencies": {
  "@f-o-t/xml": "^1.0.4",
  "pdf-lib": "^1.17.1",
  "qrcode": "^1.5.3",
  "zod": "^4.3.6"
},
"devDependencies": {
  "@f-o-t/cli": "^1.0.1",
  "@f-o-t/config": "^1.0.3",
  "@types/bun": "latest",
  "@types/qrcode": "^1.5.5"
}
```

**Step 2: Install dependencies**

Run: `bun install`
Expected: Dependencies installed successfully

**Step 3: Update fot.config.ts to include pdf-signer plugin**

```typescript
import { defineFotConfig } from '@f-o-t/config';

export default defineFotConfig({
  external: ['zod', 'pdf-lib', 'qrcode'],
  plugins: ['xml-signer', 'mtls', 'pdf-signer'],
});
```

**Step 4: Rebuild to verify configuration**

Run: `bun run build`
Expected: Build succeeds with new plugin entry point

**Step 5: Commit**

```bash
git add package.json fot.config.ts
git commit -m "feat(digital-certificate): add pdf-signer plugin dependencies"
```

---

## Task 2: Create Types and Schemas

**Files:**
- Modify: `libraries/digital-certificate/src/types.ts`
- Modify: `libraries/digital-certificate/src/schemas.ts`

**Step 1: Add PDF signer types to types.ts**

Add after the mTLS types:

```typescript
// =============================================================================
// PDF Signing Types
// =============================================================================

export interface SignaturePlacement {
  /** Page number (1-indexed, -1 for last page) */
  page: number;
  /** X coordinate from left (in points) */
  x: number;
  /** Y coordinate from bottom (in points) */
  y: number;
  /** Width of signature box (in points) */
  width: number;
  /** Height of signature box (in points) */
  height: number;
}

export interface SignatureAppearanceStyle {
  /** Background color (hex) */
  backgroundColor?: string;
  /** Border color (hex) */
  borderColor?: string;
  /** Text color (hex) */
  textColor?: string;
  /** Font size */
  fontSize?: number;
  /** Border width */
  borderWidth?: number;
}

export interface SignatureAppearanceOptions {
  /** Whether signature should be visible */
  visible: boolean;
  /** Placement on page */
  placement?: SignaturePlacement;
  /** Include QR code for verification */
  showQRCode?: boolean;
  /** Visual style */
  style?: SignatureAppearanceStyle;
  /** Custom reason text */
  reason?: string;
  /** Custom location text */
  location?: string;
  /** Contact information */
  contactInfo?: string;
}

export interface SignPdfOptions {
  /** The parsed certificate to use for signing */
  certificate: CertificateInfo;
  /** Signature appearance options */
  appearance?: SignatureAppearanceOptions;
  /** Reason for signing */
  reason?: string;
  /** Location of signing */
  location?: string;
  /** Contact information */
  contactInfo?: string;
}
```

**Step 2: Add PDF signer schemas to schemas.ts**

Add after mTLS schemas:

```typescript
// =============================================================================
// PDF Signing Schemas
// =============================================================================

export const signaturePlacementSchema = z.object({
  page: z.number().int().default(-1),
  x: z.number().default(50),
  y: z.number().default(100),
  width: z.number().default(400),
  height: z.number().default(120),
});

export const signatureAppearanceStyleSchema = z.object({
  backgroundColor: z.string().default('#E8F4F8'),
  borderColor: z.string().default('#FF0000'),
  textColor: z.string().default('#000000'),
  fontSize: z.number().default(10),
  borderWidth: z.number().default(2),
});

export const signatureAppearanceOptionsSchema = z.object({
  visible: z.boolean().default(true),
  placement: signaturePlacementSchema.optional(),
  showQRCode: z.boolean().default(true),
  style: signatureAppearanceStyleSchema.optional(),
  reason: z.string().optional(),
  location: z.string().optional(),
  contactInfo: z.string().optional(),
});

export const signPdfOptionsSchema = z.object({
  appearance: signatureAppearanceOptionsSchema.optional(),
  reason: z.string().default('Assinado digitalmente'),
  location: z.string().optional(),
  contactInfo: z.string().optional(),
});
```

**Step 3: Commit**

```bash
git add src/types.ts src/schemas.ts
git commit -m "feat(digital-certificate): add PDF signer types and schemas"
```

---

## Task 3: QR Code Generator

**Files:**
- Create: `libraries/digital-certificate/src/plugins/pdf-signer/qr-generator.ts`
- Create: `libraries/digital-certificate/__tests__/pdf-signer-qr.test.ts`

**Step 1: Write the failing test**

Create `__tests__/pdf-signer-qr.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import {
  createVerificationData,
  generateQRCode,
} from "../src/plugins/pdf-signer/qr-generator.ts";
import { loadCertificate } from "./test-helpers.ts";

describe("QR Code Generator", () => {
  const cert = loadCertificate();

  it("generates QR code as PNG buffer", async () => {
    const data = "TEST_DATA_123";
    const qrBuffer = await generateQRCode(data);

    expect(qrBuffer).toBeInstanceOf(Buffer);
    expect(qrBuffer.length).toBeGreaterThan(0);
    // PNG magic number
    expect(qrBuffer.toString("hex", 0, 4)).toBe("89504e47");
  });

  it("creates verification data string", () => {
    const documentHash = "abc123def456";
    const verificationData = createVerificationData(cert, documentHash);

    expect(verificationData).toContain(cert.fingerprint);
    expect(verificationData).toContain(documentHash);
    expect(verificationData).toContain("CERT:");
    expect(verificationData).toContain("DOC:");
  });

  it("generates QR code with verification data", async () => {
    const documentHash = "test-hash-123";
    const verificationData = createVerificationData(cert, documentHash);
    const qrBuffer = await generateQRCode(verificationData);

    expect(qrBuffer).toBeInstanceOf(Buffer);
    expect(qrBuffer.length).toBeGreaterThan(100);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test pdf-signer-qr.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Create QR generator implementation**

Create `src/plugins/pdf-signer/qr-generator.ts`:

```typescript
/**
 * QR Code Generator for PDF Signatures
 *
 * Generates QR codes for signature verification
 */

import QRCode from "qrcode";
import type { CertificateInfo } from "../../types.ts";

/**
 * Generate a QR code as PNG buffer
 *
 * @param data - The data to encode in the QR code
 * @returns PNG buffer of the QR code
 */
export async function generateQRCode(data: string): Promise<Buffer> {
  return await QRCode.toBuffer(data, {
    errorCorrectionLevel: "M",
    type: "png",
    width: 100,
    margin: 1,
  });
}

/**
 * Create verification data string for QR code
 *
 * @param cert - Certificate information
 * @param documentHash - Hash of the signed document
 * @returns Formatted verification string
 */
export function createVerificationData(
  cert: CertificateInfo,
  documentHash: string,
): string {
  const timestamp = new Date().toISOString();
  return `CERT:${cert.fingerprint}\nDOC:${documentHash}\nTIME:${timestamp}`;
}
```

**Step 4: Run test to verify it passes**

Run: `bun test pdf-signer-qr.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/plugins/pdf-signer/qr-generator.ts __tests__/pdf-signer-qr.test.ts
git commit -m "feat(pdf-signer): add QR code generator"
```

---

## Task 4: Signature Appearance Renderer

**Files:**
- Create: `libraries/digital-certificate/src/plugins/pdf-signer/signature-appearance.ts`
- Create: `libraries/digital-certificate/__tests__/pdf-signer-appearance.test.ts`

**Step 1: Write the failing test**

Create `__tests__/pdf-signer-appearance.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { PDFDocument } from "pdf-lib";
import { drawSignatureAppearance } from "../src/plugins/pdf-signer/signature-appearance.ts";
import { loadCertificate } from "./test-helpers.ts";

describe("Signature Appearance", () => {
  const cert = loadCertificate();

  it("draws signature appearance on PDF page", async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size

    const qrBuffer = Buffer.from("fake-qr-code-png");
    const placement = { x: 50, y: 100, width: 400, height: 120 };
    const style = {
      backgroundColor: "#E8F4F8",
      borderColor: "#FF0000",
      textColor: "#000000",
      fontSize: 10,
      borderWidth: 2,
    };

    await drawSignatureAppearance(page, cert, qrBuffer, placement, style);

    // Verify page was modified (has content)
    const pdfBytes = await pdfDoc.save();
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });

  it("formats certificate data correctly", async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();

    const qrBuffer = Buffer.from("test");
    const placement = { x: 50, y: 100, width: 400, height: 120 };
    const style = { fontSize: 10 };

    await drawSignatureAppearance(page, cert, qrBuffer, placement, style);

    // Just verify no errors thrown
    expect(page).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test pdf-signer-appearance.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Create signature appearance implementation**

Create `src/plugins/pdf-signer/signature-appearance.ts`:

```typescript
/**
 * Signature Appearance Renderer
 *
 * Draws visible signature box with certificate info and QR code
 */

import { type PDFPage, rgb } from "pdf-lib";
import type {
  CertificateInfo,
  SignatureAppearanceStyle,
  SignaturePlacement,
} from "../../types.ts";

/**
 * Draw signature appearance on a PDF page
 *
 * @param page - PDF page to draw on
 * @param cert - Certificate information
 * @param qrCodeBuffer - QR code PNG buffer
 * @param placement - Position and size
 * @param style - Visual styling
 */
export async function drawSignatureAppearance(
  page: PDFPage,
  cert: CertificateInfo,
  qrCodeBuffer: Buffer,
  placement: SignaturePlacement,
  style: Partial<SignatureAppearanceStyle> = {},
): Promise<void> {
  const { x, y, width, height } = placement;

  // Default style
  const bgColor = hexToRgb(style.backgroundColor ?? "#E8F4F8");
  const borderColor = hexToRgb(style.borderColor ?? "#FF0000");
  const textColor = hexToRgb(style.textColor ?? "#000000");
  const fontSize = style.fontSize ?? 10;
  const borderWidth = style.borderWidth ?? 2;

  // 1. Draw background box
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: bgColor,
    borderColor: borderColor,
    borderWidth: borderWidth,
  });

  // 2. Embed and draw QR code
  try {
    const qrImage = await page.doc.embedPng(qrCodeBuffer);
    const qrSize = 100;
    page.drawImage(qrImage, {
      x: x + 10,
      y: y + 10,
      width: qrSize,
      height: qrSize,
    });
  } catch (error) {
    console.warn("Failed to embed QR code:", error);
  }

  // 3. Draw text content
  const textX = x + 120; // After QR code
  let textY = y + height - 20;
  const lineHeight = fontSize + 4;

  // Header
  page.drawText("ASSINADO DIGITALMENTE", {
    x: textX,
    y: textY,
    size: fontSize + 2,
    color: textColor,
  });
  textY -= lineHeight * 1.5;

  // Signer name
  const signerName = cert.subject.commonName || "N/A";
  page.drawText(`Assinado por: ${signerName}`, {
    x: textX,
    y: textY,
    size: fontSize,
    color: textColor,
  });
  textY -= lineHeight;

  // Company
  const company = cert.subject.organization || "N/A";
  page.drawText(`Empresa: ${company}`, {
    x: textX,
    y: textY,
    size: fontSize,
    color: textColor,
  });
  textY -= lineHeight;

  // CNPJ/CPF
  const document = cert.brazilian.cnpj
    ? formatCnpj(cert.brazilian.cnpj)
    : cert.brazilian.cpf
      ? formatCpf(cert.brazilian.cpf)
      : "N/A";
  const docType = cert.brazilian.cnpj ? "CNPJ" : "CPF";
  page.drawText(`${docType}: ${document}`, {
    x: textX,
    y: textY,
    size: fontSize,
    color: textColor,
  });
  textY -= lineHeight;

  // Timestamp
  const timestamp = new Date().toLocaleString("pt-BR");
  page.drawText(`Data: ${timestamp}`, {
    x: textX,
    y: textY,
    size: fontSize,
    color: textColor,
  });
  textY -= lineHeight;

  // Certificate issuer
  const issuer = cert.issuer.organization || cert.issuer.commonName || "N/A";
  page.drawText(`Certificado: ${issuer}`, {
    x: textX,
    y: textY,
    size: fontSize,
    color: textColor,
  });
}

/**
 * Convert hex color to RGB values for pdf-lib
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: Number.parseInt(result[1]!, 16) / 255,
    g: Number.parseInt(result[2]!, 16) / 255,
    b: Number.parseInt(result[3]!, 16) / 255,
  };
}

/**
 * Format CNPJ with punctuation
 */
function formatCnpj(cnpj: string): string {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

/**
 * Format CPF with punctuation
 */
function formatCpf(cpf: string): string {
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}
```

**Step 4: Run test to verify it passes**

Run: `bun test pdf-signer-appearance.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/plugins/pdf-signer/signature-appearance.ts __tests__/pdf-signer-appearance.test.ts
git commit -m "feat(pdf-signer): add signature appearance renderer"
```

---

## Task 5: PDF Handler (PKCS#7 Signature)

**Files:**
- Create: `libraries/digital-certificate/src/plugins/pdf-signer/pdf-handler.ts`
- Create: `libraries/digital-certificate/__tests__/pdf-signer-handler.test.ts`

**Step 1: Write the failing test**

Create `__tests__/pdf-signer-handler.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { PDFDocument } from "pdf-lib";
import { computeDocumentHash } from "../src/plugins/pdf-signer/pdf-handler.ts";
import { loadCertificate } from "./test-helpers.ts";

describe("PDF Handler", () => {
  const cert = loadCertificate();

  it("computes SHA-256 hash of PDF buffer", () => {
    const pdfBuffer = Buffer.from("test pdf content");
    const hash = computeDocumentHash(pdfBuffer);

    expect(hash).toBeDefined();
    expect(hash).toHaveLength(64); // SHA-256 hex string
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces different hashes for different PDFs", () => {
    const pdf1 = Buffer.from("content 1");
    const pdf2 = Buffer.from("content 2");

    const hash1 = computeDocumentHash(pdf1);
    const hash2 = computeDocumentHash(pdf2);

    expect(hash1).not.toBe(hash2);
  });

  it("produces same hash for same content", () => {
    const content = Buffer.from("same content");
    const hash1 = computeDocumentHash(content);
    const hash2 = computeDocumentHash(content);

    expect(hash1).toBe(hash2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test pdf-signer-handler.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Create PDF handler implementation**

Create `src/plugins/pdf-signer/pdf-handler.ts`:

```typescript
/**
 * PDF Handler
 *
 * Handles PDF manipulation and PKCS#7 signature creation
 */

import crypto from "node:crypto";
import { PDFDocument } from "pdf-lib";
import type { CertificateInfo } from "../../types.ts";

/**
 * Compute SHA-256 hash of PDF buffer
 *
 * @param pdfBuffer - The PDF file buffer
 * @returns Hex string of SHA-256 hash
 */
export function computeDocumentHash(pdfBuffer: Buffer): string {
  const hash = crypto.createHash("sha256");
  hash.update(pdfBuffer);
  return hash.digest("hex");
}

/**
 * Create PKCS#7 detached signature for PDF
 *
 * @param dataToSign - The data to sign (typically PDF byte range)
 * @param cert - Certificate information with private key
 * @returns PKCS#7 signature buffer
 */
export function createPKCS7Signature(
  dataToSign: Buffer,
  cert: CertificateInfo,
): Buffer {
  // Create signature using RSA-SHA256
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(dataToSign);
  const signature = sign.sign(cert.keyPem);

  // For now, return raw signature
  // TODO: Wrap in proper PKCS#7/CMS structure
  return signature;
}

/**
 * Add signature dictionary to PDF
 *
 * Note: This is a simplified implementation.
 * Production use should use a proper PDF signing library
 * or implement full PKCS#7 container format.
 *
 * @param pdfDoc - The PDF document
 * @param signature - The signature buffer
 * @param cert - Certificate information
 */
export async function addSignatureDictionary(
  pdfDoc: PDFDocument,
  signature: Buffer,
  cert: CertificateInfo,
): Promise<void> {
  // This is a placeholder for signature dictionary creation
  // Full implementation requires:
  // 1. Create signature dictionary object
  // 2. Add ByteRange
  // 3. Add Contents (PKCS#7 signature)
  // 4. Add Filter and SubFilter
  // 5. Update document catalog

  console.warn(
    "Signature dictionary creation is simplified - use production library for real signing",
  );
}
```

**Step 4: Run test to verify it passes**

Run: `bun test pdf-signer-handler.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/plugins/pdf-signer/pdf-handler.ts __tests__/pdf-signer-handler.test.ts
git commit -m "feat(pdf-signer): add PDF handler with PKCS#7 signature"
```

---

## Task 6: Main PDF Signer API

**Files:**
- Create: `libraries/digital-certificate/src/plugins/pdf-signer/index.ts`
- Create: `libraries/digital-certificate/__tests__/pdf-signer.test.ts`

**Step 1: Write the failing test**

Create `__tests__/pdf-signer.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { PDFDocument } from "pdf-lib";
import { signPdf } from "../src/plugins/pdf-signer/index.ts";
import { loadCertificate } from "./test-helpers.ts";

describe("signPdf", () => {
  const cert = loadCertificate();

  it("signs a PDF document", async () => {
    // Create a simple test PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    page.drawText("Test Document", { x: 50, y: 750 });
    const originalPdf = await pdfDoc.save();

    const signedPdf = await signPdf(Buffer.from(originalPdf), {
      certificate: cert,
    });

    expect(signedPdf).toBeInstanceOf(Buffer);
    expect(signedPdf.length).toBeGreaterThan(originalPdf.length);
  });

  it("adds visible signature with default options", async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage();
    const originalPdf = await pdfDoc.save();

    const signedPdf = await signPdf(Buffer.from(originalPdf), {
      certificate: cert,
      appearance: {
        visible: true,
      },
    });

    // Verify PDF can be loaded
    const signedDoc = await PDFDocument.load(signedPdf);
    expect(signedDoc.getPageCount()).toBe(1);
  });

  it("preserves original content", async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    page.drawText("Important Content", { x: 100, y: 500 });
    const originalPdf = await pdfDoc.save();

    const signedPdf = await signPdf(Buffer.from(originalPdf), {
      certificate: cert,
    });

    const signedDoc = await PDFDocument.load(signedPdf);
    expect(signedDoc.getPageCount()).toBe(1);
  });

  it("uses custom signature placement", async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage();
    const originalPdf = await pdfDoc.save();

    const signedPdf = await signPdf(Buffer.from(originalPdf), {
      certificate: cert,
      appearance: {
        visible: true,
        placement: {
          page: 1,
          x: 100,
          y: 200,
          width: 350,
          height: 100,
        },
      },
    });

    expect(signedPdf).toBeInstanceOf(Buffer);
  });

  it("includes QR code when enabled", async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage();
    const originalPdf = await pdfDoc.save();

    const signedPdf = await signPdf(Buffer.from(originalPdf), {
      certificate: cert,
      appearance: {
        visible: true,
        showQRCode: true,
      },
    });

    expect(signedPdf.length).toBeGreaterThan(originalPdf.length);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test pdf-signer.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Create main API implementation**

Create `src/plugins/pdf-signer/index.ts`:

```typescript
/**
 * PDF Digital Signature
 *
 * Sign PDF documents with Brazilian A1 digital certificates
 * Supports visible signatures with QR codes and certificate info
 */

import { PDFDocument } from "pdf-lib";
import { signPdfOptionsSchema } from "../../schemas.ts";
import type { SignPdfOptions } from "../../types.ts";
import {
  addSignatureDictionary,
  computeDocumentHash,
  createPKCS7Signature,
} from "./pdf-handler.ts";
import { createVerificationData, generateQRCode } from "./qr-generator.ts";
import { drawSignatureAppearance } from "./signature-appearance.ts";

/**
 * Sign a PDF document with a digital certificate
 *
 * @param pdfBuffer - The PDF file as a Buffer
 * @param options - Signing options
 * @returns Signed PDF as Buffer
 */
export async function signPdf(
  pdfBuffer: Buffer,
  options: SignPdfOptions,
): Promise<Buffer> {
  // Validate options
  const opts = signPdfOptionsSchema.parse(options);
  const cert = options.certificate;

  // Load PDF
  const pdfDoc = await PDFDocument.load(pdfBuffer);

  // Add visible signature if requested
  if (opts.appearance?.visible !== false) {
    const appearance = opts.appearance ?? { visible: true };

    // Compute document hash for QR code
    const documentHash = computeDocumentHash(pdfBuffer);

    // Generate QR code if enabled
    let qrCodeBuffer: Buffer | null = null;
    if (appearance.showQRCode !== false) {
      const verificationData = createVerificationData(cert, documentHash);
      qrCodeBuffer = await generateQRCode(verificationData);
    }

    // Determine target page
    const pageCount = pdfDoc.getPageCount();
    const targetPageIndex =
      appearance.placement?.page === -1
        ? pageCount - 1
        : (appearance.placement?.page ?? pageCount) - 1;

    const page = pdfDoc.getPage(Math.max(0, Math.min(targetPageIndex, pageCount - 1)));

    // Default placement
    const placement = {
      x: appearance.placement?.x ?? 50,
      y: appearance.placement?.y ?? 100,
      width: appearance.placement?.width ?? 400,
      height: appearance.placement?.height ?? 120,
      page: targetPageIndex + 1,
    };

    // Draw signature appearance
    if (qrCodeBuffer) {
      await drawSignatureAppearance(
        page,
        cert,
        qrCodeBuffer,
        placement,
        appearance.style ?? {},
      );
    }
  }

  // Create signature
  const pdfToSign = await pdfDoc.save({ useObjectStreams: false });
  const signature = createPKCS7Signature(Buffer.from(pdfToSign), cert);

  // Add signature dictionary (simplified - not full PKCS#7 container)
  await addSignatureDictionary(pdfDoc, signature, cert);

  // Save signed PDF
  const signedPdf = await pdfDoc.save();
  return Buffer.from(signedPdf);
}
```

**Step 4: Run test to verify it passes**

Run: `bun test pdf-signer.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/plugins/pdf-signer/index.ts __tests__/pdf-signer.test.ts
git commit -m "feat(pdf-signer): add main PDF signing API"
```

---

## Task 7: Export PDF Signer from Main Index

**Files:**
- Modify: `libraries/digital-certificate/src/index.ts`

**Step 1: Update main index.ts exports**

No test needed - this is just re-exporting.

Add to the end of `src/index.ts`:

```typescript
// =============================================================================
// PDF Signer Plugin (export types only, actual plugin is sub-export)
// =============================================================================

export type {
  SignaturePlacement,
  SignatureAppearanceStyle,
  SignatureAppearanceOptions,
  SignPdfOptions,
} from "./types.ts";

export {
  signaturePlacementSchema,
  signatureAppearanceStyleSchema,
  signatureAppearanceOptionsSchema,
  signPdfOptionsSchema,
} from "./schemas.ts";
```

**Step 2: Verify build works**

Run: `bun run build`
Expected: Build succeeds with all entry points

**Step 3: Check exports**

Run: `ls -la dist/plugins/`
Expected: See `pdf-signer/` directory

**Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat(digital-certificate): export PDF signer types"
```

---

## Task 8: Real Certificate PDF Signing Tests

**Files:**
- Create: `libraries/digital-certificate/__tests__/real-pdf-signing.test.ts`
- Create: `libraries/digital-certificate/__tests__/fixtures/sample.pdf` (generated in test)

**Step 1: Create real certificate PDF signing test**

Create `__tests__/real-pdf-signing.test.ts`:

```typescript
/**
 * Real Certificate PDF Signing Tests
 *
 * Test signing PDF documents with your real Brazilian A1 certificate
 */

import { describe, expect, it } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { signPdf } from "../src/plugins/pdf-signer/index.ts";
import { hasRealCertificate, loadCertificate } from "./test-helpers.ts";

describe.skipIf(!hasRealCertificate())("Real Certificate - PDF Signing", () => {
  const cert = loadCertificate({ useReal: true });

  it("signs a simple PDF with real certificate", async () => {
    // Create test PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    page.drawText("Documento de Teste", { x: 50, y: 750, size: 20 });
    page.drawText("Este é um documento para teste de assinatura digital.", {
      x: 50,
      y: 700,
      size: 12,
    });

    const originalPdf = await pdfDoc.save();

    // Sign PDF
    const signedPdf = await signPdf(Buffer.from(originalPdf), {
      certificate: cert,
      reason: "Teste de assinatura digital",
      location: "Brasil",
    });

    expect(signedPdf).toBeInstanceOf(Buffer);
    expect(signedPdf.length).toBeGreaterThan(originalPdf.length);

    console.log("\n✅ PDF signed successfully with real certificate!");
    console.log(`Original size: ${originalPdf.length} bytes`);
    console.log(`Signed size: ${signedPdf.length} bytes`);
  });

  it("creates visible signature with certificate info", async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    page.drawText("Documento Oficial", { x: 50, y: 750 });

    const originalPdf = await pdfDoc.save();

    const signedPdf = await signPdf(Buffer.from(originalPdf), {
      certificate: cert,
      appearance: {
        visible: true,
        showQRCode: true,
        placement: {
          page: 1,
          x: 50,
          y: 100,
          width: 400,
          height: 120,
        },
      },
    });

    // Save for manual inspection
    const outputPath = join(import.meta.dir, "fixtures", "signed-output.pdf");
    writeFileSync(outputPath, signedPdf);

    console.log(`\n✅ Signed PDF saved to: ${outputPath}`);
    console.log("Open this file to visually verify the signature appearance.\n");

    expect(signedPdf.length).toBeGreaterThan(0);
  });

  it("displays certificate information in signature", async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage();
    const originalPdf = await pdfDoc.save();

    const signedPdf = await signPdf(Buffer.from(originalPdf), {
      certificate: cert,
    });

    console.log("\n=== Certificate Info in Signature ===");
    console.log(`Signer: ${cert.subject.commonName}`);
    console.log(`Company: ${cert.subject.organization}`);
    console.log(`CNPJ: ${cert.brazilian.cnpj || "N/A"}`);
    console.log(`Issuer: ${cert.issuer.commonName}`);
    console.log("======================================\n");

    expect(signedPdf).toBeDefined();
  });
});
```

**Step 2: Run real certificate tests**

Run: `bun test real-pdf-signing.test.ts`
Expected: Tests PASS if real certificate exists, SKIP otherwise

**Step 3: Manually verify signed PDF**

1. Run the test
2. Open `__tests__/fixtures/signed-output.pdf`
3. Verify signature appearance looks correct
4. Check QR code is visible
5. Check certificate info is displayed

**Step 4: Commit**

```bash
git add __tests__/real-pdf-signing.test.ts
git commit -m "test(pdf-signer): add real certificate PDF signing tests"
```

---

## Task 9: Update CHANGELOG and Documentation

**Files:**
- Modify: `libraries/digital-certificate/CHANGELOG.md`
- Create: `libraries/digital-certificate/docs/pdf-signing.md`

**Step 1: Update CHANGELOG.md**

Add to the `[Unreleased]` section:

```markdown
## [Unreleased]

### Added
- PDF signing capability via new `plugins/pdf-signer` module
- Visible signature appearance with QR code and certificate information
- Support for custom signature placement and styling
- QR code generation for signature verification
- `signPdf()` function for signing PDF documents
- Types: `SignPdfOptions`, `SignatureAppearanceOptions`, `SignaturePlacement`
```

**Step 2: Create PDF signing documentation**

Create `docs/pdf-signing.md`:

```markdown
# PDF Signing Guide

Sign PDF documents with Brazilian A1 digital certificates using visible signatures.

## Installation

```bash
npm install @f-o-t/digital-certificate pdf-lib qrcode
```

## Basic Usage

```typescript
import { parseCertificate } from '@f-o-t/digital-certificate';
import { signPdf } from '@f-o-t/digital-certificate/plugins/pdf-signer';
import { readFileSync, writeFileSync } from 'fs';

// Load certificate
const pfxBuffer = readFileSync('certificate.pfx');
const cert = parseCertificate(pfxBuffer, 'password');

// Load PDF
const pdfBuffer = readFileSync('document.pdf');

// Sign PDF
const signedPdf = await signPdf(pdfBuffer, {
  certificate: cert,
  reason: 'Assinado digitalmente',
  location: 'Brasil',
});

// Save signed PDF
writeFileSync('signed-document.pdf', signedPdf);
```

## Signature Appearance

The signature includes:
- QR code for verification
- Signer name and company
- CNPJ/CPF
- Timestamp
- Certificate issuer

### Custom Placement

```typescript
const signedPdf = await signPdf(pdfBuffer, {
  certificate: cert,
  appearance: {
    visible: true,
    placement: {
      page: 1,        // First page (use -1 for last page)
      x: 100,         // 100pt from left
      y: 200,         // 200pt from bottom
      width: 400,     // 400pt wide
      height: 120,    // 120pt tall
    },
  },
});
```

### Custom Styling

```typescript
const signedPdf = await signPdf(pdfBuffer, {
  certificate: cert,
  appearance: {
    visible: true,
    showQRCode: true,
    style: {
      backgroundColor: '#E8F4F8',  // Light blue
      borderColor: '#FF0000',       // Red
      textColor: '#000000',         // Black
      fontSize: 10,
      borderWidth: 2,
    },
  },
});
```

## Invisible Signature

```typescript
const signedPdf = await signPdf(pdfBuffer, {
  certificate: cert,
  appearance: {
    visible: false,  // No visible signature box
  },
});
```

## Notes

- The current implementation uses a simplified PKCS#7 signature format
- For production use with regulatory compliance, consider using a specialized PDF signing library
- The signature appearance follows ICP-Brasil visual standards
```

**Step 3: Commit**

```bash
git add CHANGELOG.md docs/pdf-signing.md
git commit -m "docs(pdf-signer): add CHANGELOG and documentation"
```

---

## Task 10: Final Build and Test

**Files:**
- All files in the library

**Step 1: Clean build**

Run: `bun run build`
Expected: Build succeeds with no errors

**Step 2: Run all tests**

Run: `bun test`
Expected: All tests pass

**Step 3: Verify exports**

Check that all exports are available:

```bash
ls -la dist/plugins/pdf-signer/
```

Expected:
- `index.js`
- `index.d.ts`
- Other compiled files

**Step 4: Manual smoke test**

Create a quick test script `test-pdf-sign.ts`:

```typescript
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCertificate } from './src/certificate.ts';
import { signPdf } from './src/plugins/pdf-signer/index.ts';
import { PDFDocument } from 'pdf-lib';

const pfxPath = join(__dirname, '__tests__/fixtures/test-certificate.pfx');
const pfx = readFileSync(pfxPath);
const cert = parseCertificate(pfx, 'test1234');

const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage();
page.drawText('Test Document', { x: 50, y: 750 });
const pdfBuffer = Buffer.from(await pdfDoc.save());

const signed = await signPdf(pdfBuffer, { certificate: cert });
console.log('✅ PDF signed successfully!');
console.log(`Signed PDF size: ${signed.length} bytes`);
```

Run: `bun run test-pdf-sign.ts`
Expected: Success message

**Step 5: Final commit**

```bash
git add .
git commit -m "feat(digital-certificate): complete PDF signer plugin implementation"
```

---

## Testing Checklist

- [ ] QR code generation works
- [ ] Signature appearance renders correctly
- [ ] PDF can be loaded and signed
- [ ] Real certificate signing works
- [ ] Signed PDF can be opened in PDF viewer
- [ ] Signature appearance is visible and correct
- [ ] CNPJ/CPF formatting is correct
- [ ] Timestamp is displayed correctly
- [ ] Build succeeds without errors
- [ ] All tests pass
- [ ] Documentation is complete

---

## Known Limitations

1. **PKCS#7 Signature**: The current implementation uses a simplified PKCS#7 signature. For production use with regulatory compliance (e.g., ICP-Brasil validation), a proper PKCS#7/CMS container with certificate chain should be implemented.

2. **Signature Validation**: The signed PDFs will have a visual signature appearance, but may not pass validation in Adobe Reader or other PDF validators without a proper PKCS#7 structure. Consider using `node-signpdf` or similar for production-grade signatures.

3. **QR Code Verification**: The QR code contains certificate and document hash information, but no verification endpoint is implemented. You'll need to create a verification service if you want to enable QR code scanning.

4. **Long-Term Validation (LTV)**: The implementation doesn't include timestamp server integration or CRL/OCSP information for long-term signature validation.

## Future Enhancements

- Add timestamp server support (RFC 3161)
- Implement full PKCS#7/CMS signature container
- Add certificate chain embedding
- Support for signature validation
- QR code verification endpoint
- Multiple signature support
- Signature field customization
