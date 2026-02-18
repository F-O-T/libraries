import { defineFotConfig } from "@f-o-t/config";

export default defineFotConfig({
   external: [
      "zod",
      "@f-o-t/asn1",
      "@f-o-t/crypto",
      "@f-o-t/qrcode",
      "@f-o-t/pdf",
      "@f-o-t/digital-certificate",
   ],
});
