# DATABASE_SCHEMA.md — Nexus Atlas

> **Banco:** PostgreSQL  
> **ORM:** Drizzle ORM + pool `pg` nativo  
> **Extensões:** `gen_random_uuid()`

---

## Tabela: `users`

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,             -- bcrypt hash
  email       TEXT,
  plan        TEXT NOT NULL DEFAULT 'free',
  is_admin    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**Planos válidos:** `free`, `starter_monthly`, `starter_annual`, `pro_monthly`, `pro_annual`, `vitalicio`

---

## Tabela: `programs`

```sql
CREATE TABLE programs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  weeks        INTEGER NOT NULL DEFAULT 8,
  days_per_week INTEGER NOT NULL DEFAULT 3,
  level        TEXT NOT NULL DEFAULT 'Intermediário',
  goal         TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

**Índice:** `user_id` (filtro principal)

---

## Tabela: `sessions`

```sql
CREATE TABLE sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id       UUID REFERENCES programs(id) ON DELETE SET NULL,
  name             TEXT,
  notes            TEXT,
  duration_minutes INTEGER,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Tabela: `session_exercises`

```sql
CREATE TABLE session_exercises (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets          INTEGER NOT NULL DEFAULT 0,
  reps          INTEGER NOT NULL DEFAULT 0,
  weight_kg     NUMERIC(8,2) NOT NULL DEFAULT 0,
  rpe           NUMERIC(4,1),        -- ex: 8.5
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Tabela: `clients`

```sql
CREATE TABLE clients (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT,
  plan       TEXT NOT NULL DEFAULT 'Mensal',
  is_active  BOOLEAN NOT NULL DEFAULT true,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Tabela: `prescriptions`

```sql
CREATE TABLE prescriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id    UUID,
  client_name  TEXT,
  program_name TEXT,
  goal         TEXT,
  weeks        INTEGER NOT NULL DEFAULT 8,
  days_per_week INTEGER NOT NULL DEFAULT 3,
  content      TEXT,        -- markdown gerado pela IA
  status       TEXT NOT NULL DEFAULT 'Ativo',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Tabela: `scans`

```sql
CREATE TABLE scans (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT,          -- 'barcode', 'label', 'food'
  raw_data   TEXT,
  result     JSONB,         -- { calories, protein, carbs, fat, ... }
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Tabela: `user_files`

```sql
CREATE TABLE user_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,        -- nome no servidor
  original_name TEXT NOT NULL,        -- nome original
  size          BIGINT NOT NULL DEFAULT 0,
  mime_type     TEXT,
  ext           TEXT,                 -- .pdf, .docx, .png, etc.
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);
```

**Formatos suportados:** PDF, DOC, DOCX, PNG, JPG/JPEG

---

## Tabela: `store_products`

```sql
CREATE TABLE store_products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  category    TEXT,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Tabela: `trainer_profiles`

```sql
CREATE TABLE trainer_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  name             TEXT NOT NULL,
  bio              TEXT,
  specialties      TEXT[],
  experience_years INTEGER,
  price_per_month  NUMERIC(10,2),
  contact          TEXT,
  avatar_url       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Tabela: `exercises`

```sql
CREATE TABLE exercises (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  muscle_group TEXT,
  category     TEXT,
  description  TEXT,
  tips         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Tabela: `atlas_library`

```sql
CREATE TABLE atlas_library (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  content    TEXT,
  category   TEXT,
  tags       TEXT[],
  source     TEXT,          -- PubMed ID, DOI, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Diagrama de Relacionamentos

```
users
  ├── programs (1:N)
  │     └── sessions (1:N)
  │           └── session_exercises (1:N)
  ├── clients (1:N, trainer)
  │     └── prescriptions (1:N)
  ├── user_files (1:N)
  ├── scans (1:N)
  ├── store_products (1:N)
  └── trainer_profiles (1:1)
```

---

## Índices Recomendados

```sql
CREATE INDEX idx_programs_user_id ON programs(user_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_created ON sessions(created_at DESC);
CREATE INDEX idx_session_exercises_session ON session_exercises(session_id);
CREATE INDEX idx_clients_trainer ON clients(trainer_id);
CREATE INDEX idx_user_files_user ON user_files(user_id);
CREATE INDEX idx_scans_user ON scans(user_id);
CREATE INDEX idx_store_status ON store_products(status);
```

---

*Nexus Atlas — Database Schema v2.0 | acmenexusfit.casa*
