import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import cors from "cors";
import { execSync } from "child_process";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed";
import { ensureWarehouseProvidersCatalog } from "./warehouse-providers-catalog";

const app = express();

// Enable CORS for all routes (allows requests from Vercel deployments)
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Raw body middleware for webhook signature verification (must come before JSON parsing)
app.use('/api/voice/telnyx-incoming-call', express.raw({ type: 'application/json', limit: '10mb' }));
app.use('/api/voice/telnyx-call-status', express.raw({ type: 'application/json', limit: '10mb' }));
app.use('/api/webhooks/shopify/orders', express.raw({ type: 'application/json', limit: '10mb' }));
app.use('/api/webhooks/cartpanda/orders', express.raw({ type: 'application/json', limit: '10mb' }));

// Store raw body for webhook verification
app.use('/api/voice/telnyx-incoming-call', (req: any, res: any, next: any) => {
  if (req.body instanceof Buffer) {
    req.rawBody = req.body.toString();
    req.body = JSON.parse(req.rawBody);
  }
  next();
});

app.use('/api/voice/telnyx-call-status', (req: any, res: any, next: any) => {
  if (req.body instanceof Buffer) {
    req.rawBody = req.body.toString();
    req.body = JSON.parse(req.rawBody);
  }
  next();
});

app.use('/api/webhooks/shopify/orders', (req: any, res: any, next: any) => {
  if (req.body instanceof Buffer) {
    req.rawBody = req.body.toString();
    req.body = JSON.parse(req.rawBody);
  }
  next();
});

app.use('/api/webhooks/cartpanda/orders', (req: any, res: any, next: any) => {
  if (req.body instanceof Buffer) {
    req.rawBody = req.body.toString();
    req.body = JSON.parse(req.rawBody);
  }
  next();
});

