# Nexus — replit.md

## Overview

**Nexus** — *A Plataforma Científica do Treinamento de Força* — is a premium science-based strength training mobile app built with Expo (React Native) and an Express.js backend. The AI engine is branded **Atlas IA** (*Powered by Atlas*). All UI is in Brazilian Portuguese (PT-BR).

The app is structured as a full-stack project running in a single Replit environment:
- A **React Native / Expo** frontend using file-based routing via Expo Router
- An **Express.js backend** serving as the API layer (auth, chat, file management, admin)
- **OpenAI API** integration (via Replit AI Integrations) for Atlas IA streaming chat

---

## Branding

| Field | Value |
|---|---|
| App name | **Nexus** |
| Slogan | A Plataforma Científica do Treinamento de Força |
| Subtitle | Powered by Atlas |
| AI engine | Atlas IA |
| Language | PT-BR (Brazilian Portuguese) |
| Colors | Gold `#D4AF37` / Black `#0B0B0C` |

---

## User Preferences

Preferred communication style: Simple, everyday language. PT-BR throughout.

---

## Navigation — 7 Tabs

| Tab | Screen | Route |
|---|---|---|
| Hoje | Dashboard diário | `app/(tabs)/index.tsx` |
| Treino | Programas e sessões | `app/(tabs)/treino.tsx` |
| Atlas | Atlas IA + Conteúdo científico | `app/(tabs)/atlas.tsx` |
| Scanner | Scanner de códigos e nutrição | `app/(tabs)/scanner.tsx` |
| Prescrever | Prescrições para clientes | `app/(tabs)/prescrever.tsx` |
| Loja | Planos, programas, conteúdo | `app/(tabs)/loja.tsx` |
| Perfil | Conta, configurações, admin | `app/(tabs)/perfil.tsx` |

Hidden (legacy, href:null): `chat`, `programs`, `profile`

---

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK ~54 with `expo-router` ~6 for file-based navigation
- **Routing structure**:
  - `app/(tabs)/` — 7-tab main navigation (Hoje, Treino, Atlas, Scanner, Prescrever, Loja, Perfil)
  - `app/(auth)/` — Login/Register screen (`index.tsx`)
  - `app/(admin)/` — Protected admin area: Login (`login`) and Panel (`index`)
  - `app/_layout.tsx` — Root layout with AuthGuard + AdminProvider + AuthProvider
- **Auth guard**: `components/AuthGuard.tsx` using `useSegments` + `useRouter` for route protection
- **Fonts**: Outfit font family (300–800 weight) via `@expo-google-fonts/outfit`
- **Animations**: `react-native-reanimated` + `expo-haptics` for haptic feedback
- **State management**: TanStack React Query v5 for server state; React Context for auth/admin state
- **Keyboard handling**: `react-native-keyboard-controller`

### Backend (Express.js)

- **Entry point**: `server/index.ts`
- **Routes** (`server/routes.ts`):
  - `POST /api/auth/register` — User registration (bcryptjs hashed password, JWT issued)
  - `POST /api/auth/login` — User login → JWT (30d expiry)
  - `GET /api/auth/me` — Validate JWT, return user info
  - `POST /api/admin/login` — Admin auth. Default password: `admin2211777_`. Returns HMAC token.
  - `POST /api/chat` — Streaming Atlas IA chat (OpenAI)
  - `GET/POST/DELETE /api/admin/files` — Knowledge base file management (multer)
- **Storage**: `server/storage.ts` — in-memory `MemStorage` for users
- **File uploads**: `multer` v2 → `./uploads/` directory

### Authentication & Authorization

- **User auth**: JWT-based. `bcryptjs` for hashing. 30-day token expiry. Stored in `AsyncStorage` via `contexts/AuthContext.tsx`.
- **Admin auth**: Password HMAC-SHA256 token. Default password: `admin2211777_`. Auto-login on app start (no manual login needed). Stored via `contexts/AdminContext.tsx`.
- **Route protection**: `AuthGuard` component in root layout redirects unauthenticated users to `/(auth)`.

### Admin Credentials

| Field | Value |
|---|---|
| Login identifier | `admin@nexus.atlas221177` |
| Password | `admin2211777_` |
| Auto-login | Yes (AdminContext auto-logs in on startup) |

### Plano Vitalício Nexus

- Featured in `app/(tabs)/loja.tsx` as the premium plan
- Price: R$ 997 (or 12x R$ 97)
- Includes: Atlas IA ilimitado, todos os programas, scanner avançado, prescrições ilimitadas

### AI Integration

- **Engine**: Atlas IA (powered by OpenAI via Replit AI Integrations)
- **System prompt**: Portuguese-language prompt defining the AI as Nexus platform's Atlas IA — specialized strength training science assistant
- **Chat flow**: Streaming SSE via `/api/chat`; decoded on frontend with `expo/fetch`

### Design System

- **Theme**: Dark only (`userInterfaceStyle: "dark"`)
- **Primary accent**: Gold `#D4AF37` / Dark Gold `#A8892B`
- **Background**: `#0B0B0C`
- **Cards**: `#111113` / `#18181A`
- **Border**: `#232327`
- **Muted**: `#6B6B75`
- **Gradients**: `expo-linear-gradient` throughout
- **Font**: Outfit (300/400/500/600/700/800)

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API key (Replit AI Integration) |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI-compatible base URL |
| `ADMIN_PASSWORD` | Admin password override (default: `admin2211777_`) |
| `SESSION_SECRET` | HMAC signing secret for admin tokens |
| `JWT_SECRET` | JWT signing secret for user auth |
| `EXPO_PUBLIC_DOMAIN` | Public domain for API URL resolution |
| `REPLIT_DEV_DOMAIN` | Replit dev domain (auto-set) |
| `REPLIT_DOMAINS` | Replit production domains (auto-set) |
