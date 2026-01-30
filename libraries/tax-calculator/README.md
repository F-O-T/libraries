# @f-o-t/tax-calculator

A comprehensive Brazilian tax calculation library with support for multiple
tax types, rules-based configuration, and precise monetary calculations.

## Features

- **Multiple Tax Types**: ICMS, IPI, PIS, COFINS, ISS, Substitution Tax
  (ST), Simples Nacional
- **Rules-Based Configuration**: Flexible tax rate configuration using
  @f-o-t/rules-engine
- **Precise Calculations**: Integration with @f-o-t/money for accurate
  monetary operations
- **Type-Safe**: Full TypeScript support with strict typing
- **Flexible**: Support for tiered rates, exemptions, and special regimes
- **Well-Tested**: Comprehensive test coverage

## Installation

```bash
bun add @f-o-t/tax-calculator
```

## Quick Start

```typescript
import { configureTaxRates, calculateICMS } from "@f-o-t/tax-calculator";
import { of as moneyOf } from "@f-o-t/money";

// Configure tax rates
configureTaxRates({
   icms: {
      SP: { internal: 0.18, interstate: 0.12 },
      RJ: { internal: 0.20, interstate: 0.12 },
   },
   pis: {
      lucro_real: 0.0165,
      lucro_presumido: 0.0165,
      simples_nacional: 0.0,
   },
   cofins: {
      lucro_real: 0.076,
      lucro_presumido: 0.076,
      simples_nacional: 0.0,
   },
});

// Calculate ICMS for a transaction
const baseValue = moneyOf("1000.00", "BRL");

const result = calculateICMS({
   baseValue,
   state: "SP",
   operation: "internal",
   ncm: "12345678",
   cfop: "5101",
});

console.log(result.amount); // { value: "180.00", currency: "BRL" }
console.log(result.base); // { value: "1000.00", currency: "BRL" }
```

## License

MIT © F-O-T
