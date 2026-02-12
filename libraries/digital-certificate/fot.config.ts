import { defineFotConfig } from '@f-o-t/config';

export default defineFotConfig({
  external: ['zod', '@f-o-t/xml', 'pdf-lib', 'qrcode'],
  plugins: ['xml-signer', 'mtls', 'pdf-signer'],
});
