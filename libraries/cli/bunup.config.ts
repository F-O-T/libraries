import { defineConfig } from "bunup";

export default defineConfig({
  entry: "src/index.ts",
  outdir: "dist",
  target: "bun",
  format: "esm",
  declaration: true,
  clean: true,
  minify: false,
  sourcemap: true,
  external: ["@f-o-t/config", "commander"], // Keep as external - needed by user config files
});
