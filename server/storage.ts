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

// ---- ADMIN ----
export async function getAllUsers(): Promise<User[]> {
  const r = await pool.query("SELECT id, username, plan, is_admin, created_at FROM users ORDER BY created_at DESC");
  return r.rows;
}

export async function deleteUser(id: string): Promise<void> {
  await pool.query("DELETE FROM users WHERE id = $1", [id]);
}

export async function getAppMetrics() {
  const usersR = await pool.query("SELECT COUNT(*) as count FROM users");
  const proR = await pool.query("SELECT COUNT(*) as count FROM users WHERE plan IN ('pro_monthly','pro_annual','vitalicio')");
  const sessionsR = await pool.query("SELECT COUNT(*) as count FROM sessions");
  const scansR = await pool.query("SELECT COUNT(*) as count FROM scans");
  const prescriptionsR = await pool.query("SELECT COUNT(*) as count FROM prescriptions");
  const newUsersR = await pool.query(
    "SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '7 days'"
  );
  const planDistR = await pool.query(
    "SELECT plan, COUNT(*) as count FROM users GROUP BY plan ORDER BY count DESC"
  );
  return {
    total_users: parseInt(usersR.rows[0].count),
    pro_users: parseInt(proR.rows[0].count),
    total_sessions: parseInt(sessionsR.rows[0].count),
    total_scans: parseInt(scansR.rows[0].count),
    total_prescriptions: parseInt(prescriptionsR.rows[0].count),
    new_users_7d: parseInt(newUsersR.rows[0].count),
    plan_distribution: planDistR.rows,
  };
}

// ---- STORE PRODUCTS ----
export interface StoreProduct {
  id: string;
  seller_id: string;
  seller_name?: string;
  name: string;
  description?: string;
  price: string;
  category: string;
  file_url?: string;
  contact?: string;
  status: string;
  created_at: Date;
}

export async function getStoreProducts(): Promise<StoreProduct[]> {
  try {
    await ensureStoreProductsTable();
    const r = await pool.query(
      "SELECT sp.*, u.username as seller_name FROM store_products sp JOIN users u ON sp.seller_id = u.id WHERE sp.status = 'approved' ORDER BY sp.created_at DESC"
    );
    return r.rows;
  } catch { return []; }
}

export async function getAllStoreProducts(): Promise<StoreProduct[]> {
  try {
    await ensureStoreProductsTable();
    const r = await pool.query(
      "SELECT sp.*, u.username as seller_name FROM store_products sp JOIN users u ON sp.seller_id = u.id ORDER BY sp.created_at DESC"
    );
    return r.rows;
  } catch { return []; }
}

export async function createStoreProduct(data: {
  seller_id: string; name: string; description?: string;
  price: string; category: string; file_url?: string; contact?: string; status: string;
}): Promise<StoreProduct> {
  await ensureStoreProductsTable();
  const r = await pool.query(
    "INSERT INTO store_products (seller_id, name, description, price, category, file_url, contact, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
    [data.seller_id, data.name, data.description || null, data.price, data.category, data.file_url || null, data.contact || null, data.status]
  );
  return r.rows[0];
}

export async function approveStoreProduct(id: string): Promise<StoreProduct> {
  const r = await pool.query("UPDATE store_products SET status='approved' WHERE id=$1 RETURNING *", [id]);
  return r.rows[0];
}

export async function deleteStoreProduct(id: string): Promise<void> {
  await pool.query("DELETE FROM store_products WHERE id=$1", [id]);
}

async function ensureStoreProductsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS store_products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      price TEXT NOT NULL,
      category TEXT NOT NULL,
      file_url TEXT,
      contact TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// ---- TRAINER PROFILES ----
export interface TrainerProfile {
  id: string;
  user_id: string;
  name: string;
  bio: string;
  specialties?: string;
  experience_years?: number;
  price_per_month?: string;
  contact?: string;
  avatar_url?: string;
  created_at: Date;
}

export async function getTrainerProfiles(): Promise<TrainerProfile[]> {
  try {
    const r = await pool.query("SELECT * FROM trainer_profiles ORDER BY created_at DESC");
    return r.rows;
  } catch { return []; }
}

