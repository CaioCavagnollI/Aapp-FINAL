# Nexus Atlas — Plataforma Científica do Treinamento de Força

**Powered by Atlas IA**

## Identidade
- **Nome**: Nexus Atlas
- **Slogan**: A Plataforma Científica do Treinamento de Força
- **IA**: Atlas IA (GPT-4 streaming via OpenAI)

## Stack
- **Frontend**: Expo (React Native) + Expo Router — `app/`
- **Backend**: Express + TypeScript — `server/`
- **Banco de Dados**: PostgreSQL via `DATABASE_URL`
- **Auth usuário**: JWT (30d), bcryptjs — `/api/auth/*`
- **Auth admin**: HMAC token via `/api/admin/login`
- **Storage**: PostgreSQL persistente (`server/storage.ts`)
- **Schema**: `server/db.ts` + `server/storage.ts`
- **Fontes**: Outfit (300–800) via `@expo-google-fonts/outfit`
- **Temas**: Light/Dark mode via `ThemeContext.tsx` (AsyncStorage persistente)

## Design — Paleta Oficial
| Token | Valor | Uso |
|---|---|---|
| `gold` | `#D4AF37` | Accent principal |
| `goldDark` | `#A8892B` | Gradiente escuro |
| `black` | `#0B0B0C` | Fundo base (dark) |
| `lightBg` | `#F5F5F7` | Fundo base (light) |
| `card` | `#111113` | Cards (dark) |
| `lightCard` | `#FFFFFF` | Cards (light) |

## Credenciais Admin
- **Login**: `admin@nexus221177`
- **Senha**: `admin2211777_`
- Plano: `vitalicio`, `is_admin: true`

## Estrutura de Abas (5+1)
```
(tabs)/
  _layout.tsx        # 5 tabs visíveis + hidden routes
  index.tsx          # Dashboard — stats, main pages, quick access, insights
  atlas.tsx          # Atlas Brain — 4 sub-seções
  scanner.tsx        # Scanner — câmera + análise IA
  meus-treinos.tsx   # Meus Treinos — 4 abas (Programas/Sessões/Exercícios/Prescrições)
  loja.tsx           # Atlas Store — Planos/Produtos/Mentores/Vender
  perfil.tsx         # Perfil — stats, configurações, toggle de tema (hidden)
  uploads.tsx        # Arquivos — 6 pastas: Geral/IA-RAG/Atlas Market/Scanner/Editorial/Acadêmico (hidden)
```

## Atlas Brain (atlas.tsx) — 4 Sub-Seções
1. **Atlas Acadêmico**: Chat IA streaming + Busca CrossRef/PubMed + Análise acadêmica
2. **Prescrição Atlas**: Anamnese com múltiplos chips → AI gera prescrição → salva no banco
3. **Atlas Tools**: TMB/TDEE (Mifflin-St Jeor), 1RM (Epley), Macros, TSS, RPE/RIR, Periodização, Dose-Resposta, Centro de Pesquisa
4. **Acervo Atlas**: Editoriais científicos categorizados

## Meus Treinos (meus-treinos.tsx) — 4 Abas
1. **Programas**: CRUD completo de programas de treino com ativação
2. **Sessões**: Registro de sessões com duração
3. **Exercícios**: Biblioteca com 20 exercícios pré-carregados, filtro por músculo/busca + detalhes
4. **Prescrições**: Prescrições geradas pela IA com conteúdo completo

## Atlas Store (loja.tsx) — 4 Abas
1. **Planos**: Free / Starter / Pro / Vitalício com checkout modal (Cartão/Pix/PayPal)
2. **Produtos**: Programas, Audiobooks, E-books, Cursos, Artigos — filtro por tipo
3. **Mentores Atlas**: Mentores verificados + card Orientação Acadêmica (DOCX/patches/tradução)
4. **Vender**: Publicar produtos na plataforma

## Arquivos (uploads.tsx) — 6 Pastas
- Geral · IA/RAG · Atlas Market · Scanner · Editorial · Acadêmico
- Suporte: PDF, DOCX, TXT, PNG, JPG, MP3, MP4
- Folder salvo no banco (coluna `folder` em `user_files`)

## API Endpoints Principais
```
POST   /api/auth/login          # Login usuário
POST   /api/auth/register       # Registro
GET    /api/stats               # Stats do usuário
GET    /api/programs            # Programas
POST   /api/programs            # Criar programa
PUT    /api/programs/:id/activate
DELETE /api/programs/:id
GET    /api/sessions            # Sessões
POST   /api/sessions            # Criar sessão
GET    /api/exercises           # Biblioteca de exercícios (20 pré-carregados)
GET    /api/prescriptions       # Prescrições
POST   /api/prescriptions/generate  # Gerar prescrição com IA (streaming)
GET    /api/store/products      # Produtos aprovados
POST   /api/store/products      # Publicar produto
GET    /api/user/files          # Listar arquivos (com folder)
POST   /api/user/upload         # Upload de arquivo (com folder)
DELETE /api/user/files/:id
GET    /api/research/pubmed     # Busca PubMed
GET    /api/research/crossref   # Busca CrossRef
GET    /api/research/openalex   # Busca OpenAlex
POST   /api/payments/create-checkout  # Stripe checkout
POST   /api/payments/pix        # Gerar Pix
POST   /api/admin/login         # Login admin
GET    /api/admin/users         # Admin: listar usuários
GET    /api/admin/metrics       # Admin: métricas
```

## Planos de Assinatura (v2 — Atualizado)
| Plano | Mensal | Anual | Acesso |
|---|---|---|---|
| free | R$ 0 | — | Básico (IA 5×/mês, Scanner 5×/dia, 1 programa) |
| pro_monthly / pro_annual | R$ 19 | R$ 190,90 | IA 50×, Scanner 50×, 10 clientes, 10 programas |
| pro_plus_monthly / pro_plus_annual | R$ 59,90 | R$ 590,90 | IA 500×, clientes ∞, mentorias, acadêmico, loja |
| university_monthly / university_annual | R$ 99,90 | R$ 899,90 | Pro+ + Editorial Pro + API + Multi-user |
| vitalicio | — | R$ 997 | Admin exclusivo — tudo ilimitado |

## Documentação Gerada
- `readme.md` — README principal
- `master_doc.md` — Documento mestre completo
- `documento_mao.md` — Guia do operador
- `architeture.md` — Arquitetura do sistema
- `arvore_final.md` — Árvore de arquivos
- `modulos.md` — Módulos do sistema
- `submodulos.md` — Sub-módulos e componentes
- `nexus-atlas-final.tar.gz` — Código fonte para download

## Tabelas do Banco
- users · programs · sessions · session_exercises · clients · prescriptions
- scans · user_files (+ folder) · store_products · trainer_profiles
- exercises · atlas_library
