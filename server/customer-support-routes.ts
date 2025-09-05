import { Request, Response, Express, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { customerSupportService } from "./customer-support-service";
import { db } from "./db.js";
import { customerSupportMessages, customerSupportTickets } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "cod-dashboard-secret-key-development-2025";

interface AuthRequest extends Request {
  user?: any;
}

// Middleware to verify JWT token
const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  console.log("🔐 Auth Debug:", {
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
    url: req.url,
    method: req.method
  });

  if (!token) {
    console.log("❌ No token provided");
    return res.status(401).json({ message: "Token de acesso requerido" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      console.log("❌ JWT verification failed:", err.message);
      return res.status(403).json({ message: "Token inválido" });
    }
    console.log("✅ JWT verified for user:", user.email);
    req.user = user;
    next();
  });
};

export function registerCustomerSupportRoutes(app: Express) {
  
  // ============================================================================
  // AUTHENTICATED ENDPOINTS (Customer Support Dashboard)
  // ============================================================================
  
  /**
   * Initialize support for an operation
   */
  app.post("/api/customer-support/init", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId, operationName } = req.body;

      if (!operationId) {
        return res.status(400).json({ message: "Operation ID is required" });
      }

      const operation = await customerSupportService.initializeOperationSupport(
        operationId,
        operationName || 'Support Operation'
      );

      res.json({
        success: true,
        operation
      });
    } catch (error) {
      console.error('Error initializing customer support:', error);
      res.status(500).json({ 
        message: "Failed to initialize customer support",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Get support configuration for an operation
   */
  app.get("/api/customer-support/config/:operationId", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId } = req.params;
      
      const operation = await customerSupportService.getOperationSupport(operationId);
      
      if (!operation) {
        return res.status(404).json({ message: "Support not configured for this operation" });
      }

      res.json(operation);
    } catch (error) {
      console.error('Error getting support config:', error);
      res.status(500).json({ 
        message: "Failed to get support configuration",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Get categories for an operation
   */
  app.get("/api/customer-support/:operationId/categories", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId } = req.params;
      
      const categories = await customerSupportService.getCategories(operationId);
      
      res.json(categories);
    } catch (error) {
      console.error('Error getting support categories:', error);
      res.status(500).json({ 
        message: "Failed to get support categories",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Get tickets for an operation with filters
   */
  app.get("/api/customer-support/:operationId/tickets", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId } = req.params;
      const { 
        status = 'all', 
        category = 'all', 
        search = '', 
        assignedTo,
        page = '1',
        limit = '25'
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const result = await customerSupportService.getTickets(operationId, {
        status: status as string,
        category: category as string,
        search: search as string,
        assignedTo: assignedTo as string,
        limit: limitNum,
        offset
      });

      res.json({
        tickets: result.tickets,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          totalPages: Math.ceil(result.total / limitNum)
        }
      });
    } catch (error) {
      console.error('Error getting support tickets:', error);
      res.status(500).json({ 
        message: "Failed to get support tickets",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Get a specific ticket with messages
   */
  app.get("/api/customer-support/:operationId/tickets/:ticketId", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId, ticketId } = req.params;
      
      const ticket = await customerSupportService.getTicket(operationId, ticketId);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      res.json(ticket);
    } catch (error) {
      console.error('Error getting ticket:', error);
      res.status(500).json({ 
        message: "Failed to get ticket",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Create a new ticket
   */
  app.post("/api/customer-support/:operationId/tickets", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId } = req.params;
      const ticketData = req.body;

      const ticket = await customerSupportService.createTicket(operationId, ticketData);

      res.json({
        success: true,
        ticket
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      res.status(500).json({ 
        message: "Failed to create ticket",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Add a message to a ticket
   */
  app.post("/api/customer-support/:operationId/tickets/:ticketId/messages", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId, ticketId } = req.params;
      const messageData = req.body;

      const message = await customerSupportService.addMessage(operationId, ticketId, messageData);

      res.json({
        success: true,
        message
      });
    } catch (error) {
      console.error('Error adding message:', error);
      res.status(500).json({ 
        message: "Failed to add message",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Update ticket status
   */
  app.patch("/api/customer-support/:operationId/tickets/:ticketId/status", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId, ticketId } = req.params;
      const { status, assignedTo } = req.body;

      await customerSupportService.updateTicketStatus(operationId, ticketId, status, assignedTo);

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      res.status(500).json({ 
        message: "Failed to update ticket status",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Send email reply
   */
  app.post("/api/customer-support/:operationId/tickets/:ticketId/reply", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId, ticketId } = req.params;
      const { subject, content, senderName, senderEmail } = req.body;
      const user = (req as any).user;

      const result = await customerSupportService.sendEmailReply(
        operationId,
        ticketId,
        subject,
        content,
        senderName || user?.name || 'Agent',
        senderEmail || user?.email || 'agent@support.com'
      );

      if (result.success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ message: result.error || 'Failed to send reply' });
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      res.status(500).json({ 
        message: "Failed to send reply",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Get dashboard metrics for an operation
   */
  app.get("/api/customer-support/:operationId/metrics", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId } = req.params;
      const { period = '7d' } = req.query;

      const metrics = await customerSupportService.getDashboardMetrics(operationId, period as string);

      res.json(metrics);
    } catch (error) {
      console.error('Error getting support metrics:', error);
      res.status(500).json({ 
        message: "Failed to get support metrics",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Configure Mailgun domain for operation
   */
  app.post("/api/customer-support/:operationId/configure-domain", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId } = req.params;
      const { domainName, isCustomDomain = false } = req.body;

      if (!domainName) {
        return res.status(400).json({ message: "Domain name is required" });
      }

      const result = await customerSupportService.configureMailgunDomain(
        operationId,
        domainName,
        isCustomDomain
      );

      if (result.success) {
        res.json({ success: true, domain: result.domain });
      } else {
        res.status(500).json({ message: result.error || 'Failed to configure domain' });
      }
    } catch (error) {
      console.error('Error configuring domain:', error);
      res.status(500).json({ 
        message: "Failed to configure domain",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Test endpoint to create sample data
   */
  app.post("/api/customer-support/:operationId/test-data", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId } = req.params;
      
      // Initialize support if not exists
      await customerSupportService.initializeOperationSupport(operationId, 'Test Operation');
      
      // Create sample tickets
      const sampleTickets = [
        {
          customerEmail: 'cliente1@teste.com',
          customerName: 'João Silva',
          subject: 'Dúvida sobre meu pedido',
          status: 'open',
          priority: 'medium',
          categoryName: 'duvidas',
          isAutomated: true,
        },
        {
          customerEmail: 'cliente2@teste.com',
          customerName: 'Maria Santos',
          subject: 'Preciso alterar o endereço de entrega',
          status: 'pending',
          priority: 'high',
          categoryName: 'alteracao_endereco',
          isAutomated: true,
        },
        {
          customerEmail: 'cliente3@teste.com',
          customerName: 'Pedro Costa',
          subject: 'Quero cancelar meu pedido',
          status: 'resolved',
          priority: 'low',
          categoryName: 'cancelamento',
          isAutomated: true,
        }
      ];

      // Create tickets directly to avoid any service hooks
      const createdTickets = [];
      for (const ticketData of sampleTickets) {
        try {
          // Use direct db insert to avoid service methods that might have hooks
          const [ticket] = await db.insert(customerSupportTickets)
            .values({
              operationId,
              ticketNumber: `TST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              ...ticketData,
            })
            .returning();
          createdTickets.push(ticket);
        } catch (error) {
          console.log('Warning: Could not create ticket:', error.message);
        }
      }

      res.json({
        success: true,
        message: `Created ${createdTickets.length} sample tickets`,
        tickets: createdTickets
      });
      
      // Force refresh of tickets cache
      console.log(`✅ Created ${createdTickets.length} test tickets for operation ${operationId}`);
    } catch (error) {
      console.error('Error creating test data:', error);
      res.status(500).json({ 
        message: "Failed to create test data",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}