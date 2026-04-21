# NEXUS_MASTER_DOC_ — Documento Mestre do Nexus Atlas

**Data:** Abril 2026  
**Versão:** 2.0.0  
**Produto:** Nexus Atlas — Plataforma Científica do Treinamento de Força  
**Domínio:** acmenexusfit.casa  
**Empresa:** Acme Nexus Fit

---

## SUMÁRIO EXECUTIVO

O Nexus Atlas é a plataforma mobile-first mais completa do Brasil para treinamento de força baseado em ciência. Combina inteligência artificial de última geração (OpenAI GPT-4o), ferramentas científicas práticas, pesquisa acadêmica integrada e uma comunidade de atletas e personal trainers.

A plataforma opera no modelo **freemium** com monetização via assinaturas (Stripe + PIX + PayPal) e marketplace de produtos digitais.

---

## VISÃO GERAL DO PRODUTO

### O que é

Uma super-app de treinamento que integra:
- **Atlas IA** — O assistente mais especializado em força do Brasil
- **Lab** — Calculadoras científicas profissionais
- **Scanner** — Análise nutricional por câmera com IA
- **Prescrever** — CRM + IA para personal trainers
- **Pesquisa Acadêmica** — PubMed, CrossRef, OpenAlex
- **Loja** — Marketplace de produtos e serviços fitness
- **Arquivos** — Gestão de documentos (PDF, DOC, DOCX, PNG, JPEG)

### Para quem

1. **Atletas e praticantes** que querem treinamento científico
2. **Personal trainers** que precisam de ferramentas profissionais
3. **Fisiculturistas e competidores** que buscam precisão máxima

---

## STACK TECNOLÓGICO COMPLETO

```
FRONTEND
├── Expo SDK 54 (React Native)
├── Expo Router v6 (file-based routing)
├── React Query (TanStack) — server state
├── React Native Reanimated v3 — animações
├── Expo Linear Gradient — UI
├── Expo Blur — glassmorphism iOS
├── Expo Document Picker — uploads
├── Expo Haptics — feedback tátil
├── Expo Barcode Scanner — scanner nutricional
├── Expo Google Fonts (Outfit) — tipografia
└── react-native-keyboard-controller — teclado

BACKEND
├── Node.js 22 + TypeScript
├── Express.js — HTTP server
├── PostgreSQL — banco de dados
├── Drizzle ORM + pg Pool
├── JWT (jsonwebtoken) — autenticação
├── Bcryptjs — hashing de senhas
├── Multer — upload de arquivos
└── OpenAI SDK — IA

INTEGRAÇÕES ATIVAS
├── OpenAI GPT-4o — Atlas IA + scanner
├── PubMed NCBI eUtils — pesquisa científica
├── CrossRef API — DOIs e publicações
├── OpenAlex API — base open access
├── Stripe (estruturado) — pagamentos
└── PIX (estruturado) — pagamentos Brasil

INTEGRAÇÕES PLANEJADAS
├── Google Gemini — IA alternativa
├── Strava API — importar atividades
├── Google Fit — dados de saúde
├── Garmin Connect — dispositivos
├── Resend — e-mails transacionais
├── Sentry — monitoramento de erros
└── PostHog — analytics de produto

INFRAESTRUTURA
├── Replit Deployments — hosting
├── acmenexusfit.casa — domínio customizado
├── SSL automático (Replit)
└── Expo Launch — publicação iOS
```

---

## ARQUITETURA DE TELAS

### Navegação Principal (Tabs)

| Tab | Nome | Funcionalidade |
|---|---|---|
| 1 | Hoje | Dashboard de progresso e dia ativo |
| 2 | Treino | Programas e registro de sessões |
| 3 | Atlas | IA + Lab + Conteúdo científico |
| 4 | Scanner | Scanner nutricional com câmera |
| 5 | Arquivos | Upload/gestão de documentos |
| 6 | Prescrever | CRM de clientes + prescrição IA |
| 7 | Loja | Marketplace de produtos |
| 8 | Perfil | Conta, planos, configurações |

