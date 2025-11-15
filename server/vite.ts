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
  
  // Log what files exist in dist/public for debugging
  try {
    const files = fs.readdirSync(distPath);
    console.log(`📦 Files in dist/public:`, files.slice(0, 10).join(", "), files.length > 10 ? `... (${files.length} total)` : "");
    const assetsDir = path.join(distPath, "assets");
    if (fs.existsSync(assetsDir)) {
      const assetsFiles = fs.readdirSync(assetsDir);
      console.log(`📦 Assets files (${assetsFiles.length}):`, assetsFiles.slice(0, 5).join(", "), assetsFiles.length > 5 ? `...` : "");
      
      // Verify critical assets exist
      const hasCss = assetsFiles.some(f => f.endsWith('.css'));
      const hasJs = assetsFiles.some(f => f.endsWith('.js'));
      console.log(`📦 Assets check - CSS: ${hasCss ? '✅' : '❌'}, JS: ${hasJs ? '✅' : '❌'}`);
    } else {
      console.warn("⚠️ Assets directory not found:", assetsDir);
    }
  } catch (error) {
    console.warn("⚠️ Could not list files in dist/public:", error);
  }

  // Add middleware to log asset requests for debugging
  app.use((req, res, next) => {
    if (req.path.startsWith('/assets/')) {
      const originalEnd = res.end;
      
      res.end = function(chunk?: any) {
        // 200 = OK, 304 = Not Modified (valid cached response)
        if (res.statusCode === 200 || res.statusCode === 304) {
          const contentType = res.getHeader('Content-Type') || 'unknown';
          console.log(`📦 [ASSET] ${req.method} ${req.path} - Status: ${res.statusCode}, Content-Type: ${contentType}`);
        } else if (res.statusCode >= 400) {
          console.warn(`⚠️ [ASSET] ${req.method} ${req.path} - Status: ${res.statusCode} (arquivo não encontrado ou erro)`);
        }
        return originalEnd.call(this, chunk);
      };
    }
    next();
  });

  // Serve static files with proper headers and caching
  // IMPORTANT: This must be called BEFORE the catch-all route
  app.use(express.static(distPath, {
    maxAge: process.env.NODE_ENV === "production" ? "1y" : "0",
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // Set proper Content-Type for CSS and JS files
      if (filePath.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css; charset=utf-8");
      } else if (filePath.endsWith(".js")) {
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      }
    },
  }));

  // fall through to index.html if the file doesn't exist
  // but skip API routes and static assets
  app.use("*", (req, res, next) => {
    // Skip API routes - let them be handled by API routes
    if (req.originalUrl.startsWith("/api")) {
      return next();
    }
    
    // Skip static asset requests - they should already be handled by express.static above
    if (req.originalUrl.startsWith("/assets/") || 
        req.originalUrl.startsWith("/images/") || 
        req.originalUrl.endsWith(".css") || 
        req.originalUrl.endsWith(".js") ||
        req.originalUrl.endsWith(".png") ||
        req.originalUrl.endsWith(".jpg") ||
        req.originalUrl.endsWith(".svg") ||
        req.originalUrl.endsWith(".ico")) {
      return next();
    }
    
    // Always serve fresh index.html (no cache) to ensure correct asset references
    const indexPath = path.resolve(distPath, "index.html");
    
    // Set headers to prevent caching of index.html
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    
    // Verify index.html exists before sending
    if (!fs.existsSync(indexPath)) {
      console.error(`❌ index.html not found at: ${indexPath}`);
      return res.status(500).send("index.html not found");
    }
    
    // Log which index.html is being served (first few lines to see asset references)
    try {
      const indexContent = fs.readFileSync(indexPath, "utf-8");
      const assetMatches = indexContent.match(/href=["']([^"']*\.css)["']|src=["']([^"']*\.js)["']/g);
      if (assetMatches && assetMatches.length > 0) {
        console.log(`📄 [HTML] Serving index.html with assets:`, assetMatches.slice(0, 2).join(", "));
      }
    } catch (error) {
      console.warn("⚠️ Could not read index.html for logging:", error);
    }
    
    res.sendFile(indexPath);
  });
}
