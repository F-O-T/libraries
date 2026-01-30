# Contributing to FOT Libraries

## Quick Start

1. **Clone & install:** `git clone https://github.com/F-O-T/contentta-nx.git fot-libraries && cd fot-libraries && bun install`
2. **Pick a library:** Navigate to `libraries/<library-name>`
3. **Start dev mode:** `bun run dev` (or run from root: `bun run build`)

## How to Contribute

### 🐛 Testing & Bugs
- Test your changes thoroughly before submitting
- Report issues with steps to reproduce
- Test edge cases and performance

### 📦 Library Development
- Each library is independently versioned and published
- Follow semantic versioning for releases
- Ensure backward compatibility or document breaking changes
- Add tests for new features and bug fixes

### ✨ Features & Docs
- Suggest improvements to existing libraries
- Propose new libraries that fit the collection's scope

## Project Structure

Nx monorepo with Bun workspaces:

**Libraries:** Independent packages in `libraries/` including:
- `condition-evaluator/` - Rule engine condition evaluation
- `rules-engine/` - Business rules engine
- `money/` - Type-safe monetary calculations
- `digital-certificate/` - Brazilian A1 certificate handling
- `ofx/` - OFX financial data parsing
- `content-analysis/` - Content processing utilities
- `markdown/`, `xml/`, `csv/` - Format parsers
- `spelling/` - Spelling validation

**Scripts:** Build and release automation in `scripts/`

## Code Standards

**Formatting:** Use [Biome](https://biomejs.dev/) - 3 spaces, 80 chars, double quotes
**TypeScript:** Strict mode, explicit types, camelCase variables
**Testing:** Bun test framework with coverage
**Commits:** Conventional format: `type(scope): description`
  - `feat(money): add currency conversion`
  - `fix(xml): resolve parsing bug`
  - `docs(readme): update examples`

Run checks: `bun run format && bun run typecheck && bun run test`

## Workflow

1. **Branch:** `git checkout -b feature/library-name-feature` or `fix/library-name-issue`
2. **Code:** Follow standards, write tests, update library README
3. **Check:** `bun run format && bun run typecheck && bun run test`
4. **Commit:** `git commit -m "feat(scope): description"`
5. **Push & PR:** Create PR with descriptive title and changes

## Testing

- Run all tests: `bun run test` from root
- Run library tests: `cd libraries/<name> && bun test`
- Coverage: `bun test --coverage`

## Publishing

Libraries are published independently:

1. Make your changes and commit with conventional commits
2. Run `bun run release:libraries` to version and publish
3. Each library maintains its own CHANGELOG.md

## Issues

**Bugs:** Include library name, description, steps to reproduce, expected/actual behavior
**Features:** Include library name (or propose new library), description, use case, implementation ideas
**Questions:** Check docs and existing issues first

---

Thanks for contributing! 🚀
