import { defineFotConfig } from '@f-o-t/config';

export default defineFotConfig({
	external: ['zod', '@f-o-t/digital-certificate'],
	plugins: ['generation', 'parsing'],
});
