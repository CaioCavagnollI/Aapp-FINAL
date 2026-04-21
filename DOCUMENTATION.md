# DOCUMENTATION.md — Nexus Atlas

## Guia Completo do Desenvolvedor e Usuário

---

## Índice

1. [Setup do Ambiente](#1-setup-do-ambiente)
2. [Autenticação](#2-autenticação)
3. [API Reference](#3-api-reference)
4. [Atlas IA e Lab](#4-atlas-ia-e-lab)
5. [Upload de Arquivos](#5-upload-de-arquivos)
6. [Pesquisa Científica](#6-pesquisa-científica)
7. [Pagamentos](#7-pagamentos)
8. [Painel Admin](#8-painel-admin)
9. [Variáveis de Ambiente](#9-variáveis-de-ambiente)
10. [Publicação](#10-publicação)

---

## 1. Setup do Ambiente

### Pré-requisitos
- Node.js 20+
- PostgreSQL 14+
- Expo CLI (`npm install -g expo-cli`)

### Instalação

```bash
git clone <repo>
cd nexus-atlas
npm install
```

### Configuração

Crie um arquivo `.env` na raiz:

```env
DATABASE_URL=postgresql://user:pass@host:5432/nexusatlas
AI_INTEGRATIONS_OPENAI_API_KEY=sk-...
JWT_SECRET=sua-chave-secreta-jwt
SESSION_SECRET=sua-session-secret
ADMIN_PASSWORD=senha-admin-segura
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PIX_KEY=sua-chave-pix
```

### Inicialização

```bash
# Terminal 1 — Backend
npm run server:dev   # http://localhost:5000

# Terminal 2 — Frontend
npm run expo:dev     # http://localhost:8081
```

---

## 2. Autenticação

### Fluxo de Login

```
POST /api/auth/register
Body: { username, password }
→ { token, user: { id, username, plan, is_admin } }

POST /api/auth/login
Body: { username, password }
→ { token, user: { id, username, plan, is_admin } }
```

### Usar o Token

Inclua em todas as requisições autenticadas:

```
Authorization: Bearer <jwt_token>
```

### Admin Token

Para endpoints admin, use:

```
x-admin-token: <hmac_token>
```

O token admin é gerado com: `HMAC-SHA256(ADMIN_PASSWORD, SESSION_SECRET)`

---

## 3. API Reference

### Usuário

```
GET  /api/auth/me          → dados do usuário
PUT  /api/auth/plan        → { plan: 'pro_monthly' }
GET  /api/stats            → { sessions, streak, volume }
```

### Programas de Treino

```
GET    /api/programs           → { programs: [...] }
POST   /api/programs           → { name, description, weeks, days_per_week, level, goal }
PUT    /api/programs/:id/activate
DELETE /api/programs/:id
```

### Sessões

```
GET    /api/sessions           → { sessions: [...] }
POST   /api/sessions           → { program_id, name, exercises: [{ exercise_name, sets, reps, weight_kg, rpe }] }
GET    /api/sessions/:id
DELETE /api/sessions/:id
```

### Clientes (Personal Trainer)

```
GET    /api/clients
POST   /api/clients            → { name, email, plan, notes }
PUT    /api/clients/:id
DELETE /api/clients/:id

GET    /api/prescriptions
POST   /api/prescriptions      → gera prescrição via IA
DELETE /api/prescriptions/:id
```

### Chat IA

```
POST /api/chat
Content-Type: application/json
Body: { messages: [{ role: "user", content: "..." }] }

→ SSE Stream:
data: {"content": "chunk"}
data: [DONE]
```

### Arquivos do Usuário

```
GET    /api/user/files         → { files: [...] }
POST   /api/user/upload        → multipart/form-data, campo "file"
DELETE /api/user/files/:id
```

**Formatos aceitos:** PDF, DOC, DOCX, PNG, JPG, JPEG  
**Tamanho máximo:** 50MB

---

## 4. Atlas IA e Lab

### Atlas IA (Lab IA)

O Atlas é alimentado pelo GPT-4o com um system prompt especializado em:
- Fisiologia do exercício
- Biomecânica e técnica
- Periodização (linear, ondulatória, blocos)
- Nutrição esportiva
- Recuperação e prevenção de lesões

O chat usa **Server-Sent Events (SSE)** para streaming em tempo real.

### Lab — Calculadoras

#### Volume Total

```
Volume Total = Séries × Repetições × Carga (kg)
```

#### Estimativa de 1RM

Usa a média das fórmulas de **Epley** e **Brzycki**:

```
Epley:   1RM = peso × (1 + reps / 30)
Brzycki: 1RM = peso × (36 / (37 − reps))
Média:   1RM = (Epley + Brzycki) / 2
```

A partir do 1RM estimado, calcula automaticamente as cargas para:
90%, 85%, 80%, 75%, 70%, 65%, 60%

#### IMC / Índice de Massa Corporal

```
IMC = Peso (kg) / Altura² (m)

< 18.5   → Abaixo do peso
18.5-24.9 → Peso normal
25.0-29.9 → Sobrepeso
30.0-34.9 → Obesidade grau I
35.0-39.9 → Obesidade grau II
≥ 40.0   → Obesidade grau III
```

#### Tabela RPE/RIR

| RPE | RIR | Descrição |
|---|---|---|
| 10 | 0 | Máximo absoluto |
| 9.5 | 0-1 | Quase máximo |
| 9 | 1 | Muito difícil |
| 8.5 | 1-2 | Difícil |
| 8 | 2 | Moderado-alto |
| 7 | 3 | Moderado |
| 6 | 4+ | Leve |
| 5 | 5+ | Aquecimento |

---

## 5. Upload de Arquivos

### Para Usuários

1. Acesse a aba **Arquivos** no menu principal
2. Toque no botão **+** no canto superior direito
3. Selecione um arquivo (PDF, DOC, DOCX, PNG ou JPEG)
4. O arquivo é enviado e listado automaticamente

**Via API:**

```bash
curl -X POST /api/user/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@documento.pdf"
```

### Para Admin

1. Acesse o **Painel Admin** → **Arquivos**
2. Clique em **Upload**
3. Aceita qualquer tipo de arquivo (sem restrição de formato)

**Via API:**

```bash
curl -X POST /api/admin/upload \
  -H "x-admin-token: <token>" \
  -F "file=@arquivo.zip"
```

---

## 6. Pesquisa Científica

### PubMed

```
GET /api/research/pubmed?query=hypertrophy+resistance+training&max=10

Resposta:
{
  "articles": [
    {
      "id": "37291234",
      "title": "...",
      "authors": "Smith J, Jones A...",
      "journal": "Journal of Strength and Conditioning Research",
      "pubdate": "2024 Mar",
      "url": "https://pubmed.ncbi.nlm.nih.gov/37291234/"
    }
  ]
}
```

### CrossRef

```
GET /api/research/crossref?query=1RM+estimation+formula&rows=5

Resposta:
{
  "articles": [
    {
      "doi": "10.1519/...",
      "title": "...",
      "authors": "...",
      "journal": "...",
      "year": 2023,
      "url": "https://doi.org/10.1519/..."
    }
  ]
}
```

### OpenAlex

```
GET /api/research/openalex?query=periodization+strength+training&per_page=5

Resposta:
{
  "articles": [
    {
      "id": "W2938...",
      "title": "...",
      "authors": "...",
      "journal": "...",
      "year": 2022,
      "citations": 145,
      "open_access": true,
      "url": "https://doi.org/..."
    }
  ]
}
```

---

## 7. Pagamentos

### Stripe (Cartão de Crédito/Débito)

```
POST /api/payments/create-checkout
Authorization: Bearer <token>
Body: { "plan": "pro_monthly" }

Resposta:
{
  "checkoutUrl": "https://buy.stripe.com/...",
  "plan": "pro_monthly",
  "amount": 59.90,
  "currency": "BRL"
}
```

**Configuração necessária:**
- `STRIPE_SECRET_KEY=sk_live_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`

### PIX

```
POST /api/payments/pix
Authorization: Bearer <token>
Body: { "plan": "starter_monthly" }

Resposta:
{
  "pixKey": "admin@acmenexusfit.casa",
  "amount": 29.90,
  "description": "Nexus Fit — Plano starter_monthly"
}
```

**Configuração necessária:**
- `PIX_KEY=sua-chave-pix`

### Webhook Stripe

```
POST /api/payments/webhook
stripe-signature: <assinatura>
Body: <evento Stripe>
```

Configure o webhook no Dashboard Stripe para:
`https://acmenexusfit.casa/api/payments/webhook`

---

## 8. Painel Admin

### Acesso

1. Acesse **Perfil** → rolar até o final → botão Admin (escondido)
2. Digite a senha admin (`ADMIN_PASSWORD`)
3. Você tem acesso ao painel completo

### Módulos Admin

| Módulo | Rota | Descrição |
|---|---|---|
| Painel | `/admin` | Métricas e navegação |
| Usuários | `/admin/usuarios` | CRUD usuários, upgrade de planos |
| Loja Mod | `/admin/loja-mod` | Aprovar/rejeitar produtos |
| Integrações | `/admin/integracoes` | Status das APIs |
| Faturamento | `/admin/faturamento` | Planos, métodos, Stripe/PIX config |
| Arquivos | `/admin/arquivos` | Upload e gestão de arquivos |

### Elevação de Usuário para Admin

Via API:
```bash
curl -X PUT /api/admin/users/:id/plan \
  -H "x-admin-token: <token>" \
  -d '{"plan": "vitalicio"}'
```

---

## 9. Variáveis de Ambiente

| Variável | Tipo | Descrição | Padrão |
|---|---|---|---|
| `DATABASE_URL` | string | Conexão PostgreSQL | — |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | secret | API Key OpenAI | — |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | string | Base URL OpenAI | padrão OpenAI |
| `JWT_SECRET` | secret | Chave para JWTs | — |
| `SESSION_SECRET` | secret | Secret de sessão | — |
| `ADMIN_PASSWORD` | secret | Senha admin | `admin2211777_` |
| `STRIPE_SECRET_KEY` | secret | Chave Stripe prod | — |
| `STRIPE_WEBHOOK_SECRET` | secret | Secret webhook Stripe | — |
| `PIX_KEY` | string | Chave PIX | — |
| `NODE_ENV` | string | `development` / `production` | `development` |
| `PORT` | number | Porta do servidor | `5000` |

---

## 10. Publicação

### iOS (App Store)

Use o botão **Publicar** no Replit (Expo Launch):

1. Certifique-se que `app.json` está correto
2. Clique em **Publicar** no Replit
3. Expo Launch compila e submete automaticamente

### Android (Google Play)

```bash
npx eas build --platform android --profile production
npx eas submit --platform android
```

### Web / API

Deploy via **Replit Deployments**:

1. Clique em **Deploy** no Replit
2. O backend fica disponível em `acmenexusfit.casa`
3. Configure seu domínio no Replit → Custom Domain

### Checklist Pre-Publicação

- [ ] `ADMIN_PASSWORD` definido e seguro
- [ ] `JWT_SECRET` aleatório e longo
- [ ] `DATABASE_URL` aponta para banco de produção
- [ ] `STRIPE_SECRET_KEY` com chave live (não test)
- [ ] `STRIPE_WEBHOOK_SECRET` configurado
- [ ] `PIX_KEY` com chave PIX real
- [ ] Domínio `acmenexusfit.casa` apontando para Replit
- [ ] SSL ativo (automático no Replit)

---

*DOCUMENTATION.md v2.0 | Nexus Atlas | acmenexusfit.casa*
