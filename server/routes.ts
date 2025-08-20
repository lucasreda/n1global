import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { apiCache } from "./cache";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { insertUserSchema, loginSchema, insertOrderSchema, insertProductSchema } from "@shared/schema";
import { europeanFulfillmentService } from "./fulfillment-service";

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

  // Sync routes - for importing data from providers
  app.post("/api/sync/start", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { provider = 'european_fulfillment', type = 'full_sync' } = req.body;
      
      console.log(`🔄 Starting sync for provider: ${provider}, type: ${type}`);
      
      const { syncService } = await import("./sync-service");
      const jobId = await syncService.startSync(provider, type);
      
      res.json({ 
        success: true, 
        jobId,
        message: `Sync job started for ${provider}` 
      });
    } catch (error) {
      console.error("Sync start error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to start sync job",
        error: error.message 
      });
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
  app.get("/api/dashboard/metrics", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const period = (req.query.period as string) || '30d';
      const provider = req.query.provider as string;

      console.log(`📊 Getting dashboard metrics for period: ${period}, provider: ${provider || 'all'}`);
      
      const { dashboardService } = await import("./dashboard-service");
      const metrics = await dashboardService.getDashboardMetrics(period as any, provider);

      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Erro ao buscar métricas" });
    }
  });

  app.get("/api/dashboard/revenue-chart", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const period = (req.query.period as string) || '30d';
      const provider = req.query.provider as string;

      const { dashboardService } = await import("./dashboard-service");
      const revenueData = await dashboardService.getRevenueOverTime(period as any, provider);

      res.json(revenueData);
    } catch (error) {
      console.error("Revenue chart error:", error);
      res.status(500).json({ 
        message: "Erro ao buscar dados de receita",
        error: error.message 
      });
    }
  });

  app.get("/api/dashboard/orders-by-status", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const period = (req.query.period as string) || '30d';
      const provider = req.query.provider as string;

      const { dashboardService } = await import("./dashboard-service");
      const statusData = await dashboardService.getOrdersByStatus(period as any, provider);

      res.json(statusData);
    } catch (error) {
      console.error("Orders by status error:", error);
      res.status(500).json({ 
        message: "Erro ao buscar dados por status",
        error: error.message 
      });
    }
  });

  // Orders routes - with optimized API integration and caching
  app.get("/api/orders", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string;
      const search = req.query.search as string;
      const days = req.query.days as string;
      
      // Create cache key based on all filter parameters
      const cacheKey = `orders:${status || 'all'}:${search || 'none'}:${days || 'all'}`;
      
      // Check cache first
      let allOrders = apiCache.get(cacheKey);
      
      if (!allOrders) {
        console.log("🔄 Cache miss - fetching orders from API");
        
        // Get optimized data from European Fulfillment API (only first 5 pages = ~75 orders)
        let apiOrders: any[] = [];
        try {
          let allLeads: any[] = [];
          const maxPages = 5; // Limit to first 5 pages for better performance
          
          // Calculate date range for API filtering  
          let dateFilter: { from?: string, to?: string } | undefined;
          if (days && days !== "all") {
            const daysNum = parseInt(days);
            const toDate = new Date();
            const fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - daysNum);
            
            dateFilter = {
              from: fromDate.toISOString().split('T')[0],
              to: toDate.toISOString().split('T')[0]
            };
          }
          
          for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
            const pageLeads = await europeanFulfillmentService.getLeadsList("ITALY", currentPage);
            allLeads = allLeads.concat(pageLeads);
            
            // Break early if we get less than full page
            if (pageLeads.length < 15) break;
          }
          
          apiOrders = europeanFulfillmentService.convertLeadsToOrders(allLeads);
          console.log(`✅ Converted ${allLeads.length} API leads to ${apiOrders.length} orders from ${Math.min(maxPages, allLeads.length / 15)} pages`);
        } catch (apiError) {
          console.warn("⚠️  Failed to fetch API orders, using local data only:", apiError);
        }
      
        // Get local orders as backup/additional data
        let localOrders: any[] = [];
        try {
          localOrders = await storage.getOrders(100, 0); // Limit local orders too
        } catch (localError) {
          console.warn("⚠️  Failed to fetch local orders:", localError);
        }
        
        // Combine API orders (priority) with local orders
        allOrders = [...apiOrders, ...localOrders];
        
        // Apply filters
        if (status && status !== "all") {
          allOrders = allOrders.filter((order: any) => {
            const orderStatus = order.deliveryStatus || order.status;
            return orderStatus.toLowerCase() === status.toLowerCase();
          });
        }
        
        if (search) {
          const searchLower = search.toLowerCase();
          allOrders = allOrders.filter((order: any) => 
            order.customerName?.toLowerCase().includes(searchLower) ||
            order.customerPhone?.toLowerCase().includes(searchLower) ||
            order.customerCity?.toLowerCase().includes(searchLower) ||
            order.id?.toLowerCase().includes(searchLower) ||
            order.trackingNumber?.toLowerCase().includes(searchLower)
          );
        }
        
        if (days && days !== "all") {
          const daysNum = parseInt(days);
          const now = new Date();
          let cutoffDate: Date;
          
          if (daysNum === 1) {
            // For "today", start from beginning of today
            cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          } else {
            // For other periods, go back N days from now
            cutoffDate = new Date(now.getTime() - (daysNum * 24 * 60 * 60 * 1000));
          }
          
          allOrders = allOrders.filter((order: any) => {
            const orderDate = new Date(order.createdAt);
            
            if (daysNum === 1) {
              // For today, check if it's the same day
              return orderDate.toDateString() === now.toDateString();
            }
            
            return orderDate >= cutoffDate && orderDate <= now;
          });
        }
        
        // Sort by creation date (most recent first)
        allOrders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        // Cache the filtered results for 3 minutes
        apiCache.set(cacheKey, allOrders, 3);
      } else {
        console.log("🎯 Cache hit - using cached orders");
      }
      
      // Calculate pagination
      const totalOrders = allOrders.length;
      const totalPages = Math.ceil(totalOrders / limit);
      const paginatedOrders = allOrders.slice(offset, offset + limit);
      
      // Return paginated response
      res.json({
        data: paginatedOrders,
        total: totalOrders,
        totalPages,
        currentPage: Math.floor(offset / limit) + 1,
        hasNext: offset + limit < totalOrders,
        hasPrev: offset > 0
      });
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Erro ao buscar pedidos" });
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
      const result = await europeanFulfillmentService.testConnection();
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
      
      europeanFulfillmentService.updateCredentials(email, password, apiUrl);
      
      // Test the new credentials
      const testResult = await europeanFulfillmentService.testConnection();
      
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
      const countries = await europeanFulfillmentService.getCountries();
      res.json(countries);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar países" });
    }
  });

  // Get stores
  app.get("/api/integrations/european-fulfillment/stores", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const stores = await europeanFulfillmentService.getStores();
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
      const leads = await europeanFulfillmentService.getLeadsList(country);
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar leads" });
    }
  });

  // Create lead
  app.post("/api/integrations/european-fulfillment/leads", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const leadData = req.body;
      const result = await europeanFulfillmentService.createLead(leadData);
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
      const status = await europeanFulfillmentService.getLeadStatus(lead.leadNumber);
      
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

  // Products routes
  app.get("/api/products", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const products = await storage.getProducts();
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

  const httpServer = createServer(app);
  return httpServer;
}
