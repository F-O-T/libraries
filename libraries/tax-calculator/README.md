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
import { configureTaxRates, calculate } from "@f-o-t/tax-calculator";
import { Money } from "@f-o-t/money";

// Configure tax rates using rules
const taxConfig = configureTaxRates({
   icms: [
      { conditions: { state: "SP" }, rate: 0.18 },
      { conditions: { state: "RJ" }, rate: 0.20 },
   ],
   pis: [
      { conditions: {}, rate: 0.0165 },
   ],
   cofins: [
      { conditions: {}, rate: 0.076 },
   ],
});

// Calculate taxes for a transaction
const baseValue = Money.fromDecimal("1000.00", "BRL");
const context = { state: "SP" };

const result = calculate(baseValue, taxConfig, context);

console.log(result.icms?.toString()); // "180.00 BRL"
console.log(result.total.toString()); // "256.50 BRL"
```

## License

MIT © F-O-T