### Admin Panel

| Módulo | Acesso | Descrição |
|---|---|---|
| Painel | Admin | Métricas e navegação central |
| Usuários | Admin | CRUD + upgrade de planos |
| Loja Mod | Admin | Moderação de produtos |
| Integrações | Admin | Status e config de APIs |
| Faturamento | Admin | Planos, Stripe, PIX |
| Arquivos | Admin | Upload e gestão de arquivos |

---

## MÓDULO: ATLAS IA

O coração intelectual da plataforma. O Atlas é alimentado pelo GPT-4o com um system prompt de 400+ tokens especializado em:

- Fisiologia do exercício e muscular
- Biomecânica e técnica de exercícios
- Periodização (linear, ondulatória, em blocos, DUP)
- Nutrição esportiva e timing de macros
- Recuperação, sono e prevenção de lesões
- Interpretação de pesquisas científicas

**Características técnicas:**
- Streaming em tempo real via SSE
- Context window de toda a conversa
- Indicador de digitação animado
- Respostas em português do Brasil

---

## MÓDULO: LAB (CALCULADORAS CIENTÍFICAS)

### v2.0 — Ferramentas disponíveis

#### 1. Calculadora de Volume
```
Volume Total = Séries × Repetições × Carga (kg)
Também mostra: Volume por série, Total de repetições
```

#### 2. Calculadora de %1RM (Estimativa)
```
Fórmulas usadas:
- Epley:   1RM = peso × (1 + reps/30)
- Brzycki: 1RM = peso × (36 / (37 − reps))
- Média das duas para maior precisão

Output: 1RM estimado + tabela de %: 90%, 85%, 80%, 75%, 70%, 65%, 60%
```

#### 3. Calculadora de IMC
```
IMC = Peso (kg) / Altura² (m)
Classificações: Abaixo, Normal, Sobrepeso, Obesidade I/II/III
```

#### 4. Tabela RPE/RIR
```
Referência completa de RPE 5-10 com RIR correspondente
Descrição qualitativa de cada nível
```

### Em breve no Lab
- Estimativa TDEE / Gasto Energético Total
- TSS (Training Stress Score)
- Calculadora de Deload
- Gerador de Periodização automática

---

## MÓDULO: PESQUISA CIENTÍFICA

### APIs Integradas

#### PubMed (NCBI eUtils)
- Busca em toda a base PubMed
- Retorna título, autores, periódico, data, link
- Endpoint: `GET /api/research/pubmed?query=...&max=10`

#### CrossRef
- Base de dados de DOIs e publicações acadêmicas
- Retorna DOI, título, autores, periódico, ano
- Endpoint: `GET /api/research/crossref?query=...&rows=10`

#### OpenAlex
- Maior base de dados científica open access
- Inclui contagem de citações e flag de acesso aberto
- Endpoint: `GET /api/research/openalex?query=...&per_page=10`

---

## MÓDULO: PAGAMENTOS

### Métodos Suportados

| Método | Processador | Moeda | Status |
|---|---|---|---|
| Cartão de Crédito | Stripe | BRL / USD | ✅ Estruturado |
| Cartão de Débito | Stripe | BRL | ✅ Estruturado |
| PIX | Direto | BRL | ✅ Estruturado |
| PayPal | PayPal | USD | 🔜 Em breve |
| Boleto | TBD | BRL | 🔜 Em breve |

### Tabela de Preços

| Plano | Mensal BRL | Anual BRL | USD/mês |
|---|---|---|---|
| Free | Grátis | Grátis | Free |
| Starter Mensal | R$ 29,90 | — | $5.99 |
| Starter Anual | — | R$ 239,90 | $3.99/mês |
| Pro Mensal | R$ 59,90 | — | $11.99 |
| Pro Anual | — | R$ 479,90 | $7.99/mês |
| Vitalício | R$ 997,00 | R$ 997,00 | $199.00 |

