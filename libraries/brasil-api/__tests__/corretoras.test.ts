import { describe, expect, mock, test } from "bun:test";
import { getCorretora, getCorretoras } from "../src/corretoras";

describe("getCorretoras", () => {
   describe("successful API calls", () => {
      test("should return array of brokers", async () => {
         global.fetch = mock(async () =>
            Response.json([
               {
                  cnpj: "12345678901234",
                  type: "CORRETORA",
                  nome_social: "Corretora Exemplo S.A.",
                  nome_comercial: "Corretora Exemplo",
                  status: "EM FUNCIONAMENTO NORMAL",
                  email: "contato@exemplo.com.br",
                  telefone: "11-1234-5678",
                  cep: "01310100",
                  pais: "Brasil",
                  uf: "SP",
                  municipio: "São Paulo",
                  bairro: "Bela Vista",
                  complemento: "Sala 100",
                  logradouro: "Avenida Paulista, 1000",
                  data_patrimonio_liquido: "2024-01-01",
                  valor_patrimonio_liquido: "1000000.00",
                  codigo_cvm: "1234",
                  data_inicio_situacao: "2020-01-01",
                  data_registro: "2020-01-01",
               },
               {
                  cnpj: "98765432109876",
                  type: "DISTRIBUIDORA",
                  nome_social: "Distribuidora Exemplo S.A.",
                  nome_comercial: "Distribuidora Exemplo",
                  status: "EM FUNCIONAMENTO NORMAL",
                  email: "contato@exemplo2.com.br",
                  telefone: "11-9876-5432",
                  cep: "01310200",
                  pais: "Brasil",
                  uf: "RJ",
                  municipio: "Rio de Janeiro",
                  bairro: "Centro",
                  complemento: "",
                  logradouro: "Rua Exemplo, 200",
                  data_patrimonio_liquido: "2024-01-01",
                  valor_patrimonio_liquido: "2000000.00",
                  codigo_cvm: "5678",
                  data_inicio_situacao: "2019-01-01",
                  data_registro: "2019-01-01",
               },
            ]),
         );

         const brokers = await getCorretoras();

         expect(Array.isArray(brokers)).toBe(true);
         expect(brokers.length).toBeGreaterThan(0);
      });

      test("should return brokers with required fields", async () => {
         global.fetch = mock(async () =>
            Response.json([
               {
                  cnpj: "12345678901234",
                  type: "CORRETORA",
                  nome_social: "Corretora Exemplo S.A.",
                  nome_comercial: "Corretora Exemplo",
                  status: "EM FUNCIONAMENTO NORMAL",
                  email: "",
                  telefone: "",
                  cep: "",
                  pais: "",
                  uf: "",
                  municipio: "",
                  bairro: "",
                  complemento: "",
                  logradouro: "",
                  data_patrimonio_liquido: "",
                  valor_patrimonio_liquido: "",
                  codigo_cvm: "",
                  data_inicio_situacao: "",
                  data_registro: "",
               },
            ]),
         );

         const brokers = await getCorretoras();
         const broker = brokers[0];

         // Required fields
         expect(broker).toHaveProperty("cnpj");
         expect(broker).toHaveProperty("type");
         expect(broker).toHaveProperty("nome_social");
         expect(broker).toHaveProperty("nome_comercial");
         expect(broker).toHaveProperty("status");

         expect(typeof broker.cnpj).toBe("string");
         expect(typeof broker.type).toBe("string");
         expect(typeof broker.nome_social).toBe("string");
         expect(typeof broker.nome_comercial).toBe("string");
         expect(typeof broker.status).toBe("string");
      });

      test("should return brokers with optional fields", async () => {
         global.fetch = mock(async () =>
            Response.json([
               {
                  cnpj: "12345678901234",
                  type: "CORRETORA",
                  nome_social: "Corretora Exemplo S.A.",
                  nome_comercial: "Corretora Exemplo",
                  status: "EM FUNCIONAMENTO NORMAL",
                  email: "",
                  telefone: "",
                  cep: "",
                  pais: "",
                  uf: "",
                  municipio: "",
                  bairro: "",
                  complemento: "",
                  logradouro: "",
                  data_patrimonio_liquido: "",
                  valor_patrimonio_liquido: "",
                  codigo_cvm: "",
                  data_inicio_situacao: "",
                  data_registro: "",
               },
            ]),
         );

         const brokers = await getCorretoras();
         const broker = brokers[0];

         // Optional fields - may be present
         expect(broker).toHaveProperty("email");
         expect(broker).toHaveProperty("telefone");
         expect(broker).toHaveProperty("cep");
         expect(broker).toHaveProperty("pais");
         expect(broker).toHaveProperty("uf");
         expect(broker).toHaveProperty("municipio");
         expect(broker).toHaveProperty("bairro");
         expect(broker).toHaveProperty("complemento");
         expect(broker).toHaveProperty("logradouro");
         expect(broker).toHaveProperty("data_patrimonio_liquido");
         expect(broker).toHaveProperty("valor_patrimonio_liquido");
         expect(broker).toHaveProperty("codigo_cvm");
         expect(broker).toHaveProperty("data_inicio_situacao");
         expect(broker).toHaveProperty("data_registro");
      });

      test("should return valid CNPJ format", async () => {
         global.fetch = mock(async () =>
            Response.json([
               {
                  cnpj: "12345678901234",
                  type: "CORRETORA",
                  nome_social: "Corretora Exemplo S.A.",
                  nome_comercial: "Corretora Exemplo",
                  status: "EM FUNCIONAMENTO NORMAL",
                  email: "",
                  telefone: "",
                  cep: "",
                  pais: "",
                  uf: "",
                  municipio: "",
                  bairro: "",
                  complemento: "",
                  logradouro: "",
                  data_patrimonio_liquido: "",
                  valor_patrimonio_liquido: "",
                  codigo_cvm: "",
                  data_inicio_situacao: "",
                  data_registro: "",
               },
            ]),
         );

         const brokers = await getCorretoras();
         const broker = brokers[0];

         // CNPJ is typically 14 digits
         expect(broker.cnpj).toMatch(/^\d{14}$/);
      });

      test("should return brokers with valid types", async () => {
         global.fetch = mock(async () =>
            Response.json([
               {
                  cnpj: "12345678901234",
                  type: "CORRETORA",
                  nome_social: "Corretora Exemplo S.A.",
                  nome_comercial: "Corretora Exemplo",
                  status: "EM FUNCIONAMENTO NORMAL",
                  email: "",
                  telefone: "",
                  cep: "",
                  pais: "",
                  uf: "",
                  municipio: "",
                  bairro: "",
                  complemento: "",
                  logradouro: "",
                  data_patrimonio_liquido: "",
                  valor_patrimonio_liquido: "",
                  codigo_cvm: "",
                  data_inicio_situacao: "",
                  data_registro: "",
               },
            ]),
         );

         const brokers = await getCorretoras();

         brokers.forEach((broker) => {
            expect(broker.type.length).toBeGreaterThan(0);
         });
      });

      test("should return brokers with valid status", async () => {
         global.fetch = mock(async () =>
            Response.json([
               {
                  cnpj: "12345678901234",
                  type: "CORRETORA",
                  nome_social: "Corretora Exemplo S.A.",
                  nome_comercial: "Corretora Exemplo",
                  status: "EM FUNCIONAMENTO NORMAL",
                  email: "",
                  telefone: "",
                  cep: "",
                  pais: "",
                  uf: "",
                  municipio: "",
                  bairro: "",
                  complemento: "",
                  logradouro: "",
                  data_patrimonio_liquido: "",
                  valor_patrimonio_liquido: "",
                  codigo_cvm: "",
                  data_inicio_situacao: "",
                  data_registro: "",
               },
            ]),
         );

         const brokers = await getCorretoras();

         brokers.forEach((broker) => {
            expect(broker.status.length).toBeGreaterThan(0);
         });
      });

      test("should include multiple brokers", async () => {
         global.fetch = mock(async () =>
            Response.json(
               Array.from({ length: 10 }, (_, i) => ({
                  cnpj: `${12345678901234 + i}`,
                  type: "CORRETORA",
                  nome_social: `Corretora ${i} S.A.`,
                  nome_comercial: `Corretora ${i}`,
                  status: "EM FUNCIONAMENTO NORMAL",
                  email: "",
                  telefone: "",
                  cep: "",
                  pais: "",
                  uf: "",
                  municipio: "",
                  bairro: "",
                  complemento: "",
                  logradouro: "",
                  data_patrimonio_liquido: "",
                  valor_patrimonio_liquido: "",
                  codigo_cvm: "",
                  data_inicio_situacao: "",
                  data_registro: "",
               })),
            ),
         );

         const brokers = await getCorretoras();

         // Should have a reasonable number of brokers
         expect(brokers.length).toBeGreaterThan(5);
      });
   });
});

