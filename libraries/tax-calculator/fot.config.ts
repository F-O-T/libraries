import { defineFotConfig } from '@f-o-t/config';

export default defineFotConfig({
  external: ['zod', '@f-o-t/condition-evaluator', '@f-o-t/money', '@f-o-t/rules-engine'],
});
