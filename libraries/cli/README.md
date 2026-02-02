# @f-o-t/cli

CLI tool for managing FOT (Factories of Tomorrow) libraries in monorepo workspaces.

## Features

- **Build** - Compile TypeScript libraries with optimized bundling
- **Dev Mode** - Watch mode for rapid development with automatic rebuilds
- **Test** - Run tests with optional coverage and watch mode
- **Check** - Format and lint code with Biome
- **Typecheck** - TypeScript type checking without builds
- **Generate** - Generate configuration files from `fot.config.ts`
- **Create** - Scaffold new libraries with complete boilerplate

## Installation

Install as a dev dependency in your monorepo:

```bash
bun add -D @f-o-t/cli
```

## Quick Start

```bash
# Create a new library
fot create my-library "A new library for FOT"

# Build the library
cd libraries/my-library
fot build

# Run tests
fot test

# Start development mode with watch
fot dev
```

## Commands

### `fot build`

Build the current library using bunup bundler.

```bash
fot build
```

Builds TypeScript source files into the `dist/` directory with proper type declarations and source maps.

**What it does:**
- Compiles TypeScript to JavaScript
- Generates type declaration files (.d.ts)
- Creates source maps for debugging
- Optimizes output for production

---

### `fot dev`

Start development mode with file watching and automatic rebuilds.

```bash
fot dev
```

**What it does:**
- Watches source files for changes
- Automatically rebuilds on file changes
- Provides fast feedback during development
- Keeps TypeScript types in sync

---

### `fot test [options]`

Run tests for the current library.

```bash
# Run tests once
fot test

# Run tests in watch mode
fot test --watch

# Run tests with coverage report
fot test --coverage
```

**Options:**
- `--watch` - Run tests in watch mode, re-running on file changes
- `--coverage` - Generate test coverage report

**What it does:**
- Executes test files matching `*.test.ts` pattern
- Provides detailed test output
- Optionally generates coverage metrics
- Integrates with Bun's native test runner

---

### `fot check`

Format and lint code with Biome.

```bash
fot check
```

**What it does:**
- Runs Biome code formatter on all source files
- Performs linting checks with Biome
- Ensures code style consistency across the codebase
- Exits with error if formatting or linting issues are found
- Perfect for pre-commit hooks and CI/CD pipelines

---

### `fot typecheck`

Run TypeScript type checking without building.

```bash
fot typecheck
```

**What it does:**
- Validates TypeScript types across your codebase
- Checks for type errors without generating output files
- Faster than a full build when you only need type validation
- Uses your tsconfig.json configuration

---

### `fot generate`

Generate configuration files from `fot.config.ts`.

```bash
fot generate
```

**What it does:**
- Reads your `fot.config.ts` configuration
- Generates `package.json` with proper dependencies and scripts
- Creates `tsconfig.json` with TypeScript settings
- Generates `biome.json` for code formatting and linting
- Ensures configuration stays in sync

**Use cases:**
- After updating `fot.config.ts`
- Setting up a new library
- Syncing configuration across team members

---

### `fot create <name> [description]`

Create a new library with complete scaffolding.

```bash
# Create with description
fot create my-library "A new library for FOT"

# Create with minimal setup (uses default description)
fot create my-library
```

**Arguments:**
- `<name>` - Library name (required, e.g., "my-library")
- `[description]` - Optional description for the library

**What it creates:**
- `libraries/<name>/` directory structure
- `fot.config.ts` with library configuration
- `src/index.ts` with example code
- `src/index.test.ts` with sample tests
- `README.md` with documentation template
- Generated configuration files (package.json, tsconfig.json, biome.json)
- Installed dependencies

**Example output:**
```
Creating library: @f-o-t/my-library
Description: A new library for FOT

Creating directory structure...
✓ Created libraries/my-library/src

Generating template files...
✓ Created libraries/my-library/fot.config.ts
✓ Created libraries/my-library/src/index.ts
✓ Created libraries/my-library/src/index.test.ts
✓ Created libraries/my-library/README.md

Generating configuration files...
✓ Generated libraries/my-library/package.json
✓ Generated libraries/my-library/tsconfig.json
✓ Generated libraries/my-library/biome.json

Installing dependencies...
✓ Dependencies installed

✓ Library created successfully!
```

---

### `fot help`

Show help information with all available commands.

```bash
fot help
# or
fot --help
# or
fot -h
```

---

### `fot version`

Display the CLI version number.

```bash
fot version
# or
fot --version
# or
fot -v
```

## Configuration

The CLI reads configuration from `fot.config.ts` in your library's root directory. This file defines:

- Library name and description
- Dependencies and peer dependencies
- TypeScript compiler options
- Build and output settings
- Linting and formatting rules

See [@f-o-t/config](../config/README.md) for detailed configuration options.

**Example `fot.config.ts`:**

```typescript
import { defineFotConfig } from "@f-o-t/config";

export default defineFotConfig({
  name: "my-library",
  description: "A new library for FOT",
  dependencies: {
    "zod": "^3.22.4",
  },
  tsconfig: {
    compilerOptions: {
      strict: true,
      target: "ES2022",
    },
  },
});
```

## CI/CD Integration

The CLI is designed to work seamlessly in CI/CD pipelines. Here's an example GitHub Actions workflow:

```yaml
name: Test and Build

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run checks
        run: |
          cd libraries/my-library
          fot check

      - name: Build
        run: |
          cd libraries/my-library
          fot build

      - name: Test with coverage
        run: |
          cd libraries/my-library
          fot test --coverage
```

**Pipeline best practices:**
- Use `fot check` to run both typechecking and tests
- Run `fot test --coverage` to track code coverage
- Build after tests pass with `fot build`
- Cache `node_modules` for faster CI runs

## Development

### Prerequisites

- Bun runtime (latest version)
- Node.js 18+ (for compatibility)
- TypeScript 5.0+

### Setup

```bash
# Clone the monorepo
git clone <repository-url>

# Install dependencies
bun install

# Navigate to CLI package
cd libraries/cli

# Build the CLI
bun run build

# Run in development mode
bun run dev
```

### Testing the CLI

```bash
# Run tests
bun test

# Run tests with coverage
bun test --coverage

# Test the CLI locally
./dist/index.js --help
```

### Project Structure

```
libraries/cli/
├── src/
│   ├── commands/         # Command implementations
│   │   ├── build.ts     # Build command
│   │   ├── dev.ts       # Dev command
│   │   ├── test.ts      # Test command
│   │   ├── check.ts     # Check command
│   │   ├── typecheck.ts # Typecheck command
│   │   ├── generate.ts  # Generate command
│   │   ├── create.ts    # Create command
│   │   └── index.ts     # Command exports
│   ├── templates/        # Library scaffolding templates
│   ├── builder.ts        # Build utilities
│   ├── config-loader.ts  # Configuration loader
│   └── index.ts          # CLI entry point
├── dist/                 # Built output
├── fot.config.ts         # CLI library config
├── package.json
├── tsconfig.json
└── README.md
```

## Troubleshooting

### Build fails with module errors

Ensure all dependencies are installed:
```bash
bun install
```

### TypeScript errors in development

Run typecheck to see detailed errors:
```bash
fot typecheck
```

### Tests not running

Verify test files match the pattern `*.test.ts` and are in the `src/` directory.

### Configuration out of sync

Regenerate configuration files:
```bash
fot generate
```

## License

MIT
