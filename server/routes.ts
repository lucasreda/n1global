import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { apiCache } from "./cache";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { insertUserSchema, loginSchema, insertOrderSchema, insertProductSchema } from "@shared/schema";
import { EuropeanFulfillmentService } from "./fulfillment-service";
import { shopifyService } from "./shopify-service";
import { storeContext } from "./middleware/store-context";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

interface AuthRequest extends Request {
  user?: any;
}

// Middleware to verify JWT token
const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token de acesso requerido" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: "Token inválido" });
    }
    req.user = user;
    next();
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }

      const user = await storage.createUser(userData);
      
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.status(201).json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Development endpoint to reset onboarding for testing
  app.post("/api/auth/reset-onboarding", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      await storage.resetUserOnboarding(req.user.id);
      res.json({ 
        success: true, 
        message: "Onboarding resetado. Faça logout e login novamente." 
      });
    } catch (error) {
      console.error("Error resetting onboarding:", error);
      res.status(500).json({ message: "Erro ao resetar onboarding" });
    }
  });

  // Smart Sync routes - for intelligent incremental synchronization
  app.post("/api/sync/start", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      // CRITICAL: Get user's operation for data isolation
      const userOperations = await storage.getUserOperations(req.user.id);
      const currentOperation = userOperations[0];
      
      if (!currentOperation) {
        return res.status(400).json({ 
          success: false,
          message: "Nenhuma operação encontrada. Complete o onboarding primeiro." 
        });
      }

      const { syncType = "intelligent", maxPages = 3 } = req.body;
      const { smartSyncService } = await import("./smart-sync-service");
      
      const userContext = {
        userId: req.user.id,
        operationId: currentOperation.id,
        storeId: req.user.storeId
      };
      
      let result;
      if (syncType === "full") {
        result = await smartSyncService.startFullInitialSync(userContext);
      } else if (syncType === "incremental") {
        result = await smartSyncService.startIncrementalSync({ maxPages }, userContext);
      } else {
        // Default: intelligent sync
        result = await smartSyncService.startIntelligentSync(userContext);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Smart sync error:", error);
      res.status(500).json({ message: "Failed to start smart sync" });
    }
  });

  app.get("/api/sync/stats", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const operationId = req.query.operationId as string;
      const { smartSyncService } = await import("./smart-sync-service");
      const stats = await smartSyncService.getSyncStats(operationId);
      
      res.json(stats);
    } catch (error) {
      console.error("Sync stats error:", error);
      res.status(500).json({ message: "Failed to get sync stats" });
    }
  });

  // Real-time sync progress endpoint for better user experience
  app.get("/api/sync/progress", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { smartSyncService } = await import("./smart-sync-service");
      const progress = await smartSyncService.getSyncProgress();
      res.json(progress);
    } catch (error) {
      console.error("Sync progress error:", error);
      res.status(500).json({ message: "Erro ao obter progresso da sincronização" });
    }
  });
  
  app.get("/api/sync/status/:jobId", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { jobId } = req.params;
      const { syncService } = await import("./sync-service");
      const job = await syncService.getSyncStatus(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Sync job not found" });
      }
      
      res.json(job);
    } catch (error) {
      console.error("Sync status error:", error);
      res.status(500).json({ message: "Failed to get sync status" });
    }
  });
  
  app.get("/api/sync/history", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { provider, limit = 10 } = req.query;
      const { syncService } = await import("./sync-service");
      const jobs = await syncService.getRecentSyncJobs(provider as string, Number(limit));
      
      res.json(jobs);
    } catch (error) {
      console.error("Sync history error:", error);
      res.status(500).json({ message: "Failed to get sync history" });
    }
  });

  // Dashboard routes - using real database data
  app.get("/api/dashboard/metrics", authenticateToken, storeContext, async (req: AuthRequest, res: Response) => {
    try {
      const period = (req.query.period as string) || '30d';
      const provider = req.query.provider as string;
      const operationId = req.query.operationId as string;

      console.log(`📊 Getting dashboard metrics for period: ${period}, provider: ${provider || 'all'}, operation: ${operationId || 'auto'}`);
      
      const { dashboardService } = await import("./dashboard-service");
      const metrics = await dashboardService.getDashboardMetrics(period as any, provider, req, operationId);

      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Erro ao buscar métricas" });
    }
  });

  app.get("/api/dashboard/revenue-chart", authenticateToken, storeContext, async (req: AuthRequest, res: Response) => {
    try {
      const period = (req.query.period as string) || '30d';
      const provider = req.query.provider as string;
      const operationId = req.query.operationId as string;

      const { dashboardService } = await import("./dashboard-service");
      const revenueData = await dashboardService.getRevenueOverTime(period as any, provider, req, operationId);

      res.json(revenueData);
    } catch (error) {
      console.error("Revenue chart error:", error);
      res.status(500).json({ 
        message: "Erro ao buscar dados de receita",
        error: error.message 
      });
    }
  });

  app.get("/api/dashboard/orders-by-status", authenticateToken, storeContext, async (req: AuthRequest, res: Response) => {
    try {
      const period = (req.query.period as string) || '30d';
      const provider = req.query.provider as string;

      const { dashboardService } = await import("./dashboard-service");
      const statusData = await dashboardService.getOrdersByStatus(period as any, provider, req);

      res.json(statusData);
    } catch (error) {
      console.error("Orders by status error:", error);
      res.status(500).json({ 
        message: "Erro ao buscar dados por status",
        error: error.message 
      });
    }
  });

  // Currency conversion routes
  app.get("/api/currency/rates", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { currencyService } = await import("./currency-service");
      const rates = await currencyService.getExchangeRates();
      res.json(rates);
    } catch (error) {
      console.error("Currency rates error:", error);
      res.status(500).json({ message: "Erro ao buscar taxas de câmbio" });
    }
  });

  app.post("/api/currency/convert", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { amount, fromCurrency } = req.body;
      const { currencyService } = await import("./currency-service");
      const convertedAmount = await currencyService.convertToBRL(amount, fromCurrency);
      res.json({ convertedAmount, originalAmount: amount, fromCurrency, toCurrency: 'BRL' });
    } catch (error) {
      console.error("Currency conversion error:", error);
      res.status(500).json({ message: "Erro ao converter moeda" });
    }
  });

  // Test CurrencyAPI endpoint
  app.get("/api/test-currency", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { CurrencyService } = await import("./currency-service");
      const currencyService = CurrencyService.getInstance();
      currencyService.clearCache(); // Forçar nova requisição
      const rates = await currencyService.getExchangeRates();
      res.json({ rates, message: "Taxas obtidas com sucesso da CurrencyAPI" });
    } catch (error) {
      console.error("Erro ao testar CurrencyAPI:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Operations routes
  app.get("/api/operations", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      console.log("Fetching operations for user:", req.user?.id);
      const operations = await storage.getUserOperations(req.user.id);
      console.log("Found operations:", operations);
      res.json(operations);
    } catch (error) {
      console.error("Operations error:", error);
      res.status(500).json({ message: "Erro ao buscar operações" });
    }
  });

  app.post("/api/operations", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { name, country, currency } = req.body;
      if (!name?.trim()) {
        return res.status(400).json({ message: "Nome da operação é obrigatório" });
      }
      if (!country?.trim()) {
        return res.status(400).json({ message: "País da operação é obrigatório" });
      }
      if (!currency?.trim()) {
        return res.status(400).json({ message: "Moeda da operação é obrigatória" });
      }

      // Create operation
      const operation = await storage.createOperation({
        name: name.trim(),
        description: `Operação criada em ${new Date().toLocaleDateString()}`,
        country: country.trim(),
        currency: currency.trim()
      }, req.user.id);

      console.log("New operation created:", operation);
      res.json(operation);
    } catch (error) {
      console.error("Create operation error:", error);
      res.status(500).json({ message: "Erro ao criar operação" });
    }
  });

  // Onboarding routes
  app.get("/api/user/onboarding-status", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      res.json({
        onboardingCompleted: user.onboardingCompleted,
        onboardingSteps: user.onboardingSteps
      });
    } catch (error) {
      console.error("Onboarding status error:", error);
      res.status(500).json({ message: "Erro ao buscar status do onboarding" });
    }
  });

  app.post("/api/onboarding/create-operation", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { name, country, currency } = req.body;
      if (!name?.trim()) {
        return res.status(400).json({ message: "Nome da operação é obrigatório" });
      }
      if (!country?.trim()) {
        return res.status(400).json({ message: "País da operação é obrigatório" });
      }
      if (!currency?.trim()) {
        return res.status(400).json({ message: "Moeda da operação é obrigatória" });
      }

      // Create operation
      const operation = await storage.createOperation({
        name: name.trim(),
        description: `Operação criada durante onboarding`,
        country: country.trim(),
        currency: currency.trim()
      }, req.user.id);

      // Update user onboarding step
      await storage.updateOnboardingStep(req.user.id, 'step1_operation', true);

      res.json({ operation });
    } catch (error) {
      console.error("Create operation error:", error);
      res.status(500).json({ message: "Erro ao criar operação" });
    }
  });

  app.post("/api/onboarding/complete-step", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { stepId } = req.body;
      if (!stepId) {
        return res.status(400).json({ message: "ID da etapa é obrigatório" });
      }

      await storage.updateOnboardingStep(req.user.id, stepId, true);
      res.json({ success: true });
    } catch (error) {
      console.error("Complete step error:", error);
      res.status(500).json({ message: "Erro ao completar etapa" });
    }
  });

  app.post("/api/onboarding/skip-step", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { stepId } = req.body;
      if (!stepId) {
        return res.status(400).json({ message: "ID da etapa é obrigatório" });
      }

      // Skip step by marking it as completed
      await storage.updateOnboardingStep(req.user.id, stepId, true);
      res.json({ success: true, message: "Etapa pulada com sucesso" });
    } catch (error) {
      console.error("Skip step error:", error);
      res.status(500).json({ message: "Erro ao pular etapa" });
    }
  });

  app.post("/api/onboarding/sync-data", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      console.log(`🔍 Onboarding sync-data: Starting for user ${req.user.id}`);
      
      // Get current data counts
      const userOperations = await storage.getUserOperations(req.user.id);
      console.log(`🔍 Onboarding: Found ${userOperations.length} operations for user`);
      
      const firstOperation = userOperations[0];
      console.log(`🔍 Onboarding: First operation:`, firstOperation ? firstOperation.name : 'NONE');
      
      let orderCount = 0;
      let campaignCount = 0;
      let syncedOrdersFromAPI = 0;

      if (firstOperation) {
        console.log(`🔍 Onboarding: Found operation ${firstOperation.name} (${firstOperation.id})`);
        
        // Get configured shipping providers for this operation
        const providers = await storage.getShippingProvidersByOperation(firstOperation.id);
        console.log(`🔍 Onboarding: Found ${providers.length} providers:`, providers.map(p => `${p.name} (${p.type}) - active: ${p.isActive}, apiKey: ${!!p.apiKey}`));
        
        const activeProvider = providers.find(p => p.isActive && p.apiKey);
        console.log(`🔍 Onboarding: Active provider:`, activeProvider ? `${activeProvider.name} (${activeProvider.type})` : 'NONE');

        if (activeProvider && activeProvider.type === 'european_fulfillment') {
          try {
            // Use the smart sync service for consistent synchronization
            const { smartSyncService } = await import('./smart-sync-service');
            
            // Get the user's store ID for context
            const userStoreId = req.user.storeId || firstOperation.storeId;
            
            // Create user context for the sync
            const userContext = {
              userId: req.user.id,
              operationId: firstOperation.id,
              storeId: userStoreId
            };
            
            console.log(`🚀 Starting onboarding sync for operation ${firstOperation.name} (${firstOperation.country})`);
            
            // Run a limited sync during onboarding (first 10 pages to avoid timeout)
            const syncResult = await smartSyncService.startIntelligentSyncLimited(userContext, 10);
            
            if (syncResult.success) {
              syncedOrdersFromAPI = syncResult.newLeads;
              console.log(`✅ Onboarding sync completed: ${syncResult.newLeads} orders imported`);
            } else {
              console.warn(`⚠️ Onboarding sync failed: ${syncResult.message}`);
              syncedOrdersFromAPI = 0;
            }
            
          } catch (apiError) {
            console.warn("Failed to sync from API:", apiError);
            console.error("Full API error:", apiError);
            // Fall back to database count
            const orders = await storage.getOrdersByStore(req.user.storeId || '');
            orderCount = orders.length;
          }
        } else {
          // No active provider, count existing orders in database
          const orders = await storage.getOrdersByStore(req.user.storeId || '');
          orderCount = orders.length;
        }

        // Check if user completed ads step - if not, campaigns should be 0
        const userStatus = await storage.getUser(req.user.id);
        const onboardingSteps = (userStatus as any)?.onboardingSteps || {};
        
        if (onboardingSteps.step4_ads) {
          campaignCount = 6; // Based on current Facebook ads setup
        } else {
          campaignCount = 0; // User skipped ads step
        }
      }

      const totalOrders = syncedOrdersFromAPI || orderCount;
      
      const status = {
        orders: {
          current: totalOrders,
          total: totalOrders, // Use actual count from API, no artificial limit
          completed: totalOrders > 0
        },
        campaigns: {
          current: campaignCount,
          total: campaignCount,
          completed: campaignCount > 0 || !firstOperation // Complete if no operation or has campaigns
        }
      };

      res.json({ status });
    } catch (error) {
      console.error("Sync data error:", error);
      res.status(500).json({ message: "Erro na sincronização" });
    }
  });

  app.post("/api/onboarding/complete", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      // Mark all steps as completed and onboarding as done
      await storage.completeOnboarding(req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Complete onboarding error:", error);
      res.status(500).json({ message: "Erro ao finalizar onboarding" });
    }
  });

  // Shipping providers routes
  app.get("/api/shipping-providers", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const operationId = req.headers['x-operation-id'] as string;
      if (!operationId) {
        return res.status(400).json({ message: "Operation ID é obrigatório" });
      }
      
      const providers = await storage.getShippingProvidersByOperation(operationId);
      res.json(providers);
    } catch (error) {
      console.error("Get shipping providers error:", error);
      res.status(500).json({ message: "Erro ao buscar transportadoras" });
    }
  });

  app.post("/api/shipping-providers", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { name, type, login, password } = req.body;
      const operationId = req.headers['x-operation-id'] as string;
      
      if (!name?.trim()) {
        return res.status(400).json({ message: "Nome da transportadora é obrigatório" });
      }
      
      if (!operationId) {
        return res.status(400).json({ message: "Operation ID é obrigatório" });
      }

      // Get user's store ID from the user record
      const user = await storage.getUser(req.user.id);
      if (!user?.storeId) {
        return res.status(400).json({ message: "Usuário não possui store associado" });
      }

      const provider = await storage.createShippingProvider({
        name: name.trim(),
        type: type || 'european_fulfillment',
        login: login || null,
        password: password || null
      }, user.storeId, operationId);

      res.json(provider);
    } catch (error) {
      console.error("Create shipping provider error:", error);
      res.status(500).json({ message: "Erro ao criar transportadora" });
    }
  });

  app.post("/api/shipping-providers/:id/configure", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      // Get provider details
      const provider = await storage.getShippingProvider(id);
      if (!provider) {
        return res.status(404).json({ message: "Transportadora não encontrada" });
      }

      // Configure integration based on provider type
      let configResult;
      
      if (provider.type === 'european_fulfillment') {
        // Use European Fulfillment service for authentication
        const { EuropeanFulfillmentService } = await import('./fulfillment-service');
        const service = new EuropeanFulfillmentService();
        
        // Update service credentials and test connection
        service.updateCredentials(provider.login, provider.password);
        configResult = await service.testConnection();
      } else {
        // For other providers, simulate configuration
        configResult = {
          success: true,
          token: `mock_token_${Date.now()}`,
          message: `Integração ${provider.name} configurada com sucesso`
        };
      }

      if (configResult.connected) {
        // Update provider as configured
        await storage.updateShippingProvider(id, {
          apiKey: 'configured',
          isActive: true
        });
      }

      res.json({
        success: configResult.connected,
        message: configResult.message || 'Configuração realizada'
      });
    } catch (error) {
      console.error("Configure provider error:", error);
      res.status(500).json({ 
        success: false,
        message: "Erro ao configurar integração" 
      });
    }
  });

  app.post("/api/shipping-providers/:id/test", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      // Get provider details
      const provider = await storage.getShippingProvider(id);
      if (!provider) {
        return res.status(404).json({ message: "Transportadora não encontrada" });
      }

      if (!provider.apiKey) {
        return res.status(400).json({
          success: false,
          message: "Provider não configurado. Configure primeiro."
        });
      }

      let testResult;

      if (provider.type === 'european_fulfillment') {
        // Test with European Fulfillment API
        const { EuropeanFulfillmentService } = await import('./fulfillment-service');
        const service = new EuropeanFulfillmentService();
        
        // Update service credentials
        service.updateCredentials(provider.login, provider.password);
        
        try {
          // Test connection to verify credentials work
          const connectionTest = await service.testConnection();
          
          if (connectionTest.connected) {
            testResult = {
              success: true,
              message: `Teste realizado com sucesso! ${connectionTest.message}`,
              testData: connectionTest
            };
          } else {
            testResult = {
              success: false,
              message: `Erro no teste: ${connectionTest.message}`
            };
          }
        } catch (error) {
          testResult = {
            success: false,
            message: `Erro no teste: ${error.message}`
          };
        }
      } else {
        // For other providers, simulate test
        testResult = {
          success: true,
          message: `Teste de integração ${provider.name} realizado com sucesso`,
          testData: {
            order_id: `TEST_${Date.now()}`,
            status: 'created'
          }
        };
      }

      if (testResult.success) {
        // Update provider with test timestamp
        await storage.updateShippingProvider(id, {
          isActive: true,
          lastTestAt: new Date()
        });
      }

      res.json({
        success: testResult.success,
        message: testResult.message,
        providerId: id
      });
    } catch (error) {
      console.error("Test provider error:", error);
      res.status(500).json({ 
        success: false,
        message: "Erro ao testar integração" 
      });
    }
  });

  // Facebook Ads routes
  app.get("/api/facebook/business-managers", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { facebookAdsService } = await import("./facebook-ads-service");
      const businessManagers = await facebookAdsService.getBusinessManagers();
      res.json(businessManagers);
    } catch (error) {
      console.error("Facebook business managers error:", error);
      res.status(500).json({ message: "Erro ao buscar Business Managers" });
    }
  });

  app.post("/api/facebook/business-managers", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { insertFacebookBusinessManagerSchema } = await import("@shared/schema");
      const validatedData = insertFacebookBusinessManagerSchema.parse(req.body);
      
      const { facebookAdsService } = await import("./facebook-ads-service");
      const businessManager = await facebookAdsService.addBusinessManager(validatedData);
      
      res.json(businessManager);
    } catch (error) {
      console.error("Add Facebook business manager error:", error);
      res.status(500).json({ message: "Erro ao adicionar Business Manager" });
    }
  });

  app.get("/api/facebook/accounts", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { facebookAdsService } = await import("./facebook-ads-service");
      const accounts = await facebookAdsService.getAdAccounts();
      res.json(accounts);
    } catch (error) {
      console.error("Facebook accounts error:", error);
      res.status(500).json({ message: "Erro ao buscar contas do Facebook" });
    }
  });

  app.post("/api/facebook/accounts", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { insertFacebookAdAccountSchema } = await import("@shared/schema");
      const validatedData = insertFacebookAdAccountSchema.parse(req.body);
      
      const { facebookAdsService } = await import("./facebook-ads-service");
      const { DashboardService } = await import("./dashboard-service");
      const dashboardService = new DashboardService();
      
      const account = await facebookAdsService.addAdAccount(validatedData);
      
      // Invalida cache do dashboard para refletir nova conta
      await dashboardService.invalidateCache();
      console.log('🔄 Dashboard cache invalidated after adding Facebook account');
      
      res.json(account);
    } catch (error) {
      console.error("Add Facebook account error:", error);
      res.status(500).json({ message: "Erro ao adicionar conta do Facebook" });
    }
  });

  app.get("/api/facebook/campaigns", authenticateToken, storeContext, async (req: AuthRequest, res: Response) => {
    try {
      const { period, autoSync } = req.query;
      const { facebookAdsService } = await import("./facebook-ads-service");
      const { syncManager } = await import("./sync-manager");
      
      // Get storeId from middleware context for data isolation
      const storeId = (req as any).storeId;
      
      // Verificar se deve fazer sincronização automática
      if (autoSync === 'true' && syncManager.shouldAutoSync()) {
        console.log('🔄 Iniciando sincronização automática (30min interval)');
        try {
          await facebookAdsService.syncCampaigns(period as string || "last_30d", storeId);
          syncManager.updateLastSyncTime();
          console.log('✅ Sincronização automática concluída');
        } catch (syncError) {
          console.error('❌ Erro na sincronização automática:', syncError);
        }
      }
      
      const campaigns = await facebookAdsService.getCampaignsWithPeriod(period as string || "last_30d", storeId);
      res.json(campaigns);
    } catch (error) {
      console.error("Facebook campaigns error:", error);
      res.status(500).json({ message: "Erro ao buscar campanhas do Facebook" });
    }
  });

  // Nova rota para obter informações de sincronização
  app.get("/api/facebook/sync-info", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { syncManager } = await import("./sync-manager");
      const syncInfo = syncManager.getSyncInfo();
      res.json(syncInfo);
    } catch (error) {
      console.error("Sync info error:", error);
      res.status(500).json({ message: "Erro ao buscar informações de sincronização" });
    }
  });

  app.post("/api/facebook/sync-period", authenticateToken, storeContext, async (req: AuthRequest, res: Response) => {
    try {
      const { period } = req.body;
      const { facebookAdsService } = await import("./facebook-ads-service");
      const { syncManager } = await import("./sync-manager");
      
      // Get storeId from middleware context for data isolation
      const storeId = (req as any).storeId;
      
      console.log('🔄 Iniciando sincronização por período');
      const result = await facebookAdsService.syncCampaigns(period || "last_30d", storeId);
      syncManager.updateLastSyncTime();
      console.log('✅ Sincronização por período concluída');
      
      res.json(result);
    } catch (error) {
      console.error("Facebook sync period error:", error);
      res.status(500).json({ message: "Erro ao sincronizar campanhas por período" });
    }
  });

  app.patch("/api/facebook/campaigns/:campaignId", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { campaignId } = req.params;
      const { isSelected } = req.body;
      const { facebookAdsService } = await import("./facebook-ads-service");
      const { DashboardService } = await import("./dashboard-service");
      const dashboardService = new DashboardService();
      
      await facebookAdsService.updateCampaignSelection(campaignId, isSelected);
      
      // Invalida cache do dashboard para refletir mudança na seleção
      await dashboardService.invalidateCache();
      console.log('🔄 Dashboard cache invalidated after campaign selection change');
      
      res.json({ success: true });
    } catch (error) {
      console.error("Facebook campaign update error:", error);
      res.status(500).json({ message: "Erro ao atualizar campanha" });
    }
  });

  app.post("/api/facebook/sync", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { period } = req.body;
      const { facebookAdsService } = await import("./facebook-ads-service");
      const { syncManager } = await import("./sync-manager");
      const { DashboardService } = await import("./dashboard-service");
      const dashboardService = new DashboardService();
      
      console.log('🔄 Iniciando sincronização manual');
      const result = await facebookAdsService.syncCampaigns(period || "last_30d");
      syncManager.updateLastSyncTime();
      
      // Invalida cache do dashboard após sincronização
      await dashboardService.invalidateCache();
      console.log('🔄 Dashboard cache invalidated after sync');
      console.log('✅ Sincronização manual concluída');
      
      res.json(result);
    } catch (error) {
      console.error("Facebook sync error:", error);
      res.status(500).json({ message: "Erro ao sincronizar campanhas do Facebook" });
    }
  });

  app.patch("/api/facebook/campaigns/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { isSelected } = req.body;
      
      const { facebookAdsService } = await import("./facebook-ads-service");
      const campaign = await facebookAdsService.updateCampaignSelection(id, isSelected);
      
      res.json(campaign);
    } catch (error) {
      console.error("Update campaign error:", error);
      res.status(500).json({ message: "Erro ao atualizar campanha" });
    }
  });

  // Auto-sync shipping data endpoint
  app.get('/api/sync/auto', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { syncManager } = await import("./sync-manager");
      const syncResult = await syncManager.autoSyncShippingIfNeeded();
      res.json(syncResult);
    } catch (error) {
      console.error('Error in auto-sync:', error);
      res.status(500).json({ 
        error: 'Auto-sync failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Get shipping sync status
  app.get('/api/sync/shipping-status', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { syncManager } = await import("./sync-manager");
      const syncInfo = syncManager.getShippingSyncInfo();
      res.json(syncInfo);
    } catch (error) {
      console.error('Error getting shipping sync status:', error);
      res.status(500).json({ 
        error: 'Failed to get sync status', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Rota para sincronização completa progressiva
  app.post('/api/sync/complete-progressive', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { forceComplete, maxRetries } = req.body;
      const { smartSyncService } = await import("./smart-sync-service");
      
      // Iniciar sincronização completa progressiva de forma assíncrona
      smartSyncService.performCompleteSyncProgressive({ 
        forceFullSync: forceComplete,
        maxRetries 
      }).catch(error => {
        console.error('Erro na sincronização completa progressiva:', error);
      });
      
      res.json({ 
        success: true, 
        message: 'Sincronização completa iniciada. Use /sync/complete-status para acompanhar o progresso.' 
      });
    } catch (error) {
      console.error('Erro ao iniciar sincronização completa progressiva:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro interno do servidor' 
      });
    }
  });

  // Rota para obter status da sincronização completa progressiva
  app.get('/api/sync/complete-status', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { smartSyncService } = await import("./smart-sync-service");
      const status = smartSyncService.getCompleteSyncStatus();
      res.json(status);
    } catch (error) {
      console.error('Erro ao obter status da sincronização completa:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro interno do servidor' 
      });
    }
  });

  // Orders routes - fetch from database with filters and pagination
  app.get("/api/orders", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      // CRITICAL: Get user's operation for data isolation
      const userOperations = await storage.getUserOperations(req.user.id);
      const currentOperation = userOperations[0];
      
      if (!currentOperation) {
        console.log(`⚠️ User ${req.user.id} has no operations - returning empty results`);
        return res.json({ data: [], total: 0, page: 1, totalPages: 0 });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string;
      const search = req.query.search as string;
      const days = req.query.days as string;
      
      console.log(`📋 Fetching orders for operation ${currentOperation.name}: limit=${limit}, offset=${offset}, status=${status || 'all'}, search=${search || 'none'}, days=${days || 'all'}`);
      
      // Build WHERE clause components - CRITICAL: Always filter by operationId first
      const whereConditions = [`operation_id = $${1}`];
      const params = [currentOperation.id];
      
      // Date filter - use order_date (actual order date) for business analytics
      if (days && days !== "all") {
        const daysNum = parseInt(days);
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - daysNum);
        whereConditions.push(`order_date >= $${params.length + 1}`);
        params.push(dateFrom.toISOString());
      }
      
      // Status filter
      if (status && status !== "all") {
        whereConditions.push(`status = $${params.length + 1}`);
        params.push(status);
      }
      
      // Search filter
      if (search) {
        whereConditions.push(`(customer_name ILIKE $${params.length + 1} OR customer_phone ILIKE $${params.length + 1} OR customer_city ILIKE $${params.length + 1} OR id ILIKE $${params.length + 1})`);
        params.push(`%${search}%`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      // Execute queries using raw SQL
      const { pool } = await import("./db");
      
      const [ordersResult, countResult] = await Promise.all([
        pool.query(`
          SELECT * FROM orders 
          ${whereClause}
          ORDER BY created_at DESC 
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `, [...params, limit, offset]),
        
        pool.query(`
          SELECT COUNT(*) as count FROM orders 
          ${whereClause}
        `, params)
      ]);

      const ordersData = ordersResult.rows;
      const totalCount = parseInt(countResult.rows[0].count);

      const currentPage = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(totalCount / limit);
      const hasNext = currentPage < totalPages;
      const hasPrev = currentPage > 1;

      console.log(`📋 Found ${ordersData.length} orders (page ${currentPage}/${totalPages}, total: ${totalCount})`);

      const responseData = {
        data: ordersData.map(order => ({
          ...order,
          // Format for frontend compatibility
          customerId: order.customer_id,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          customerPhone: order.customer_phone,
          customerAddress: order.customer_address,
          customerCity: order.customer_city,
          customerState: order.customer_state,
          customerCountry: order.customer_country,
          customerZip: order.customer_zip,
          paymentStatus: order.payment_status,
          paymentMethod: order.payment_method,
          trackingNumber: order.tracking_number,
          providerOrderId: order.provider_order_id,
          leadValue: order.total?.toString(),
          // Include cost fields
          productCost: parseFloat(order.product_cost || '0').toFixed(2),
          shippingCost: parseFloat(order.shipping_cost || '0').toFixed(2),
          items: JSON.stringify([{
            name: order.products?.[0]?.name || "Produto",
            quantity: 1,
            price: Number(order.total || 0)
          }])
        })),
        total: totalCount,
        totalPages,
        currentPage,
        hasNext,
        hasPrev
      };

      res.json(responseData);
    } catch (error) {
      console.error("Orders fetch error:", error);
      res.status(500).json({ 
        message: "Erro ao buscar pedidos",
        error: error.message 
      });
    }
  });

  app.get("/api/orders/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar pedido" });
    }
  });

  app.post("/api/orders", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.patch("/api/orders/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const updates = updateOrderSchema.parse(req.body);
      const order = await storage.updateOrder(req.params.id, updates);
      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }
      res.json(order);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.delete("/api/orders/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const deleted = await storage.deleteOrder(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }
      res.json({ message: "Pedido removido com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao remover pedido" });
    }
  });

  // European Fulfillment Center Integration Routes
  
  // Test connection
  app.get("/api/integrations/european-fulfillment/test", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const service = new EuropeanFulfillmentService();
      const result = await service.testConnection();
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        connected: false,
        message: "Erro ao testar conexão",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Update credentials
  app.post("/api/integrations/european-fulfillment/credentials", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { email, password, apiUrl } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }
      
      const service = new EuropeanFulfillmentService(email, password, apiUrl);
      
      // Test the new credentials
      const testResult = await service.testConnection();
      
      res.json({
        message: "Credenciais atualizadas",
        testResult
      });
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar credenciais" });
    }
  });

  // Get countries
  app.get("/api/integrations/european-fulfillment/countries", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const service = new EuropeanFulfillmentService();
      const countries = await service.getCountries();
      res.json(countries);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar países" });
    }
  });

  // Get stores
  app.get("/api/integrations/european-fulfillment/stores", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const service = new EuropeanFulfillmentService();
      const stores = await service.getStores();
      res.json(stores);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar lojas" });
    }
  });

  // Create store
  app.post("/api/integrations/european-fulfillment/stores", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { name, link } = req.body;
      
      if (!name || !link) {
        return res.status(400).json({ message: "Nome e link da loja são obrigatórios" });
      }
      
      const result = await europeanFulfillmentService.createStore({ name, link });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar loja" });
    }
  });

  // Get leads list
  app.get("/api/integrations/european-fulfillment/leads", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      // Default to Italy if no country specified
      const country = (req.query.country as string) || "ITALY";
      const service = new EuropeanFulfillmentService();
      const leads = await service.getLeadsList(country);
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar leads" });
    }
  });

  // Create lead
  app.post("/api/integrations/european-fulfillment/leads", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const leadData = req.body;
      const service = new EuropeanFulfillmentService();
      const result = await service.createLead(leadData);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar lead" });
    }
  });

  // Fulfillment leads routes
  app.get("/api/fulfillment-leads", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const leads = await storage.getFulfillmentLeads();
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar leads de fulfillment" });
    }
  });

  app.get("/api/fulfillment-leads/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const lead = await storage.getFulfillmentLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead não encontrado" });
      }
      res.json(lead);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar lead" });
    }
  });

  app.post("/api/fulfillment-leads", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const leadData = req.body;
      
      // Try to send to European Fulfillment Center
      const result = await europeanFulfillmentService.createLead(leadData);
      
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.get("/api/fulfillment-leads/:id/status", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const lead = await storage.getFulfillmentLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead não encontrado" });
      }

      // Get status from European Fulfillment Center
      const service = new EuropeanFulfillmentService();
      const status = await service.getLeadStatus(lead.leadNumber);
      
      if (status) {
        // Update local status
        await storage.updateFulfillmentLead(lead.id, {
          status: status.status
        });
      }

      res.json(status || { status: lead.status });
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar status do lead" });
    }
  });

  // Onboarding Step 5: Data Synchronization Test Route
  app.post("/api/onboarding/test-sync", authenticateToken, storeContext, async (req: AuthRequest, res: Response) => {
    try {
      const { operationId, maxOrders = 50 } = req.body;
      const storeId = (req as any).storeId;
      
      if (!operationId) {
        return res.status(400).json({ message: "Operation ID é obrigatório" });
      }
      
      console.log(`🧪 Iniciando teste de sincronização do onboarding para operação ${operationId}`);
      
      // Import smart sync service
      const { SmartSyncService } = await import("./smart-sync-service");
      const syncService = new SmartSyncService();
      
      // Get operation details
      const { db } = await import("./db");
      const { operations } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const [operation] = await db
        .select()
        .from(operations)
        .where(eq(operations.id, operationId))
        .limit(1);
      
      if (!operation) {
        return res.status(404).json({ message: "Operação não encontrada" });
      }
      
      // Create user context for sync
      const userContext = {
        userId: req.user.id,
        operationId: operationId,
        storeId: storeId
      };
      
      // Run limited sync (only 3-4 pages for testing = ~45-60 orders)
      const pageLimit = Math.ceil(maxOrders / 15); // 15 orders per page
      const result = await syncService.startIntelligentSyncLimited(userContext, pageLimit);
      
      // Update onboarding step 5 as completed if sync was successful
      if (result.success && result.newLeads > 0) {
        const user = await storage.getUser(req.user.id);
        if (user) {
          const steps = typeof user.onboardingSteps === 'string' 
            ? JSON.parse(user.onboardingSteps) 
            : user.onboardingSteps || {};
          
          steps.step5_sync = true;
          
          await storage.updateUser(req.user.id, {
            onboardingCompleted: true,
            onboardingSteps: JSON.stringify(steps)
          });
          
          console.log(`✅ Onboarding concluído para usuário ${req.user.id}`);
        }
      }
      
      res.json({
        success: result.success,
        message: result.success 
          ? `Sincronização teste concluída: ${result.newLeads} pedidos importados`
          : "Falha na sincronização de teste",
        details: {
          newOrders: result.newLeads,
          updatedOrders: result.updatedLeads,
          totalProcessed: result.totalProcessed,
          pagesScanned: result.pagesScanned || pageLimit,
          operationName: operation.name,
          operationCountry: operation.country,
          onboardingCompleted: result.success && result.newLeads > 0
        }
      });
      
    } catch (error) {
      console.error("Onboarding sync test error:", error);
      res.status(500).json({ 
        success: false,
        message: "Erro no teste de sincronização",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Products routes
  app.get("/api/products", authenticateToken, storeContext, async (req: AuthRequest, res: Response) => {
    try {
      // Get storeId from middleware context for data isolation
      const storeId = (req as any).storeId;
      const products = await storage.getProducts(storeId);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar produtos" });
    }
  });

  app.get("/api/products/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar produto" });
    }
  });

  app.post("/api/products", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  app.patch("/api/products/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const updates = req.body;
      const product = await storage.updateProduct(req.params.id, updates);
      if (!product) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
      res.json(product);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  // Shipping providers routes
  app.get("/api/shipping-providers", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const providers = await storage.getShippingProviders();
      res.json(providers);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar provedores de envio" });
    }
  });

  // Unified Ad Networks Routes (Facebook + Google)
  
  // Get all ad accounts (Facebook + Google)
  app.get("/api/ad-accounts", authenticateToken, storeContext, async (req: AuthRequest, res: Response) => {
    try {
      const { adAccounts } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      
      // Get storeId from middleware context for data isolation
      const storeId = (req as any).storeId;
      
      const accounts = await db
        .select()
        .from(adAccounts)
        .where(eq(adAccounts.storeId, storeId));
        
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching ad accounts:", error);
      res.status(500).json({ message: "Erro ao buscar contas de anúncios" });
    }
  });

  // Add new ad account (Facebook or Google)
  app.post("/api/ad-accounts", authenticateToken, storeContext, async (req: AuthRequest, res: Response) => {
    try {
      const { insertAdAccountSchema, adAccounts } = await import("@shared/schema");
      const { db } = await import("./db");
      
      // Get storeId from middleware context for data isolation
      const storeId = (req as any).storeId;
      
      const accountData = insertAdAccountSchema.parse(req.body);
      
      // Validate network type
      if (!['facebook', 'google'].includes(accountData.network)) {
        return res.status(400).json({ message: "Rede inválida. Use 'facebook' ou 'google'" });
      }
      
      // Test connection based on network
      if (accountData.network === 'facebook') {
        const { facebookAdsService } = await import("./facebook-ads-service");
        const isValid = await facebookAdsService.authenticate(
          accountData.accessToken || '',
          accountData.accountId
        );
        if (!isValid) {
          return res.status(400).json({ message: "Credenciais do Facebook inválidas" });
        }
      } else if (accountData.network === 'google') {
        // Allow account creation but mark as inactive if Google Ads credentials are missing
        if (!process.env.GOOGLE_ADS_DEVELOPER_TOKEN) {
          console.log('⚠️ Google Ads credenciais não configuradas, conta será criada como inativa');
          accountData.isActive = false;
        } else {
          // Only validate if credentials are available
          try {
            const { googleAdsService } = await import("./google-ads-service");
            const isValid = await googleAdsService.authenticate(
              accountData.accessToken || '',
              accountData.accountId
            );
            if (!isValid) {
              return res.status(400).json({ message: "Credenciais do Google Ads inválidas" });
            }
            accountData.isActive = true;
          } catch (error) {
            console.error('Erro validando Google Ads:', error);
            accountData.isActive = false;
          }
        }
      }

      const [newAccount] = await db
        .insert(adAccounts)
        .values({
          ...accountData,
          storeId // Associate account with store for data isolation
        })
        .returning();
        
      res.status(201).json(newAccount);
    } catch (error) {
      console.error("Error adding ad account:", error);
      res.status(500).json({ message: "Erro ao adicionar conta de anúncios" });
    }
  });

  // Get unified campaigns (Facebook + Google)
  app.get("/api/campaigns", authenticateToken, storeContext, async (req: AuthRequest, res: Response) => {
    try {
      const { campaigns, adAccounts } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq, and, inArray } = await import("drizzle-orm");
      
      // Get storeId from middleware context for data isolation
      const storeId = (req as any).storeId;
      
      const period = req.query.period as string || 'last_30d';
      const autoSync = req.query.autoSync === 'true';
      
      // Auto-sync both Facebook and Google Ads if needed
      if (autoSync) {
        try {
          // Sync Facebook Ads
          const { facebookAdsService } = await import("./facebook-ads-service");
          await facebookAdsService.syncCampaigns(period, storeId);
          
          // Sync Google Ads
          const { googleAdsService } = await import("./google-ads-service");
          await googleAdsService.syncCampaigns(period, storeId);
        } catch (error) {
          console.error('Auto-sync failed:', error);
        }
      }
      
      // CRITICAL: Only get campaigns from accounts belonging to this store
      const storeAccounts = await db
        .select()
        .from(adAccounts)
        .where(eq(adAccounts.storeId, storeId));
      
      const storeAccountIds = storeAccounts.map(acc => acc.accountId);
      
      if (storeAccountIds.length === 0) {
        return res.json([]);
      }
      
      // Get campaigns only from store's accounts
      const storeCampaigns = await db
        .select()
        .from(campaigns)
        .where(inArray(campaigns.accountId, storeAccountIds));
      
      // Add account name to campaigns (only from store accounts)
      const campaignsWithAccountInfo = storeCampaigns.map(campaign => ({
        ...campaign,
        accountName: storeAccounts.find(acc => acc.accountId === campaign.accountId)?.name || 'Conta Desconhecida'
      }));
      
      res.json(campaignsWithAccountInfo);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Erro ao buscar campanhas" });
    }
  });

  // Update campaign selection (Facebook + Google)
  app.patch("/api/campaigns/:id", authenticateToken, storeContext, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { isSelected } = req.body;
      const { campaigns, adAccounts } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq, and, inArray } = await import("drizzle-orm");
      
      // Get storeId from middleware context for data isolation
      const storeId = (req as any).storeId;
      
      // CRITICAL: Verify campaign belongs to user's store before updating
      const storeAccountIds = await db
        .select({ accountId: adAccounts.accountId })
        .from(adAccounts)
        .where(eq(adAccounts.storeId, storeId));
      
      const accountIds = storeAccountIds.map(acc => acc.accountId);
      
      const [updatedCampaign] = await db
        .update(campaigns)
        .set({ isSelected })
        .where(
          and(
            eq(campaigns.id, id),
            inArray(campaigns.accountId, accountIds)
          )
        )
        .returning();
        
      if (!updatedCampaign) {
        return res.status(404).json({ message: "Campanha não encontrada ou sem permissão" });
      }
      
      res.json(updatedCampaign);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ message: "Erro ao atualizar campanha" });
    }
  });

  // Shopify Integration Routes
  
  // Get Shopify integration for operation
  app.get("/api/integrations/shopify", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { operationId } = req.query;
      
      if (!operationId) {
        return res.status(400).json({ message: "operationId é obrigatório" });
      }
      
      const integration = await shopifyService.getIntegration(operationId as string);
      
      if (!integration) {
        return res.status(404).json({ message: "Integração Shopify não encontrada" });
      }
      
      res.json(integration);
    } catch (error) {
      console.error("Error getting Shopify integration:", error);
      res.status(500).json({ message: "Erro ao buscar integração Shopify" });
    }
  });

  // Save/update Shopify integration
  app.post("/api/integrations/shopify", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { operationId, shopName, accessToken } = req.body;
      
      if (!operationId || !shopName || !accessToken) {
        return res.status(400).json({ message: "operationId, shopName e accessToken são obrigatórios" });
      }
      
      const integration = await shopifyService.saveIntegration(operationId, shopName, accessToken);
      res.json(integration);
    } catch (error) {
      console.error("Error saving Shopify integration:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao salvar integração Shopify" 
      });
    }
  });

  // Test Shopify connection
  app.post("/api/integrations/shopify/test", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { shopName, accessToken } = req.body;
      
      if (!shopName || !accessToken) {
        return res.status(400).json({ message: "shopName e accessToken são obrigatórios" });
      }
      
      const result = await shopifyService.testConnection(shopName, accessToken);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error testing Shopify connection:", error);
      res.status(500).json({ message: "Erro ao testar conexão Shopify" });
    }
  });

  // Sync Shopify data
  app.post("/api/integrations/shopify/sync", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { operationId } = req.query;
      
      if (!operationId) {
        return res.status(400).json({ message: "operationId é obrigatório" });
      }
      
      const result = await shopifyService.syncData(operationId as string);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error syncing Shopify data:", error);
      res.status(500).json({ message: "Erro ao sincronizar dados Shopify" });
    }
  });

  // Remove Shopify integration
  app.delete("/api/integrations/shopify", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { operationId } = req.query;
      
      if (!operationId) {
        return res.status(400).json({ message: "operationId é obrigatório" });
      }
      
      const removed = await shopifyService.removeIntegration(operationId as string);
      
      if (!removed) {
        return res.status(404).json({ message: "Integração Shopify não encontrada" });
      }
      
      res.json({ message: "Integração Shopify removida com sucesso" });
    } catch (error) {
      console.error("Error removing Shopify integration:", error);
      res.status(500).json({ message: "Erro ao remover integração Shopify" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
