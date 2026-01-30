# @f-o-t/brasil-api

Type-safe wrapper for [Brasil API](https://brasilapi.com.br/) with Zod validation.

## Installation

```bash
bun add @f-o-t/brasil-api
# or
npm install @f-o-t/brasil-api
```

## Features

- 🔒 **Full TypeScript type safety** with Zod validation
- 🌳 **Tree-shakeable** - import only what you need
- ⚡ **Built for Bun and Node.js 18+**
- 🎯 **Covers all 14 Brasil API endpoint categories**
- 🛠️ **Flexible configuration** (global or context-based)
- 🚨 **Custom error hierarchy** for precise error handling

## Quick Start

```typescript
import { getCep, getCnpj, getBanks } from "@f-o-t/brasil-api";

// Fetch address by postal code
const address = await getCep("01310-100");
console.log(address.city); // "São Paulo"

// Get company info
const company = await getCnpj("00000000000191");
console.log(company.razao_social); // "BANCO DO BRASIL S.A."

// List all banks
const banks = await getBanks();
console.log(banks.length); // 200+
```

## Configuration

### Global Configuration

```typescript
import { configureBrasilApi } from "@f-o-t/brasil-api";

configureBrasilApi({
   timeout: 5000, // 5 seconds
   baseUrl: "https://brasilapi.com.br/api", // custom URL
});
```

### Context Configuration

```typescript
import { withConfig, getCep, getCnpj } from "@f-o-t/brasil-api";

const api = withConfig({ timeout: 15000 }, { getCep, getCnpj });

await api.getCep("01310-100"); // uses 15s timeout
```

## API Reference

### CEP (Postal Codes)

```typescript
import { getCep, getCepV2 } from "@f-o-t/brasil-api";

// Basic CEP lookup
const address = await getCep("01310-100");
// { cep, state, city, neighborhood, street, service }

// CEP with geolocation
const addressWithCoords = await getCepV2("01310-100");
// { ..., location: { coordinates: { latitude, longitude } } }
```

### Banks

```typescript
import { getBanks, getBank } from "@f-o-t/brasil-api";

// All banks
const banks = await getBanks();

// Specific bank by code
const bb = await getBank(1); // Banco do Brasil
```

### CNPJ

```typescript
import { getCnpj } from "@f-o-t/brasil-api";

const company = await getCnpj("00000000000191");
// { cnpj, razao_social, uf, municipio, qsa, ... }
```

### DDD (Area Codes)

```typescript
import { getDdd } from "@f-o-t/brasil-api";

const result = await getDdd(11); // or "11"
// { state: "SP", cities: ["São Paulo", "Guarulhos", ...] }
```

### Holidays

```typescript
import { getFeriados } from "@f-o-t/brasil-api";

const holidays = await getFeriados(2024);
// [{ date: "2024-01-01", name: "Confraternização Universal", type: "national" }]
```

### IBGE

```typescript
import { getEstados, getMunicipios } from "@f-o-t/brasil-api";

// All states
const states = await getEstados();

// Municipalities by state
const cities = await getMunicipios("SP");
```

### ISBN

```typescript
import { getIsbn } from "@f-o-t/brasil-api";

const book = await getIsbn("9788545702870");
// { isbn, title, authors, publisher, year, ... }
```

### NCM

```typescript
import { getNcms, getNcm } from "@f-o-t/brasil-api";

const codes = await getNcms();
const specific = await getNcm("01012100");
```

### PIX

```typescript
import { getPixParticipants } from "@f-o-t/brasil-api";

const participants = await getPixParticipants();
// [{ ispb, nome, modalidade_participacao, ... }]
```

### Domain Status

```typescript
import { getDomainStatus } from "@f-o-t/brasil-api";

const status = await getDomainStatus("google.com.br");
// { status, fqdn, hosts, expires_at, ... }
```

### Interest Rates

```typescript
import { getTaxas, getTaxa } from "@f-o-t/brasil-api";

const rates = await getTaxas();
const cdi = await getTaxa("CDI");
```

### Brokers

```typescript
import { getCorretoras, getCorretora } from "@f-o-t/brasil-api";

const brokers = await getCorretoras();
const xp = await getCorretora("02332886000104");
```

### Weather (CPTEC)

```typescript
import { getCidades, getPrevisao, getPrevisaoOndas } from "@f-o-t/brasil-api";

const cities = await getCidades();
const forecast = await getPrevisao(244, 3); // São Paulo, 3 days
const waves = await getPrevisaoOndas(1234); // Ocean forecast
```

### Currency Exchange

```typescript
import { getMoedas, getCotacao } from "@f-o-t/brasil-api";

const currencies = await getMoedas();
const usd = await getCotacao("USD", "2024-01-15");
// { simbolo, cotacaoCompra, cotacaoVenda, ... }
```

### FIPE (Vehicle Prices)

```typescript
import { getFipeMarcas, getFipePreco, getFipeTabelas } from "@f-o-t/brasil-api";

const brands = await getFipeMarcas("carros");
const price = await getFipePreco("001004-1");
const tables = await getFipeTabelas();
```

## Error Handling

```typescript
import {
   BrasilApiError,
   BrasilApiNetworkError,
   BrasilApiValidationError,
   BrasilApiResponseError,
} from "@f-o-t/brasil-api";

try {
   const address = await getCep("invalid");
} catch (error) {
   if (error instanceof BrasilApiValidationError) {
      console.log("Input validation failed:", error.zodError);
   } else if (error instanceof BrasilApiNetworkError) {
      console.log("Network error:", error.statusCode, error.endpoint);
   } else if (error instanceof BrasilApiResponseError) {
      console.log("Invalid API response:", error.zodError);
   }
}
```

## License

MIT

## Credits

Built on top of [Brasil API](https://brasilapi.com.br/) by [@filipedeschamps](https://github.com/filipedeschamps).
