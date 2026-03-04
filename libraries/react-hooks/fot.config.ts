import { defineFotConfig } from "@f-o-t/config";

export default defineFotConfig({
  formats: ["esm", "cjs"],
  external: [],
  typescript: {
    declaration: true,
  },
});
