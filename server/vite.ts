import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // Wrap vite.middlewares to skip API routes
  app.use((req, res, next) => {
    // Skip API routes - let them be handled by Express API routes
    if (req.originalUrl?.startsWith("/api")) {
      return next();
    }
    // Use vite middleware for all other routes
    vite.middlewares(req, res, next);
  });
  
  app.use("*", async (req, res, next) => {
    // Skip API routes - let them be handled by API routes
    if (req.originalUrl.startsWith("/api")) {
      return next();
    }
    
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In production, after esbuild bundling, import.meta.dirname will be the dist/ directory
  // The Vite build outputs files to dist/public/, so we need to use process.cwd() 
  // to get the project root, then resolve to dist/public/
  const distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  console.log(`📁 Serving static files from: ${distPath}`);

  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      // Set proper Content-Type for CSS files
      if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      }
      // Set proper Content-Type for JS files
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      }
      // Enable CORS for all static files
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  }));

  // fall through to index.html if the file doesn't exist
  // but skip API routes
  app.use("*", (req, res, next) => {
    // Skip API routes - let them be handled by API routes
    if (req.originalUrl.startsWith("/api")) {
      return next();
    }
    
    // Skip static asset requests - they should already be handled by express.static above
    if (req.originalUrl.startsWith("/assets/") || 
        req.originalUrl.endsWith(".css") || 
        req.originalUrl.endsWith(".js")) {
      return next();
    }
    
    // Verificar se HTML tem crossorigin antes de servir (apenas no primeiro acesso)
    try {
      const htmlPath = path.resolve(distPath, "index.html");
      const htmlContent = fs.readFileSync(htmlPath, "utf-8");
      const hasCrossorigin = /crossorigin/i.test(htmlContent);
      if (hasCrossorigin) {
        console.warn(`⚠️ [SERVE] HTML ainda contém crossorigin! Links CSS/Script podem não carregar corretamente.`);
        // Tentar remover em runtime como fallback
        const cleanedHtml = htmlContent
          .replace(/<link([^>]*rel=["']stylesheet["'][^>]*)crossorigin(?:=["'][^"']*["'])?([^>]*)>/gi, '<link$1$2>')
          .replace(/<script([^>]*type=["']module["'][^>]*)crossorigin(?:=["'][^"']*["'])?([^>]*)>/gi, '<script$1$2>')
          .replace(/\s+crossorigin(?:=["'][^"']*["'])?/gi, '');
        return res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(cleanedHtml);
      }
    } catch (error) {
      console.warn(`⚠️ [SERVE] Erro ao verificar HTML:`, error);
    }
    
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
