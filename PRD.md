# PRD.md — Nexus Atlas Product Requirements Document

**Produto:** Nexus Atlas — Plataforma Científica do Treinamento de Força  
**Domínio:** acmenexusfit.casa  
**Versão:** 2.0  
**Data:** Abril 2026  
**Público-alvo:** Atletas, fisiculturistas, personal trainers e entusiastas do treinamento baseado em evidências

---

## 1. Visão do Produto

O Nexus Atlas é a plataforma mobile definitiva para quem treina com inteligência. Nossa missão é democratizar o acesso ao conhecimento científico do treinamento de força, combinando IA generativa de última geração com ferramentas práticas de programação e análise.

**Tagline:** *Ciência no seu treino.*

---

## 2. Objetivos de Negócio

| Objetivo | Métrica | Meta 6 Meses |
|---|---|---|
| Aquisição | Usuários registrados | 10.000 |
| Conversão | Free → Pago | 15% |
| Retenção | DAU/MAU | 40% |
| Receita | MRR | R$ 50.000 |
| NPS | Net Promoter Score | ≥ 60 |

---

## 3. Usuários e Personas

### Persona 1: Atleta Intermediário
- **Quem é:** 25-40 anos, treina 4-5x/semana, quer melhorar resultados
- **Dores:** Não sabe como estruturar periodização, se perde em conteúdo contraditório
- **Ganhos:** Atlas IA responde dúvidas científicas, Lab calcula cargas e volumes

### Persona 2: Personal Trainer
- **Quem é:** Profissional que atende 10-30 clientes, precisa de ferramentas
- **Dores:** Demora para criar programas, difícil acompanhar múltiplos clientes
- **Ganhos:** Prescrição automatizada, CRM de clientes, Loja para vender planos

### Persona 3: Atleta Avançado / Competidor
- **Quem é:** Pratica powerlifting, fisiculturismo ou crossfit, quer precisão
- **Dores:** Quer dados, não opiniões. Quer saber o que a ciência diz.
- **Ganhos:** PubMed integrado, calculadoras de %1RM, biblioteca editorial

---

## 4. Funcionalidades por Módulo

### 4.1 Atlas IA (Lab IA)
**Status:** ✅ Implementado

- Chat em tempo real com streaming (Server-Sent Events)
- GPT-4o com system prompt especializado em fisiologia
- Sugestões de perguntas pré-definidas
- Histórico de conversa na sessão

**Próximas funcionalidades:**
- [ ] Histórico persistente de conversas
- [ ] Favoritar respostas
- [ ] Compartilhar resposta

### 4.2 Atlas Lab (Calculadoras)
**Status:** ✅ Implementado — v2.0

| Ferramenta | Descrição | Status |
|---|---|---|
| Volume | Séries × Reps × Carga | ✅ |
| %1RM | Epley + Brzycki médio | ✅ |
| IMC | kg / m² + classificação | ✅ |
| RPE/RIR | Tabela de referência | ✅ |
| TDEE | Gasto energético total | 🔜 |
| TSS | Training Stress Score | 🔜 |
| Deload | Calculadora de deload | 🔜 |
| Periodização | Auto-geração de mesociclo | 🔜 |

### 4.3 Scanner Nutricional
**Status:** ✅ Implementado

- Câmera do dispositivo para scan de código de barras
- IA analisa imagens de rótulos nutricionais
- Retorna macros, calorias e recomendações

### 4.4 Gestão de Treinos
**Status:** ✅ Implementado

- Criação e gestão de programas (blocos, semanas, dias)
- Registro de sessões (exercícios, séries, reps, carga, RPE)
- Dashboard de progresso e streak
- Ativação de programas

### 4.5 Prescrição para Personal Trainers
**Status:** ✅ Implementado

- CRM de clientes com notas e planos
- Geração de prescrição via IA (Atlas)
- Histórico de prescrições por cliente

### 4.6 Loja / Marketplace
**Status:** ✅ Implementado

- Usuários podem listar produtos (e-books, planos)
- Aprovação moderada pelo admin
- Perfis de personal trainer com especialidades e preço

