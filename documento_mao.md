# Nexus Atlas — Documento na Mão (Guia Rápido do Operador)

**Para quem administra o Nexus Atlas no dia a dia.**

---

## Acesso Admin

1. Abra o app Nexus Atlas
2. Na tela de login, toque em **"Entrar como Admin"** (ícone de escudo no canto)
3. Usuário: `admin@nexus221177`
4. Senha: `admin2211777_`

---

## O Que Você Pode Fazer Como Admin

### Gerenciar Usuários
- Painel Admin → **Colaboradores**
- Troque o plano de qualquer usuário com o ícone de setas
- Delete usuários com o ícone de lixeira (admin não pode ser deletado)

### Gerenciar Planos
- Painel Admin → **Colaboradores** → Toque no ícone de swap em qualquer usuário
- Planos disponíveis: Free, Pro Mensal/Anual, Pro+ Mensal/Anual, University Mensal/Anual, Vitalício

### Criar Workspaces
- Painel Admin → **Workspaces** → Toque em "+ Novo"
- Preencha nome e descrição
- Workspaces organizam equipes dentro da plataforma

### Criar Tenants (Organizações)
- Painel Admin → **Tenants** → Toque em "+ Novo"
- Preencha nome, domínio e e-mail de faturamento
- Tenants são organizações maiores que contêm múltiplos workspaces

### Ver Receita
- Painel Admin → **Billing**
- Mostra receita estimada mensal, assinantes por plano

### Monitorar Métricas
- Painel Admin → **Visão Geral**
- KPIs em tempo real: usuários, workspaces, tenants, sessões, prescrições

---

## Publicar Conteúdo na Loja

1. Acesse **Atlas Store** → aba **Vender**
2. Preencha: nome, descrição, preço, categoria, link/contato
3. Tap **Publicar** — aguarda aprovação do admin
4. No painel admin: **Produtos da Loja** (via API `/api/admin/store/products`)

---

## Gerenciar Arquivos

- Usuários fazem upload em **Arquivos** (ícone de nuvem no perfil)
- 6 pastas: Geral · IA/RAG · Atlas Market · Scanner · Editorial · Acadêmico
- Admin vê todos os arquivos via API `/api/admin/files`

---

## Variáveis de Ambiente Necessárias

| Variável | O que é |
|---|---|
| `DATABASE_URL` | String de conexão PostgreSQL |
| `OPENAI_API_KEY` | Chave da API OpenAI (GPT-4) |
| `STRIPE_SECRET_KEY` | Chave secreta Stripe |
| `PIX_KEY` | Chave Pix para recebimento |
| `ADMIN_USERNAME` | Override do login admin (opcional) |
| `ADMIN_PASSWORD` | Override da senha admin (opcional) |
| `JWT_SECRET` | Segredo JWT (gerado automaticamente se ausente) |

---

## Emergências

### App sem resposta
- Reinicie o workflow "Start Backend"
- Reinicie o workflow "Start Frontend"

### Usuário não consegue fazer login
- Verifique se a conta existe: Painel Admin → Colaboradores
- Redefina o plano se necessário

### IA não responde
- Verifique se `OPENAI_API_KEY` está configurada
- Verifique o saldo/quota da conta OpenAI

---

## Contatos

- **Domínio**: acmenexusfit.casa
- **Admin**: admin@nexus221177
- **Suporte Técnico**: admin@nexus221177
