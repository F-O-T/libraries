# @f-o-t/pdf

Comprehensive PDF 1.7 library with generation, parsing, and digital signatures.

## Features

- **Complete PDF 1.7 Support**: Full spec implementation
- **Generation**: Create PDFs from scratch with text, graphics, images
- **Parsing**: Read and extract content from PDFs
- **Digital Signatures**: Sign PDFs with @f-o-t/digital-certificate
- **Zod-First**: Complete validation
- **TypeScript-First**: Full type safety
- **Stream Support**: Memory-efficient processing

## Installation

```bash
bun add @f-o-t/pdf
```

## Quick Start

```typescript
import { createPDF } from "@f-o-t/pdf";

const pdf = createPDF();
pdf.addPage()
   .drawText("Hello, World!", { x: 50, y: 750 });

const bytes = await pdf.save();
```

## Documentation

Coming soon.

## License

MIT
