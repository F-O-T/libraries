import { defineFotConfig } from '@f-o-t/config';

export default defineFotConfig({
  external: ['zod', '@f-o-t/xml'],
  plugins: ['xml-signer', 'mtls'],
});
