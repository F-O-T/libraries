import { defineConfig } from "bunup";

export default defineConfig({
   dts: {
      inferTypes: true,
   },
   entry: ["src/index.ts", "src/xml-signer.ts", "src/mtls.ts"],
});
