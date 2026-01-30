// @f-o-t/brasil-api
export const VERSION = "0.1.0";

// ============================================================================
// Configuration
// ============================================================================

export { configureBrasilApi, getConfig, resetConfig, setConfig } from "./config";
export type { BrasilApiConfig } from "./config";

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

export { getCep, getCepV2 } from "./cep";
export type { CepResponse, CepV2Response } from "./cep";

// ============================================================================
// Banks
// ============================================================================

export { getBank, getBanks } from "./banks";
export type { Bank } from "./banks";

// ============================================================================
// CNPJ (Company Registry)
// ============================================================================

export { getCnpj } from "./cnpj";
export type { CnpjResponse } from "./cnpj";

// ============================================================================
// DDD (Area Codes)
// ============================================================================

export { getDdd } from "./ddd";
export type { DddResponse } from "./ddd";

// ============================================================================
// Feriados (National Holidays)
// ============================================================================

export { getFeriados } from "./feriados";
export type { Feriado } from "./feriados";

// ============================================================================
// IBGE (Brazilian Institute of Geography and Statistics)
// ============================================================================

export { getEstados, getMunicipios } from "./ibge";
export type { Estado, Municipio } from "./ibge";

// ============================================================================
// ISBN (International Standard Book Number)
// ============================================================================

export { getIsbn } from "./isbn";
export type { IsbnResponse } from "./isbn";

// ============================================================================
// NCM (Nomenclatura Comum do Mercosul)
// ============================================================================

export { getNcm, getNcms } from "./ncm";
export type { Ncm } from "./ncm";

// ============================================================================
// PIX (Instant Payment System)
// ============================================================================

export { getPixParticipants } from "./pix";
export type { PixParticipant } from "./pix";

// ============================================================================
// Registro.br (Domain Registration)
// ============================================================================

export { getDomainStatus } from "./registrobr";
export type { DomainStatus } from "./registrobr";

// ============================================================================
// Taxas (Interest Rates)
// ============================================================================

export { getTaxa, getTaxas } from "./taxas";
export type { Taxa } from "./taxas";

// ============================================================================
// Corretoras (CVM Registered Brokers)
// ============================================================================

export { getCorretora, getCorretoras } from "./corretoras";
export type { Corretora } from "./corretoras";

// ============================================================================
// CPTEC (Weather Forecast)
// ============================================================================

export { getCidades, getPrevisao, getPrevisaoOndas } from "./cptec";
export type { Cidade, Previsao, PrevisaoOndas } from "./cptec";

// ============================================================================
// Cambio (Currency Exchange)
// ============================================================================

export { getCotacao, getMoedas } from "./cambio";
export type { Cotacao, Moeda } from "./cambio";

// ============================================================================
// FIPE (Vehicle Prices)
// ============================================================================

export { getFipeMarcas, getFipePreco, getFipeTabelas } from "./fipe";
export type { FipeMarca, FipePreco, FipeTabela, TipoVeiculo } from "./fipe";
