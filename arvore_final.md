# Nexus Atlas — Árvore de Arquivos Final

```
nexus-atlas/
├── app/
│   ├── _layout.tsx                    # Root layout (providers, fonts, auth guard)
│   ├── (auth)/
│   │   ├── _layout.tsx                # Auth stack layout
│   │   └── index.tsx                  # Tela de login/registro
│   ├── (tabs)/
│   │   ├── _layout.tsx                # Tab bar com 5 abas + hidden routes
│   │   ├── index.tsx                  # Dashboard — stats, cards, insights
│   │   ├── atlas.tsx                  # Atlas Brain — 4 sub-seções IA
│   │   ├── scanner.tsx                # Scanner — câmera + análise IA
│   │   ├── meus-treinos.tsx           # Meus Treinos — 4 abas
│   │   ├── loja.tsx                   # Atlas Store — 4 abas
│   │   ├── planos.tsx                 # Planos & Pagamentos — 5 planos
│   │   ├── perfil.tsx                 # Perfil do usuário (hidden)
│   │   ├── uploads.tsx                # Gerenciador de arquivos (hidden)
│   │   ├── treino.tsx                 # Treino rápido (hidden)
│   │   └── prescrever.tsx             # Prescrever clientes (hidden)
│   └── (admin)/
│       ├── _layout.tsx                # Admin stack layout
│       ├── index.tsx                  # Painel Admin — 7 seções
│       ├── login.tsx                  # Login admin
│       ├── usuarios.tsx               # Gestão de usuários (legacy)
│       ├── loja-mod.tsx               # Moderação da loja (legacy)
│       ├── arquivos.tsx               # Gerenciamento de arquivos (legacy)
│       ├── faturamento.tsx            # Faturamento (legacy)
│       └── integracoes.tsx            # Integrações (legacy)
│
├── components/
│   └── ErrorBoundary.tsx              # Error boundary global
│
├── contexts/
│   ├── AuthContext.tsx                # Auth usuário — JWT, plan, is_admin
│   ├── AdminContext.tsx               # Auth admin — HMAC token
│   └── ThemeContext.tsx               # Dark/light mode — AsyncStorage
│
├── constants/
│   └── colors.ts                      # Paleta de cores oficial
│
├── hooks/
│   └── useColors.ts                   # Hook para acessar cores do tema
│
├── lib/
│   └── query-client.ts               # React Query + fetcher + getApiUrl()
│
├── assets/
│   └── images/
│       ├── icon.png                   # Ícone do app (logo Nexus)
│       ├── logo.jpeg                  # Logo alternativo
│       ├── logo-glow.jpeg             # Logo com efeito glow
│       ├── logo-clean.jpeg            # Logo limpo (versão simples)
│       ├── splash-icon.png            # Splash screen
│       ├── favicon.png                # Favicon web
│       ├── android-icon-foreground.png
│       ├── android-icon-background.png
│       └── android-icon-monochrome.png
│
├── server/
│   ├── index.ts                       # Express setup + inicialização
│   ├── routes.ts                      # Todos os endpoints REST (~1200 linhas)
│   ├── storage.ts                     # CRUD functions PostgreSQL
│   ├── db.ts                          # Conexão + DDL de 14 tabelas
│   └── templates/
│       └── landing-page.html          # Landing page do backend (porta 5000)
│
├── attached_assets/                   # Logos e assets enviados pelo usuário
│   ├── WhatsApp_Image_*_1.jpeg        # Logo limpo (fundo preto, dourado)
│   ├── WhatsApp_Image_*_2.jpeg        # Logo variante
│   ├── WhatsApp_Image_*_glow.jpeg     # Logo com glow dourado
│   └── screenshot-*.png              # Screenshot de referência
│
├── app.json                           # Config Expo (bundle id, ícones, splash)
├── package.json                       # Dependências
├── tsconfig.json                      # TypeScript config
├── readme.md                          # README principal
├── master_doc.md                      # Documentação mestre
├── documento_mao.md                   # Guia do operador
├── architeture.md                     # Arquitetura do sistema
├── arvore_final.md                    # Árvore de arquivos (este arquivo)
├── modulos.md                         # Módulos do sistema
├── submodulos.md                      # Sub-módulos e componentes
└── replit.md                          # Contexto do projeto (Replit Agent)
```

---

## Contagem de Arquivos

| Categoria | Quantidade |
|---|---|
| Screens (app/) | 14 |
| Contexts | 3 |
| Server files | 4 |
| Documentation | 8 |
| Assets | 9 |
| **Total** | **~38 arquivos principais** |

---

## Rotas Expo Router

| Rota | Arquivo | Tipo |
|---|---|---|
| `/` | `(tabs)/index.tsx` | Tab |
| `/atlas` | `(tabs)/atlas.tsx` | Tab |
| `/scanner` | `(tabs)/scanner.tsx` | Tab |
| `/meus-treinos` | `(tabs)/meus-treinos.tsx` | Tab |
| `/loja` | `(tabs)/loja.tsx` | Tab |
| `/perfil` | `(tabs)/perfil.tsx` | Hidden |
| `/uploads` | `(tabs)/uploads.tsx` | Hidden |
| `/planos` | `(tabs)/planos.tsx` | Hidden |
| `/treino` | `(tabs)/treino.tsx` | Hidden |
| `/prescrever` | `(tabs)/prescrever.tsx` | Hidden |
| `/(admin)` | `(admin)/index.tsx` | Stack |
| `/(admin)/login` | `(admin)/login.tsx` | Stack |
| `/(auth)` | `(auth)/index.tsx` | Stack |
