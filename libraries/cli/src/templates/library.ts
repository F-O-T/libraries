/**
 * Templates for scaffolding new libraries
 */

export interface LibraryTemplates {
  fotConfig: string;
  indexTs: string;
  indexTestTs: string;
  readme: string;
}

/**
 * Get templates for a new library
 *
 * @param name - Library name (e.g., "my-library")
 * @param description - Brief description of the library
 * @returns Object containing all template files
 */
export function getLibraryTemplate(
  name: string,
  description: string
): LibraryTemplates {
  const packageName = `@f-o-t/${name}`;

  const fotConfig = `import { defineFotConfig } from "@f-o-t/config";

export default defineFotConfig({
  formats: ["esm", "cjs"],
  external: [],
  typescript: {
    declaration: true,
  },
});
`;

  const indexTs = `/**
 * ${packageName}
 * ${description}
 */

export function hello(): string {
  return "Hello from ${packageName}!";
}
`;

  const indexTestTs = `import { describe, expect, test as it } from "bun:test";
import { hello } from "./index";

describe("${packageName}", () => {
  it("should export hello function", () => {
    expect(hello()).toBe("Hello from ${packageName}!");
  });
});
`;

  const readme = `# ${packageName}

${description}

## Installation

\`\`\`bash
# bun
bun add ${packageName}

# npm
npm install ${packageName}

# yarn
yarn add ${packageName}

# pnpm
pnpm add ${packageName}
\`\`\`

## Quick Start

\`\`\`typescript
import { hello } from "${packageName}";

console.log(hello());
\`\`\`

## API Reference

### \`hello()\`

Returns a greeting string.

\`\`\`typescript
const greeting = hello();
console.log(greeting); // "Hello from ${packageName}!"
\`\`\`

## Contributing

Contributions are welcome! Please check the repository for guidelines.

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Links

- [GitHub Repository](https://github.com/F-O-T/libraries)
- [Issue Tracker](https://github.com/F-O-T/libraries/issues)
`;

  return {
    fotConfig,
    indexTs,
    indexTestTs,
    readme,
  };
}
