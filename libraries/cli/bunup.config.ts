import { defineConfig } from "bunup";

export default defineConfig({
  entries: ["src/index.ts"],
  outdir: "dist",
  target: "bun",
  format: "esm",
  declaration: true,
  clean: true,
  minify: false,
  sourcemap: true,
});
