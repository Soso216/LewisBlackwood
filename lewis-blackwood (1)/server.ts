import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Increase limit to accommodate large base64 image and audio uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Helper to initialize server-side Gemini client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the environment variables on the server.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// API endpoint for health check
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Server-side proxy for Gemini Chat (conversational message history)
app.post("/api/gemini/chat", async (req, res) => {
  const { history, systemInstruction, tools, toolConfig, message, model = "gemini-3.8-flash" } = req.body;

  try {
    const ai = getGeminiClient();

    // Map old/legacy model names dynamically to recommended, active models
    let resolvedModel = model;
    if (model === "gemini-2.5-flash" || model === "gemini-3.5-flash") {
      resolvedModel = "gemini-3.8-flash";
    }

    // Candidate models to try in case of quota exhaustion
    const modelsToTry = [resolvedModel, "gemini-3.1-flash-lite", "gemini-flash-latest"].filter(
      (m, idx, arr) => arr.indexOf(m) === idx
    );

    // Determine toolConfig if combining search and functions
    let effectiveToolConfig = toolConfig;
    if (!effectiveToolConfig && tools && Array.isArray(tools)) {
      const hasSearch = tools.some((t: any) => t && t.googleSearch);
      const hasFunctions = tools.some((t: any) => t && t.functionDeclarations);
      if (hasSearch && hasFunctions) {
        effectiveToolConfig = { includeServerSideToolInvocations: true };
      }
    }

    let lastError: any = null;
    for (const currentModel of modelsToTry) {
      try {
        const chat = ai.chats.create({
          model: currentModel,
          config: {
            systemInstruction,
            tools,
            toolConfig: effectiveToolConfig,
          },
          history: history,
        });

        const response = await chat.sendMessage({ message });

        return res.json({
          text: response.text,
          functionCalls: response.functionCalls,
          candidates: response.candidates,
          groundingMetadata: response.candidates?.[0]?.groundingMetadata,
          modelUsed: currentModel,
        });
      } catch (err: any) {
        console.warn(`Model ${currentModel} failed:`, err.message || err);
        lastError = err;
        const errMsg = String(err.message || err);
        if (errMsg.includes("resource_exhausted") || errMsg.includes("429") || errMsg.includes("Quota")) {
          // Wait 1.5 seconds before retrying the next fallback model to relieve rate limit
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        } else {
          throw err;
        }
      }
    }

    throw lastError;
  } catch (error: any) {
    const errStr = String(error?.message || error);
    const isQuota = errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("429") || errStr.includes("Quota");
    if (isQuota) {
      console.warn("Gemini Chat: Quota/Rate limit reached (429 RESOURCE_EXHAUSTED). Providing in-character notification.");
      return res.json({
        text: "El servicio de Gemini ha alcanzado el límite de consultas gratuitas por minuto (429 RESOURCE_EXHAUSTED).\n\n⏳ **Tiempo restante de espera:** 60 segundos.\n\n*Lewis acomoda su reloj con calma:* No te preocupes, pequeña. Faltan unos momentos para que se restablezca el sistema. Puedes preguntarme en cualquier momento cuánto falta o vincular una clave con facturación para acceso continuo. ♡\n\n· · ─────── ·鋼· ─────── · ·",
        isQuotaExceeded: true,
        quotaResetSeconds: 60
      });
    }
    console.error("Gemini Chat API Error:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

// Server-side proxy for Gemini GenerateContent (for audio, image, single-shot generation)
app.post("/api/gemini/generate", async (req, res) => {
  const { contents, config, model = "gemini-3.8-flash" } = req.body;

  try {
    const ai = getGeminiClient();

    // Map old/legacy model names dynamically to active recommended models
    let resolvedModel = model;
    let fallbackModels: string[] = [];

    if (model === "gemini-2.5-flash" || model === "gemini-3.5-flash" || model === "gemini-3.8-flash") {
      resolvedModel = "gemini-3.8-flash";
      fallbackModels = ["gemini-3.1-flash-lite", "gemini-flash-latest"];
    } else if (model === "gemini-2.5-flash-preview-tts" || model === "gemini-3.1-flash-tts-preview" || model === "gemini-3.8-flash-lite-tts") {
      resolvedModel = "gemini-3.8-flash-lite-tts";
      fallbackModels = ["gemini-3.8-flash-tts"];
    } else if (model === "gemini-2.5-flash-image" || model === "gemini-3.1-flash-lite-image") {
      resolvedModel = "gemini-3.1-flash-lite-image";
      fallbackModels = ["gemini-3.1-flash-image"];
    }

    const tryModels = [resolvedModel, ...fallbackModels];
    let lastError: any = null;

    for (const curModel of tryModels) {
      try {
        const response = await ai.models.generateContent({
          model: curModel,
          contents,
          config,
        });

        return res.json(response);
      } catch (err: any) {
        console.warn(`generateContent with ${curModel} failed:`, err.message || err);
        lastError = err;
        const msg = String(err.message || err);
        if (msg.includes("resource_exhausted") || msg.includes("429") || msg.includes("Quota")) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  } catch (error: any) {
    const errStr = String(error?.message || error);
    const isQuota = errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("429") || errStr.includes("Quota");
    if (isQuota) {
      console.warn("Gemini Generate: Quota limit reached (429).");
      return res.json({
        candidates: [{
          content: {
            parts: [{ text: "Quota limit reached" }]
          }
        }],
        isQuotaExceeded: true
      });
    }
    console.error("Gemini Generate API Error:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

// Vite middleware development setup and static asset delivery
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware mounted successfully.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production assets from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

setupVite();
