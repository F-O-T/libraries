# @f-o-t/cli

CLI tool for managing FOT (Factories of Tomorrow) libraries.

## Installation

```bash
bun add -D @f-o-t/cli
```

## Usage

```bash
# Run the CLI
fot --help

# Build libraries
fot build

# Test libraries
fot test

# Validate configuration
fot validate
```

## Development

```bash
# Install dependencies
bun install

# Build the CLI
bun run build

# Run in development mode
bun run dev
```

## Commands

- `fot build` - Build all libraries or a specific library
- `fot test` - Run tests for all libraries or a specific library
- `fot validate` - Validate fot.config.ts configuration
- `fot --version` - Show CLI version
- `fot --help` - Show help information

## Configuration

The CLI reads configuration from `fot.config.ts` in the project root. See `@f-o-t/config` for configuration options.
