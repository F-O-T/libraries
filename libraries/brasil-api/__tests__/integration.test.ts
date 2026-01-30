import { afterEach, describe, expect, mock, test } from "bun:test";
import {
   configureBrasilApi,
   getConfig,
   resetConfig,
   // Configuration
   type BrasilApiConfig,
   // Errors
   BrasilApiError,
   BrasilApiNetworkError,
   BrasilApiResponseError,
   BrasilApiValidationError,
   // CEP
   getCep,
   getCepV2,
   type CepResponse,
   type CepV2Response,
   // Banks
   getBank,
   getBanks,
   type Bank,
   // CNPJ
   getCnpj,
   type CnpjResponse,
   // DDD
   getDdd,
   type DddResponse,
   // Feriados
   getFeriados,
   type Feriado,
   // IBGE
   getEstados,
   getMunicipios,
   type Estado,
   type Municipio,
   // ISBN
   getIsbn,
   type IsbnResponse,
   // NCM
   getNcm,
   getNcms,
   type Ncm,
   // PIX
   getPixParticipants,
   type PixParticipant,
   // Registro.br
   getDomainStatus,
   type DomainStatus,
   // Taxas
   getTaxa,
   getTaxas,
   type Taxa,
   // Corretoras
   getCorretora,
   getCorretoras,
   type Corretora,
   // CPTEC
   getCidades,
   getPrevisao,
   getPrevisaoOndas,
   type Cidade,
   type Previsao,
   type PrevisaoOndas,
   // Cambio
   getCotacao,
   getMoedas,
   type Cotacao,
   type Moeda,
   // FIPE
   getFipeMarcas,
   getFipePreco,
   getFipeTabelas,
   type FipeMarca,
   type FipePreco,
   type FipeTabela,
   type TipoVeiculo,
} from "../src/index";

