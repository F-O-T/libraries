# Plano: Assinatura ICP-Brasil Completa

> Implementação in-house de assinaturas digitais compatíveis com ICP-Brasil

## Objetivo

Criar assinaturas PDF (PAdES-LTV) que passem validação no ITI VALIDAR sem usar serviços externos.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     signPdf()                                │
│  1. Visual Appearance (QR + Certificate Info)               │
│  2. PKCS#7 Signature Creation                               │
│  3. Add ICP-Brasil Attributes                               │
│  4. Request Timestamp                                        │
│  5. Embed in PDF with ByteRange                             │
└─────────────────────────────────────────────────────────────┘
```

## Componentes Necessários

### ✅ Já Implementado
- [x] Certificado P12/PFX loading
- [x] Cadeia de certificados
- [x] PKCS#7 básico com node-forge
- [x] Assinatura visual (QR + info)
- [x] PDF manipulation com pdf-lib

### 🔨 A Implementar

#### 1. Timestamp (RFC 3161) - CRÍTICO
**Status:** ✅ Implementado (`timestamp-client.ts`)

**Funcionalidade:**
- Conecta em servidor TSA ICP-Brasil
- Envia hash da assinatura
- Recebe timestamp token (ASN.1)
- Embute no atributo `id-aa-timeStampToken`

**Servidores TSA Gratuitos:**
- Valid.com: `http://timestamp.valid.com.br/tsa`
- Safeweb: `http://tsa.safeweb.com.br/tsa/tsa`

#### 2. Signature Policy - CRÍTICO
**Status:** 🔨 A fazer

**Arquivo:** `signature-policy.ts`

**Funcionalidade:**
- Baixa documento da política ICP-Brasil (PA_AD_RB_v2_3)
- Calcula SHA-256 do documento
- Adiciona ao atributo `id-aa-ets-sigPolicyId`:
  ```asn1
  SignaturePolicyIdentifier ::= SEQUENCE {
    signaturePolicyId OBJECT IDENTIFIER,  // 2.16.76.1.7.1.1.2.3
    signaturePolicyHash OtherHashAlgAndValue
  }
  ```

**URL da Política:**
```
http://politicas.icpbrasil.gov.br/PA_AD_RB_v2_3.der
```

#### 3. Commitment Type - OPCIONAL
**Status:** 🔨 A fazer

**Arquivo:** `commitment-type.ts`

**Funcionalidade:**
- Adiciona atributo `id-aa-ets-commitmentType`
- Valores comuns:
  - `1.2.840.113549.1.9.16.6.1` - proof of origin
  - `1.2.840.113549.1.9.16.6.4` - proof of approval

#### 4. Revocation Info (CRL/OCSP) - PARA LTV
**Status:** 🔨 A fazer

**Arquivo:** `revocation-info.ts`

**Funcionalidade:**
- Extrai URLs de CRL/OCSP do certificado
- Baixa CRL ou faz request OCSP
- Embute resposta na assinatura
- Permite validação offline (LTV - Long Term Validation)

#### 5. PAdES-BES/LTV Builder - CRÍTICO
**Status:** 🔨 A fazer

**Arquivo:** `pades-builder.ts`

**Funcionalidade:**
- Orquestra todos os componentes
- Cria estrutura PKCS#7/CMS completa
- Adiciona atributos na ordem correta:
  1. content-type
  2. message-digest
  3. signing-time
  4. **signature-policy-identifier** ⭐
  5. **commitment-type** (opcional)
  6. **signing-certificate-v2** ⭐
- Atributos não-assinados:
  7. **timestamp** ⭐
  8. **revocation-info** (para LTV)

#### 6. PDF Signer Integration
**Status:** 🔨 A fazer

**Arquivo:** `index.ts` (atualizar)

**Funcionalidade:**
- Integra `pades-builder.ts`
- Calcula ByteRange corretamente
- Embute assinatura no PDF
- Valida estrutura final

## Fluxo de Implementação