describe("getCorretora", () => {
   describe("successful API calls", () => {
      test("should return specific broker by CNPJ", async () => {
         let callCount = 0;
         global.fetch = mock(async () => {
            callCount++;
            if (callCount === 1) {
               return Response.json([
                  {
                     cnpj: "12345678901234",
                     type: "CORRETORA",
                     nome_social: "Corretora Exemplo S.A.",
                     nome_comercial: "Corretora Exemplo",
                     status: "EM FUNCIONAMENTO NORMAL",
                     email: "",
                     telefone: "",
                     cep: "",
                     pais: "",
                     uf: "",
                     municipio: "",
                     bairro: "",
                     complemento: "",
                     logradouro: "",
                     data_patrimonio_liquido: "",
                     valor_patrimonio_liquido: "",
                     codigo_cvm: "",
                     data_inicio_situacao: "",
                     data_registro: "",
                  },
               ]);
            }
            return Response.json({
               cnpj: "12345678901234",
               type: "CORRETORA",
               nome_social: "Corretora Exemplo S.A.",
               nome_comercial: "Corretora Exemplo",
               status: "EM FUNCIONAMENTO NORMAL",
               email: "",
               telefone: "",
               cep: "",
               pais: "",
               uf: "",
               municipio: "",
               bairro: "",
               complemento: "",
               logradouro: "",
               data_patrimonio_liquido: "",
               valor_patrimonio_liquido: "",
               codigo_cvm: "",
               data_inicio_situacao: "",
               data_registro: "",
            });
         });

         const brokers = await getCorretoras();
         const firstBroker = brokers[0];

         const result = await getCorretora(firstBroker.cnpj);

         expect(result).toHaveProperty("cnpj");
         expect(result.cnpj).toBe(firstBroker.cnpj);
      });

      test("should return broker with all required fields", async () => {
         let callCount = 0;
         global.fetch = mock(async () => {
            callCount++;
            if (callCount === 1) {
               return Response.json([
                  {
                     cnpj: "12345678901234",
                     type: "CORRETORA",
                     nome_social: "Corretora Exemplo S.A.",
                     nome_comercial: "Corretora Exemplo",
                     status: "EM FUNCIONAMENTO NORMAL",
                     email: "",
                     telefone: "",
                     cep: "",
                     pais: "",
                     uf: "",
                     municipio: "",
                     bairro: "",
                     complemento: "",
                     logradouro: "",
                     data_patrimonio_liquido: "",
                     valor_patrimonio_liquido: "",
                     codigo_cvm: "",
                     data_inicio_situacao: "",
                     data_registro: "",
                  },
               ]);
            }
            return Response.json({
               cnpj: "12345678901234",
               type: "CORRETORA",
               nome_social: "Corretora Exemplo S.A.",
               nome_comercial: "Corretora Exemplo",
               status: "EM FUNCIONAMENTO NORMAL",
               email: "",
               telefone: "",
               cep: "",
               pais: "",
               uf: "",
               municipio: "",
               bairro: "",
               complemento: "",
               logradouro: "",
               data_patrimonio_liquido: "",
               valor_patrimonio_liquido: "",
               codigo_cvm: "",
               data_inicio_situacao: "",
               data_registro: "",
            });
         });

         const brokers = await getCorretoras();
         const firstBroker = brokers[0];

         const result = await getCorretora(firstBroker.cnpj);

         expect(result).toHaveProperty("cnpj");
         expect(result).toHaveProperty("type");
         expect(result).toHaveProperty("nome_social");
         expect(result).toHaveProperty("nome_comercial");
         expect(result).toHaveProperty("status");

         expect(typeof result.cnpj).toBe("string");
         expect(typeof result.type).toBe("string");
         expect(typeof result.nome_social).toBe("string");
         expect(typeof result.nome_comercial).toBe("string");
         expect(typeof result.status).toBe("string");
      });

      test("should return matching broker information", async () => {
         let callCount = 0;
         global.fetch = mock(async () => {
            callCount++;
            if (callCount === 1) {
               return Response.json([
                  {
                     cnpj: "12345678901234",
                     type: "CORRETORA",
                     nome_social: "Corretora Exemplo S.A.",
                     nome_comercial: "Corretora Exemplo",
                     status: "EM FUNCIONAMENTO NORMAL",
                     email: "",
                     telefone: "",
                     cep: "",
                     pais: "",
                     uf: "",
                     municipio: "",
                     bairro: "",
                     complemento: "",
                     logradouro: "",
                     data_patrimonio_liquido: "",
                     valor_patrimonio_liquido: "",
                     codigo_cvm: "",
                     data_inicio_situacao: "",
                     data_registro: "",
                  },
               ]);
            }
            return Response.json({
               cnpj: "12345678901234",
               type: "CORRETORA",
               nome_social: "Corretora Exemplo S.A.",
               nome_comercial: "Corretora Exemplo",
               status: "EM FUNCIONAMENTO NORMAL",
               email: "",
               telefone: "",
               cep: "",
               pais: "",
               uf: "",
               municipio: "",
               bairro: "",
               complemento: "",
               logradouro: "",
               data_patrimonio_liquido: "",
               valor_patrimonio_liquido: "",
               codigo_cvm: "",
               data_inicio_situacao: "",
               data_registro: "",
            });
         });

         const brokers = await getCorretoras();
         const firstBroker = brokers[0];

         const result = await getCorretora(firstBroker.cnpj);

         expect(result.cnpj).toBe(firstBroker.cnpj);
         expect(result.nome_social).toBe(firstBroker.nome_social);
         expect(result.status).toBe(firstBroker.status);
      });

      test("should return valid CNPJ format", async () => {
         let callCount = 0;
         global.fetch = mock(async () => {
            callCount++;
            if (callCount === 1) {
               return Response.json([
                  {
                     cnpj: "12345678901234",
                     type: "CORRETORA",
                     nome_social: "Corretora Exemplo S.A.",
                     nome_comercial: "Corretora Exemplo",
                     status: "EM FUNCIONAMENTO NORMAL",
                     email: "",
                     telefone: "",
                     cep: "",
                     pais: "",
                     uf: "",
                     municipio: "",
                     bairro: "",
                     complemento: "",
                     logradouro: "",
                     data_patrimonio_liquido: "",
                     valor_patrimonio_liquido: "",
                     codigo_cvm: "",
                     data_inicio_situacao: "",
                     data_registro: "",
                  },
               ]);
            }
            return Response.json({
               cnpj: "12345678901234",
               type: "CORRETORA",
               nome_social: "Corretora Exemplo S.A.",
               nome_comercial: "Corretora Exemplo",
               status: "EM FUNCIONAMENTO NORMAL",
               email: "",
               telefone: "",
               cep: "",
               pais: "",
               uf: "",
               municipio: "",
               bairro: "",
               complemento: "",
               logradouro: "",
               data_patrimonio_liquido: "",
               valor_patrimonio_liquido: "",
               codigo_cvm: "",
               data_inicio_situacao: "",
               data_registro: "",
            });
         });

         const brokers = await getCorretoras();
         const firstBroker = brokers[0];

         const result = await getCorretora(firstBroker.cnpj);

         expect(result.cnpj).toMatch(/^\d{14}$/);
      });
   });
});
