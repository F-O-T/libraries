// @f-o-t/brasil-api
export const VERSION = "0.1.0";

// ============================================================================
// Configuration
// ============================================================================

export type { BrasilApiConfig } from "./config";
export {
   configureBrasilApi,
   getConfig,
   resetConfig,
   setConfig,
} from "./config";

// ============================================================================
// Errors
// ============================================================================

export {
   BrasilApiError,
   BrasilApiNetworkError,
   BrasilApiResponseError,
   BrasilApiValidationError,
} from "./errors";

// ============================================================================
// CEP (Postal Codes)
// ============================================================================

export type { CepResponse, CepV2Response } from "./cep";
export { getCep, getCepV2 } from "./cep";

// ============================================================================
// Banks
// ============================================================================

export type { Bank } from "./banks";
export { getBank, getBanks } from "./banks";

// ============================================================================
// CNPJ (Company Registry)
// ============================================================================

export type { CnpjResponse } from "./cnpj";
export { getCnpj } from "./cnpj";

// ============================================================================
// DDD (Area Codes)
// ============================================================================

export type { DddResponse } from "./ddd";
export { getDdd } from "./ddd";

// ============================================================================
// Feriados (National Holidays)
// ============================================================================

export type { Feriado } from "./feriados";
export { getFeriados } from "./feriados";

// ============================================================================
// IBGE (Brazilian Institute of Geography and Statistics)
// ============================================================================

export type { Estado, Municipio } from "./ibge";
export { getEstados, getMunicipios } from "./ibge";

// ============================================================================
// ISBN (International Standard Book Number)
// ============================================================================

export type { IsbnResponse } from "./isbn";
export { getIsbn } from "./isbn";

// ============================================================================
// NCM (Nomenclatura Comum do Mercosul)
// ============================================================================

export type { Ncm } from "./ncm";
export { getNcm, getNcms } from "./ncm";

// ============================================================================
// PIX (Instant Payment System)
// ============================================================================

export type { PixParticipant } from "./pix";
export { getPixParticipants } from "./pix";

// ============================================================================
// Registro.br (Domain Registration)
// ============================================================================

export type { DomainStatus } from "./registrobr";
export { getDomainStatus } from "./registrobr";

// ============================================================================
// Taxas (Interest Rates)
// ============================================================================

export type { Taxa } from "./taxas";
export { getTaxa, getTaxas } from "./taxas";

// ============================================================================
// Corretoras (CVM Registered Brokers)
// ============================================================================

export type { Corretora } from "./corretoras";
export { getCorretora, getCorretoras } from "./corretoras";

// ============================================================================
// CPTEC (Weather Forecast)
// ============================================================================

export type { Cidade, Previsao, PrevisaoOndas } from "./cptec";
export { getCidades, getPrevisao, getPrevisaoOndas } from "./cptec";

// ============================================================================
// Cambio (Currency Exchange)
// ============================================================================

export type { Cotacao, Moeda } from "./cambio";
export { getCotacao, getMoedas } from "./cambio";

// ============================================================================
// FIPE (Vehicle Prices)
// ============================================================================

export type { FipeMarca, FipePreco, FipeTabela, TipoVeiculo } from "./fipe";
export { getFipeMarcas, getFipePreco, getFipeTabelas } from "./fipe";