### Fase 1: Timestamp (PRIORIDADE MÁXIMA)
```
1. ✅ timestamp-client.ts - conectar TSA
2. 🔨 Testar recebimento de timestamp
3. 🔨 Integrar em pades-signer.ts
4. 🔨 Adicionar como atributo não-assinado
```

### Fase 2: Signature Policy
```
1. 🔨 Baixar PA_AD_RB_v2_3.der
2. 🔨 Calcular hash SHA-256
3. 🔨 Criar atributo sigPolicyId com hash
4. 🔨 Adicionar aos atributos assinados
```

### Fase 3: Signing Certificate V2
```
1. 🔨 Calcular hash do certificado
2. 🔨 Adicionar atributo signing-certificate-v2
3. 🔨 Incluir issuer serial
```

### Fase 4: Integração e Testes
```
1. 🔨 Criar PAdES-BES completo
2. 🔨 Testar no ITI VALIDAR
3. 🔨 Adicionar revocation info (LTV)
4. 🔨 Validar assinatura completa
```

## Atributos ICP-Brasil Obrigatórios

| Atributo | OID | Status | Crítico |
|----------|-----|--------|---------|
| content-type | 1.2.840.113549.1.9.3 | ✅ | Sim |
| message-digest | 1.2.840.113549.1.9.4 | ✅ | Sim |
| signing-time | 1.2.840.113549.1.9.5 | ✅ | Sim |
| signature-policy-id | 1.2.840.113549.1.9.16.2.15 | 🔨 | **SIM** |
| signing-certificate-v2 | 1.2.840.113549.1.9.16.2.47 | 🔨 | **SIM** |
| commitment-type | 1.2.840.113549.1.9.16.2.16 | 🔨 | Não |
| timestamp (unsigned) | 1.2.840.113549.1.9.16.2.14 | 🔨 | **SIM** |
| revocation-info (unsigned) | 1.2.840.113549.1.9.16.2.24 | 🔨 | LTV |

## Referências

### Documentação ICP-Brasil
- [DOC-ICP-15.03](http://www.iti.gov.br/legislacao/documentos-principais) - Políticas de Assinatura
- [PA_AD_RB_v2_3](http://politicas.icpbrasil.gov.br/PA_AD_RB_v2_3.pdf) - Política atual
- [ITI VALIDAR](https://validar.iti.gov.br) - Validador oficial

### Padrões
- [RFC 3161](https://datatracker.ietf.org/doc/html/rfc3161) - Timestamp Protocol
- [RFC 5652](https://datatracker.ietf.org/doc/html/rfc5652) - CMS (PKCS#7)
- [ETSI EN 319 122](https://www.etsi.org/deliver/etsi_en/319100_319199/31912202/01.01.01_60/en_31912202v010101p.pdf) - PAdES

## Próximos Passos

1. **Implementar Signature Policy** (`signature-policy.ts`)
2. **Implementar Signing Certificate V2** (`signing-certificate.ts`)
3. **Atualizar pades-signer.ts** com todos atributos
4. **Integrar Timestamp** nos atributos não-assinados
5. **Testar no ITI VALIDAR**

## Estimativa de Tempo

- Signature Policy: 2-3 horas
- Signing Certificate V2: 1-2 horas
- Timestamp Integration: 2-3 horas
- ByteRange fixing: 3-4 horas
- Testing & Debug: 4-6 horas

**Total: 12-18 horas de desenvolvimento**

## Riscos

1. **ByteRange Calculation** - Mais complexo, pode precisar reescrever
2. **ASN.1 Encoding** - Errors sutis podem quebrar validação
3. **TSA Availability** - Servidores gratuitos podem estar offline
4. **Policy Changes** - ICP-Brasil pode mudar políticas

## Alternativas

Se ficar muito complexo:
1. Usar `jsrsasign` (biblioteca japonesa com suporte PAdES completo)
2. Usar `pdf-signer` (wrapper para Java iText)
3. Integrar com serviço pago temporariamente para entender estrutura