export async function upsertTrainerProfile(data: {
  user_id: string; name: string; bio: string; specialties?: string;
  experience_years?: number; price_per_month?: string; contact?: string; avatar_url?: string;
}): Promise<TrainerProfile> {
  await ensureTrainerProfilesTable();
  const existing = await pool.query("SELECT id FROM trainer_profiles WHERE user_id=$1", [data.user_id]);
  if (existing.rows.length > 0) {
    const r = await pool.query(
      "UPDATE trainer_profiles SET name=$1,bio=$2,specialties=$3,experience_years=$4,price_per_month=$5,contact=$6,avatar_url=$7 WHERE user_id=$8 RETURNING *",
      [data.name, data.bio, data.specialties || null, data.experience_years || null, data.price_per_month || null, data.contact || null, data.avatar_url || null, data.user_id]
    );
    return r.rows[0];
  }
  const r = await pool.query(
    "INSERT INTO trainer_profiles (user_id,name,bio,specialties,experience_years,price_per_month,contact,avatar_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
    [data.user_id, data.name, data.bio, data.specialties || null, data.experience_years || null, data.price_per_month || null, data.contact || null, data.avatar_url || null]
  );
  return r.rows[0];
}

async function ensureTrainerProfilesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS trainer_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      bio TEXT NOT NULL,
      specialties TEXT,
      experience_years INTEGER,
      price_per_month TEXT,
      contact TEXT,
      avatar_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// ---- EXERCISES ----
export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  secondary_muscles?: string;
  equipment?: string;
  difficulty: string;
  instructions?: string;
  tips?: string;
  video_url?: string;
  image_url?: string;
  created_at: Date;
}

export async function getExercises(): Promise<Exercise[]> {
  try {
    await ensureExercisesTable();
    const r = await pool.query("SELECT * FROM exercises ORDER BY muscle_group, name");
    if (r.rows.length === 0) await seedExercises();
    const r2 = await pool.query("SELECT * FROM exercises ORDER BY muscle_group, name");
    return r2.rows;
  } catch { return []; }
}

export async function createExercise(data: {
  name: string; muscle_group: string; secondary_muscles?: string;
  equipment?: string; difficulty?: string; instructions?: string; tips?: string;
}): Promise<Exercise> {
  await ensureExercisesTable();
  const r = await pool.query(
    "INSERT INTO exercises (name,muscle_group,secondary_muscles,equipment,difficulty,instructions,tips) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
    [data.name, data.muscle_group, data.secondary_muscles || null, data.equipment || null, data.difficulty || "Intermediário", data.instructions || null, data.tips || null]
  );
  return r.rows[0];
}

