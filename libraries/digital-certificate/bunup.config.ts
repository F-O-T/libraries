import { defineConfig } from "bunup";

export default defineConfig({
   entry: [
      "src/index.ts",
      "src/plugins/xml-signer/index.ts",
      "src/plugins/mtls/index.ts",
   ],
   outdir: "dist",
   format: "esm",
   target: "bun",
   dts: {
      inferTypes: true,
   },
   clean: true,
   minify: false,
   sourcemap: true,
   external: ["@f-o-t/asn1", "@f-o-t/crypto", "@f-o-t/xml", "neverthrow", "zod"],
});
