import { defineConfig } from "bunup";

export default defineConfig({
   dts: {
      inferTypes: true,
   },
   entry: [
      "src/index.ts",
      "src/plugins/timezone/index.ts",
      "src/plugins/business-days/index.ts",
      "src/plugins/format/index.ts",
      "src/plugins/relative-time/index.ts",
   ],
});