### 4.7 Upload de Arquivos (Todos os Usuários)
**Status:** ✅ Implementado — v2.0

- Upload de PDF, DOC, DOCX, PNG, JPEG (até 50MB)
- Listagem e exclusão de arquivos
- Armazenamento seguro por usuário

### 4.8 Faturamento e Pagamentos
**Status:** ✅ Estruturado — Configurável

| Método | Status |
|---|---|
| Cartão de Crédito (Stripe) | ✅ Estruturado |
| PIX | ✅ Estruturado |
| PayPal | 🔜 Em breve |
| Boleto Bancário | 🔜 Em breve |

### 4.9 Painel Admin (Exclusivo)
**Status:** ✅ Implementado — v2.0

| Página | Funcionalidade |
|---|---|
| Painel | Métricas globais |
| Usuários | Gerenciar/upgrade planos |
| Loja Mod | Aprovar/rejeitar produtos |
| Integrações | Configurar APIs |
| Faturamento | Planos, métodos, Stripe config |
| Arquivos | Upload/gestão de arquivos admin |

### 4.10 Biblioteca Científica
**Status:** ✅ Backend + UI básica

- PubMed via NCBI eUtils API
- CrossRef via API pública
- OpenAlex via API open access
- Endpoint: `/api/research/pubmed?query=...`

---

## 5. Integrações Externas

| Serviço | Uso | Status |
|---|---|---|
| OpenAI GPT-4o | Atlas IA + Scanner | ✅ Ativo |
| PubMed (NCBI) | Pesquisa científica | ✅ Implementado |
| CrossRef | DOIs e publicações | ✅ Implementado |
| OpenAlex | Base open access | ✅ Implementado |
| Stripe | Pagamentos internacionais | ✅ Estruturado |
| PIX | Pagamentos Brasil | ✅ Estruturado |
| Google Gemini | IA alternativa | 🔜 Planejado |
| Strava | Importar atividades | 🔜 Planejado |
| Google Fit | Dados de saúde | 🔜 Planejado |
| Garmin | Dados de dispositivos | 🔜 Planejado |
| Resend | E-mails transacionais | 🔜 Planejado |
| Sentry | Monitoramento de erros | 🔜 Planejado |
| PostHog | Analytics de produto | 🔜 Planejado |
| Atlas Scanner | IA visual avançada | 🔜 Planejado |

---

## 6. Requisitos Não-Funcionais

### Performance
- Tempo de resposta da API < 500ms (exceto streaming)
- Primeiro streaming byte < 1s
- App deve iniciar < 3s em dispositivo médio

### Disponibilidade
- SLA: 99.5% uptime
- Domínio: acmenexusfit.casa

### Segurança
- Senhas com bcrypt (10 rounds)
- JWT com expiração de 30 dias
- Admin com token HMAC-SHA256
- Arquivos por usuário (isolamento total)
- HTTPS em produção

### Plataformas Suportadas
- iOS 16+ (Expo Go + App Store)
- Android 10+ (Expo Go + Google Play)
- Web (Chrome, Safari, Firefox, Edge)

---

## 7. Roadmap

### Q2 2026 (Atual)
- [x] Lab com calculadoras (Volume, %1RM, IMC, RPE)
- [x] Upload de arquivos para todos os usuários
- [x] Admin: Faturamento + Arquivos
- [x] PubMed, CrossRef, OpenAlex integrados
- [x] Stripe + PIX estruturados

### Q3 2026
- [ ] Google Gemini como IA alternativa
- [ ] Strava + Google Fit sync
- [ ] Histórico de conversas Atlas
- [ ] Notificações push (treino, metas)
- [ ] Sentry + PostHog integrados

### Q4 2026
- [ ] Garmin Connect integration
- [ ] Modo offline (cache local)
- [ ] Resend para e-mails automáticos
- [ ] TDEE + TSS calculators no Lab
- [ ] Periodização automática

---

*PRD v2.0 | Nexus Atlas | acmenexusfit.casa*
