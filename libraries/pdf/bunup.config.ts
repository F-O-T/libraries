import { defineConfig } from "bunup";

export default defineConfig({
   entry: [
      "src/index.ts",
      "src/generation/index.ts",
      "src/parsing/index.ts",
      "src/signing/index.ts",
   ],
   dts: {
      inferTypes: true,
   },
   format: "esm",
   target: "node",
   sourcemap: true,
});
