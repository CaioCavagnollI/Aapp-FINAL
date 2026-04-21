# Nexus — A Plataforma Científica do Treinamento de Força

**Powered by Atlas IA**

## Identidade
- **Nome**: Nexus
- **Slogan**: A Plataforma Científica do Treinamento de Força
- **Subtítulo**: Powered by Atlas IA
- **IA**: Atlas IA (GPT-4.1 streaming)

## Stack
- **Frontend**: Expo (React Native) + Expo Router — arquivo base em `app/`
- **Backend**: Express + TypeScript em `server/`
- **Banco de Dados**: PostgreSQL via `DATABASE_URL` — 9 tabelas (users, programs, exercises, sessions, session_exercises, clients, prescriptions, scans, user_files)
- **Auth usuário**: JWT (30d), bcryptjs — rotas `/api/auth/*`
- **Auth admin**: HMAC token via `/api/admin/login`
- **Storage**: PostgreSQL persistente (`server/storage.ts`)
- **Schema**: `server/db.ts` + `server/storage.ts`
- **Fontes**: Outfit (300–800) via `@expo-google-fonts/outfit`

## Design — Paleta Oficial
| Token | Valor | Uso |
|---|---|---|
| `gold` | `#D4AF37` | Accent principal |
| `goldDark` | `#A8892B` | Gradiente escuro |
| `goldLight` | `#E8CC6A` | Destaque suave |
| `black` | `#0B0B0C` | Fundo base |
| `card` | `#111113` | Cards |
| `cardElevated` | `#18181A` | Cards elevados |
| `border` | `#232327` | Bordas |
| `muted` | `#6B6B75` | Texto secundário |
| `text` | `#FFFFFF` | Texto principal |
| `textSecondary` | `#A1A1AA` | Texto de suporte |

## Estrutura de Arquivos (Canônica)

```
app/
  _layout.tsx              # Root layout — providers, fonts, AuthGuard
  (tabs)/
    _layout.tsx            # 7 abas: Hoje, Treino, Atlas, Scanner, Prescrever, Loja, Perfil
    index.tsx              # Aba Hoje — stats reais da API /api/stats
    treino.tsx             # Aba Treino — programas e sessões reais do banco
    atlas.tsx              # Aba Atlas — Atlas IA chat streaming
    scanner.tsx            # Aba Scanner — câmera nativa + análise nutricional IA
    prescrever.tsx         # Aba Prescrever — clientes reais + geração IA streaming
    loja.tsx               # Aba Loja — Starter 19/190, Pro 99/990, Vitalício (admin)
    perfil.tsx             # Aba Perfil — dados reais, plano, admin badge
  (admin)/
    _layout.tsx            # Admin layout
    index.tsx              # Painel admin
    login.tsx              # Login admin (sincroniza AuthContext)
  (auth)/
    _layout.tsx            # Auth layout
    index.tsx              # Login/registro de usuário

contexts/
  AuthContext.tsx          # JWT auth — user, plan, is_admin, isPro, isVitalicio
  AdminContext.tsx         # Auth admin — login retorna userToken p/ AuthContext

server/
  db.ts                    # Conexão PostgreSQL + 8 tabelas DDL
  storage.ts               # CRUD completo para todas entidades
  routes.ts                # REST APIs: auth, stats, programs, sessions, clients,
                           #   prescriptions (+ streaming IA), scans, admin
  index.ts                 # Express setup
  templates/landing-page.html

lib/
  query-client.ts          # React Query + fetcher + getApiUrl()
```

## Credenciais Admin
- **Login**: `admin@nexus221177`
- **Senha**: `admin2211777_`
- Plano: `vitalicio`, `is_admin: true`
- Overrideable por `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars

## Planos de Assinatura
| Plano | Mensal | Anual | Acesso |
|---|---|---|---|
| Starter | R$ 19/mês | R$ 190/ano | Atlas IA básico, 5 clientes |
| Pro Nexus | R$ 99/mês | R$ 990/ano | Atlas IA avançado, 20 clientes |
| Vitalício Nexus | — | — | Admin exclusivo, tudo ilimitado |

## Portas
- **Frontend (Expo)**: 8081
- **Backend (Express)**: 5000

## Variáveis de Ambiente Relevantes
| Variável | Uso |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI via integração Replit |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | Base URL OpenAI |
| `JWT_SECRET` | Secret JWT |
| `ADMIN_USERNAME` | Override usuário admin |
| `ADMIN_PASSWORD` | Override senha admin |

## API Routes

### Auth
- `POST /api/auth/register` — cria usuário
- `POST /api/auth/login` — login usuário, retorna JWT + user (com plan/is_admin)
- `GET /api/auth/me` — retorna usuário autenticado
- `PATCH /api/auth/plan` — atualiza plano do usuário

### Stats
- `GET /api/stats` — estatísticas do usuário (sessões, volume, sequência, prescrições)

### Programas
- `GET /api/programs` — lista programas do usuário
- `POST /api/programs` — cria programa

### Sessões
- `GET /api/sessions` — lista sessões do usuário
- `POST /api/sessions` — registra sessão

### Clientes
- `GET /api/clients` — lista clientes
- `POST /api/clients` — adiciona cliente

### Prescrições
- `GET /api/prescriptions` — lista prescrições
- `POST /api/prescriptions` — salva prescrição
- `POST /api/prescriptions/generate` — geração streaming com Atlas IA

### Scans
- `GET /api/scans` — histórico de scans
- `POST /api/scans` — analisa produto com IA

### Admin (requer x-admin-token)
- `POST /api/admin/login` — autentica, retorna token + userToken JWT
- `GET /api/admin/files` — lista arquivos
- `POST /api/admin/upload` — upload (multer, max 50MB)
- `DELETE /api/admin/files/:filename` — exclui arquivo

## AsyncStorage Keys
- `nexusatlas_auth_token` — JWT do usuário
- `nexusatlas_auth_user` — objeto User serializado
- `nexusatlas_admin_token` — token HMAC do admin

## RevenueCat (PENDENTE)
- Integração RevenueCat foi recusada pelo usuário
- Pacotes instalados: `react-native-purchases`, `@replit/revenuecat-sdk`
- Para configurar: o usuário precisa autorizar a integração RevenueCat no Replit
- Tela Loja mostra preços corretos mas checkout mostra mensagem "em breve"
- Para retomar: ler `.local/skills/revenuecat/SKILL.md` e executar seed script
- NOTA: NÃO usar Stripe — RevenueCat é o método correto para app mobile
