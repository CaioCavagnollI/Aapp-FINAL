# Nexus Atlas — Módulos do Sistema

---

## Módulo 1: Autenticação e Identidade

**Arquivos**: `contexts/AuthContext.tsx`, `contexts/AdminContext.tsx`, `app/(auth)/index.tsx`, `app/(admin)/login.tsx`

### Funcionalidades
- Registro de usuário com username e senha (bcryptjs)
- Login com JWT de 30 dias
- Plano do usuário embutido no JWT payload
- Admin auth com HMAC token separado
- Persistência em AsyncStorage
- Guards de rota (redireciona não-autenticados para /(auth))

### Endpoints
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/admin/login`

---

## Módulo 2: Dashboard

**Arquivo**: `app/(tabs)/index.tsx`

### Funcionalidades
- Saudação personalizada com nome do usuário
- Stats em tempo real (sessões, clientes, prescrições, streak)
- Volume total em kg com barra de progresso
- Cards de navegação para as 4 seções principais
- Quick access row (atalhos)
- Insight científico do dia (rotativo)
- Banner de chamada para anamnese

### Endpoints
- `GET /api/stats`

---

## Módulo 3: Atlas Brain

**Arquivo**: `app/(tabs)/atlas.tsx`

### Sub-módulos
| Sub-módulo | Descrição |
|---|---|
| Atlas Acadêmico | Chat GPT-4 streaming + busca acadêmica + análise de artigos |
| Prescrição Atlas | Anamnese multi-chip + geração IA streaming + salvar no banco |
| Atlas Tools | 8 calculadoras científicas |
| Acervo Atlas | Editoriais por categoria |

### Endpoints
- `POST /api/chat` (Atlas Acadêmico)
- `GET /api/research/pubmed`, `GET /api/research/crossref`, `GET /api/research/openalex`
- `POST /api/prescriptions/generate` (streaming)
- `POST /api/prescriptions`
- `GET /api/atlas-library`

---

## Módulo 4: Scanner

**Arquivo**: `app/(tabs)/scanner.tsx`

### Funcionalidades
- Câmera nativa via expo-camera
- Análise de imagem por IA (identificação de equipamentos/alimentos)
- Análise nutricional
- Histórico de scans

### Endpoints
- `POST /api/scans`
- `GET /api/scans`

---

## Módulo 5: Meus Treinos

**Arquivo**: `app/(tabs)/meus-treinos.tsx`

### Sub-módulos
| Sub-módulo | Descrição |
|---|---|
| Programas | CRUD completo, ativação de programa ativo |
| Sessões | Registro de sessões com duração e notas |
| Exercícios | Biblioteca com 20+ exercícios, filtro por músculo |
| Prescrições | Prescrições geradas por IA |

### Endpoints
- `GET/POST/PUT/DELETE /api/programs`
- `GET/POST /api/sessions`
- `GET /api/exercises`
- `GET /api/prescriptions`

---

## Módulo 6: Atlas Store

**Arquivo**: `app/(tabs)/loja.tsx` + `app/(tabs)/planos.tsx`

### Sub-módulos
| Sub-módulo | Descrição |
|---|---|
| Planos | 5 planos com comparativo e link para /planos |
| Produtos | Marketplace com 6 tipos de produtos |
| Mentores Atlas | Mentores verificados + Orientação Acadêmica |
| Vender | Publicar produto para moderação |
| Planos & Pagamentos | Página dedicada com checkout (Cartão/Pix/PayPal) |

### Endpoints
- `GET /api/store/products`
- `POST /api/store/products`
- `GET /api/trainer-profiles`
- `POST /api/payments/create-checkout`
- `POST /api/payments/pix`

---

## Módulo 7: Gerenciador de Arquivos

**Arquivo**: `app/(tabs)/uploads.tsx`

### Funcionalidades
- 6 pastas: Geral · IA/RAG · Atlas Market · Scanner · Editorial · Acadêmico
- Upload de PDF, DOCX, TXT, PNG, JPG, MP3, MP4
- Visualização por pasta
- Delete de arquivos
- Tamanho e data de upload

### Endpoints
- `GET /api/user/files`
- `POST /api/user/upload`
- `DELETE /api/user/files/:id`

---

## Módulo 8: Painel Administrativo

**Arquivo**: `app/(admin)/index.tsx`

### Sub-módulos
| Seção | Descrição |
|---|---|
| Visão Geral | KPIs: Usuários, Receita, Workspaces, Tenants |
| Analytics | Crescimento 30d, receita por plano, engajamento |
| Colaboradores | CRUD de usuários, change de plano |
| Workspaces | Espaços de trabalho (criar/listar/deletar) |
| Tenants | Organizações multi-tenant (criar/listar/deletar) |
| Billing | Faturamento centralizado por plano |
| Configurações | Info do sistema + ações de manutenção |

### Endpoints
- `GET /api/admin/metrics`
- `GET/POST/PUT/DELETE /api/admin/users`
- `GET/POST/PUT/DELETE /api/admin/workspaces`
- `GET/POST/PUT/DELETE /api/admin/tenants`
- `GET /api/admin/revenue`
- `GET/POST/DELETE /api/admin/files`

---

## Módulo 9: Temas (Dark/Light Mode)

**Arquivo**: `contexts/ThemeContext.tsx`

### Funcionalidades
- Toggle dark/light persistido em AsyncStorage
- Hook `useTheme()` disponível em todas as telas
- Paleta adaptativa via `constants/colors.ts`
- BlurView no iOS dark mode para tab bar
