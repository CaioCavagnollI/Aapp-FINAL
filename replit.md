# Fitversum Lab — replit.md

## Overview

**Fitversum Lab** is a science-based strength training mobile app built with Expo (React Native). It acts as an AI-powered coaching assistant that provides evidence-based workout prescriptions, periodization programs, and exercise science education — all delivered in Brazilian Portuguese.

The app is structured as a full-stack project running in a single Replit environment:
- A **React Native / Expo** frontend using file-based routing via Expo Router
- An **Express.js backend** serving as the API layer (chat, file management, admin)
- A **PostgreSQL database** managed via Drizzle ORM
- **OpenAI API** integration for the AI Lab chat feature

The target audience is strength athletes and coaches who want scientifically grounded training guidance. The app includes an admin panel for uploading knowledge base documents, a conversational AI assistant, curated training programs, and a user profile screen.

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK ~54 with `expo-router` ~6 for file-based navigation
- **Routing structure**:
  - `app/(tabs)/` — Main user-facing tabs: Home (`index`), AI Chat (`chat`), Programs (`programs`), Profile (`profile`)
  - `app/(admin)/` — Protected admin area: Login (`login`) and Admin Panel (`index`)
  - `app/_layout.tsx` — Root layout wrapping everything in providers
- **Tab bar**: Conditionally uses iOS native tabs (via `expo-router/unstable-native-tabs` and `expo-glass-effect`) on iOS with Liquid Glass support, and a classic Expo `Tabs` component on other platforms
- **Fonts**: Outfit font family (300–800 weight) loaded via `@expo-google-fonts/outfit`
- **Animations**: `react-native-reanimated` for fluid UI animations; `expo-haptics` for tactile feedback
- **State management**: TanStack React Query v5 (`@tanstack/react-query`) for server state / data fetching
- **Keyboard handling**: `react-native-keyboard-controller` with a platform-compatible wrapper (`KeyboardAwareScrollViewCompat`)
- **Error handling**: Class-based `ErrorBoundary` + `ErrorFallback` components for graceful crash UI

### Backend (Express.js)

- **Framework**: Express v5 (`express`)
- **Entry point**: `server/index.ts` — sets up CORS, JSON parsing, static file serving, and registers routes
- **Routes** (`server/routes.ts`):
  - `POST /api/admin/login` — Password-based admin auth returning an HMAC token
  - `POST /api/chat` — Streaming AI chat using OpenAI (with a fixed scientific system prompt in Portuguese)
  - `GET/POST/DELETE /api/admin/files` — File upload/management for the knowledge base (uses `multer` for multipart uploads)
  - Protected admin routes use a custom `adminMiddleware` that validates the HMAC token via `x-admin-token` header
- **Storage**: `server/storage.ts` currently uses an in-memory `MemStorage` class (not yet wired to PostgreSQL for users)
- **File uploads**: `multer` v2 handles document uploads to a local directory

### Database

- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema location**: `shared/schema.ts` (users table) and `shared/models/chat.ts` (conversations + messages tables)
- **Migrations**: Generated into `./migrations/` via `drizzle-kit push` / `drizzle-kit generate`
- **Connection**: Requires `DATABASE_URL` environment variable
- **Tables defined**:
  - `users` — id (UUID), username, password
  - `conversations` — id (serial), title, createdAt
  - `messages` — id (serial), conversationId (FK → conversations), role, content, createdAt
- **Note**: The Drizzle schema is defined but the Express routes and storage layer are not yet fully integrated with the DB (storage uses in-memory fallback)

### Authentication & Authorization

- **Admin auth**: Simple password-based system. The admin password is stored as an env var (`ADMIN_PASSWORD`). Login returns an HMAC-SHA256 token (signed with `SESSION_SECRET`). The token is stored client-side in `AsyncStorage` and sent via `x-admin-token` header on admin API calls.
- **Admin context**: `contexts/AdminContext.tsx` provides login/logout state to the React tree, persisting the token across sessions via `@react-native-async-storage/async-storage`
- **No user authentication**: Regular users have no login system yet

### AI Integration

- **Provider**: OpenAI (configurable base URL via `AI_INTEGRATIONS_OPENAI_BASE_URL`)
- **System prompt**: Fixed Portuguese-language prompt defining the AI as a strength training expert ("Lab IA do Fitversum")
- **Chat flow**: Streaming responses via the `/api/chat` endpoint; the frontend uses `fetch` with streamed text decoding
- **Knowledge base**: Admin can upload documents (PDF, etc.) that are intended to form the RAG knowledge base (file management routes exist; RAG pipeline not yet fully implemented)

### Networking & API Client

- **API URL resolution**: `lib/query-client.ts` builds the base URL from `EXPO_PUBLIC_DOMAIN` env var
- **Expo dev proxy**: Dev script sets `EXPO_PACKAGER_PROXY_URL` and `REACT_NATIVE_PACKAGER_HOSTNAME` to the Replit dev domain for Metro bundler
- **CORS**: The Express server allows origins matching `REPLIT_DEV_DOMAIN` and `REPLIT_DOMAINS` env vars, plus any `localhost` origin

### Design System

- **Color palette**: Dark theme only (`userInterfaceStyle: "dark"`). Gold (`#D4AF37`) as primary accent on near-black backgrounds (`#0B0B0C`). Defined in `constants/colors.ts`
- **Background**: `#0B0B0C` (splash + default background)
- **Gradients**: `expo-linear-gradient` used throughout for premium feel

---

## External Dependencies

### Core Mobile / UI
| Package | Purpose |
|---|---|
| `expo` ~54 | Core Expo SDK |
| `expo-router` ~6 | File-based navigation |
| `expo-blur` | Blur effects for tab bar on iOS |
| `expo-glass-effect` | iOS Liquid Glass tab bar |
| `expo-symbols` | SF Symbols for iOS tab icons |
| `expo-linear-gradient` | Gradient backgrounds and cards |
| `expo-haptics` | Haptic feedback |
| `expo-image` | Optimized image component |
| `expo-image-picker` | Camera roll / photo selection |
| `expo-document-picker` | File picking for admin uploads |
| `expo-location` | Location access (future use) |
| `react-native-reanimated` | Smooth animations |
| `react-native-gesture-handler` | Gesture support |
| `react-native-keyboard-controller` | Keyboard-aware scroll views |
| `@expo-google-fonts/outfit` | Outfit font family |

### Data & State
| Package | Purpose |
|---|---|
| `@tanstack/react-query` v5 | Server state management / caching |
| `@react-native-async-storage/async-storage` | Persistent local storage (admin token) |

### Backend
| Package | Purpose |
|---|---|
| `express` v5 | HTTP server and API routing |
| `multer` v2 | Multipart file upload handling |
| `openai` v6 | OpenAI API client (chat completions) |
| `drizzle-orm` | Type-safe PostgreSQL ORM |
| `drizzle-zod` | Schema validation from Drizzle tables |
| `pg` | PostgreSQL driver |
| `p-limit` / `p-retry` | Concurrency control / retry logic |

### Environment Variables Required
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API key |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | (Optional) Custom OpenAI-compatible base URL |
| `ADMIN_PASSWORD` | Admin panel password |
| `SESSION_SECRET` | HMAC signing secret for admin tokens |
| `EXPO_PUBLIC_DOMAIN` | Public domain for API URL resolution in the app |
| `REPLIT_DEV_DOMAIN` | Replit dev domain (auto-set by Replit) |
| `REPLIT_DOMAINS` | Replit production domains (auto-set by Replit) |