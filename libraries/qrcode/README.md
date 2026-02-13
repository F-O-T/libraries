# @f-o-t/qrcode

QR code generation as PNG images. Zero external dependencies.

## Installation

```bash
bun add @f-o-t/qrcode
```

## API

### `generateQrCode(data: string, options?: QrCodeOptions): Uint8Array`

Generate a QR code as a PNG image buffer. Encodes the input string using byte mode (ISO/IEC 18004) and returns a PNG `Uint8Array`.

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `size` | `number` | `200` | Image size in pixels |
| `errorCorrection` | `"L" \| "M" \| "Q" \| "H"` | `"M"` | Error correction level |
| `margin` | `number` | `4` | Quiet zone margin in modules |

## Usage

```ts
import { generateQrCode } from "@f-o-t/qrcode";

// Generate a QR code PNG
const png = generateQrCode("https://example.com");

// Write to file
await Bun.write("qrcode.png", png);

// With options
const customPng = generateQrCode("Hello, World!", {
  size: 400,
  errorCorrection: "H",
  margin: 2,
});
```

## Types

```ts
type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

type QrCodeOptions = {
  size?: number;
  errorCorrection?: ErrorCorrectionLevel;
  margin?: number;
};
```

## Validation

Options are validated with Zod. The schema is also exported for use in your own validation pipelines:

```ts
import { qrCodeOptionsSchema } from "@f-o-t/qrcode";

const validated = qrCodeOptionsSchema.parse({ size: 300 });
```
