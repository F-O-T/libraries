import { defineConfig } from "bunup";

export default defineConfig({
   dts: {
      inferTypes: true,
   },
   entry: [
      "src/index.ts",
      "src/stream-parser.ts",
      "src/xpath.ts",
      "src/canonicalize.ts",
   ],
});
