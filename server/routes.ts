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
            content: "Você é um especialista em nutrição esportiva. Dado um código de barras ou texto de rótulo nutricional, forneça informações nutricionais estruturadas em JSON com campos: nome, calorias_por_100g, proteina_g, carboidratos_g, gorduras_g, porcao_recomendada, observacoes_esportivas. Se não reconhecer o produto, estime com base no código ou descrição."
          }, {
            role: "user",
            content: `Tipo: ${type || "barcode"}. Dados: ${raw_data}. Responda APENAS com JSON válido.`
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

    // Ensure admin user exists in DB
    let adminUser = await storage.getUserByUsername(adminUsername);
    if (!adminUser) {
      const hashed = await bcrypt.hash(adminPassword, 10);
      adminUser = await storage.createUser({ username: adminUsername, password: hashed, is_admin: true });
    } else if (!adminUser.is_admin) {
      await storage.updateUserPlan(adminUser.id, "vitalicio");
    }

    const userToken = jwt.sign({ userId: adminUser.id, plan: "vitalicio", isAdmin: true }, JWT_SECRET_FINAL, { expiresIn: "30d" });
    const adminToken = getAdminToken();
    res.json({ token: adminToken, userToken, user: { id: adminUser.id, username: adminUser.username, plan: "vitalicio", is_admin: true } });
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

  const httpServer = createServer(app);
  return httpServer;
}
