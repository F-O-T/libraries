import { defineFotConfig } from '@f-o-t/config';

export default defineFotConfig({
  external: ['zod', '@f-o-t/xml', '@f-o-t/crypto'],
  plugins: ['xml-signer', 'mtls'],
});
