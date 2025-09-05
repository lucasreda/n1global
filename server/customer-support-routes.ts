import { Request, Response, Express, NextFunction } from "express";
import { customerSupportService } from "./customer-support-service";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

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

export function registerCustomerSupportRoutes(app: Express) {
  /**
   * Initialize customer support for an operation
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
   * Get overview metrics for an operation
   */
  app.get("/api/customer-support/:operationId/overview", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId } = req.params;
      
      const metrics = {
        openTickets: 5,
        aiResponded: 7,
        monthlyTickets: 7,
        unreadTickets: 7
      };
      
      res.json(metrics);
    } catch (error) {
      console.error('🔍 Overview error:', error);
      res.status(500).json({ message: 'Erro ao buscar métricas', error: error instanceof Error ? error.message : 'Unknown error' });
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
        categoryId = 'all', 
        search = '', 
        assignedTo,
        page = '1',
        limit = '25'
      } = req.query;

      console.log('🎫 Getting tickets with filters:', { operationId, status, category, categoryId, search, assignedTo, page, limit });
      
      // Sem cache headers para garantir resposta fresca
      // res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      // res.set('Pragma', 'no-cache');
      // res.set('Expires', '0');

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const filters = {
        status: status === 'all' ? undefined : status as string,
        category: categoryId === 'all' ? undefined : categoryId as string,
        search: search as string,
        assignedTo: assignedTo as string | undefined,
        limit: limitNum,
        offset
      };

      const result = await customerSupportService.getTickets(operationId, filters);
      
      console.log('🎫 Tickets result:', {
        ticketsFound: result.tickets.length,
        total: result.total,
        ticketNumbers: result.tickets.map(t => t.ticketNumber)
      });

      res.json(result);
    } catch (error) {
      console.error('Error getting tickets:', error);
      res.status(500).json({ 
        message: "Failed to get tickets",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Get specific ticket with messages
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
      
      res.status(201).json(ticket);
    } catch (error) {
      console.error('Error creating ticket:', error);
      res.status(500).json({ 
        message: "Failed to create ticket",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Add message to ticket
   */
  app.post("/api/customer-support/:operationId/tickets/:ticketId/messages", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId, ticketId } = req.params;
      const messageData = req.body;
      
      const message = await customerSupportService.addMessage(operationId, ticketId, messageData);
      
      res.status(201).json(message);
    } catch (error) {
      console.error('Error adding message:', error);
      res.status(500).json({ 
        message: "Failed to add message",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Configure domain for operation
   */
  app.post("/api/customer-support/:operationId/configure-domain", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId } = req.params;
      const { domain, isCustomDomain } = req.body;
      
      if (!domain) {
        return res.status(400).json({ message: "Domain is required" });
      }

      const result = await customerSupportService.configureMailgunDomain(
        operationId,
        domain,
        isCustomDomain
      );
      
      if (result.success) {
        res.json({ success: true, message: "Domain configured successfully" });
      } else {
        res.status(400).json({ success: false, error: result.error });
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
   * Get analytics for operation
   */
  app.get("/api/customer-support/:operationId/analytics", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId } = req.params;
      const { period = '30d' } = req.query;
      
      const analytics = await customerSupportService.getAnalytics(operationId, period as string);
      
      res.json(analytics);
    } catch (error) {
      console.error('Error getting analytics:', error);
      res.status(500).json({ 
        message: "Failed to get analytics",
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
      
      const result = await customerSupportService.sendEmailReply(
        operationId,
        ticketId,
        subject,
        content,
        senderName,
        senderEmail
      );
      
      if (result.success) {
        res.json({ success: true, message: "Email sent successfully" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ 
        message: "Failed to send email",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}