---

## MÓDULO: UPLOAD DE ARQUIVOS

### Para Usuários Comuns
- **Formatos:** PDF, DOC, DOCX, PNG, JPG, JPEG
- **Limite:** 50MB por arquivo
- **Acesso:** Aba "Arquivos" no menu principal
- **Isolamento:** Cada usuário vê apenas seus próprios arquivos

### Para Administradores
- **Formatos:** Qualquer tipo
- **Limite:** 50MB por arquivo
- **Acesso:** Admin → Arquivos
- **Funcionalidades:** Upload, listagem, busca, exclusão

---

## SEGURANÇA E COMPLIANCE

### Autenticação
- JWT com expiração de 30 dias
- Bcrypt com 10 rounds para senhas
- HMAC-SHA256 para token admin
- Refresh implícito em login

### Autorização
- Rotas protegidas por `authMiddleware` (JWT)
- Endpoints admin protegidos por `adminMiddleware` (HMAC token)
- Arquivos isolados por `user_id` no banco de dados
- Nenhum acesso cross-user possível

### Dados Sensíveis
- Senhas nunca armazenadas em plaintext
- Chaves de API via variáveis de ambiente
- Nenhum dado sensível no código-fonte
- HTTPS obrigatório em produção

---

## CONFIGURAÇÃO DE PRODUÇÃO

### Domínio
```
acmenexusfit.casa → Replit Deployment
```

### Configurar DNS
1. Adicione um CNAME: `acmenexusfit.casa` → `<replit-domain>`
2. Configure no Replit: Settings → Custom Domains

### Variáveis de Ambiente Obrigatórias
```
DATABASE_URL=<postgresql-production-url>
AI_INTEGRATIONS_OPENAI_API_KEY=sk-live-...
JWT_SECRET=<random-256-bit-secret>
SESSION_SECRET=<random-256-bit-secret>
ADMIN_PASSWORD=<senha-forte-unica>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PIX_KEY=<chave-pix-empresa>
NODE_ENV=production
```

---

## MÉTRICAS E KPIs

### Técnicas
- Uptime: ≥ 99.5%
- Latência API: < 500ms (p95)
- Primeiro byte streaming: < 1s
- App startup: < 3s

### Negócio
- MRR target (6 meses): R$ 50.000
- Usuários ativos: 10.000
- Conversão Free→Pago: 15%
- NPS: ≥ 60

---

## INFORMAÇÕES LEGAIS

**Empresa:** Acme Nexus Fit  
**Domínio:** acmenexusfit.casa  
**Suporte:** admin@acmenexusfit.casa  
**Política de Privacidade:** acmenexusfit.casa/privacidade  
**Termos de Uso:** acmenexusfit.casa/termos

---

## CHANGELOG v2.0.0

### Novos Recursos
- ✅ **Lab** — Calculadoras científicas (Volume, %1RM, IMC, RPE/RIR)
- ✅ **Uploads para Usuários** — PDF/DOC/DOCX/PNG/JPEG para todos os usuários
- ✅ **Admin: Faturamento** — Gestão de planos, Stripe, PIX, PayPal
- ✅ **Admin: Arquivos** — Página dedicada de gerenciamento de arquivos
- ✅ **Research APIs** — PubMed, CrossRef, OpenAlex integrados ao backend
- ✅ **Stripe + PIX** — Endpoints de pagamento estruturados
- ✅ **Admin Billing Stats** — Métricas de assinaturas e receita
- ✅ **DB: user_files** — Nova tabela para arquivos de usuários

### Melhorias
- Atlas agora tem 3 abas: Lab IA, Conteúdo, Lab
- Admin index com navegação para Faturamento e Arquivos
- Backend com suporte total a uploads por usuário com isolamento

---

*NEXUS_MASTER_DOC_ v2.0.0 | © 2026 Acme Nexus Fit | acmenexusfit.casa*
