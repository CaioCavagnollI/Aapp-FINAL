import { pool } from "./db";

export interface User {
  id: string;
  username: string;
  password: string;
  email?: string;
  plan: string;
  is_admin: boolean;
  created_at: Date;
}

export interface Program {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  weeks: number;
  days_per_week: number;
  level: string;
  goal?: string;
  is_active: boolean;
  created_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  program_id?: string;
  name?: string;
  notes?: string;
  duration_minutes?: number;
  completed_at?: Date;
  created_at: Date;
}

export interface SessionExercise {
  id: string;
  session_id: string;
  exercise_name: string;
  sets: number;
  reps: number;
  weight_kg: number;
  rpe?: number;
  notes?: string;
}

export interface Client {
  id: string;
  trainer_id: string;
  name: string;
  email?: string;
  plan: string;
  is_active: boolean;
  notes?: string;
  created_at: Date;
}

export interface Prescription {
  id: string;
  trainer_id: string;
  client_id?: string;
  client_name?: string;
  program_name?: string;
  goal?: string;
  weeks: number;
  days_per_week: number;
  content?: string;
  status: string;
  created_at: Date;
}

export interface Scan {
  id: string;
  user_id: string;
  type?: string;
  raw_data?: string;
  result?: object;
  created_at: Date;
}

// ---- USERS ----
export async function getUser(id: string): Promise<User | undefined> {
  const r = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return r.rows[0];
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const r = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
  return r.rows[0];
}

export async function createUser(data: { username: string; password: string; is_admin?: boolean }): Promise<User> {
  const plan = data.is_admin ? "vitalicio" : "free";
  const r = await pool.query(
    "INSERT INTO users (username, password, plan, is_admin) VALUES ($1, $2, $3, $4) RETURNING *",
    [data.username, data.password, plan, data.is_admin || false]
  );
  return r.rows[0];
}

export async function updateUserPlan(id: string, plan: string): Promise<User | undefined> {
  const r = await pool.query(
    "UPDATE users SET plan = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [plan, id]
  );
  return r.rows[0];
}

