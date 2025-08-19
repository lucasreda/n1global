import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { insertUserSchema, loginSchema, insertOrderSchema, updateOrderSchema, insertFulfillmentLeadSchema, insertProductSchema } from "@shared/schema";
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

  // Dashboard routes - with real API integration and date filtering
  app.get("/api/dashboard/metrics", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const date = req.query.date as string;
      const days = req.query.days as string;
      
      // Get real data from European Fulfillment API
      let apiMetrics: any = null;
      try {
        // Get first few pages for dashboard metrics
        let allLeads: any[] = [];
        for (let page = 1; page <= 5; page++) { // Get first 5 pages for metrics
          const pageLeads = await europeanFulfillmentService.getLeadsList("ITALY", page);
          allLeads = allLeads.concat(pageLeads);
          if (pageLeads.length < 15) break; // Stop if we get less than full page
        }
        
        let orders = europeanFulfillmentService.convertLeadsToOrders(allLeads);
        
        // Apply date filter if specified
        if (days && days !== "all") {
          const daysNum = parseInt(days);
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - daysNum);
          
          orders = orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate >= cutoffDate;
          });
        }
        
        // Calculate real metrics from filtered API data
        const totalOrders = orders.length;
        const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
        const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
        const shippedOrders = orders.filter(o => o.status === 'shipped').length;
        const confirmedOrders = orders.filter(o => o.status === 'confirmed').length;
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        
        const paidOrders = orders.filter(o => o.paymentStatus === 'paid').length;
        const totalRevenue = orders.filter(o => o.paymentStatus === 'paid').reduce((sum, o) => sum + o.total, 0);
        
        const successRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;
        const conversionRate = totalOrders > 0 ? (paidOrders / totalOrders) * 100 : 0;
        
        apiMetrics = {
          id: `metrics-${new Date().toISOString().split('T')[0]}`,
          date: new Date().toISOString().split('T')[0],
          totalOrders,
          successfulOrders: deliveredOrders,
          cancelledOrders,
          shippedOrders,
          confirmedOrders,
          pendingOrders,
          revenue: totalRevenue,
          successRate: Math.round(successRate * 100) / 100,
          conversionRate: Math.round(conversionRate * 100) / 100,
          period: days || "all",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        console.log(`📊 Generated real metrics from ${totalOrders} API orders (filtered for ${days || 'all'} days)`);
      } catch (apiError) {
        console.warn("⚠️  Failed to fetch API metrics, using local data:", apiError);
      }
      
      // Fallback to local metrics if API fails
      if (!apiMetrics) {
        apiMetrics = await storage.getDashboardMetrics(date);
      }
      
      res.json(apiMetrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Erro ao buscar métricas" });
    }
  });

  // Orders routes - with real API integration, filters and pagination
  app.get("/api/orders", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string;
      const search = req.query.search as string;
      const days = req.query.days as string;
      
      // Get all real data from European Fulfillment API
      let apiOrders: any[] = [];
      try {
        // Fetch multiple pages to get all orders
        let allLeads: any[] = [];
        let currentPage = 1;
        let hasMorePages = true;
        
        while (hasMorePages && currentPage <= 10) { // Limit to first 10 pages for now (150 orders)
          const pageLeads = await europeanFulfillmentService.getLeadsList("ITALY", currentPage);
          allLeads = allLeads.concat(pageLeads);
          
          // Check if we have more pages (simplified check)
          if (pageLeads.length < 15) { // If less than page size, we're done
            hasMorePages = false;
          } else {
            currentPage++;
          }
          
          // Limit to prevent excessive API calls
          if (currentPage > 10) hasMorePages = false;
        }
        
        apiOrders = europeanFulfillmentService.convertLeadsToOrders(allLeads);
        console.log(`✅ Converted ${allLeads.length} API leads to ${apiOrders.length} orders from ${Math.min(currentPage - 1, 10)} pages`);
      } catch (apiError) {
        console.warn("⚠️  Failed to fetch API orders, using local data only:", apiError);
      }
      
      // Get local orders as backup/additional data
      let localOrders: any[] = [];
      if (status) {
        localOrders = await storage.getOrdersByStatus(status);
      } else {
        localOrders = await storage.getOrders(1000, 0); // Get more for filtering
      }
      
      // Combine API orders (priority) with local orders
      let allOrders = [...apiOrders, ...localOrders];
      
      // Apply status filter
      if (status && status !== "all") {
        allOrders = allOrders.filter(order => {
          const orderStatus = order.deliveryStatus || order.status;
          return orderStatus.toLowerCase() === status.toLowerCase();
        });
      }
      
      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        allOrders = allOrders.filter(order => 
          order.customerName?.toLowerCase().includes(searchLower) ||
          order.customerPhone?.toLowerCase().includes(searchLower) ||
          order.customerCity?.toLowerCase().includes(searchLower) ||
          order.id?.toLowerCase().includes(searchLower) ||
          order.trackingNumber?.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply date filter
      if (days && days !== "all") {
        const daysNum = parseInt(days);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysNum);
        
        allOrders = allOrders.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= cutoffDate;
        });
      }
      
      // Sort by creation date (most recent first)
      allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
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
      const leadData = insertFulfillmentLeadSchema.parse(req.body);
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
      const leadData = insertFulfillmentLeadSchema.parse(req.body);
      
      // Create lead locally first
      const localLead = await storage.createFulfillmentLead(leadData);
      
      // Try to send to European Fulfillment Center
      const result = await europeanFulfillmentService.createLead(leadData);
      
      if (result.success && result.lead_number) {
        // Update local lead with remote lead number
        await storage.updateFulfillmentLead(localLead.id, {
          leadNumber: result.lead_number,
          status: "sent"
        });
      }
      
      res.status(201).json({
        ...localLead,
        fulfillmentResponse: result
      });
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
