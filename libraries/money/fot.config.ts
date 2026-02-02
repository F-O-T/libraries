import { defineFotConfig } from '@f-o-t/config';

export default defineFotConfig({
	external: ['zod', '@f-o-t/condition-evaluator', '@f-o-t/bigint'],
	plugins: ['operators'],
	typescript: {
		maxMemory: 8192, // 8GB - needed for complex type inference during declaration generation
	},
});
