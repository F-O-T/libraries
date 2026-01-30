// @f-o-t/brasil-api
export const VERSION = "0.1.0";

export type { CnpjResponse } from "./cnpj";
// CNPJ
export { getCnpj } from "./cnpj";
export type { Feriado } from "./feriados";
// Feriados (National Holidays)
export { getFeriados } from "./feriados";
export type { Estado, Municipio } from "./ibge";
// IBGE (Brazilian Institute of Geography and Statistics)
export { getEstados, getMunicipios } from "./ibge";
