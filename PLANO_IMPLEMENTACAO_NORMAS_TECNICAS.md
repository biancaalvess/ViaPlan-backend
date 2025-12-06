# Plano de Implementação: Conformidade com Normas Técnicas Brasileiras

## Base Legal e Normativa
- **Decreto nº 7.983/2013**: SINAPI como referência oficial
- **NBR 12721**: Custos Unitários Básicos (CUB) e áreas
- **NBR 7480**: Aço para concreto armado
- **NBR 6118**: Projeto de estruturas de concreto
- **SINAPI/Cadernos Técnicos**: Critérios de medição

---

## 1. TERAPLENAGEM: Empolamento e Contração de Solo

### Problema Identificado
Atualmente, `calculateSpoilVolume` usa `expansionFactor = 1.0` (linha 278), ignorando os fatores físicos do solo.

### Implementação Necessária

#### 1.1. Fatores de Empolamento (Expansão)
- **Solo argiloso**: 25% (E = 0,25)
- **Solo arenoso**: 15% (E = 0,15)
- **Solo rochoso**: 50% (E = 0,50)
- **Solo misto**: 25% (E = 0,25) - padrão

#### 1.2. Fatores de Contração (Compactação)
- **Contração média**: 10% (C = 0,10)
- **Contração alta**: 15% (C = 0,15)

#### 1.3. Fórmulas Corretas
```
V_corte = V_aterro / (1 - C)
V_solto = V_corte × (1 + E)
```

### Arquivos a Modificar
- `src/services/measurement-calculations-viaplan.ts`
- `src/types/measurement.ts` (adicionar campos de tipo de solo)

---

## 2. ALVENARIA: Área Líquida (Desconto de Vãos)

### Problema Identificado
Sistema não implementa desconto de vãos conforme SINAPI.

### Implementação Necessária

#### 2.1. Critério SINAPI (Área Líquida)
- **Descontar 100%** dos vãos de portas e janelas
- Medir separadamente: Vergas, Contravergas, Bonecas/Espaletas
- Bonecas < 6 m² usam código específico com maior custo

#### 2.2. Validação de Hibridismo
- **Bloquear**: Usar área bruta com composições SINAPI
- **Permitir**: Área bruta apenas se composição não for SINAPI

### Arquivos a Criar/Modificar
- Criar: `src/services/masonry-calculations.ts`
- Modificar: `src/services/civil-measurement-calculations.ts` (funções de alvenaria)
- Modificar: `src/types/civil-measurement.ts` (adicionar interface de vãos)

---

## 3. CONCRETO: Duplicação de Volumes em Interseções

### Problema Identificado
Não há tratamento de interseções entre vigas, pilares e lajes.

### Implementação Necessária

#### 3.1. Hierarquia de Prioridade (NBR 6118/SINAPI)
1. **Laje** prevalece sobre **Viga**
2. **Viga** prevalece sobre **Pilar**
3. Volume da interseção computado apenas uma vez

#### 3.2. Regras de Medição
- **Pilares**: Da face superior da laje inferior até face inferior da viga/laje superior (altura livre)
- **Vigas**: Comprimento entre faces dos pilares (não eixo a eixo)
- **Lajes**: Descontar volume ocupado pelas vigas (se viga invertida)

### Arquivos a Criar/Modificar
- Criar: `src/services/concrete-volume-calculations.ts`
- Modificar: `src/types/civil-measurement.ts` (adicionar estruturas)

---

## 4. AÇO: Massa Nominal vs. Real (NBR 7480)

### Problema Identificado
Não há diferenciação entre peso nominal (cálculo) e peso real (balança).

### Implementação Necessária

#### 4.1. Regra NBR 7480
- **Medição para pagamento**: Massa nominal teórica
- **Tolerância de fabricação**: ±7% (não deve ser paga)
- **Fórmula**: Peso = Comprimento × Massa Nominal (kg/m)

