# Nexus Atlas — Plataforma Científica do Treinamento de Força

> **Domínio:** acmenexusfit.casa  
> **Stack:** Expo (React Native) + Node.js Express + PostgreSQL  
> **Versão:** 2.0.0

---

## O que é o Nexus Atlas?

O Nexus Atlas é uma plataforma mobile-first de treinamento de força baseada em ciência. Desenvolvida para atletas e personal trainers que querem levar seus treinos ao próximo nível com dados, IA e evidências científicas.

### Recursos Principais

- **Atlas IA** — Chatbot especializado em fisiologia do exercício, periodização e nutrição esportiva (GPT-4o)
- **Lab** — Calculadoras científicas: Volume, %1RM, IMC, RPE/RIR
- **Scanner Nutricional** — Análise de alimentos por câmera e IA
- **Prescrição de Treino** — Geração automatizada de programas de treinamento personalizados
- **Biblioteca Científica** — Integração com PubMed, CrossRef e OpenAlex
- **Loja** — Marketplace de planos e e-books de treinamento
- **Uploads** — Importação e exportação de PDF, DOC, DOCX, PNG, JPEG
- **Painel Admin** — Gerenciamento completo de usuários, faturamento e integrações

---

## Tecnologias

### Frontend
- Expo (React Native) — iOS, Android, Web
- Expo Router (file-based routing)
- React Query (TanStack) — server state
- React Native Reanimated — animações
- Expo Document Picker — upload de arquivos
- Expo Haptics — feedback tátil

### Backend
- Node.js + Express (TypeScript)
- PostgreSQL + pool de conexões
- JWT Authentication
- Multer — upload de arquivos
- OpenAI SDK (GPT-4o / streaming)

### Integrações
- **OpenAI** — Atlas IA + análise nutricional
- **Stripe** — pagamentos com cartão (configurável)
- **PIX** — pagamentos instantâneos brasileiros
- **PubMed** — artigos científicos (NCBI eUtils)
- **CrossRef** — DOIs e publicações acadêmicas
- **OpenAlex** — base de dados open access

---

## Instalação Local

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com suas chaves

# 3. Iniciar o backend (porta 5000)
npm run server:dev

# 4. Iniciar o frontend (porta 8081)
npm run expo:dev
```

---

## Variáveis de Ambiente Necessárias

| Variável | Descrição | Obrigatório |
|---|---|---|
| `DATABASE_URL` | URL de conexão PostgreSQL | Sim |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | Chave da API OpenAI | Sim |
| `JWT_SECRET` | Secret para tokens JWT | Sim |
| `ADMIN_PASSWORD` | Senha do painel admin | Sim |
| `STRIPE_SECRET_KEY` | Chave secreta Stripe | Para pagamentos |
| `STRIPE_WEBHOOK_SECRET` | Secret webhook Stripe | Para pagamentos |
| `PIX_KEY` | Chave PIX da empresa | Para PIX |
| `SESSION_SECRET` | Secret da sessão | Sim |

---

## Estrutura de Planos

| Plano | Preço (BRL) | Preço (USD) |
|---|---|---|
| Free | Grátis | Free |
| Starter Mensal | R$ 29,90/mês | $5.99/mês |
| Starter Anual | R$ 239,90/ano | $47.90/ano |
| Pro Mensal | R$ 59,90/mês | $11.99/mês |
| Pro Anual | R$ 479,90/ano | $95.90/ano |
| Vitalício | R$ 997,00 | $199.00 |

---

## Publicação

### App Store (iOS)
Use o botão **Publicar** do Replit (Expo Launch) para submeter à App Store.

### Google Play (Android)
Gere o APK com `expo build:android` via EAS CLI.

### Web / API
Deploy via Replit Deployments — o backend serve em `acmenexusfit.casa`.

---

## Contribuição

Este projeto é proprietário. Para contribuir, entre em contato: **admin@acmenexusfit.casa**

---

*Nexus Atlas — Ciência no seu treino.*
