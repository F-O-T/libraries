# @f-o-t/pdf

PDF 1.7 library with generation, parsing, and editing plugins.

## Installation

```bash
bun add @f-o-t/pdf
```

## Plugins

The library is organized into plugins, each importable from a separate entry point.

### Generation (`@f-o-t/pdf/plugins/generation`)

Create PDFs from scratch with text, graphics, and images.

```ts
import { createDocument, createPage, addFont, writePdf } from "@f-o-t/pdf/plugins/generation";
```

### Parsing (`@f-o-t/pdf/plugins/parsing`)

Read and extract content from existing PDFs.

```ts
import { createLexer, createParser, createReader } from "@f-o-t/pdf/plugins/parsing";
```

### Editing (`@f-o-t/pdf/plugins/editing`)

Load existing PDFs, modify them, and save with incremental updates. Also supports creating signature placeholders for digital signing workflows.

#### `loadPdf(data: Uint8Array): PdfDocument`

Load an existing PDF for editing. Returns a `PdfDocument` that can be modified and saved.

```ts
import { loadPdf } from "@f-o-t/pdf/plugins/editing";

const pdfBytes = await Bun.file("document.pdf").bytes();
const doc = loadPdf(pdfBytes);
```

#### `PdfDocument`

```ts
type PdfDocument = {
  pageCount: number;
  getPage(index: number): PdfPage;
  embedPng(data: Uint8Array): PdfImage;
  save(): Uint8Array;
  saveWithPlaceholder(options: SignaturePlaceholderOptions): {
    pdf: Uint8Array;
    byteRange: [number, number, number, number];
  };
};
```

#### `PdfPage`

```ts
type PdfPage = {
  width: number;
  height: number;
  drawText(text: string, options: TextOptions): void;
  drawRectangle(options: RectOptions): void;
  drawImage(image: PdfImage, options: ImageOptions): void;
};
```

#### Drawing on Pages

```ts
import { loadPdf } from "@f-o-t/pdf/plugins/editing";

const doc = loadPdf(pdfBytes);
const page = doc.getPage(0);

// Draw text
page.drawText("Hello, World!", { x: 50, y: 750, size: 14, color: "#000000" });

// Draw a rectangle
page.drawRectangle({
  x: 40,
  y: 740,
  width: 200,
  height: 30,
  borderColor: "#333333",
  borderWidth: 1,
});

// Embed and draw a PNG image
const pngBytes = await Bun.file("logo.png").bytes();
const image = doc.embedPng(pngBytes);
page.drawImage(image, { x: 50, y: 600, width: 100, height: 100 });

// Save with incremental update
const output = doc.save();
await Bun.write("modified.pdf", output);
```

#### Signature Placeholders

Create a signature placeholder for digital signing workflows:

```ts
import {
  loadPdf,
  findByteRange,
  extractBytesToSign,
  embedSignature,
} from "@f-o-t/pdf/plugins/editing";

const doc = loadPdf(pdfBytes);

// Save with signature placeholder
const { pdf } = doc.saveWithPlaceholder({
  reason: "Document approval",
  name: "John Doe",
  location: "Office",
  signatureLength: 16384,
  docMdpPermission: 2,
});

// Find the byte range and extract bytes to sign
const { byteRange } = findByteRange(pdf);
const bytesToSign = extractBytesToSign(pdf, byteRange);

// ... create your CMS signature over bytesToSign ...

// Embed the signature into the PDF
const signedPdf = embedSignature(pdf, signatureBytes);
```

#### Signature Utility Functions

| Function | Description |
|---|---|
| `findByteRange(pdf)` | Locate the `/ByteRange` in a PDF with a signature placeholder |
| `extractBytesToSign(pdf, byteRange)` | Extract the bytes covered by the byte range |
| `embedSignature(pdf, signature)` | Embed a DER-encoded signature into the placeholder |

## Types

### Editing Plugin Types

```ts
type TextOptions = {
  x: number;
  y: number;
  size?: number;      // default: 12
  color?: string;     // hex color, default: "#000000"
};

type RectOptions = {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
};

type ImageOptions = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PdfImage = {
  readonly objectNumber: number;
  readonly width: number;
  readonly height: number;
};

type SignaturePlaceholderOptions = {
  reason?: string;
  name?: string;
  location?: string;
  contactInfo?: string;
  signatureLength?: number;      // default: 16384
  docMdpPermission?: 1 | 2 | 3; // default: 2
};
```