#### 4.2. Tabela de Massas Nominais
- φ 5mm = 0,154 kg/m
- φ 6.3mm = 0,245 kg/m
- φ 8mm = 0,395 kg/m
- φ 10mm = 0,617 kg/m
- φ 12.5mm = 0,963 kg/m
- φ 16mm = 1,578 kg/m
- φ 20mm = 2,466 kg/m
- φ 25mm = 3,853 kg/m
- φ 32mm = 6,313 kg/m

### Arquivos a Criar/Modificar
- Criar: `src/services/rebar-weight-calculations.ts`
- Modificar: `src/types/civil-measurement.ts` (adicionar armaduras)

---

## 5. REVESTIMENTOS: Área Real com Desconto de Vãos

### Problema Identificado
Não há desconto de vãos em revestimentos cerâmicos/argamassados.

### Implementação Necessária

#### 5.1. Regras SINAPI
- **Cerâmica/Azulejo**: Área real (descontar todos os vãos)
- **Reboco/Emboço**: Área real (descontar vãos)
- **Pintura**: Área real (intradorso medido separadamente)
- **Cantos/Quinas**: Medir por metro linear (m)

#### 5.2. Espessuras de Regularização
- Considerar espessura média real (não apenas nominal)
- Pagar item de "Regularização" se > 2cm

### Arquivos a Criar/Modificar
- Criar: `src/services/finish-calculations.ts`
- Modificar: `src/types/civil-measurement.ts` (adicionar revestimentos)

---

## 6. IMPERMEABILIZAÇÃO: Área Real + Rodapés

### Problema Identificado
Não considera rodapés de subida e sobreposições.

### Implementação Necessária

#### 6.1. Regra Correta
```
Área Total = Área Piso + Área Rodapés (30cm) + Sobreposições (10-15%)
```

#### 6.2. Validação de Composição
- Se CPU já inclui sobreposição: medir apenas área geométrica
- Se CPU não inclui: adicionar 15% de sobreposição

### Arquivos a Modificar
- `src/services/civil-measurement-calculations.ts` (impermeabilização)

---

## 7. NBR 12.721: Área Equivalente vs. Área Real

### Problema Identificado
Confusão entre área equivalente (rateio) e área real (materiais).

### Implementação Necessária

#### 7.1. Separação Clara
- **Área Equivalente**: Apenas para rateio de custos/CUB
- **Área Real**: Para compra de materiais e orçamento executivo

#### 7.2. Validação
- Bloquear uso de área equivalente em quantitativos de materiais

### Arquivos a Criar
- Criar: `src/services/nbr-12721-calculations.ts`

---

## 8. VALIDAÇÃO DE METODOLOGIA HÍBRIDA

### Implementação Necessária

#### 8.1. Validador de Consistência
Criar função que valida:
- Critério de medição vs. Composição de custo
- Se usa SINAPI: forçar área líquida
- Se usa TCPO antigo: permitir área parcial (com aviso)

### Arquivos a Criar
- Criar: `src/services/methodology-validator.ts`

---

## 9. PRIORIDADE DE IMPLEMENTAÇÃO

### Fase 1 (Crítico - 1 semana)
1. ✅ Empolamento e contração de solo (Terraplenagem)
2. ✅ Área líquida de alvenaria (desconto de vãos)
3. ✅ Massa nominal de aço (NBR 7480)

### Fase 2 (Alto - 2 semanas)
4. Interseções de concreto (vigas/pilares/lajes)
5. Revestimentos (desconto de vãos)
6. Impermeabilização (rodapés e sobreposições)

### Fase 3 (Médio - 1 semana)
7. Validador de metodologia híbrida
8. NBR 12.721 (separação área equivalente/real)

---

## 10. CHECKLIST DE VALIDAÇÃO

Antes de aprovar orçamento:
- [ ] Terraplenagem: Empolamento aplicado (> 20%)?
- [ ] Concreto: Interseções descontadas?
- [ ] Aço: Peso nominal (não balança)?
- [ ] Alvenaria: Vãos descontados 100%?
- [ ] Revestimento: Área real (vãos descontados)?
- [ ] Metodologia: Consistente (SINAPI = área líquida)?