app.use(express.json({ limit: '10mb' })); // Increased limit for ElevenLabs audio
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

  // DEBUG: Log ALL requests to see what's being intercepted
  app.use((req, res, next) => {
    if (req.path === "/api/user/profile" || req.originalUrl === "/api/user/profile") {
      console.log("🔍 [DEBUG] Requisição detectada para /api/user/profile");
      console.log("🔍 [DEBUG] Method:", req.method);
      console.log("🔍 [DEBUG] Path:", req.path);
      console.log("🔍 [DEBUG] Original URL:", req.originalUrl);
      console.log("🔍 [DEBUG] Headers:", Object.keys(req.headers));
    }
    next();
  });

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
  const shouldAutoPush =
    process.env.AUTO_DB_PUSH === "true" ||
    (process.env.NODE_ENV === "production" && process.env.AUTO_DB_PUSH !== "false");

  // Push database schema when explicitly enabled
  if (shouldAutoPush) {
    try {
      console.log('📦 Pushing database schema changes...');
      execSync('npm run db:push -- --force', { stdio: 'inherit' });
      console.log('✅ Database schema updated successfully');
    } catch (error) {
      console.error('❌ Failed to push database schema:', error);
      // Continue anyway - schema might already be up to date
    }
  }
  
  // Garantir que o catálogo de providers está completo (inclui Big Arena)
  await ensureWarehouseProvidersCatalog();
  
  // Seed database with initial data
  await seedDatabase();
  
  // Executar migrações do banco de dados (adicionar colunas/tabelas faltantes)
  if (process.env.DATABASE_URL) {
    try {
      console.log('🔄 Executando migrações do banco de dados...');
      execSync('npm run db:migrate', { stdio: 'inherit', env: process.env });
      console.log('✅ Migrações aplicadas com sucesso');
    } catch (error) {
      console.error('❌ Erro ao executar migrações:', error);
      // Continuar mesmo com erro - migrações podem já estar aplicadas
      console.log('⚠️ Continuando startup mesmo com erro nas migrações');
    }
  }
  
  // Servir imagens antes de tudo (precisa vir antes do Vite)
  app.use('/images', express.static(path.join(process.cwd(), 'client', 'public', 'images')));
  app.use('/favicon.ico', express.static(path.join(process.cwd(), 'client', 'public', 'favicon.ico')));
  
  const server = await registerRoutes(app);
  
  // 🏭 Start Warehouse Sync Workers
  console.log('');
  console.log('🏭 Starting Warehouse Sync Workers...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Start FHB sync worker
  const { startFHBWorker } = await import('./workers/fhb-sync-worker');
  startFHBWorker();
  
  // Start European Fulfillment sync worker
  const { startEuropeanFulfillmentWorker } = await import('./workers/european-fulfillment-sync-worker');
  startEuropeanFulfillmentWorker();
  
  // Start eLogy sync worker
  const { startElogyWorker } = await import('./workers/elogy-sync-worker');
  startElogyWorker();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  // 🔗 Start Warehouse Linking Workers
  console.log('🔗 Starting Warehouse Linking Workers...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Start FHB linking worker
  const { startFHBLinkingWorker } = await import('./workers/fhb-linking-worker');
  startFHBLinkingWorker();
  
  // Start European Fulfillment linking worker
  const { startEuropeanFulfillmentLinkingWorker } = await import('./workers/european-fulfillment-linking-worker');
  startEuropeanFulfillmentLinkingWorker();
  
  // Start eLogy linking worker
  const { startElogyLinkingWorker } = await import('./workers/elogy-linking-worker');
  startElogyLinkingWorker();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // 🛍️ Start Shopify/CartPanda/Digistore24/Big Arena Polling Workers
  console.log('🛍️  Starting Shopify/CartPanda/Digistore24/Big Arena Polling Workers...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Start Shopify polling worker
  const { startShopifyPollingWorker } = await import('./workers/shopify-sync-worker');
  startShopifyPollingWorker();

  // Start CartPanda polling worker
  const { startCartPandaPollingWorker } = await import('./workers/cartpanda-sync-worker');
  startCartPandaPollingWorker();

  // Start Digistore24 polling worker
  const { startDigistoreSyncWorker } = await import('./workers/digistore-sync-worker');
  startDigistoreSyncWorker();

  // Start Big Arena polling worker
  const { startBigArenaSyncWorker } = await import('./workers/big-arena-sync-worker');
  startBigArenaSyncWorker();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // 🔄 Start Staging Sync Worker
  console.log('🔄 Starting Staging Sync Worker...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Start staging sync worker
  const { startStagingSyncWorker } = await import('./workers/staging-sync-worker');
  startStagingSyncWorker();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // 🧹 Start Cleanup Job for Old Sync Sessions
  console.log('🧹 Starting cleanup job for old sync sessions...');
  const { db } = await import('./db');
  const { syncSessions } = await import('@shared/schema');
  const { or, and, eq, lt } = await import('drizzle-orm');
  
  // Limpar sessões de sync antigas (>24h) a cada 6 horas
  setInterval(async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const deleted = await db
        .delete(syncSessions)
        .where(
          or(
            // Sessões completadas há mais de 24h
            and(
              eq(syncSessions.isRunning, false),
              lt(syncSessions.endTime, twentyFourHoursAgo)
            ),
            // Sessões travadas há mais de 24h (ainda isRunning mas não atualizadas)
            and(
              eq(syncSessions.isRunning, true),
              lt(syncSessions.lastUpdatedAt, twentyFourHoursAgo)
            )
          )
        )
        .returning();
      
      if (deleted.length > 0) {
        console.log(`🧹 Limpeza de sessões antigas: ${deleted.length} removidas`);
      }
    } catch (error) {
      console.error('Erro ao limpar sessões antigas:', error);
    }
  }, 6 * 60 * 60 * 1000); // A cada 6 horas
  
  console.log('✅ Cleanup job iniciado');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

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

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
