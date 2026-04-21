# Nexus Atlas — Arquitetura do Sistema

---

## Diagrama de Alto Nível

```
┌─────────────────────────────────────────────────────────┐
│                    NEXUS ATLAS                          │
│              acmenexusfit.casa                          │
├─────────────────────────────────────────────────────────┤
│  FRONTEND (Expo / React Native)   :8081                 │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │Dashboard │AtlasBrain│ Scanner  │MeusTreino│          │
│  ├──────────┴──────────┴──────────┴──────────┤          │
│  │   Atlas Store  │  Planos  │  Admin Panel  │          │
│  └──────────────────────────────────────────┘           │
├─────────────────────────────────────────────────────────┤
│  BACKEND (Express + TypeScript)   :5000                 │
│  ┌────────────────────────────────────────┐             │
│  │ Auth │ Users │ Programs │ Sessions     │             │
│  │ Exercises │ Prescriptions │ Scans      │             │
│  │ Store │ Files │ Admin │ Workspaces     │             │
│  │ Tenants │ Revenue │ AI (OpenAI)        │             │
│  │ Research (PubMed/CrossRef/OpenAlex)    │             │
│  │ Payments (Stripe/Pix)                 │             │
│  └────────────────────────────────────────┘             │
├─────────────────────────────────────────────────────────┤
│  DATABASE (PostgreSQL)                                  │
│  14 tabelas: users, workspaces, tenants,                │
│  programs, sessions, session_exercises,                  │
│  clients, prescriptions, scans, user_files,             │
│  store_products, trainer_profiles, exercises,            │
│  atlas_library                                          │
├─────────────────────────────────────────────────────────┤
│  SERVIÇOS EXTERNOS                                      │
│  • OpenAI API (GPT-4, streaming)                        │
│  • PubMed E-utilities API                               │
│  • CrossRef REST API                                    │
│  • OpenAlex API                                         │
│  • Stripe Payments API                                  │
└─────────────────────────────────────────────────────────┘
```

---

## Fluxo de Autenticação

```
Usuário → POST /api/auth/login
       ← JWT (30 dias)
       → Armazenado em AsyncStorage
       → AuthContext distribui user/plan/is_admin
       → authMiddleware valida em cada request protegido

Admin  → POST /api/admin/login
       ← adminToken (HMAC) + userToken (JWT)
       → AdminContext armazena adminToken
       → adminMiddleware valida via HMAC
```

---

## Fluxo de Prescrição IA

```
Usuário preenche Anamnese
    ↓
POST /api/prescriptions/generate
    ↓
Backend monta prompt (objetivo + músculo + restrições + local + frequência + nível)
    ↓
OpenAI GPT-4 (streaming SSE)
    ↓
Frontend lê stream chunk por chunk via expo/fetch getReader()
    ↓
Prescrição completa → POST /api/prescriptions (salva no banco)
    ↓
Aparece em Meus Treinos → Prescrições
```

---

## Fluxo de Pagamento

```
Usuário escolhe plano em /planos
    ↓
Seleciona método: Cartão | Pix | PayPal
    ↓
Cartão → POST /api/payments/create-checkout → Stripe checkout URL
Pix    → POST /api/payments/pix → QR Code gerado
PayPal → Redirecionamento externo
    ↓
Webhook Stripe (produção) → PUT /api/admin/users/:id/plan
    ↓
Usuário recebe plano atualizado no JWT no próximo login
```

---

## Fluxo Multi-tenant

```
Admin cria Tenant (organização)
    ↓
Admin cria Workspace dentro do tenant
    ↓
Admin associa usuários ao workspace (workspace_id)
    ↓
Usuários do mesmo workspace compartilham contexto
    ↓
Métricas agregadas no Billing do painel admin
```

---

## Layers da Aplicação

| Layer | Responsabilidade |
|---|---|
| **Contexts** | AuthContext, AdminContext, ThemeContext — estado global |
| **Screens** | Expo Router pages — UI e UX |
| **Components** | Componentes reutilizáveis (modal, card, input) |
| **lib/query-client** | React Query + fetcher global + getApiUrl() |
| **constants/colors** | Paleta de cores (dark/light mode) |
| **server/routes.ts** | REST API endpoints |
| **server/storage.ts** | CRUD functions — abstração do DB |
| **server/db.ts** | Conexão PostgreSQL + DDL das tabelas |

---

## Decisões de Arquitetura

1. **Expo Router** escolhido para roteamento baseado em arquivos (similar ao Next.js)
2. **React Query** para cache de server state — evita refetch desnecessário
3. **SSE/Streaming** para respostas de IA — melhor UX que wait-all
4. **PostgreSQL** com pool de conexões — suporta múltiplos usuários simultâneos
5. **JWT** de 30 dias com plano embutido no payload — reduz queries ao banco
6. **HMAC admin token** gerado por sessão — segurança extra para admin
7. **tsx runtime** no backend — TypeScript sem build step, mais rápido para dev
8. **BlurView** no iOS + fallback sólido no Android/Web — adaptação de plataforma
