import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";
import crypto from "node:crypto";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SYSTEM_PROMPT = `Você é o Lab IA do Fitversum — um assistente especializado em treinamento de força científico, com profundo conhecimento em fisiologia do exercício, biomecânica e programação baseada em evidências.

Seu conhecimento é baseado em pesquisas científicas revisadas por pares. Você fornece:
- Prescrições de treino baseadas em evidências (séries, repetições, intensidade, volume)
- Explicações científicas com referência à fisiologia muscular, recrutamento de unidades motoras e princípios de sobrecarga progressiva
- Dicas de técnica de exercícios baseadas em pesquisas biomecânicas
- Estratégias de periodização (linear, ondulatória, em blocos)
- Conselhos sobre recuperação, nutrição para performance e prevenção de lesões

Diretrizes:
- Sempre cite princípios fisiológicos (ex.: "Com base no princípio do tamanho do recrutamento de unidades motoras...")
- Seja preciso: use percentuais de 1RM, escalas de PSE e faixas de repetições específicas
- Reconheça variações individuais e considerações de segurança
- Mantenha as respostas cientificamente rigorosas, mas acessíveis
- Formate as respostas com clareza, usando seções quando apropriado
- Nunca dê conselhos médicos nem diagnósticos
- Responda sempre em português do Brasil

Você é o padrão ouro de conhecimento em treinamento de força.`;

function getAdminToken(): string {
  const password = process.env.ADMIN_PASSWORD || "";
  const secret = process.env.SESSION_SECRET || "fitversum-secret";
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

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${timestamp}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "messages é obrigatório" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
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

  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Senha obrigatória" });

    const adminPassword = process.env.ADMIN_PASSWORD || "";
    if (password !== adminPassword) {
      return res.status(401).json({ error: "Senha incorreta" });
    }

    const token = getAdminToken();
    res.json({ token });
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
          filename,
          originalName,
          size: stat.size,
          uploadedAt: isNaN(timestamp) ? stat.mtime.toISOString() : new Date(timestamp).toISOString(),
          ext: path.extname(filename).toLowerCase(),
        };
      });
      files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      res.json({ files });
    } catch (error) {
      console.error("Files list error:", error);
      res.status(500).json({ error: "Erro ao listar arquivos" });
    }
  });

  app.post("/api/admin/upload", adminMiddleware, upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
    res.json({
      message: "Arquivo enviado com sucesso",
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
    });
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
      console.error("Delete error:", error);
      res.status(500).json({ error: "Erro ao excluir arquivo" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
