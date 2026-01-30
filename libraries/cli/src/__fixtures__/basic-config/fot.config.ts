import { defineFotConfig } from "@f-o-t/config";

export default defineFotConfig({
  formats: ["esm", "cjs"],
  external: ["@f-o-t/config"],
  typescript: {
    declaration: true,
  },
});