describe("Integration Tests", () => {
   afterEach(() => {
      resetConfig();
   });

   describe("Configuration System", () => {
      test("should get default configuration", () => {
         const config = getConfig();
         expect(config.baseUrl).toBe("https://brasilapi.com.br/api");
         expect(config.timeout).toBe(10000);
      });

      test("should configure base URL", () => {
         configureBrasilApi({ baseUrl: "https://custom.api.com" });
         const config = getConfig();
         expect(config.baseUrl).toBe("https://custom.api.com");
         expect(config.timeout).toBe(10000); // Should keep default
      });

      test("should configure timeout", () => {
         configureBrasilApi({ timeout: 5000 });
         const config = getConfig();
         expect(config.baseUrl).toBe("https://brasilapi.com.br/api");
         expect(config.timeout).toBe(5000);
      });

      test("should configure multiple options", () => {
         configureBrasilApi({
            baseUrl: "https://test.api.com",
            timeout: 3000,
         });
         const config = getConfig();
         expect(config.baseUrl).toBe("https://test.api.com");
         expect(config.timeout).toBe(3000);
      });

      test("should merge configurations", () => {
         configureBrasilApi({ baseUrl: "https://first.com" });
         configureBrasilApi({ timeout: 7000 });
         const config = getConfig();
         expect(config.baseUrl).toBe("https://first.com");
         expect(config.timeout).toBe(7000);
      });

      test("should reset configuration to defaults", () => {
         configureBrasilApi({
            baseUrl: "https://custom.com",
            timeout: 5000,
         });
         resetConfig();
         const config = getConfig();
         expect(config.baseUrl).toBe("https://brasilapi.com.br/api");
         expect(config.timeout).toBe(10000);
      });
   });

   describe("API Functions with Custom Configuration", () => {
      test("should use custom base URL for API calls", async () => {
         configureBrasilApi({ baseUrl: "https://custom.brasilapi.com" });

         const mockFetch = mock(async (url: string) => {
            expect(url).toContain("https://custom.brasilapi.com");
            return Response.json({
               cep: "01310-100",
               state: "SP",
               city: "São Paulo",
               neighborhood: "Bela Vista",
               street: "Avenida Paulista",
               service: "viacep",
            });
         });

         global.fetch = mockFetch;

         await getCep("01310-100");
         expect(mockFetch).toHaveBeenCalled();
      });

      test("should respect custom timeout", async () => {
         configureBrasilApi({ timeout: 100 });

         global.fetch = mock(
            async (_url: string, options?: RequestInit) =>
               new Promise((resolve, reject) => {
                  const checkAbort = () => {
                     if (options?.signal?.aborted) {
                        reject(new DOMException("Aborted", "AbortError"));
                     }
                  };

                  options?.signal?.addEventListener("abort", checkAbort);

                  setTimeout(() => {
                     checkAbort();
                     resolve(
                        Response.json({
                           cep: "01310-100",
                           state: "SP",
                           city: "São Paulo",
                           neighborhood: "Bela Vista",
                           street: "Avenida Paulista",
                           service: "viacep",
                        }),
                     );
                  }, 500); // Longer than timeout
               }),
         );

         await expect(getCep("01310-100")).rejects.toThrow(
            "Request timeout after 100ms",
         );
      });
   });

   describe("Module Exports", () => {
      test("should export all configuration functions", () => {
         expect(typeof configureBrasilApi).toBe("function");
         expect(typeof getConfig).toBe("function");
         expect(typeof resetConfig).toBe("function");
      });

      test("should export all error classes", () => {
         expect(typeof BrasilApiError).toBe("function");
         expect(typeof BrasilApiNetworkError).toBe("function");
         expect(typeof BrasilApiResponseError).toBe("function");
         expect(typeof BrasilApiValidationError).toBe("function");
      });

      test("should export CEP functions", () => {
         expect(typeof getCep).toBe("function");
         expect(typeof getCepV2).toBe("function");
      });

      test("should export Banks functions", () => {
         expect(typeof getBank).toBe("function");
         expect(typeof getBanks).toBe("function");
      });

      test("should export CNPJ functions", () => {
         expect(typeof getCnpj).toBe("function");
      });

      test("should export DDD functions", () => {
         expect(typeof getDdd).toBe("function");
      });

      test("should export Feriados functions", () => {
         expect(typeof getFeriados).toBe("function");
      });

      test("should export IBGE functions", () => {
         expect(typeof getEstados).toBe("function");
         expect(typeof getMunicipios).toBe("function");
      });

      test("should export ISBN functions", () => {
         expect(typeof getIsbn).toBe("function");
      });

      test("should export NCM functions", () => {
         expect(typeof getNcm).toBe("function");
         expect(typeof getNcms).toBe("function");
      });

      test("should export PIX functions", () => {
         expect(typeof getPixParticipants).toBe("function");
      });

      test("should export Registro.br functions", () => {
         expect(typeof getDomainStatus).toBe("function");
      });

      test("should export Taxas functions", () => {
         expect(typeof getTaxa).toBe("function");
         expect(typeof getTaxas).toBe("function");
      });

      test("should export Corretoras functions", () => {
         expect(typeof getCorretora).toBe("function");
         expect(typeof getCorretoras).toBe("function");
      });

      test("should export CPTEC functions", () => {
         expect(typeof getCidades).toBe("function");
         expect(typeof getPrevisao).toBe("function");
         expect(typeof getPrevisaoOndas).toBe("function");
      });

      test("should export Cambio functions", () => {
         expect(typeof getCotacao).toBe("function");
         expect(typeof getMoedas).toBe("function");
      });

      test("should export FIPE functions", () => {
         expect(typeof getFipeMarcas).toBe("function");
         expect(typeof getFipePreco).toBe("function");
         expect(typeof getFipeTabelas).toBe("function");
      });
   });

   describe("Error Handling", () => {
      test("should throw validation errors for invalid input", async () => {
         await expect(getCep("invalid")).rejects.toThrow(
            BrasilApiValidationError,
         );
      });

      test("should throw network errors on request failures", async () => {
         global.fetch = mock(() => Promise.reject(new Error("Network error")));

         await expect(getCep("01310-100")).rejects.toThrow(
            BrasilApiNetworkError,
         );
      });

      test("should throw network errors on HTTP errors", async () => {
         global.fetch = mock(async () => new Response(null, { status: 404 }));

         await expect(getCep("01310-100")).rejects.toThrow(
            BrasilApiNetworkError,
         );
      });
   });

   describe("Configuration Isolation", () => {
      test("should not affect other tests after reset", async () => {
         configureBrasilApi({
            baseUrl: "https://test1.com",
            timeout: 1000,
         });
         resetConfig();

         const config = getConfig();
         expect(config.baseUrl).toBe("https://brasilapi.com.br/api");
         expect(config.timeout).toBe(10000);
      });

      test("should maintain configuration across multiple function calls", async () => {
         configureBrasilApi({ baseUrl: "https://consistent.api.com" });

         const mockFetch = mock(async (url: string) => {
            expect(url).toContain("https://consistent.api.com");
            return Response.json({
               cep: "01310-100",
               state: "SP",
               city: "São Paulo",
               neighborhood: "Bela Vista",
               street: "Avenida Paulista",
               service: "viacep",
            });
         });

         global.fetch = mockFetch;

         await getCep("01310-100");
         await getCep("01310-100");

         expect(mockFetch).toHaveBeenCalledTimes(2);
      });
   });
});
