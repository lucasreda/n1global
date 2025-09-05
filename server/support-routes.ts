import type { Express, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { supportService } from "./support-service";
import { db } from "./db";
import { supportCategories, supportResponses, insertSupportCategorySchema, insertSupportResponseSchema } from "@shared/schema";
import { eq } from "drizzle-orm";

// Use the SAME JWT_SECRET as the main routes
const JWT_SECRET = process.env.JWT_SECRET || "cod-dashboard-secret-key-development-2025";

interface AuthRequest extends Request {
  user?: any;
}

// Middleware to verify JWT token
const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  console.log("🔐 Support Auth Debug:", {
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
    url: req.url,
    method: req.method,
    secret: JWT_SECRET.substring(0, 20) + '...'
  });

  if (!token) {
    console.log("❌ No token provided");
    return res.status(401).json({ message: "Token de acesso requerido" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      console.log("❌ Support JWT verification failed:", err.message);
      return res.status(403).json({ message: "Token inválido" });
    }
    console.log("✅ Support JWT verified for user:", user.email);
    req.user = user;
    next();
  });
};

export function registerSupportRoutes(app: Express) {
  
  // ============================================================================
  // WEBHOOK ENDPOINTS (PUBLIC - No auth required)
  // ============================================================================
  
  /**
   * Mailgun webhook endpoint for incoming emails
   */
  app.post("/api/support/webhook/mailgun", async (req: Request, res: Response) => {
    try {
      console.log("📧 Received Mailgun webhook:", req.body);
      
      // Mailgun sends form data for incoming emails
      const {
        From: from,
        To: to,
        Subject: subject,
        'stripped-text': text,
        'stripped-html': html,
        'Message-Id': messageId,
        sender,
        recipient,
        'body-plain': bodyPlain,
        'body-html': bodyHtml
      } = req.body;
      
      // Transform Mailgun data to our format
      const webhookData = {
        from: from || sender,
        to: to || recipient,
        subject: subject || '',
        text: text || bodyPlain || '',
        html: html || bodyHtml || '',
        attachments: [], // We can process attachments later if needed
        message_id: messageId || `mg_${Date.now()}`
      };
      
      // Process the email
      const processedEmail = await supportService.processIncomingEmail(webhookData);
      
      console.log("✅ Mailgun email processed:", processedEmail.id);
      res.status(200).send("OK");
      
    } catch (error) {
      console.error("❌ Error processing Mailgun webhook:", error);
      res.status(500).send("Error");
    }
  });

  /**
   * Resend webhook endpoint for incoming emails (deprecated)
   */
  app.post("/api/support/webhook/resend", async (req: Request, res: Response) => {
    try {
      console.log("📧 Received Resend webhook:", req.body);
      
      // Verify webhook (you should add webhook signature verification in production)
      const webhookData = req.body;
      
      if (!webhookData.type || webhookData.type !== 'email.received') {
        return res.status(400).json({ message: "Invalid webhook type" });
      }
      
      // Process the email
      const processedEmail = await supportService.processIncomingEmail(webhookData.data);
      
      console.log("✅ Email processed:", processedEmail.id);
      res.json({ 
        success: true, 
        emailId: processedEmail.id,
        status: processedEmail.status 
      });
      
    } catch (error) {
      console.error("❌ Error processing webhook:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to process email" 
      });
    }
  });

  // ============================================================================
  // ADMIN ENDPOINTS (Requires authentication)
  // ============================================================================

  /**
   * Get all support categories
   */
  app.get("/api/support/categories", async (req: AuthRequest, res: Response) => {
    try {
      const categories = await supportService.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  /**
   * Create new support category
   */
  app.post("/api/support/categories", async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = insertSupportCategorySchema.parse(req.body);
      
      const [category] = await db
        .insert(supportCategories)
        .values(validatedData)
        .returning();

      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  /**
   * Update support category
   */
  app.put("/api/support/categories/:id", async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const validatedData = insertSupportCategorySchema.parse(req.body);
      
      const [category] = await db
        .update(supportCategories)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(supportCategories.id, id))
        .returning();

      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  /**
   * Get support tickets with filters and pagination
   */
  app.get("/api/support/tickets", async (req: AuthRequest, res: Response) => {
    try {
      const {
        status,
        categoryId,
        priority,
        assignedToUserId,
        page = "1",
        limit = "20"
      } = req.query;

      const options = {
        status: status as string | undefined,
        categoryId: categoryId as string | undefined,
        priority: priority as string | undefined,
        assignedToUserId: assignedToUserId as string | undefined,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10)
      };

      const result = await supportService.getTickets(options);
      res.json(result);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  /**
   * Get specific ticket by ID with conversation history
   */
  app.get("/api/support/tickets/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const ticket = await supportService.getTicketById(id);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      res.json(ticket);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });

  /**
   * Update ticket status
   */
  app.patch("/api/support/tickets/:id/status", async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user?.id;

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const [updatedTicket] = await supportService.updateTicketStatus(id, status, userId);
      
      if (!updatedTicket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Add status change to conversation
      await supportService.addConversation(id, {
        type: 'status_change',
        content: `Status changed to: ${status}`,
        isInternal: true,
        userId
      });

      res.json(updatedTicket);
    } catch (error) {
      console.error("Error updating ticket status:", error);
      res.status(500).json({ message: "Failed to update ticket status" });
    }
  });

  /**
   * Add conversation/reply to ticket
   */
  app.post("/api/support/tickets/:id/conversations", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { content, isInternal = false, type = 'note' } = req.body;
      const userId = req.user?.id;

      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      const [conversation] = await supportService.addConversation(id, {
        type,
        content,
        isInternal,
        userId
      });

      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error adding conversation:", error);
      res.status(500).json({ message: "Failed to add conversation" });
    }
  });

  /**
   * Get response templates for a category
   */
  app.get("/api/support/categories/:categoryId/responses", async (req: AuthRequest, res: Response) => {
    try {
      const { categoryId } = req.params;
      
      const responses = await db
        .select()
        .from(supportResponses)
        .where(eq(supportResponses.categoryId, categoryId));

      res.json(responses);
    } catch (error) {
      console.error("Error fetching responses:", error);
      res.status(500).json({ message: "Failed to fetch responses" });
    }
  });

  /**
   * Create response template
   */
  app.post("/api/support/responses", async (req: AuthRequest, res: Response) => {
    try {
      const validatedData = insertSupportResponseSchema.parse(req.body);
      
      const [response] = await db
        .insert(supportResponses)
        .values(validatedData)
        .returning();

      res.status(201).json(response);
    } catch (error) {
      console.error("Error creating response:", error);
      res.status(500).json({ message: "Failed to create response" });
    }
  });

  /**
   * Update response template
   */
  app.put("/api/support/responses/:id", async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const validatedData = insertSupportResponseSchema.parse(req.body);
      
      const [response] = await db
        .update(supportResponses)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(supportResponses.id, id))
        .returning();

      if (!response) {
        return res.status(404).json({ message: "Response not found" });
      }

      res.json(response);
    } catch (error) {
      console.error("Error updating response:", error);
      res.status(500).json({ message: "Failed to update response" });
    }
  });

  /**
   * Delete response template
   */
  app.delete("/api/support/responses/:id", async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      const [deletedResponse] = await db
        .delete(supportResponses)
        .where(eq(supportResponses.id, id))
        .returning();

      if (!deletedResponse) {
        return res.status(404).json({ message: "Response not found" });
      }

      res.json({ message: "Response deleted successfully" });
    } catch (error) {
      console.error("Error deleting response:", error);
      res.status(500).json({ message: "Failed to delete response" });
    }
  });

  /**
   * Get support dashboard metrics
   */
  app.get("/api/support/dashboard", async (req: AuthRequest, res: Response) => {
    try {
      const { period = "7d" } = req.query;
      const metrics = await supportService.getDashboardMetrics(period as string);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  /**
   * Manual email categorization (for testing AI)
   */
  app.post("/api/support/categorize", async (req: AuthRequest, res: Response) => {
    try {
      const { subject, content } = req.body;
      
      if (!subject || !content) {
        return res.status(400).json({ message: "Subject and content are required" });
      }

      const result = await supportService.categorizeEmail(subject, content);
      res.json(result);
    } catch (error) {
      console.error("Error categorizing email:", error);
      res.status(500).json({ message: "Failed to categorize email" });
    }
  });

  /**
   * Reply to a support ticket
   */
  app.post('/api/support/tickets/:id/reply', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      console.log('📧 Starting ticket reply process...');
      console.log('Request params:', req.params);
      console.log('Request body:', req.body);
      console.log('User info:', req.user);

      const { id: ticketId } = req.params;
      const { message } = req.body;

      if (!ticketId) {
        console.error('❌ Missing ticket ID');
        return res.status(400).json({ message: 'ID do ticket é obrigatório' });
      }

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        console.error('❌ Missing or invalid message');
        return res.status(400).json({ message: 'Mensagem é obrigatória' });
      }

      if (message.length > 5000) {
        console.error('❌ Message too long');
        return res.status(400).json({ message: 'Mensagem muito longa (máximo 5000 caracteres)' });
      }

      // Get agent name from user session if available
      const agentName = (req as any).user?.name || (req as any).user?.email || 'Equipe de Suporte';
      console.log('👤 Agent name:', agentName);

      console.log('🔄 Calling supportService.replyToTicket...');
      await supportService.replyToTicket(ticketId, message.trim(), agentName);
      console.log('✅ Reply sent successfully');

      res.json({ 
        message: 'Resposta enviada com sucesso',
        success: true 
      });

    } catch (error) {
      console.error('❌ Error replying to ticket:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Erro interno do servidor',
        success: false,
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined
      });
    }
  });

  /**
   * Test AI auto-response system
   */
  app.post('/api/support/test-ai-response', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      console.log('🤖 Testing AI auto-response...');
      
      // Simulate an email for testing
      const testEmail = {
        from: 'cliente@teste.com',
        to: 'support@codashboard.com',
        subject: 'Quando meu pedido vai chegar?',
        text: 'Oi, fiz um pedido há 3 dias e ainda não recebi informações sobre a entrega. Podem me ajudar?',
        html: '<p>Oi, fiz um pedido há 3 dias e ainda não recebi informações sobre a entrega. Podem me ajudar?</p>',
        attachments: [],
        message_id: `test_ai_${Date.now()}`
      };
      
      console.log('🤖 Simulating AI response generation...');
      const result = await supportService.processIncomingEmail(testEmail);
      
      res.json({ 
        message: 'AI response test completed',
        simulatedEmail: {
          id: result.id,
          status: result.status,
          category: result.categoryId
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('🤖 AI response test error:', error);
      res.status(500).json({ 
        message: 'Test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

}