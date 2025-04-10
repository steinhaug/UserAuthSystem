import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
// Import Firebase Admin SDK
import './firebase-admin';
// Import AI-related routes
import openaiRouter from "./openai";
import anthropicRouter from "./anthropic";

// Lazy-load Gemini to avoid immediate import errors if package is missing
let geminiRouter;
try {
  geminiRouter = require("./gemini").default;
} catch (err) {
  console.warn("Gemini router could not be loaded. This is fine if you're not using Gemini.");
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Mount AI routes based on DEFAULT_LLM environment variable
  const defaultLLM = (process.env.DEFAULT_LLM || 'OPENAI').trim().toUpperCase();
  console.log(`Using ${defaultLLM} as the default language model`);

  // Set up AI router paths
  if (defaultLLM === 'OPENAI') {
    app.use('/api/ai', openaiRouter);
    console.log('OpenAI API routes mounted at /api/ai');
  } else if (defaultLLM === 'GEMINI') {
    if (geminiRouter) {
      app.use('/api/ai', geminiRouter);
      console.log('Gemini API routes mounted at /api/ai');
    } else {
      console.warn('Gemini router not available, falling back to OpenAI');
      app.use('/api/ai', openaiRouter);
    }
  } else if (defaultLLM === 'CLAUDE') {
    app.use('/api/ai', anthropicRouter);
    console.log('Claude API routes mounted at /api/ai');
  } else {
    console.warn(`Unknown LLM provider: ${defaultLLM}, falling back to OpenAI`);
    app.use('/api/ai', openaiRouter);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
