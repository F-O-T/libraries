import { describe, test, expect } from "bun:test";
import { getLibraryTemplate, type LibraryTemplates } from "../../src/templates/library";

describe("getLibraryTemplate", () => {
  test("returns all template files", () => {
    const templates = getLibraryTemplate("test-lib", "A test library");

    expect(templates.fotConfig).toBeDefined();
    expect(templates.indexTs).toBeDefined();
    expect(templates.indexTestTs).toBeDefined();
    expect(templates.readme).toBeDefined();
  });

  test("uses correct package name in templates", () => {
    const templates = getLibraryTemplate("my-lib", "My library");

    expect(templates.fotConfig).toContain("@f-o-t/config");
    expect(templates.indexTs).toContain("@f-o-t/my-lib");
    expect(templates.indexTestTs).toContain("@f-o-t/my-lib");
    expect(templates.readme).toContain("@f-o-t/my-lib");
  });

  test("includes description in templates", () => {
    const templates = getLibraryTemplate("test-lib", "Custom description");

    expect(templates.indexTs).toContain("Custom description");
    expect(templates.readme).toContain("Custom description");
  });

  test("fotConfig is valid TypeScript", () => {
    const templates = getLibraryTemplate("test-lib", "A test library");

    expect(templates.fotConfig).toContain("import { defineFotConfig }");
    expect(templates.fotConfig).toContain("export default defineFotConfig(");
  });
});
