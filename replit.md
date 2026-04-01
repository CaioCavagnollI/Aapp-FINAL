# Nexus — A Plataforma Científica do Treinamento de Força

**Powered by Atlas**

## Identidade
- **Nome**: Nexus
- **Slogan**: A Plataforma Científica do Treinamento de Força
- **Subtítulo**: Powered by Atlas
- **IA**: Atlas IA

## Stack
- **Frontend**: Expo (React Native) + Expo Router — arquivo base em `app/`
- **Backend**: Express + TypeScript em `server/`
- **Auth usuário**: JWT (30d), bcryptjs — rotas `/api/auth/*`
- **Auth admin**: HMAC token via `/api/admin/login`
- **Storage**: MemStorage em memória (`server/storage.ts`) — usuários reiniciam com o servidor
- **Schema**: Drizzle ORM + Zod em `shared/schema.ts`
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
| `navy` | `#0F2044` | Apoio institucional/técnico |
| `navyLight` | `#1B3460` | Apoio suave |

## Estrutura de Arquivos (Canônica)

```
app/
  _layout.tsx              # Root layout — providers, fonts, AuthGuard
  (tabs)/
    _layout.tsx            # 7 abas: Hoje, Treino, Atlas, Scanner, Prescrever, Loja, Perfil
    index.tsx              # Aba Hoje
    treino.tsx             # Aba Treino — programas, exercícios, performance
    atlas.tsx              # Aba Atlas — Atlas IA chat + conteúdo editorial
    scanner.tsx            # Aba Scanner — 4 tipos de scan
    prescrever.tsx         # Aba Prescrever — Nova, Clientes, Templates, Histórico
    loja.tsx               # Aba Loja — Planos, Programas, Conteúdo, Ferramentas
    perfil.tsx             # Aba Perfil — conta, preferências, admin, logout
  (admin)/
    _layout.tsx            # Admin layout
    index.tsx              # Painel admin — upload/gerenciamento de arquivos
    login.tsx              # Tela de login admin (username + password)
  (auth)/
    _layout.tsx            # Auth layout
    index.tsx              # Login/registro de usuário

contexts/
  AuthContext.tsx          # JWT auth do usuário — login, register, logout
  AdminContext.tsx         # Auth admin — auto-login na inicialização

components/
  ErrorBoundary.tsx        # Classe error boundary
  ErrorFallback.tsx        # UI de fallback para erros
  KeyboardAwareScrollViewCompat.tsx

constants/
  colors.ts                # Paleta oficial Nexus

lib/
  query-client.ts          # React Query + fetcher + getApiUrl()

server/
  index.ts                 # Servidor Express — CORS, body parsing, logging
  routes.ts                # Todas as rotas API
  storage.ts               # MemStorage — IStorage interface
  templates/landing-page.html

shared/
  schema.ts                # Schema Drizzle — tabela users, types InsertUser/User
```

## Credenciais Admin
- **Login**: `admin@nexus221177`
- **Senha**: `admin2211777_`
- Auto-login na inicialização (AdminContext)
- Overrideable por `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars

## Portas
- **Frontend (Expo)**: 8081
- **Backend (Express)**: 5000

## Variáveis de Ambiente Relevantes
| Variável | Uso |
|---|---|
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI via integração Replit |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | Base URL OpenAI |
| `JWT_SECRET` | Secret JWT (fallback: `nexusatlas-jwt-secret`) |
| `SESSION_SECRET` | Fallback p/ JWT e HMAC admin |
| `ADMIN_USERNAME` | Override usuário admin |
| `ADMIN_PASSWORD` | Override senha admin |

## API Routes

### Auth
- `POST /api/auth/register` — cria usuário
- `POST /api/auth/login` — login usuário, retorna JWT
- `GET /api/auth/me` — retorna usuário autenticado (Bearer token)

### Chat
- `POST /api/chat` — streaming SSE com Atlas IA

### Admin (requer x-admin-token)
- `POST /api/admin/login` — autentica admin, retorna token HMAC
- `GET /api/admin/files` — lista arquivos em `/uploads`
- `POST /api/admin/upload` — upload de arquivo (multer, max 50MB)
- `DELETE /api/admin/files/:filename` — exclui arquivo

## AsyncStorage Keys
- `nexusatlas_auth_token` — JWT do usuário
- `nexusatlas_auth_user` — objeto User serializado
- `nexusatlas_admin_token` — token HMAC do admin

## O que foi removido (consolidação)
- `app/(tabs)/chat.tsx` — duplicata do chat do atlas.tsx
- `app/(tabs)/programs.tsx` — aba antiga de programas
- `app/(tabs)/profile.tsx` — aba antiga de perfil (substituída por perfil.tsx)
- `server/replit_integrations/` — audio, batch, chat, image — código morto não registrado

## Residual Pendente
- **Stripe/billing**: integração de pagamento não implementada — botões de compra são visuais
- **Banco de dados real**: MemStorage não persiste entre reinicios
- **RLS/RBAC completo**: auth só no backend básico, sem row-level security
- **Scanner real**: leitura de código de barras ainda não implementada
- **Prescrições persistidas**: dados de clientes/templates são mock
- **Signed URLs para uploads**: upload admin é local sem CDN
