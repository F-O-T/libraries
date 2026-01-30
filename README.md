# FOT Libraries

A collection of production-ready TypeScript libraries built with Bun, covering domains from financial calculations to content processing.

## Libraries

| Library | Description | Version |
|---------|-------------|---------|
| [`@f-o-t/condition-evaluator`](./libraries/condition-evaluator) | Flexible, typesafe condition evaluator for building rule engines | [![npm](https://img.shields.io/npm/v/@f-o-t/condition-evaluator)](https://www.npmjs.com/package/@f-o-t/condition-evaluator) |
| [`@f-o-t/rules-engine`](./libraries/rules-engine) | Business rules engine with condition evaluation | [![npm](https://img.shields.io/npm/v/@f-o-t/rules-engine)](https://www.npmjs.com/package/@f-o-t/rules-engine) |
| [`@f-o-t/money`](./libraries/money) | Type-safe money handling with BigInt precision and ISO 4217 currency support | [![npm](https://img.shields.io/npm/v/@f-o-t/money)](https://www.npmjs.com/package/@f-o-t/money) |
| [`@f-o-t/digital-certificate`](./libraries/digital-certificate) | Brazilian A1 digital certificate handling with .pfx/.p12 parsing, XML-DSig signing, and mTLS | [![npm](https://img.shields.io/npm/v/@f-o-t/digital-certificate)](https://www.npmjs.com/package/@f-o-t/digital-certificate) |
| [`@f-o-t/ofx`](./libraries/ofx) | OFX (Open Financial Exchange) parser and generator | [![npm](https://img.shields.io/npm/v/@f-o-t/ofx)](https://www.npmjs.com/package/@f-o-t/ofx) |
| [`@f-o-t/content-analysis`](./libraries/content-analysis) | Content analysis and processing utilities | [![npm](https://img.shields.io/npm/v/@f-o-t/content-analysis)](https://www.npmjs.com/package/@f-o-t/content-analysis) |
| [`@f-o-t/markdown`](./libraries/markdown) | Markdown parsing and processing | [![npm](https://img.shields.io/npm/v/@f-o-t/markdown)](https://www.npmjs.com/package/@f-o-t/markdown) |
| [`@f-o-t/xml`](./libraries/xml) | XML parsing and manipulation | [![npm](https://img.shields.io/npm/v/@f-o-t/xml)](https://www.npmjs.com/package/@f-o-t/xml) |
| [`@f-o-t/csv`](./libraries/csv) | CSV parsing and generation | [![npm](https://img.shields.io/npm/v/@f-o-t/csv)](https://www.npmjs.com/package/@f-o-t/csv) |
| [`@f-o-t/spelling`](./libraries/spelling) | Spelling correction and validation | [![npm](https://img.shields.io/npm/v/@f-o-t/spelling)](https://www.npmjs.com/package/@f-o-t/spelling) |

## Requirements

- [Bun](https://bun.sh/) v1.0 or higher
- Node.js v20 or higher (for compatibility)

## Quick Start

Clone the repository and install dependencies:

```bash
git clone https://github.com/F-O-T/contentta-nx.git fot-libraries
cd fot-libraries
bun install
```

## Development

### Available Commands

```bash
# Build all libraries
bun run build

# Run type checking
bun run typecheck

# Format code with Biome
bun run format

# Run tests
bun run test

# Clean build artifacts
bun run clean

# Release a library
bun run release:libraries
```

### Working with Libraries

Each library is independently versioned and published. To work on a specific library:

```bash
cd libraries/<library-name>

# Development mode with watch
bun run dev

# Build the library
bun run build

# Run tests
bun run test

# Type check
bun run typecheck
```

## Monorepo Structure

This is an Nx monorepo using Bun workspaces:

```
fot-libraries/
├── libraries/          # Published libraries
│   ├── condition-evaluator/
│   ├── rules-engine/
│   ├── money/
│   └── ...
├── scripts/           # Build and release automation
├── biome.json        # Code formatting config
├── nx.json           # Nx configuration
└── package.json      # Workspace config
```

## Code Standards

- **Formatting:** [Biome](https://biomejs.dev/) with 3 spaces, 80 char line width, double quotes
- **TypeScript:** Strict mode, explicit types, camelCase variables
- **Commits:** Conventional format: `type(scope): description`
- **Testing:** Bun test framework
- **Versioning:** Independent library versioning with semantic versioning

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

Licensed under the [Apache-2.0 License](./LICENSE.md). Individual libraries may have their own licenses (typically MIT) - check each library's package.json.

## Support

- **Issues:** Report bugs and feature requests at [GitHub Issues](https://github.com/F-O-T/contentta-nx/issues)
- **Documentation:** Each library contains its own README with detailed usage examples

---

Built with [Bun](https://bun.sh/) and [Nx](https://nx.dev/)
