import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";
import crypto from "node:crypto";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as storage from "./storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  console.warn("[WARN] JWT_SECRET not set in env. Using insecure fallback for development only.");
}
const JWT_SECRET_FINAL = JWT_SECRET || "nexusatlas-jwt-secret-dev-only";

const SYSTEM_PROMPT = `Você é o Atlas IA da plataforma Nexus — A Plataforma Científica do Treinamento de Força. Você é um assistente especializado em treinamento de força científico, com profundo conhecimento em fisiologia do exercício, biomecânica e programação baseada em evidências.

Seu conhecimento é baseado em pesquisas científicas revisadas por pares. Você fornece:
- Prescrições de treino baseadas em evidências (séries, repetições, intensidade, volume)
- Explicações científicas com referência à fisiologia muscular, recrutamento de unidades motoras e princípios de sobrecarga progressiva
- Dicas de técnica de exercícios baseadas em pesquisas biomecânicas
- Estratégias de periodização (linear, ondulatória, em blocos)
- Conselhos sobre recuperação, nutrição para performance e prevenção de lesões

Diretrizes:
- Sempre cite princípios fisiológicos
- Seja preciso: use percentuais de 1RM, escalas de PSE e faixas de repetições específicas
- Reconheça variações individuais e considerações de segurança
- Mantenha as respostas cientificamente rigorosas, mas acessíveis
- Formate as respostas com clareza, usando seções quando apropriado
- Nunca dê conselhos médicos nem diagnósticos
- Responda sempre em português do Brasil

Você é o padrão ouro de conhecimento em treinamento de força.`;

const PRESCRIPTION_PROMPT = `Você é o Atlas IA, especialista em prescrição de treino científico da plataforma Nexus. 
Gere uma prescrição de treinamento completa e detalhada em português do Brasil baseada nas informações fornecidas.

A prescrição deve incluir:
1. Resumo do programa (objetivo, duração, frequência)
2. Divisão dos dias de treino
3. Para cada dia: lista de exercícios com séries, repetições, carga relativa (%1RM ou RPE), descanso
4. Progressão semanal sugerida
5. Dicas de recuperação e nutrição peri-treino

Use formatação clara com emojis e seções bem definidas. Seja específico e científico.`;

function getAdminToken(): string {
  const password = process.env.ADMIN_PASSWORD || "admin2211777_";
  const secret = process.env.SESSION_SECRET || "nexusatlas-secret";
  return crypto.createHmac("sha256", secret).update(password).digest("hex");
}

function validateAdminToken(token: string): boolean {
  return token === getAdminToken();
}

function adminMiddleware(req: Request, res: Response, next: Function) {
  const token = req.headers["x-admin-token"] as string;
  if (!token || !validateAdminToken(token)) {
    return res.status(401).json({ error: "Não autorizado" });
  }
  next();
}

interface AuthRequest extends Request {
  userId?: string;
  userPlan?: string;
  isAdmin?: boolean;
}

