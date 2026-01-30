import { defineConfig } from "bunup";

export default defineConfig({
   entry: [
      "src/index.ts",
      "src/generation/index.ts",
      "src/parsing/index.ts",
      "src/signing/index.ts",
   ],
   outdir: "dist",
   clean: true,
   dts: true,
   format: "esm",
   target: "es2023",
   minify: false,
   sourcemap: true,
});
