import { defineFotConfig } from '@f-o-t/config';

export default defineFotConfig({
	external: ['zod', '@f-o-t/condition-evaluator', '@f-o-t/bigint'],
	plugins: ['operators'],
});
