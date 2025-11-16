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
      console.log("🚫 [VITE] PULANDO rota API:", req.originalUrl);
      console.log("🚫 [VITE] Path:", req.path);
      console.log("🚫 [VITE] Chamando next() para passar para Express");
      return next();
    }
    // Use vite middleware for all other routes
    console.log("✅ [VITE] Processando rota:", req.originalUrl);
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
  
  // Log asset requests for debugging
  app.use((req, res, next) => {
    if (req.path.startsWith('/assets/') || req.path.endsWith('.css') || req.path.endsWith('.js')) {
      console.log(`📦 [ASSET REQUEST] ${req.method} ${req.path}`);
      res.on('finish', () => {
        const contentType = res.getHeader('Content-Type') || 'not-set';
        const contentLength = res.getHeader('Content-Length') || 'not-set';
        console.log(`📦 [ASSET RESPONSE] ${req.path} - Status: ${res.statusCode}, Content-Type: ${contentType}, Content-Length: ${contentLength}`);
      });
    }
    next();
  });

  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      // Set proper Content-Type for CSS files
      if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        console.log(`✅ [STATIC] Setting Content-Type: text/css for ${filePath}`);
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
    
    console.log(`📄 [HTML REQUEST] ${req.method} ${req.originalUrl}`);
    
    // Read and log HTML content to verify crossorigin is removed
    try {
      const htmlPath = path.resolve(distPath, "index.html");
      const htmlContent = fs.readFileSync(htmlPath, "utf-8");
      
      // Check for crossorigin in CSS links
      const cssLinks = htmlContent.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi);
      if (cssLinks && cssLinks.length > 0) {
        cssLinks.forEach((link, idx) => {
          const hasCrossorigin = /\bcrossorigin\b/i.test(link);
          console.log(`📄 [HTML] CSS link ${idx + 1}: hasCrossorigin=${hasCrossorigin}, link=${link.substring(0, 150)}`);
        });
      }
      
      // Check for crossorigin in script tags
      const scriptTags = htmlContent.match(/<script[^>]*type=["']module["'][^>]*>/gi);
      if (scriptTags && scriptTags.length > 0) {
        scriptTags.forEach((script, idx) => {
          const hasCrossorigin = /\bcrossorigin\b/i.test(script);
          console.log(`📄 [HTML] Script tag ${idx + 1}: hasCrossorigin=${hasCrossorigin}, script=${script.substring(0, 150)}`);
        });
      }
    } catch (error) {
      console.warn(`⚠️ [HTML] Could not read HTML for verification:`, error);
    }
    
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
