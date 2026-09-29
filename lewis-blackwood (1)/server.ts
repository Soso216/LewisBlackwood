import express from "express";
import path from "path";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import { createServer as createViteServer } from "vite";

dotenv.config();
const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Inicializar cliente de Groq
function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not defined in environment variables.");
  }
  return new Groq({ apiKey });
}

app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Endpoint de chat adaptado a Groq
app.post("/api/gemini/chat", async (req, res) => {
  const { history, systemInstruction, message } = req.body;
  try {
    const groq = getGroqClient();

    const messages: any[] = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    
    if (history && Array.isArray(history)) {
      for (const h of history) {
        const role = h.role === "model" ? "assistant" : "user";
        const content = h.parts?.map((p: any) => p.text).join("") || "";
        if (content) messages.push({ role, content });
      }
    }
    
    messages.push({ role: "user", content: message });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: messages,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || "";

    return res.json({
      text: responseText,
      modelUsed: "llama-3.3-70b-versatile",
    });

  } catch (error: any) {
    console.error("Groq Chat API Error:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

// Vite middleware y static assets
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

setupVite();