async function ensureExercisesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exercises (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      muscle_group TEXT NOT NULL,
      secondary_muscles TEXT,
      equipment TEXT,
      difficulty TEXT NOT NULL DEFAULT 'Intermediário',
      instructions TEXT,
      tips TEXT,
      video_url TEXT,
      image_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function seedExercises() {
  const exercises = [
    { name: "Agachamento Livre", muscle_group: "Quadríceps", secondary_muscles: "Glúteos, Isquiotibiais, Lombar", equipment: "Barra", difficulty: "Intermediário", instructions: "Posicione a barra sobre os trapézios, pés na largura dos ombros. Desça controladamente até as coxas ficarem paralelas ao chão, mantendo o tórax ereto e joelhos alinhados com os pés.", tips: "Mantenha o peso nos calcanhares. Não deixe os joelhos ultrapassarem os pés excessivamente." },
    { name: "Supino Reto", muscle_group: "Peitoral", secondary_muscles: "Tríceps, Deltóide Anterior", equipment: "Barra, Banco", difficulty: "Iniciante", instructions: "Deitado no banco, pegue a barra com pegada levemente mais larga que os ombros. Desça a barra controladamente ao peito e empurre de volta.", tips: "Mantenha as escápulas retraídas e os pés fixos no chão. Inspire na descida, expire na subida." },
    { name: "Levantamento Terra", muscle_group: "Lombar", secondary_muscles: "Glúteos, Isquiotibiais, Quadríceps, Trapézio", equipment: "Barra", difficulty: "Avançado", instructions: "Com a barra sobre os pés, agache mantendo as costas retas. Segure a barra com as mãos na largura dos ombros. Empurre o chão com os pés enquanto ergue a barra, mantendo-a próxima ao corpo.", tips: "Mantenha a coluna neutra durante todo o movimento. Não arredonde as costas." },
    { name: "Barra Fixa", muscle_group: "Dorsal", secondary_muscles: "Bíceps, Rombóides, Infraespinal", equipment: "Barra fixa", difficulty: "Intermediário", instructions: "Pendure-se na barra com pegada pronada mais larga que os ombros. Puxe o corpo até o queixo ultrapassar a barra, controlando a descida.", tips: "Evite balançar o corpo. Foque em contrair o dorsal ao subir." },
    { name: "Desenvolvimento com Halteres", muscle_group: "Deltóide", secondary_muscles: "Tríceps, Trapézio", equipment: "Halteres, Banco", difficulty: "Iniciante", instructions: "Sentado, segure os halteres na altura dos ombros com os cotovelos dobrados a 90°. Empurre os halteres para cima até os braços ficarem quase estendidos.", tips: "Não trave os cotovelos no topo. Mantenha o core contraído." },
    { name: "Rosca Direta com Barra", muscle_group: "Bíceps", secondary_muscles: "Braquiorradial, Braquial", equipment: "Barra EZ ou reta", difficulty: "Iniciante", instructions: "Em pé, segure a barra com pegada supinada. Flexione os cotovelos trazendo a barra até os ombros, sem mover os ombros.", tips: "Mantenha os cotovelos fixos ao lado do corpo. Controle a descida." },
    { name: "Tríceps Testa", muscle_group: "Tríceps", secondary_muscles: "Cotovelo", equipment: "Barra EZ, Banco", difficulty: "Intermediário", instructions: "Deitado no banco, segure a barra com pegada fechada. Desça a barra em direção à testa flexionando os cotovelos, mantendo os braços perpendiculares ao chão.", tips: "Mantenha os cotovelos apontados para cima e próximos. Não afaste os cotovelos." },
    { name: "Leg Press", muscle_group: "Quadríceps", secondary_muscles: "Glúteos, Isquiotibiais", equipment: "Máquina Leg Press", difficulty: "Iniciante", instructions: "Na máquina, posicione os pés na plataforma na largura dos ombros. Empurre a plataforma até quase estender os joelhos, depois desça controladamente.", tips: "Não trave os joelhos no topo. Varie a posição dos pés para focar músculos diferentes." },
    { name: "Remada Curvada", muscle_group: "Dorsal", secondary_muscles: "Bíceps, Rombóides, Deltoide Posterior", equipment: "Barra", difficulty: "Intermediário", instructions: "Com o tronco inclinado a 45°, segure a barra com pegada pronada. Puxe a barra em direção ao abdômen contraindo o dorsal.", tips: "Mantenha as costas retas. Puxe com os cotovelos, não com as mãos." },
    { name: "Cadeira Extensora", muscle_group: "Quadríceps", secondary_muscles: "", equipment: "Máquina Extensora", difficulty: "Iniciante", instructions: "Sentado na máquina, encaixe os pés no apoio. Estenda os joelhos até os pés ficarem paralelos ao chão, depois desça controladamente.", tips: "Ideal para isolamento do quadríceps. Não trave os joelhos no topo." },
    { name: "Mesa Flexora", muscle_group: "Isquiotibiais", secondary_muscles: "", equipment: "Máquina Flexora", difficulty: "Iniciante", instructions: "Deitado na máquina, posicione o apoio atrás dos tornozelos. Flexione os joelhos trazendo os calcanhares em direção aos glúteos.", tips: "Controle a descida. Não deixe os quadris levantarem." },
    { name: "Elevação Lateral", muscle_group: "Deltóide", secondary_muscles: "Trapézio", equipment: "Halteres", difficulty: "Iniciante", instructions: "Em pé com um halter em cada mão, eleve os braços lateralmente até a altura dos ombros, com uma leve flexão dos cotovelos.", tips: "Evite balançar o tronco. Use carga adequada para manter a técnica." },
    { name: "Afundo", muscle_group: "Quadríceps", secondary_muscles: "Glúteos, Isquiotibiais", equipment: "Halteres ou Barra (opcional)", difficulty: "Iniciante", instructions: "Em pé, dê um passo à frente e desça o joelho traseiro quase até o chão. Volte à posição inicial e repita com a outra perna.", tips: "Mantenha o tronco ereto. O joelho da frente não deve ultrapassar excessivamente os dedos do pé." },
    { name: "Pulldown no Pulley", muscle_group: "Dorsal", secondary_muscles: "Bíceps, Rombóides", equipment: "Polia alta", difficulty: "Iniciante", instructions: "Sentado com os joelhos sob o apoio, puxe a barra em direção ao peito, contraindo o dorsal. Controle a subida.", tips: "Incline levemente o tronco para trás. Evite puxar com os braços apenas." },
    { name: "Stiff", muscle_group: "Isquiotibiais", secondary_muscles: "Glúteos, Lombar", equipment: "Barra ou Halteres", difficulty: "Intermediário", instructions: "Em pé com as costas retas, incline o tronco à frente descendo o peso ao longo das pernas até sentir o alongamento dos isquiotibiais.", tips: "Mantenha uma leve flexão nos joelhos. Não arredonde a coluna lombar." },
    { name: "Supino Inclinado", muscle_group: "Peitoral", secondary_muscles: "Deltóide Anterior, Tríceps", equipment: "Barra ou Halteres, Banco inclinado", difficulty: "Intermediário", instructions: "No banco inclinado a 30-45°, desça o peso ao peito superior e empurre de volta.", tips: "Enfatiza a porção superior do peitoral. Mantenha as escápulas retraídas." },
    { name: "Panturrilha em Pé", muscle_group: "Gastrocnêmio", secondary_muscles: "Sóleo", equipment: "Máquina ou Barra", difficulty: "Iniciante", instructions: "Em pé, eleve os calcanhares ao máximo e desça controladamente abaixo do nível da plataforma.", tips: "Pause no topo para melhor ativação. Use amplitude completa de movimento." },
    { name: "Crucifixo com Halteres", muscle_group: "Peitoral", secondary_muscles: "Deltóide Anterior", equipment: "Halteres, Banco", difficulty: "Intermediário", instructions: "Deitado no banco, com halteres nas mãos e cotovelos levemente flexionados, abra os braços para o lado e volte à posição inicial.", tips: "Sinta o alongamento no peitoral. Não use carga excessiva." },
    { name: "Prancha", muscle_group: "Core", secondary_muscles: "Lombar, Glúteos", equipment: "Nenhum", difficulty: "Iniciante", instructions: "Apoie-se nos antebraços e pontas dos pés, mantendo o corpo em linha reta. Contraia o abdômen e glúteos.", tips: "Não deixe o quadril cair ou subir. Respire normalmente durante o exercício." },
    { name: "Abdominal Supra", muscle_group: "Core", secondary_muscles: "", equipment: "Nenhum", difficulty: "Iniciante", instructions: "Deitado, com os joelhos dobrados, eleve o tronco em direção aos joelhos contraindo o abdômen. Desça controladamente.", tips: "Não puxe o pescoço com as mãos. O movimento deve vir do abdômen." },
  ];
  for (const ex of exercises) {
    await pool.query(
      "INSERT INTO exercises (name,muscle_group,secondary_muscles,equipment,difficulty,instructions,tips) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING",
      [ex.name, ex.muscle_group, ex.secondary_muscles, ex.equipment, ex.difficulty, ex.instructions, ex.tips]
    );
  }
}

// ---- ATLAS LIBRARY ----
export interface AtlasLibraryEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags?: string;
  created_at: Date;
}

export async function getAtlasLibrary(): Promise<AtlasLibraryEntry[]> {
  try {
    await ensureAtlasLibraryTable();
    const r = await pool.query("SELECT * FROM atlas_library ORDER BY created_at DESC");
    return r.rows;
  } catch { return []; }
}

export async function createAtlasLibraryEntry(data: {
  title: string; content: string; category: string; tags?: string;
}): Promise<AtlasLibraryEntry> {
  await ensureAtlasLibraryTable();
  const r = await pool.query(
    "INSERT INTO atlas_library (title,content,category,tags) VALUES ($1,$2,$3,$4) RETURNING *",
    [data.title, data.content, data.category, data.tags || null]
  );
  return r.rows[0];
}

async function ensureAtlasLibraryTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS atlas_library (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Geral',
      tags TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}