// ---- PROGRAMS ----
export async function getPrograms(userId: string): Promise<Program[]> {
  const r = await pool.query("SELECT * FROM programs WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
  return r.rows;
}

export async function createProgram(data: {
  user_id: string; name: string; description?: string;
  weeks?: number; days_per_week?: number; level?: string; goal?: string;
}): Promise<Program> {
  const r = await pool.query(
    `INSERT INTO programs (user_id, name, description, weeks, days_per_week, level, goal)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [data.user_id, data.name, data.description || null, data.weeks || 8,
     data.days_per_week || 3, data.level || "Intermediário", data.goal || null]
  );
  return r.rows[0];
}

export async function setActiveProgram(userId: string, programId: string): Promise<void> {
  await pool.query("UPDATE programs SET is_active = false WHERE user_id = $1", [userId]);
  await pool.query("UPDATE programs SET is_active = true WHERE id = $1 AND user_id = $2", [programId, userId]);
}

export async function deleteProgram(id: string, userId: string): Promise<void> {
  await pool.query("DELETE FROM programs WHERE id = $1 AND user_id = $2", [id, userId]);
}

// ---- SESSIONS ----
export async function getSessions(userId: string): Promise<Session[]> {
  const r = await pool.query("SELECT * FROM sessions WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
  return r.rows;
}

export async function createSession(data: {
  user_id: string; program_id?: string; name?: string; notes?: string; duration_minutes?: number;
}): Promise<Session> {
  const r = await pool.query(
    `INSERT INTO sessions (user_id, program_id, name, notes, duration_minutes, completed_at)
     VALUES ($1,$2,$3,$4,$5, NOW()) RETURNING *`,
    [data.user_id, data.program_id || null, data.name || "Sessão de treino",
     data.notes || null, data.duration_minutes || null]
  );
  return r.rows[0];
}

export async function getSessionWithExercises(sessionId: string, userId: string) {
  const sessionR = await pool.query("SELECT * FROM sessions WHERE id = $1 AND user_id = $2", [sessionId, userId]);
  if (!sessionR.rows[0]) return null;
  const exR = await pool.query("SELECT * FROM session_exercises WHERE session_id = $1 ORDER BY created_at", [sessionId]);
  return { session: sessionR.rows[0], exercises: exR.rows };
}

export async function addSessionExercise(data: {
  session_id: string; exercise_name: string; sets: number; reps: number;
  weight_kg: number; rpe?: number; notes?: string;
}): Promise<SessionExercise> {
  const r = await pool.query(
    `INSERT INTO session_exercises (session_id, exercise_name, sets, reps, weight_kg, rpe, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [data.session_id, data.exercise_name, data.sets, data.reps,
     data.weight_kg, data.rpe || null, data.notes || null]
  );
  return r.rows[0];
}

export async function getUserStats(userId: string) {
  const sessionsR = await pool.query(
    "SELECT COUNT(*) as count FROM sessions WHERE user_id = $1 AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW()) AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())",
    [userId]
  );
  const totalSessions = await pool.query("SELECT COUNT(*) as count FROM sessions WHERE user_id = $1", [userId]);
  const volumeR = await pool.query(
    "SELECT COALESCE(SUM(sets * reps * weight_kg), 0) as volume FROM session_exercises se JOIN sessions s ON se.session_id = s.id WHERE s.user_id = $1",
    [userId]
  );
  const clientsR = await pool.query(
    "SELECT COUNT(*) as count FROM clients WHERE trainer_id = $1 AND is_active = true", [userId]
  );
  const prescriptionsR = await pool.query(
    "SELECT COUNT(*) as count FROM prescriptions WHERE trainer_id = $1 AND status = 'Ativo'", [userId]
  );
  const recentR = await pool.query(
    "SELECT created_at FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30",
    [userId]
  );
  let streak = 0;
  const today = new Date(); today.setHours(0,0,0,0);
  const days = new Set(recentR.rows.map((r: {created_at: Date}) => {
    const d = new Date(r.created_at); d.setHours(0,0,0,0); return d.getTime();
  }));
  for (let i = 0; i < 30; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    if (days.has(d.getTime())) streak++;
    else if (i > 0) break;
  }
  return {
    sessions_this_month: parseInt(sessionsR.rows[0].count),
    total_sessions: parseInt(totalSessions.rows[0].count),
    total_volume_kg: parseFloat(volumeR.rows[0].volume),
    active_clients: parseInt(clientsR.rows[0].count),
    active_prescriptions: parseInt(prescriptionsR.rows[0].count),
    streak_days: streak,
  };
}

// ---- CLIENTS ----
export async function getClients(trainerId: string): Promise<Client[]> {
  const r = await pool.query(
    "SELECT c.*, (SELECT COUNT(*) FROM sessions s WHERE s.user_id = c.id) as session_count FROM clients c WHERE c.trainer_id = $1 ORDER BY c.created_at DESC",
    [trainerId]
  );
  return r.rows;
}

export async function createClient(data: {
  trainer_id: string; name: string; email?: string; plan?: string; notes?: string;
}): Promise<Client> {
  const r = await pool.query(
    "INSERT INTO clients (trainer_id, name, email, plan, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *",
    [data.trainer_id, data.name, data.email || null, data.plan || "Mensal", data.notes || null]
  );
  return r.rows[0];
}

export async function updateClient(id: string, trainerId: string, data: Partial<Client>): Promise<Client | undefined> {
  const r = await pool.query(
    "UPDATE clients SET name=COALESCE($1,name), is_active=COALESCE($2,is_active) WHERE id=$3 AND trainer_id=$4 RETURNING *",
    [data.name, data.is_active, id, trainerId]
  );
  return r.rows[0];
}

// ---- PRESCRIPTIONS ----
export async function getPrescriptions(trainerId: string): Promise<Prescription[]> {
  const r = await pool.query(
    "SELECT * FROM prescriptions WHERE trainer_id = $1 ORDER BY created_at DESC", [trainerId]
  );
  return r.rows;
}

export async function createPrescription(data: {
  trainer_id: string; client_id?: string; client_name?: string; program_name?: string;
  goal?: string; weeks?: number; days_per_week?: number; content?: string;
}): Promise<Prescription> {
  const r = await pool.query(
    `INSERT INTO prescriptions (trainer_id, client_id, client_name, program_name, goal, weeks, days_per_week, content)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [data.trainer_id, data.client_id || null, data.client_name || null,
     data.program_name || null, data.goal || null, data.weeks || 8,
     data.days_per_week || 3, data.content || null]
  );
  return r.rows[0];
}

// ---- SCANS ----
export async function getScans(userId: string): Promise<Scan[]> {
  const r = await pool.query(
    "SELECT * FROM scans WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20", [userId]
  );
  return r.rows;
}

export async function createScan(data: {
  user_id: string; type?: string; raw_data?: string; result?: object;
}): Promise<Scan> {
  const r = await pool.query(
    "INSERT INTO scans (user_id, type, raw_data, result) VALUES ($1,$2,$3,$4) RETURNING *",
    [data.user_id, data.type || null, data.raw_data || null, data.result ? JSON.stringify(data.result) : null]
  );
  return r.rows[0];
}
