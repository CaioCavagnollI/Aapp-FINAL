# Nexus Atlas — Sub-módulos e Componentes

---

## Sub-módulos do Atlas Brain

### 1. Atlas Acadêmico (Chat IA)

**Componente**: `AtlasAcademico` dentro de `atlas.tsx`

| Elemento | Descrição |
|---|---|
| Chat List | FlatList invertida com mensagens IA + usuário |
| Input | TextInput com send button e streaming state |
| Streamer | `expo/fetch` getReader() para chunks de texto |
| Busca CrossRef | Campo de busca + FlatList de resultados com DOI |
| Busca PubMed | Integração com E-utilities API |
| Analisar Artigo | Modal de análise com URL ou texto do artigo |

**Chips de contexto rápido**: Hipertrofia, Força, Cardio, Nutrição, Recuperação, Periodi., Biomecânica

---

### 2. Prescrição Atlas (Anamnese)

**Componente**: `AtlasPrescrição` dentro de `atlas.tsx`

| Campo | Tipo | Opções |
|---|---|---|
| Objetivo | Multi-chip | Hipertrofia, Força, Resistência, Emagrecimento, Saúde, Performance, Funcional, Reabilitação |
| Foco Muscular | Multi-chip | Peito, Costas, Pernas, Ombros, Bíceps, Tríceps, Core, Glúteos, Posterior |
| Restrições | Multi-chip | Nenhuma, Lesão ombro, Lombar, Joelho, Cervical, Cardíaco, Hipertensão, Diabetes |
| Local | Single-chip | Academia, Casa sem equipamento, Casa com equipamento, Ar livre |
| Frequência | Single-chip | 2×, 3×, 4×, 5×, 6× por semana |
| Dias de treino | Single-chip | 2 a 6 dias |
| Duração sessão | Single-chip | 30min a 90min+ |
| Nível | Single-chip | Iniciante, Intermediário, Avançado, Atleta |

**Output**: Streaming do GPT-4 → Prescrição salva no banco

---

### 3. Atlas Tools (Calculadoras)

| Calculadora | Fórmula | Inputs |
|---|---|---|
| TMB/TDEE | Mifflin-St Jeor | Peso, Altura, Idade, Sexo, Nível atividade |
| 1RM | Epley (1+reps/30) | Peso, Repetições → tabela 50-100% |
| Macros | Baseado no TDEE | % proteína, carboidrato, gordura |
| TSS | Training Stress Score | Duração, IF, FTP |
| RPE/RIR | Tabela de correlação | — |
| Periodização | 4 modelos | Linear, Ondulatório, por Bloco, ATG |
| Dose-Resposta | Gráfico por volume | Iniciante → Avançado |
| Centro de Pesquisa | Link PubMed/CrossRef | Busca por termo |

---

### 4. Acervo Atlas (Editoriais)

**Categorias**: Hipertrofia · Força · Nutrição · Recuperação · Metodologia · Biomecânica

**Ações**: Filtrar por categoria · Criar novo editorial (admin) · Busca textual

---

## Sub-módulos de Meus Treinos

### Biblioteca de Exercícios

**20 exercícios pré-carregados** agrupados por grupo muscular:

| Músculo | Exercícios |
|---|---|
| Quadríceps | Agachamento Livre, Leg Press, Cadeira Extensora, Afundo |
| Peitoral | Supino Reto, Supino Inclinado, Crucifixo |
| Dorsal | Barra Fixa, Remada Curvada, Pulldown |
| Isquiotibiais | Mesa Flexora, Stiff |
| Deltóide | Desenvolvimento, Elevação Lateral |
| Bíceps | Rosca Direta |
| Tríceps | Tríceps Testa |
| Lombar | Levantamento Terra |
| Core | Prancha, Abdominal Supra |
| Gastrocnêmio | Panturrilha em Pé |

**Filtros disponíveis**: Todos · Quadríceps · Peitoral · Dorsal · Isquiotibiais · Deltóide · Bíceps · Tríceps · Lombar · Core · Gastrocnêmio

---

## Sub-módulos da Atlas Store

### Tipos de Produtos
- Programa de Treino
- Audiobook
- E-book
- Curso Online
- Artigo Científico
- Suplemento/Produto Físico

### Mentores Atlas
- Card de orientação acadêmica (DOCX, patches, tradução)
- Mentores verificados com bio, especialidades, preço/mês, contato
- CTA de contato direto

---

## Componentes Reutilizáveis (inline nos arquivos)

| Componente | Arquivo | Propósito |
|---|---|---|
| `StatCard` | `admin/index.tsx` | Card de KPI com gradiente |
| `SectionHeader` | `admin/index.tsx` | Header de seção com action button |
| `PlanBadge` | `admin/index.tsx` | Badge colorida de plano |
| `GrowthBar` | `admin/index.tsx` | Gráfico de barras simples |
| `PlanCard` | `planos.tsx` | Card completo de plano com preço e features |
| `TabIcon` | `(tabs)/_layout.tsx` | Ícone de tab com Ionicons |
| `FileCard` | `uploads.tsx` | Card de arquivo com ícone por extensão |
| `ErrorBoundary` | `components/` | Fallback para erros de crash |

---

## Fluxo de Dados por Funcionalidade

### Streaming de Chat
```
User input → TextInput.onSubmit
→ fetch('expo/fetch') com ReadableStream
→ getReader().read() loop
→ setMessages() chunk por chunk
→ useRef para scroll automático
```

### Upload de Arquivo
```
DocumentPicker.getDocumentAsync()
→ FormData append (file + folder)
→ POST /api/user/upload (multipart)
→ Backend salva no DB (filename, original_name, size, mime_type, ext, folder)
→ React Query invalidate ['user-files']
```

### Anamnese → Prescrição
```
Multi-chip selections stored in useState arrays
→ Gerar Prescrição pressed
→ POST /api/prescriptions/generate (streaming SSE)
→ Content chunks displayed in real-time
→ On complete: POST /api/prescriptions (salva no banco)
→ Tab switch to "Prescrições" automático
```
