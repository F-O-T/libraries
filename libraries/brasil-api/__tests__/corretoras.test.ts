import { describe, expect, test } from "bun:test";
import { getCorretora, getCorretoras } from "../src/corretoras";

describe("getCorretoras", () => {
   describe("successful API calls", () => {
      test("should return array of brokers", async () => {
         const brokers = await getCorretoras();

         expect(Array.isArray(brokers)).toBe(true);
         expect(brokers.length).toBeGreaterThan(0);
      });

      test("should return brokers with required fields", async () => {
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
         const brokers = await getCorretoras();
         const broker = brokers[0];

         // CNPJ is typically 14 digits
         expect(broker.cnpj).toMatch(/^\d{14}$/);
      });

      test("should return brokers with valid types", async () => {
         const brokers = await getCorretoras();

         brokers.forEach((broker) => {
            expect(broker.type.length).toBeGreaterThan(0);
         });
      });

      test("should return brokers with valid status", async () => {
         const brokers = await getCorretoras();

         brokers.forEach((broker) => {
            expect(broker.status.length).toBeGreaterThan(0);
         });
      });

      test("should include multiple brokers", async () => {
         const brokers = await getCorretoras();

         // Should have a reasonable number of brokers
         expect(brokers.length).toBeGreaterThan(5);
      });
   });
});

describe("getCorretora", () => {
   describe("successful API calls", () => {
      test("should return specific broker by CNPJ", async () => {
         const brokers = await getCorretoras();
         const firstBroker = brokers[0];

         const result = await getCorretora(firstBroker.cnpj);

         expect(result).toHaveProperty("cnpj");
         expect(result.cnpj).toBe(firstBroker.cnpj);
      });

      test("should return broker with all required fields", async () => {
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
         const brokers = await getCorretoras();
         const firstBroker = brokers[0];

         const result = await getCorretora(firstBroker.cnpj);

         expect(result.cnpj).toBe(firstBroker.cnpj);
         expect(result.nome_social).toBe(firstBroker.nome_social);
         expect(result.status).toBe(firstBroker.status);
      });

      test("should return valid CNPJ format", async () => {
         const brokers = await getCorretoras();
         const firstBroker = brokers[0];

         const result = await getCorretora(firstBroker.cnpj);

         expect(result.cnpj).toMatch(/^\d{14}$/);
      });
   });
});
