# Nexus Atlas — Documento Mestre

**Versão**: 1.0.0 | **Data**: Abril 2026 | **Status**: Em Produção

---

## 1. Visão Geral

Nexus Atlas é uma plataforma SaaS de fitness científico multi-tenant com 5 módulos principais e painel administrativo organizacional completo. Construída com React Native/Expo no frontend e Express/TypeScript/PostgreSQL no backend, integra IA generativa, pesquisa acadêmica e prescrição personalizada.

---

## 2. Módulos Principais

### 2.1 Dashboard (index.tsx)
- Stats em tempo real da API `/api/stats`
- Cards de navegação para principais seções
- Acesso rápido (Atlas Brain, Scanner, Meus Treinos, Mentorias)
- Insights científicos do dia
- Chamada de anamnese

### 2.2 Atlas Brain (atlas.tsx)
**4 sub-seções:**
1. **Atlas Acadêmico** — Chat IA GPT-4 streaming + busca CrossRef/PubMed + análise de artigos
2. **Prescrição Atlas** — Anamnese completa → IA gera prescrição → salva no banco
3. **Atlas Tools** — 8 calculadoras: TMB/TDEE, 1RM, Macros, TSS, RPE/RIR, Periodização, Dose-Resposta, Centro de Pesquisa
4. **Acervo Atlas** — Editoriais científicos categorizados

### 2.3 Scanner (scanner.tsx)
- Câmera nativa para identificação de equipamentos e alimentos
- Análise nutricional por IA
- Histórico de scans salvo no banco

### 2.4 Meus Treinos (meus-treinos.tsx)
**4 abas:**
1. **Programas** — CRUD completo, ativação de programa
2. **Sessões** — Registro com duração e notas
3. **Exercícios** — Biblioteca (20+ pré-carregados), filtro por músculo, detalhes em modal
4. **Prescrições** — Prescrições IA com conteúdo completo

### 2.5 Atlas Store (loja.tsx)
**4 abas:**
1. **Planos** — Visualização + link para página de planos completa
2. **Produtos** — Programas, audiobooks, e-books, cursos, artigos
3. **Mentores Atlas** — Mentores verificados + Orientação Acadêmica
4. **Vender** — Formulário para publicar produtos

### 2.6 Planos & Pagamentos (planos.tsx)
- 5 planos com toggle mensal/anual
- Checkout modal com 3 métodos: Cartão, Pix, PayPal
- Tabela comparativa de recursos
- FAQ integrado

### 2.7 Painel Admin (admin/index.tsx)
**7 seções organizacionais:**
1. **Visão Geral** — KPIs: Usuários, Receita, Workspaces, Tenants, Sessões, Prescrições
2. **Analytics** — Gráfico de crescimento 30d, receita por plano, engajamento
3. **Colaboradores** — CRUD de usuários, alterar planos
4. **Workspaces** — Espaços de trabalho (criar, listar, excluir)
5. **Tenants** — Organizações multi-tenant (criar, listar, excluir)
6. **Billing** — Faturamento centralizado por plano
7. **Configurações** — Info do sistema, ações de manutenção

---

## 3. Arquitetura Técnica

### Backend
- **Framework**: Express 4 + TypeScript (tsx runtime)
- **DB**: PostgreSQL via `pg` library + pool
- **Auth**: JWT (30 dias, usuário) + HMAC token (admin)
- **IA**: OpenAI SDK (GPT-4, streaming com SSE)
- **Pesquisa**: PubMed E-utilities API, CrossRef API, OpenAlex API
- **Pagamentos**: Stripe API + Pix (chave configurável)
- **Arquivos**: Upload multipart + armazenamento no DB
- **Port**: 5000

### Frontend
- **Framework**: Expo 52 / React Native
- **Router**: Expo Router (file-based)
- **State**: React Query (@tanstack/react-query) + useState + AsyncStorage
- **Styling**: StyleSheet + LinearGradient + BlurView
- **Animações**: Reanimated 3
- **Keyboard**: react-native-keyboard-controller
- **Port**: 8081

### Database Tables
| Tabela | Propósito |
|---|---|
| users | Autenticação, plano, workspace/tenant |
| workspaces | Espaços de trabalho organizacionais |
| tenants | Organizações multi-tenant |
| programs | Programas de treino |
| sessions | Sessões de treino |
| session_exercises | Exercícios de cada sessão |
| clients | Clientes do treinador |
| prescriptions | Prescrições geradas por IA |
| scans | Scans de câmera |
| user_files | Arquivos do usuário (6 pastas) |
| store_products | Produtos da loja |
| trainer_profiles | Perfis de mentores |
| exercises | Biblioteca de exercícios |
| atlas_library | Editoriais e acervo científico |

---

## 4. Segurança

- Senhas com bcryptjs (salt rounds: 10)
- JWTs assinados com segredo de 64+ bytes
- Admin protegido por HMAC token único por sessão
- CORS configurado
- Uploads validados por tipo MIME
- Variáveis sensíveis via env vars

---

## 5. Multi-tenant

- Tabela `workspaces`: espaços de trabalho com limite de usuários
- Tabela `tenants`: organizações com limite de workspaces
- Usuários têm `workspace_id` e `tenant_id` opcionais
- Gerenciado pelo painel admin (seções Workspaces e Tenants)

---

## 6. Domínio e Deploy

- **Domínio**: acmenexusfit.casa
- **Deploy iOS**: Via Expo Launch (Replit)
- **Deploy backend**: Node.js em produção
- **Variáveis críticas**: `DATABASE_URL`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `PIX_KEY`
