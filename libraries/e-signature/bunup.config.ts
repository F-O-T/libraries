import { defineConfig } from "bunup";

export default defineConfig({
   entry: [
      "src/index.ts",
      "src/plugins/react/index.ts",
      "src/plugins/worker/index.ts",
   ],
   outdir: "dist",
   format: "esm",
   target: "browser",
   dts: {
      inferTypes: true,
   },
   clean: true,
   minify: false,
   sourcemap: true,
   external: [
      "@f-o-t/asn1",
      "@f-o-t/crypto",
      "@f-o-t/digital-certificate",
      "@f-o-t/pdf",
      "@f-o-t/qrcode",
      "neverthrow",
      "react",
      "zod",
   ],
});