function authMiddleware(req: AuthRequest, res: Response, next: Function) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticação obrigatório" });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET_FINAL) as { userId: string; plan?: string; isAdmin?: boolean };
    req.userId = payload.userId;
    req.userPlan = payload.plan;
    req.isAdmin = payload.isAdmin;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${timestamp}_${safe}`);
  },
});

const upload = multer({ storage: multerStorage, limits: { fileSize: 50 * 1024 * 1024 } });

export async function registerRoutes(app: Express): Promise<Server> {

  // ===== AUTH =====

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: "Usuário e senha são obrigatórios" });
      if (username.length < 3) return res.status(400).json({ error: "Usuário deve ter pelo menos 3 caracteres" });
      if (password.length < 6) return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
      const existing = await storage.getUserByUsername(username);
      if (existing) return res.status(409).json({ error: "Usuário já existe" });
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ username, password: hashedPassword });
      const token = jwt.sign({ userId: user.id, plan: user.plan, isAdmin: user.is_admin }, JWT_SECRET_FINAL, { expiresIn: "30d" });
      res.status(201).json({ token, user: { id: user.id, username: user.username, plan: user.plan, is_admin: user.is_admin } });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ error: "Erro ao criar conta" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: "Usuário e senha são obrigatórios" });
      const user = await storage.getUserByUsername(username);
      if (!user) return res.status(401).json({ error: "Usuário ou senha incorretos" });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: "Usuário ou senha incorretos" });
      const token = jwt.sign({ userId: user.id, plan: user.plan, isAdmin: user.is_admin }, JWT_SECRET_FINAL, { expiresIn: "30d" });
      res.json({ token, user: { id: user.id, username: user.username, plan: user.plan, is_admin: user.is_admin } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Erro ao fazer login" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
      res.json({ user: { id: user.id, username: user.username, plan: user.plan, is_admin: user.is_admin } });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar usuário" });
    }
  });

  app.put("/api/auth/plan", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { plan } = req.body;
      const validPlans = ["free", "starter_monthly", "starter_annual", "pro_monthly", "pro_annual", "vitalicio"];
      if (!validPlans.includes(plan)) return res.status(400).json({ error: "Plano inválido" });
      const user = await storage.updateUserPlan(req.userId!, plan);
      res.json({ user: { id: user!.id, username: user!.username, plan: user!.plan } });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar plano" });
    }
  });

  // ===== STATS =====

  app.get("/api/stats", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const stats = await storage.getUserStats(req.userId!);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  });

  // ===== CHAT =====

  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "messages é obrigatório" });
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();
      const stream = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        stream: true,
        max_completion_tokens: 8192,
      });
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("Chat error:", error);
      if (!res.headersSent) res.status(500).json({ error: "Erro no chat" });
      else { res.write(`data: ${JSON.stringify({ error: "Erro no stream" })}\n\n`); res.end(); }
    }
  });

  // ===== PROGRAMS =====

  app.get("/api/programs", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const programs = await storage.getPrograms(req.userId!);
      res.json({ programs });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar programas" });
    }
  });

  app.post("/api/programs", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { name, description, weeks, days_per_week, level, goal } = req.body;
      if (!name) return res.status(400).json({ error: "Nome é obrigatório" });
      const program = await storage.createProgram({ user_id: req.userId!, name, description, weeks, days_per_week, level, goal });
      res.status(201).json({ program });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar programa" });
    }
  });

  app.put("/api/programs/:id/activate", authMiddleware, async (req: AuthRequest, res) => {
    try {
      await storage.setActiveProgram(req.userId!, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao ativar programa" });
    }
  });

  app.delete("/api/programs/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      await storage.deleteProgram(req.params.id, req.userId!);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir programa" });
    }
  });

  // ===== SESSIONS =====

  app.get("/api/sessions", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const sessions = await storage.getSessions(req.userId!);
      res.json({ sessions });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar sessões" });
    }
  });

  app.post("/api/sessions", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { program_id, name, notes, duration_minutes, exercises } = req.body;
      const session = await storage.createSession({ user_id: req.userId!, program_id, name, notes, duration_minutes });
      if (exercises && Array.isArray(exercises)) {
        for (const ex of exercises) {
          await storage.addSessionExercise({ session_id: session.id, ...ex });
        }
      }
      const full = await storage.getSessionWithExercises(session.id, req.userId!);
      res.status(201).json(full);
    } catch (error) {
      res.status(500).json({ error: "Erro ao registrar sessão" });
    }
  });

  app.get("/api/sessions/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = await storage.getSessionWithExercises(req.params.id, req.userId!);
      if (!data) return res.status(404).json({ error: "Sessão não encontrada" });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar sessão" });
    }
  });

  // ===== CLIENTS =====

  app.get("/api/clients", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const clients = await storage.getClients(req.userId!);
      res.json({ clients });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar clientes" });
    }
  });

  app.post("/api/clients", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { name, email, plan, notes } = req.body;
      if (!name) return res.status(400).json({ error: "Nome é obrigatório" });
      const client = await storage.createClient({ trainer_id: req.userId!, name, email, plan, notes });
      res.status(201).json({ client });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar cliente" });
    }
  });

  app.put("/api/clients/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const client = await storage.updateClient(req.params.id, req.userId!, req.body);
      if (!client) return res.status(404).json({ error: "Cliente não encontrado" });
      res.json({ client });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar cliente" });
    }
  });

  // ===== PRESCRIPTIONS =====

  app.get("/api/prescriptions", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const prescriptions = await storage.getPrescriptions(req.userId!);
      res.json({ prescriptions });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar prescrições" });
    }
  });

  app.post("/api/prescriptions", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { client_id, client_name, program_name, goal, weeks, days_per_week } = req.body;
      if (!client_name && !client_id) return res.status(400).json({ error: "Cliente é obrigatório" });
      const prescription = await storage.createPrescription({
        trainer_id: req.userId!, client_id, client_name, program_name, goal, weeks, days_per_week
      });
      res.status(201).json({ prescription });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar prescrição" });
    }
  });

  app.post("/api/prescriptions/generate", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { client_name, goal, weeks, days_per_week, level, notes } = req.body;
      if (!client_name || !goal) return res.status(400).json({ error: "Cliente e objetivo são obrigatórios" });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const userPrompt = `Gere uma prescrição completa para:
