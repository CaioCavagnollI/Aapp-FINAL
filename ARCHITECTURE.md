# ARCHITECTURE.md — Nexus Atlas

## Visão Geral

```
┌─────────────────────────────────────────────────┐
│                   CLIENTE                        │
│  iOS App  │  Android App  │  Web (Browser)       │
│           Expo (React Native)                    │
└─────────────────────┬───────────────────────────┘
                      │ HTTPS / REST API
                      ▼
┌─────────────────────────────────────────────────┐
│             BACKEND (Express / Node.js)          │
│  Port 5000  │  TypeScript  │  JWT Auth            │
│─────────────────────────────────────────────────│
│  /api/auth    │  /api/chat     │  /api/sessions   │
│  /api/user    │  /api/programs │  /api/scans       │
│  /api/admin   │  /api/research │  /api/payments    │
└──────────────────┬──────────────────────────────┘
                   │
         ┌─────────┴────────┐
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌──────────────────┐
│  PostgreSQL DB  │  │   External APIs  │
│  (Replit DB)    │  │  OpenAI, PubMed  │
│                 │  │  CrossRef,       │
│  Tables:        │  │  OpenAlex,       │
│  - users        │  │  Stripe, PIX     │
│  - programs     │  └──────────────────┘
│  - sessions     │
│  - session_ex   │
│  - clients      │
│  - prescriptions│
│  - scans        │
│  - user_files   │
│  - store_prod   │
│  - trainer_prof │
│  - exercises    │
│  - atlas_lib    │
└─────────────────┘
```

---

## Frontend Architecture

### Roteamento (Expo Router)

```
app/
├── _layout.tsx              # Root layout + providers
├── (auth)/
│   ├── _layout.tsx
│   └── index.tsx            # Login + Register
├── (tabs)/
│   ├── _layout.tsx          # Tab bar navigation
│   ├── index.tsx            # Dashboard (Hoje)
│   ├── treino.tsx           # Gestão de treinos
│   ├── atlas.tsx            # Atlas IA + Lab + Conteúdo
│   ├── scanner.tsx          # Scanner nutricional
│   ├── uploads.tsx          # Upload/gestão de arquivos
│   ├── prescrever.tsx       # Prescrições para clientes
│   ├── loja.tsx             # Marketplace
│   └── perfil.tsx           # Perfil + planos + config
└── (admin)/
    ├── _layout.tsx
    ├── login.tsx            # Login admin
    ├── index.tsx            # Painel admin
    ├── usuarios.tsx         # Gerenciar usuários
    ├── loja-mod.tsx         # Moderação da loja
    ├── integracoes.tsx      # Integrações e APIs
    ├── faturamento.tsx      # Pagamentos e planos
    └── arquivos.tsx         # Gerenciar arquivos
```

### State Management

```
┌─────────────────────────────────┐
│         React Contexts           │
│  AuthContext  │  AdminContext    │
│  (user/token) │  (admin/token)  │
└────────────────┬────────────────┘
                 │
┌────────────────▼────────────────┐
│       TanStack Query             │
│  Server state caching           │
│  Mutations + invalidation       │
│  queryKey: ['/api/...', id]     │
└─────────────────────────────────┘
                 │
┌────────────────▼────────────────┐
│      Component Local State      │
│  useState — forms, toggles, UI  │
└─────────────────────────────────┘
```

### Atlas Page Architecture (3-tab system)

```
AtlasScreen
├── Tab: Lab IA
│   ├── FlatList (inverted chat)
│   ├── Streaming via SSE
│   └── TextInput + Send
├── Tab: Conteúdo
│   ├── Categorias grid
│   ├── Editorial cards
│   └── Research card → PubMed link
└── Tab: Lab (Calculadoras)
    ├── Volume Calculator (sets×reps×load)
    ├── %1RM Calculator (Epley + Brzycki)
    ├── IMC Calculator (kg/m²)
    └── RPE/RIR Reference Table
```

---

## Backend Architecture

### Middlewares

```
Request
  → CORS check (whitelist Replit domains + localhost)
  → Body parsing (JSON + urlencoded)
  → Request logging
  → Route handler
    → authMiddleware (JWT verify)
    → adminMiddleware (HMAC token)
  → Error handler
  → Response
```

### API Routes Map

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | /api/auth/register | — | Criar conta |
| POST | /api/auth/login | — | Login |
| GET | /api/auth/me | JWT | Dados do usuário |
| PUT | /api/auth/plan | JWT | Atualizar plano |
| GET | /api/stats | JWT | Estatísticas do usuário |
| POST | /api/chat | — | Chat IA (SSE stream) |
| GET | /api/programs | JWT | Listar programas |
| POST | /api/programs | JWT | Criar programa |
| DELETE | /api/programs/:id | JWT | Excluir programa |
| GET | /api/sessions | JWT | Listar sessões |
| POST | /api/sessions | JWT | Criar sessão |
| GET | /api/clients | JWT | Listar clientes |
| POST | /api/clients | JWT | Criar cliente |
| GET | /api/user/files | JWT | Listar arquivos do usuário |
| POST | /api/user/upload | JWT | Upload de arquivo |
| DELETE | /api/user/files/:id | JWT | Excluir arquivo |
| GET | /api/research/pubmed | — | Buscar PubMed |
| GET | /api/research/crossref | — | Buscar CrossRef |
| GET | /api/research/openalex | — | Buscar OpenAlex |
| POST | /api/payments/create-checkout | JWT | Criar checkout Stripe |
| POST | /api/payments/webhook | — | Webhook Stripe |
| POST | /api/payments/pix | JWT | Gerar PIX |
| GET | /api/admin/files | ADMIN | Listar arquivos admin |
| POST | /api/admin/upload | ADMIN | Upload admin |
| DELETE | /api/admin/files/:name | ADMIN | Excluir arquivo admin |
| GET | /api/admin/users | ADMIN | Listar usuários |
| GET | /api/admin/billing/stats | ADMIN | Métricas de faturamento |

### Streaming (SSE)

O chat do Atlas usa Server-Sent Events para streaming em tempo real:

```
Client → POST /api/chat
Server → Content-Type: text/event-stream
         data: {"content": "chunk1"}\n\n
         data: {"content": "chunk2"}\n\n
         data: [DONE]\n\n
```

---

## Security

- **JWT** com expiração de 30 dias para usuários
- **HMAC-SHA256** para tokens admin (baseado em ADMIN_PASSWORD + SESSION_SECRET)
- **Bcrypt** (10 rounds) para hashing de senhas
- **Multer** com validação de tipo MIME e extensão
- **CORS** restrito a domínios Replit + localhost
- Dados sensíveis via variáveis de ambiente (nunca no código)

---

## Database Schema Summary

Ver `DATABASE_SCHEMA.md` para detalhes completos.

Tabelas principais:
- `users` — usuários, planos, admin flag
- `programs` — programas de treino
- `sessions` + `session_exercises` — registro de treinos
- `clients` + `prescriptions` — ferramentas de personal trainer
- `user_files` — arquivos enviados pelos usuários
- `store_products` + `trainer_profiles` — marketplace
- `scans` — histórico do scanner nutricional
- `exercises` + `atlas_library` — biblioteca científica

---

*Versão: 2.0.0 | Domínio: acmenexusfit.casa*
