import { defineFotConfig } from '@f-o-t/config';

export default defineFotConfig({
  external: ['zod'],
  plugins: ['stream', 'xpath', 'canonicalize'],
});
