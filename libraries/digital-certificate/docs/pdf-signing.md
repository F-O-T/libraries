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

## API Reference

### `signPdf(pdfBuffer, options)`

Signs a PDF document with a digital certificate.

**Parameters:**
- `pdfBuffer: Buffer | Uint8Array` - The PDF document to sign
- `options: SignPdfOptions` - Signature options

**Returns:** `Promise<Uint8Array>` - The signed PDF document

### `SignPdfOptions`

Options for PDF signing.

```typescript
interface SignPdfOptions {
  certificate: ParsedCertificate;
  reason?: string;
  location?: string;
  contactInfo?: string;
  appearance?: SignatureAppearanceOptions;
}
```

**Properties:**
- `certificate: ParsedCertificate` - The parsed digital certificate to use for signing
- `reason?: string` - Optional reason for signing (e.g., "Assinado digitalmente")
- `location?: string` - Optional location where the signature was created
- `contactInfo?: string` - Optional contact information of the signer
- `appearance?: SignatureAppearanceOptions` - Optional signature appearance configuration

### `SignatureAppearanceOptions`

Options for configuring the signature appearance.

```typescript
interface SignatureAppearanceOptions {
  visible?: boolean;
  placement?: SignaturePlacement;
  showQRCode?: boolean;
  style?: SignatureAppearanceStyle;
}
```

**Properties:**
- `visible?: boolean` - Whether to show a visible signature (default: `true`)
- `placement?: SignaturePlacement` - Custom placement of the signature box
- `showQRCode?: boolean` - Whether to include a QR code (default: `true`)
- `style?: SignatureAppearanceStyle` - Custom styling options

### `SignaturePlacement`

Defines where the signature box should appear.

```typescript
interface SignaturePlacement {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

**Properties:**
- `page: number` - Page number (1-indexed, use `-1` for last page)
- `x: number` - X coordinate in points from left edge
- `y: number` - Y coordinate in points from bottom edge
- `width: number` - Width of signature box in points
- `height: number` - Height of signature box in points

### `SignatureAppearanceStyle`

Styling options for the signature appearance.

```typescript
interface SignatureAppearanceStyle {
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  fontSize?: number;
  borderWidth?: number;
}
```

**Properties:**
- `backgroundColor?: string` - Background color (hex format, e.g., `"#E8F4F8"`)
- `borderColor?: string` - Border color (hex format, e.g., `"#0066CC"`)
- `textColor?: string` - Text color (hex format, e.g., `"#000000"`)
- `fontSize?: number` - Font size for text (default: `10`)
- `borderWidth?: number` - Border width in points (default: `1`)

## Notes

- The current implementation uses a simplified PKCS#7 signature format
- For production use with regulatory compliance, consider using a specialized PDF signing library
- The signature appearance follows ICP-Brasil visual standards
