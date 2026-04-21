import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email TEXT,
      plan TEXT NOT NULL DEFAULT 'free',
      is_admin BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS programs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      weeks INTEGER NOT NULL DEFAULT 8,
      days_per_week INTEGER NOT NULL DEFAULT 3,
      level TEXT NOT NULL DEFAULT 'Intermediário',
      goal TEXT,
      is_active BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
      name TEXT,
      notes TEXT,
      duration_minutes INTEGER,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS session_exercises (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      exercise_name TEXT NOT NULL,
      sets INTEGER NOT NULL DEFAULT 0,
      reps INTEGER NOT NULL DEFAULT 0,
      weight_kg NUMERIC(8,2) NOT NULL DEFAULT 0,
      rpe NUMERIC(4,1),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT,
      plan TEXT NOT NULL DEFAULT 'Mensal',
      is_active BOOLEAN NOT NULL DEFAULT true,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_id UUID,
      client_name TEXT,
      program_name TEXT,
      goal TEXT,
      weeks INTEGER NOT NULL DEFAULT 8,
      days_per_week INTEGER NOT NULL DEFAULT 3,
      content TEXT,
      status TEXT NOT NULL DEFAULT 'Ativo',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS scans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT,
      raw_data TEXT,
      result JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      size BIGINT NOT NULL DEFAULT 0,
      mime_type TEXT,
      ext TEXT,
      uploaded_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export { pool };