- Cliente: ${client_name}
- Objetivo: ${goal}
- Duração: ${weeks || 8} semanas
- Frequência: ${days_per_week || 3}x por semana
- Nível: ${level || "Intermediário"}
${notes ? `- Observações: ${notes}` : ""}`;

      const stream = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: PRESCRIPTION_PROMPT },
          { role: "user", content: userPrompt }
        ],
        stream: true,
        max_completion_tokens: 4096,
      });

      let full = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          full += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Save prescription after generation
      await storage.createPrescription({
        trainer_id: req.userId!, client_name, goal, weeks, days_per_week,
        program_name: `${goal} — ${days_per_week || 3}x/sem`, content: full
      });

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("Prescription generate error:", error);
      if (!res.headersSent) res.status(500).json({ error: "Erro ao gerar prescrição" });
      else { res.write(`data: ${JSON.stringify({ error: "Erro no stream" })}\n\n`); res.end(); }
    }
  });

  // ===== SCANS =====

  app.get("/api/scans", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const scans = await storage.getScans(req.userId!);
      res.json({ scans });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar scans" });
    }
  });

  app.post("/api/scans", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { type, raw_data } = req.body;
      if (!raw_data) return res.status(400).json({ error: "Dados do scan são obrigatórios" });

      // Use AI to analyze the scan
      let result: object = { raw: raw_data, analyzed: false };
      try {
        const aiRes = await openai.chat.completions.create({
          model: "gpt-4.1",
          messages: [{
            role: "system",
            content: "Você é um especialista em nutrição esportiva. Responda SEMPRE em português do Brasil. Dado um código de barras ou texto de rótulo nutricional, forneça informações nutricionais estruturadas em JSON com campos: nome, calorias_por_100g, proteina_g, carboidratos_g, gorduras_g, porcao_recomendada, observacoes_esportivas. Se não reconhecer o produto, estime com base no código ou descrição. Todos os textos do JSON devem estar em português do Brasil."
          }, {
            role: "user",
            content: `Tipo: ${type || "barcode"}. Dados: ${raw_data}. Responda APENAS com JSON válido em português do Brasil.`
          }],
          max_completion_tokens: 500,
        });
        const content = aiRes.choices[0]?.message?.content || "{}";
        result = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
      } catch { /* use default result */ }

      const scan = await storage.createScan({ user_id: req.userId!, type, raw_data, result });
      res.status(201).json({ scan });
    } catch (error) {
      res.status(500).json({ error: "Erro ao salvar scan" });
    }
  });

  // ===== ADMIN =====

  app.post("/api/admin/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Usuário e senha obrigatórios" });
    const adminUsername = process.env.ADMIN_USERNAME || "admin@nexus221177";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin2211777_";
    if (username !== adminUsername || password !== adminPassword) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    // Ensure admin user exists in DB with vitalicio plan
    let adminUser = await storage.getUserByUsername(adminUsername);
    if (!adminUser) {
      const hashed = await bcrypt.hash(adminPassword, 10);
      adminUser = await storage.createUser({ username: adminUsername, password: hashed, is_admin: true });
    }
    // Always ensure admin has vitalicio plan
    await storage.updateUserPlan(adminUser.id, "vitalicio");

    const userToken = jwt.sign({ userId: adminUser.id, plan: "vitalicio", isAdmin: true }, JWT_SECRET_FINAL, { expiresIn: "30d" });
    const adminToken = getAdminToken();
    res.json({ token: adminToken, userToken, user: { id: adminUser.id, username: adminUser.username, plan: "vitalicio", is_admin: true } });
  });

  // ===== ADMIN USERS MANAGEMENT =====

  app.get("/api/admin/users", adminMiddleware, async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json({ users });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  });

  app.put("/api/admin/users/:id/plan", adminMiddleware, async (req, res) => {
    try {
      const { plan } = req.body;
      const validPlans = ["free", "starter_monthly", "starter_annual", "pro_monthly", "pro_annual", "vitalicio"];
      if (!validPlans.includes(plan)) return res.status(400).json({ error: "Plano inválido" });
      const user = await storage.updateUserPlan(req.params.id, plan);
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar plano" });
    }
  });

  app.delete("/api/admin/users/:id", adminMiddleware, async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir usuário" });
    }
  });

  app.get("/api/admin/metrics", adminMiddleware, async (_req, res) => {
    try {
      const metrics = await storage.getAppMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar métricas" });
    }
  });

  // ===== STORE PRODUCTS =====

  app.get("/api/store/products", async (_req, res) => {
    try {
      const products = await storage.getStoreProducts();
      res.json({ products });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar produtos" });
    }
  });

  app.post("/api/store/products", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { name, description, price, category, file_url, contact } = req.body;
      if (!name || !price || !category) return res.status(400).json({ error: "Nome, preço e categoria são obrigatórios" });
      const product = await storage.createStoreProduct({
        seller_id: req.userId!, name, description, price, category, file_url, contact, status: "pending"
      });
      res.status(201).json({ product });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar produto" });
    }
  });

  app.get("/api/admin/store/products", adminMiddleware, async (_req, res) => {
    try {
      const products = await storage.getAllStoreProducts();
      res.json({ products });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar produtos" });
    }
  });

  app.put("/api/admin/store/products/:id/approve", adminMiddleware, async (req, res) => {
    try {
      const product = await storage.approveStoreProduct(req.params.id);
      res.json({ product });
    } catch (error) {
      res.status(500).json({ error: "Erro ao aprovar produto" });
    }
  });

  app.delete("/api/admin/store/products/:id", adminMiddleware, async (req, res) => {
    try {
      await storage.deleteStoreProduct(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir produto" });
    }
  });

  // ===== TRAINER PROFILES (Prescrição Premium) =====

  app.get("/api/trainer-profiles", async (_req, res) => {
    try {
      const profiles = await storage.getTrainerProfiles();
      res.json({ profiles });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar perfis" });
    }
  });

  app.post("/api/trainer-profiles", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { name, bio, specialties, experience_years, price_per_month, contact, avatar_url } = req.body;
      if (!name || !bio) return res.status(400).json({ error: "Nome e bio são obrigatórios" });
      const profile = await storage.upsertTrainerProfile({
        user_id: req.userId!, name, bio, specialties, experience_years, price_per_month, contact, avatar_url
      });
      res.json({ profile });
    } catch (error) {
      res.status(500).json({ error: "Erro ao salvar perfil" });
    }
  });

  // ===== EXERCISES LIBRARY =====

  app.get("/api/exercises", async (_req, res) => {
    try {
      const exercises = await storage.getExercises();
      res.json({ exercises });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar exercícios" });
    }
  });

  app.post("/api/admin/exercises", adminMiddleware, async (req, res) => {
    try {
      const exercise = await storage.createExercise(req.body);
      res.status(201).json({ exercise });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar exercício" });
    }
  });

  // ===== ATLAS SCANNER LIBRARY =====

  app.get("/api/atlas-library", async (_req, res) => {
    try {
      const entries = await storage.getAtlasLibrary();
      res.json({ entries });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar biblioteca" });
    }
  });

  app.post("/api/admin/atlas-library", adminMiddleware, async (req, res) => {
    try {
      const entry = await storage.createAtlasLibraryEntry(req.body);
      res.status(201).json({ entry });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar entrada na biblioteca" });
    }
  });

  app.get("/api/admin/files", adminMiddleware, (_req, res) => {
    try {
      const files = fs.readdirSync(UPLOADS_DIR).map((filename) => {
        const filePath = path.join(UPLOADS_DIR, filename);
        const stat = fs.statSync(filePath);
        const parts = filename.split("_");
        const timestamp = parseInt(parts[0], 10);
        const originalName = parts.slice(1).join("_");
        return {
          filename, originalName, size: stat.size,
          uploadedAt: isNaN(timestamp) ? stat.mtime.toISOString() : new Date(timestamp).toISOString(),
          ext: path.extname(filename).toLowerCase(),
        };
      });
      files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      res.json({ files });
    } catch (error) {
      res.status(500).json({ error: "Erro ao listar arquivos" });
    }
  });

  app.post("/api/admin/upload", adminMiddleware, upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
    res.json({ message: "Arquivo enviado com sucesso", filename: req.file.filename, originalName: req.file.originalname, size: req.file.size });
  });

  app.delete("/api/admin/files/:filename", adminMiddleware, (req, res) => {
    try {
      const filename = req.params.filename;
      const safe = path.basename(filename);
      const filePath = path.join(UPLOADS_DIR, safe);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Arquivo não encontrado" });
      fs.unlinkSync(filePath);
      res.json({ message: "Arquivo excluído" });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir arquivo" });
    }
  });

  // ===== USER FILE UPLOADS =====

  const USER_UPLOADS_DIR = path.resolve(process.cwd(), "uploads", "user");
  if (!fs.existsSync(USER_UPLOADS_DIR)) {
    fs.mkdirSync(USER_UPLOADS_DIR, { recursive: true });
  }

  const userUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, USER_UPLOADS_DIR),
      filename: (_req, file, cb) => {
        const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, `${Date.now()}_${safe}`);
      },
    }),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/png",
        "image/jpeg",
        "image/jpg",
      ];
      const ext = path.extname(file.originalname).toLowerCase();
      const allowedExts = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"];
      if (allowed.includes(file.mimetype) || allowedExts.includes(ext)) cb(null, true);
      else cb(new Error("Tipo de arquivo não permitido"));
    },
  });

  app.get("/api/user/files", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { pool } = await import("./db");
      const result = await pool.query(
        "SELECT id, filename, original_name, size, mime_type, ext, uploaded_at FROM user_files WHERE user_id = $1 ORDER BY uploaded_at DESC",
        [req.userId]
      );
      const files = result.rows.map((r) => ({
        ...r,
        url: `/api/user/files/${r.id}/download`,
      }));
      res.json({ files });
    } catch (error) {
      res.status(500).json({ error: "Erro ao listar arquivos" });
    }
  });

  app.post("/api/user/upload", authMiddleware, userUpload.single("file"), async (req: AuthRequest, res) => {
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
    try {
      const { pool } = await import("./db");
      const ext = path.extname(req.file.originalname).toLowerCase();
      await pool.query(
        "INSERT INTO user_files (user_id, filename, original_name, size, mime_type, ext) VALUES ($1, $2, $3, $4, $5, $6)",
        [req.userId, req.file.filename, req.file.originalname, req.file.size, req.file.mimetype, ext]
      );
      res.json({ message: "Arquivo enviado com sucesso", originalName: req.file.originalname, size: req.file.size });
    } catch (error) {
      res.status(500).json({ error: "Erro ao registrar arquivo" });
    }
  });

  app.delete("/api/user/files/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { pool } = await import("./db");
      const result = await pool.query(
        "SELECT filename FROM user_files WHERE id = $1 AND user_id = $2",
        [req.params.id, req.userId]
      );
      if (!result.rows.length) return res.status(404).json({ error: "Arquivo não encontrado" });
      const filePath = path.join(USER_UPLOADS_DIR, result.rows[0].filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await pool.query("DELETE FROM user_files WHERE id = $1 AND user_id = $2", [req.params.id, req.userId]);
      res.json({ message: "Arquivo excluído" });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir arquivo" });
    }
  });

  // ===== RESEARCH APIs (PubMed, CrossRef, OpenAlex) =====

  app.get("/api/research/pubmed", async (req, res) => {
    try {
      const { query, max = "10" } = req.query as { query?: string; max?: string };
      if (!query) return res.status(400).json({ error: "query é obrigatório" });
      const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${max}&retmode=json&sort=relevance`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json() as { esearchresult?: { idlist?: string[] } };
      const ids = searchData.esearchresult?.idlist || [];
      if (!ids.length) return res.json({ articles: [] });
      const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`;
      const summaryRes = await fetch(summaryUrl);
      const summaryData = await summaryRes.json() as { result?: Record<string, any> };
      const articles = ids.map((id) => {
        const item = summaryData.result?.[id] || {};
        return {
          id,
          title: item.title || "",
          authors: (item.authors || []).slice(0, 3).map((a: any) => a.name).join(", "),
          journal: item.fulljournalname || item.source || "",
          pubdate: item.pubdate || "",
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        };
      });
      res.json({ articles });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar no PubMed" });
    }
  });

  app.get("/api/research/crossref", async (req, res) => {
    try {
      const { query, rows = "10" } = req.query as { query?: string; rows?: string };
      if (!query) return res.status(400).json({ error: "query é obrigatório" });
      const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${rows}&select=DOI,title,author,published,container-title&mailto=admin@acmenexusfit.casa`;
      const crossRes = await fetch(url);
      const crossData = await crossRes.json() as { message?: { items?: any[] } };
      const items = crossData.message?.items || [];
      const articles = items.map((item) => ({
        doi: item.DOI,
        title: Array.isArray(item.title) ? item.title[0] : item.title || "",
        authors: (item.author || []).slice(0, 3).map((a: any) => `${a.given || ""} ${a.family || ""}`.trim()).join(", "),
        journal: Array.isArray(item["container-title"]) ? item["container-title"][0] : "",
        year: item.published?.["date-parts"]?.[0]?.[0] || "",
        url: `https://doi.org/${item.DOI}`,
      }));
      res.json({ articles });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar no CrossRef" });
    }
  });

  app.get("/api/research/openalex", async (req, res) => {
    try {
      const { query, per_page = "10" } = req.query as { query?: string; per_page?: string };
      if (!query) return res.status(400).json({ error: "query é obrigatório" });
      const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=${per_page}&mailto=admin@acmenexusfit.casa`;
      const oaRes = await fetch(url);
      const oaData = await oaRes.json() as { results?: any[] };
      const articles = (oaData.results || []).map((item) => ({
        id: item.id,
        title: item.display_name || item.title || "",
        authors: (item.authorships || []).slice(0, 3).map((a: any) => a.author?.display_name || "").join(", "),
        journal: item.primary_location?.source?.display_name || "",
        year: item.publication_year || "",
        citations: item.cited_by_count || 0,
        url: item.doi ? `https://doi.org/${item.doi.replace("https://doi.org/", "")}` : item.id,
        open_access: item.open_access?.is_oa || false,
      }));
      res.json({ articles });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar no OpenAlex" });
    }
  });

  // ===== STRIPE PAYMENTS =====

  app.post("/api/payments/create-checkout", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { plan } = req.body;
      if (!plan) return res.status(400).json({ error: "Plano é obrigatório" });
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        return res.status(503).json({ error: "Stripe não configurado. Configure STRIPE_SECRET_KEY nas variáveis de ambiente." });
      }
      const PLAN_PRICES: Record<string, { amount: number; currency: string; interval?: string }> = {
        starter_monthly: { amount: 2990, currency: "brl", interval: "month" },
        starter_annual: { amount: 23990, currency: "brl", interval: "year" },
        pro_monthly: { amount: 5990, currency: "brl", interval: "month" },
        pro_annual: { amount: 47990, currency: "brl", interval: "year" },
        vitalicio: { amount: 99700, currency: "brl" },
      };
      const priceConfig = PLAN_PRICES[plan];
      if (!priceConfig) return res.status(400).json({ error: "Plano inválido" });
      res.json({
        checkoutUrl: `https://buy.stripe.com/${plan}`,
        plan,
        amount: priceConfig.amount / 100,
        currency: priceConfig.currency.toUpperCase(),
        message: "Configure Stripe com suas chaves reais para processar pagamentos.",
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar sessão de pagamento" });
    }
  });

  app.post("/api/payments/webhook", async (req, res) => {
    try {
      const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!stripeWebhookSecret) return res.status(503).json({ error: "Webhook secret não configurado" });
      const sig = req.headers["stripe-signature"] as string;
      console.log("[Stripe Webhook] Received event, signature:", sig ? "present" : "missing");
      res.json({ received: true });
    } catch (error) {
      res.status(400).json({ error: "Webhook error" });
    }
  });

  app.post("/api/payments/pix", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { plan } = req.body;
      if (!plan) return res.status(400).json({ error: "Plano é obrigatório" });
      const PLAN_AMOUNTS: Record<string, number> = {
        starter_monthly: 29.90,
        starter_annual: 239.90,
        pro_monthly: 59.90,
        pro_annual: 479.90,
        vitalicio: 997.00,
      };
      const amount = PLAN_AMOUNTS[plan];
      if (!amount) return res.status(400).json({ error: "Plano inválido" });
      const pixKey = process.env.PIX_KEY || "";
      res.json({
        pixKey,
        amount,
        description: `Nexus Fit — Plano ${plan}`,
        message: "Configure PIX_KEY nas variáveis de ambiente com sua chave PIX real.",
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao gerar PIX" });
    }
  });

  // ===== ATLAS SCANNER PROXY =====

  app.post("/api/atlas-scanner/analyze", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { query, type = "text", imageUrl } = req.body;
      if (!query && !imageUrl) return res.status(400).json({ error: "Dados para análise são obrigatórios" });

      const ATLAS_URL = "https://atlas-scanner-v-3--caiocavagnollic.replit.app/scanner";
      let atlasResult: any = null;

      // Try Atlas Scanner external webhook first
      try {
        const atlasRes = await fetch(ATLAS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: query || imageUrl, type, source: "nexus_atlas" }),
          signal: AbortSignal.timeout(8000),
        });
        if (atlasRes.ok) {
          atlasResult = await atlasRes.json();
        }
      } catch { /* fallback to OpenAI */ }

      // Fallback: use OpenAI GPT-4 for deep analysis
      if (!atlasResult) {
        try {
          const systemMsg = type === "equipment"
            ? "Você é o Atlas Scanner IA. Identifique equipamentos de ginástica, exercícios e técnica de execução. Responda em JSON com: nome, categoria, musculos_alvo, execucao_correta, variações, erros_comuns, beneficios. Responda sempre em português do Brasil."
            : type === "posture"
            ? "Você é o Atlas Scanner IA especializado em análise postural. Avalie a postura e forneça JSON com: avaliacao_geral, pontos_fortes, correcoes_necessarias, exercicios_corretivos, riscos_identificados. Responda sempre em português do Brasil."
            : type === "food"
            ? "Você é o Atlas Scanner IA nutricionista esportivo. Analise o alimento/suplemento e responda em JSON com: nome, calorias_por_100g, proteina_g, carboidratos_g, gorduras_g, porcao_recomendada, timing_ideal, observacoes_esportivas. Responda sempre em português do Brasil."
            : "Você é o Atlas Scanner IA. Analise o conteúdo e forneça informações estruturadas relevantes em JSON. Responda sempre em português do Brasil.";

          const aiRes = await openai.chat.completions.create({
            model: "gpt-4.1",
            messages: [
              { role: "system", content: systemMsg },
              { role: "user", content: `Tipo de análise: ${type}. Conteúdo: ${query || imageUrl}. Responda APENAS com JSON válido.` }
            ],
            max_completion_tokens: 800,
          });
          const content = aiRes.choices[0]?.message?.content || "{}";
          try {
            atlasResult = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
          } catch {
            atlasResult = { analise: content, fonte: "Atlas IA (GPT-4.1)" };
          }
        } catch (aiError: any) {
          console.warn("[Atlas Scanner] OpenAI fallback error:", aiError?.message || aiError);
          atlasResult = {
            analise: `Análise do conteúdo: "${query || imageUrl}" (tipo: ${type}). Para análise detalhada configure a chave de IA nas variáveis de ambiente.`,
            fonte: "Atlas Scanner (modo offline)",
            tipo: type,
            sugestao: "Configure AI_INTEGRATIONS_OPENAI_API_KEY para análise completa via Atlas IA.",
          };
        }
      }

      // Persist as a scan record
      let scan: any = null;
      try {
        scan = await storage.createScan({
          user_id: req.userId!,
          type: `atlas_${type}`,
          raw_data: query || imageUrl || "",
          result: atlasResult,
        });
      } catch { /* non-critical */ }

      res.json({ result: atlasResult, scan_id: scan?.id || null, source: "atlas_scanner" });
    } catch (error) {
      console.error("[Atlas Scanner] Error:", error);
      res.status(500).json({ error: "Erro ao processar análise do Atlas Scanner" });
    }
  });

  // ===== GOOGLE FIT INTEGRATION =====

  app.get("/api/health/google-fit/status", authMiddleware, async (req: AuthRequest, res) => {
    const clientId = process.env.GOOGLE_FIT_CLIENT_ID;
    res.json({
      connected: !!clientId,
      configured: !!clientId,
      authUrl: clientId
        ? `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(process.env.GOOGLE_FIT_REDIRECT_URI || "")}&response_type=code&scope=https://www.googleapis.com/auth/fitness.activity.read+https://www.googleapis.com/auth/fitness.body.read+https://www.googleapis.com/auth/fitness.heart_rate.read&access_type=offline`
        : null,
      message: clientId ? "Google Fit configurado" : "Configure GOOGLE_FIT_CLIENT_ID e GOOGLE_FIT_CLIENT_SECRET nas variáveis de ambiente",
      dataSources: [
        { id: "steps", name: "Passos Diários", unit: "passos", icon: "footsteps-outline" },
        { id: "heart_rate", name: "Frequência Cardíaca", unit: "bpm", icon: "heart-outline" },
        { id: "calories", name: "Calorias Queimadas", unit: "kcal", icon: "flame-outline" },
        { id: "active_minutes", name: "Minutos Ativos", unit: "min", icon: "timer-outline" },
        { id: "distance", name: "Distância", unit: "km", icon: "map-outline" },
        { id: "weight", name: "Peso", unit: "kg", icon: "scale-outline" },
      ],
    });
  });

  app.post("/api/health/google-fit/sync", authMiddleware, async (req: AuthRequest, res) => {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: "Token de acesso Google Fit é obrigatório" });

    try {
      const now = Date.now();
      const dayAgo = now - 86400000;
      const fitRes = await fetch(
        `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            aggregateBy: [
              { dataTypeName: "com.google.step_count.delta" },
              { dataTypeName: "com.google.calories.expended" },
              { dataTypeName: "com.google.heart_rate.bpm" },
            ],
            bucketByTime: { durationMillis: 86400000 },
            startTimeMillis: dayAgo,
            endTimeMillis: now,
          }),
        }
      );
      if (!fitRes.ok) return res.status(400).json({ error: "Falha ao buscar dados do Google Fit" });
      const fitData = await fitRes.json();
      res.json({ synced: true, data: fitData, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ error: "Erro ao sincronizar Google Fit" });
    }
  });

  // ===== SAMSUNG HEALTH INTEGRATION =====

  app.get("/api/health/samsung/status", authMiddleware, async (_req, res) => {
    res.json({
      connected: false,
      configured: false,
      message: "Samsung Health requer Samsung Developer Partner Agreement. Solicite acesso em shealth.samsung.com/developer.",
      authUrl: "https://shealth.samsung.com/developer",
      dataSources: [
        { id: "steps", name: "Passos", unit: "passos", icon: "footsteps-outline" },
        { id: "heart_rate", name: "Frequência Cardíaca", unit: "bpm", icon: "heart-outline" },
        { id: "sleep", name: "Sono", unit: "horas", icon: "moon-outline" },
        { id: "stress", name: "Nível de Estresse", unit: "pts", icon: "pulse-outline" },
        { id: "calories", name: "Calorias", unit: "kcal", icon: "flame-outline" },
        { id: "body_composition", name: "Composição Corporal", unit: "%", icon: "body-outline" },
        { id: "spo2", name: "SpO2", unit: "%", icon: "water-outline" },
      ],
    });
  });

  // ===== GEMINI AI ALTERNATIVE =====

  app.post("/api/ai/gemini", authMiddleware, async (req: AuthRequest, res) => {
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ error: "Mensagem é obrigatória" });

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      // Fallback to OpenAI if Gemini not configured
      try {
        const aiRes = await openai.chat.completions.create({
          model: "gpt-4.1",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...(context || []),
            { role: "user", content: message },
          ],
          max_completion_tokens: 800,
        });
        return res.json({
          reply: aiRes.choices[0]?.message?.content || "",
          model: "gpt-4.1-fallback",
          note: "Gemini não configurado. Configure GEMINI_API_KEY para usar o Google Gemini.",
        });
      } catch {
        return res.status(503).json({ error: "Nenhum modelo de IA disponível" });
      }
    }

    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nUsuário: ${message}` }] }],
            generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
          }),
        }
      );
      if (!geminiRes.ok) throw new Error("Gemini API error");
      const gemData = await geminiRes.json();
      const reply = gemData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      res.json({ reply, model: "gemini-2.0-flash" });
    } catch (error) {
      res.status(500).json({ error: "Erro ao processar com Gemini" });
    }
  });

  // ===== STRAVA INTEGRATION =====

  app.get("/api/health/strava/status", authMiddleware, async (_req, res) => {
    const clientId = process.env.STRAVA_CLIENT_ID;
    res.json({
      connected: !!clientId,
      configured: !!clientId,
      authUrl: clientId
        ? `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(process.env.STRAVA_REDIRECT_URI || "")}&response_type=code&scope=read,activity:read_all`
        : null,
      message: clientId ? "Strava configurado" : "Configure STRAVA_CLIENT_ID e STRAVA_CLIENT_SECRET nas variáveis de ambiente",
    });
  });

  app.get("/api/health/strava/activities", authMiddleware, async (req: AuthRequest, res) => {
    const { accessToken } = req.query as { accessToken?: string };
    if (!accessToken) return res.status(400).json({ error: "accessToken é obrigatório" });
    try {
      const stravaRes = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?per_page=20`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!stravaRes.ok) return res.status(400).json({ error: "Falha ao buscar atividades Strava" });
      const activities = await stravaRes.json();
      res.json({ activities });
    } catch {
      res.status(500).json({ error: "Erro ao buscar atividades Strava" });
    }
  });

  // ===== ADMIN BILLING STATS =====

  app.get("/api/admin/billing/stats", adminMiddleware, async (_req, res) => {
    try {
      const { pool } = await import("./db");
      const result = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE plan != 'free') as active_subscriptions,
          COUNT(*) as total_users
        FROM users
      `);
      const stats = result.rows[0];
      res.json({
        activeSubscriptions: parseInt(stats.active_subscriptions) || 0,
        totalUsers: parseInt(stats.total_users) || 0,
        mrr: 0,
        totalRevenue: 0,
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar métricas de faturamento" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
