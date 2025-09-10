import { Request, Response, Express } from "express";
import { customerSupportService } from "./customer-support-service";
import { authenticateToken } from "./auth-middleware";
import { validateOperationAccess } from "./middleware/operation-access";
import { db } from "./db";
import { storage } from "./storage";
import { aiDirectives, type AiDirective, type InsertAiDirective, insertAiDirectiveSchema } from "@shared/schema";
import { eq, and } from "drizzle-orm";

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
   * Get voice settings for an operation
   */
  app.get("/api/customer-support/:operationId/voice-settings", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId } = req.params;
      
      const settings = await customerSupportService.getVoiceSettings(operationId);
      
      res.json(settings);
    } catch (error) {
      console.error('Error getting voice settings:', error);
      res.status(500).json({ 
        message: "Failed to get voice settings",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Save voice settings for an operation
   */
  app.post("/api/customer-support/:operationId/voice-settings", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId } = req.params;
      const settings = req.body;
      
      const savedSettings = await customerSupportService.saveVoiceSettings(operationId, settings);
      
      res.json({
        success: true,
        settings: savedSettings
      });
    } catch (error) {
      console.error('Error saving voice settings:', error);
      res.status(500).json({ 
        message: "Failed to save voice settings",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Provision Twilio phone number for an operation
   */
  app.post("/api/customer-support/:operationId/provision-number", authenticateToken, validateOperationAccess, async (req: Request, res: Response) => {
    try {
      const { operationId } = req.params;
      
      const phoneNumber = await customerSupportService.provisionTwilioNumber(operationId);
      
      res.json({
        success: true,
        phoneNumber,
        message: "Número Twilio provisionado com sucesso"
      });
    } catch (error) {
      console.error('Error provisioning Twilio number:', error);
      
      // Handle specific Twilio errors
      if (error instanceof Error && error.message.includes('Trial accounts are allowed only one Twilio number')) {
        res.status(400).json({ 
          message: "Conta Twilio trial permite apenas um número",
          error: "Para provisionar números adicionais, é necessário fazer upgrade da conta Twilio para um plano pago.",
          trialLimitation: true
        });
        return;
      }

      if (error instanceof Error && error.message.includes('No available phone numbers found')) {
        res.status(400).json({ 
          message: "Nenhum número disponível encontrado",
          error: "Não foram encontrados números disponíveis nas regiões suportadas. Tente novamente mais tarde.",
          noNumbersAvailable: true
        });
        return;
      }

      res.status(500).json({ 
        message: "Falha ao provisionar número Twilio",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Release Twilio phone number for an operation
   */
  app.delete("/api/customer-support/:operationId/release-number", authenticateToken, validateOperationAccess, async (req: Request, res: Response) => {
    try {
      const { operationId } = req.params;
      
      await customerSupportService.releaseTwilioNumber(operationId);
      
      res.json({
        success: true,
        message: "Número Twilio liberado com sucesso"
      });
    } catch (error) {
      console.error('Error releasing Twilio number:', error);
      res.status(500).json({ 
        message: "Falha ao liberar número Twilio",
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
      
      const metrics = await customerSupportService.getOverview(operationId);
      
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
        page: pageNum,
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
      const { domain, emailPrefix, isCustomDomain } = req.body;
      
      if (!domain || !emailPrefix) {
        return res.status(400).json({ message: "Domain and email prefix are required" });
      }

      const result = await customerSupportService.configureMailgunDomain(
        operationId,
        domain,
        isCustomDomain,
        emailPrefix
      );
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: "Domain configured successfully",
          domain: result.domain,
          dnsRecords: result.dnsRecords
        });
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
   * Verify domain configuration
   */
  app.post("/api/customer-support/:operationId/verify-domain", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId } = req.params;
      const { domain } = req.body;
      
      if (!domain) {
        return res.status(400).json({ message: "Domain is required" });
      }

      const result = await customerSupportService.verifyDomain(operationId, domain);
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: result.verified ? "Domain verified successfully" : "Domain not yet verified",
          verified: result.verified
        });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      res.status(500).json({ 
        message: "Failed to verify domain",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Get DNS records for domain
   */
  app.get("/api/customer-support/:operationId/dns-records/:domain", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { domain } = req.params;
      
      const dnsRecords = await customerSupportService.getDomainDnsRecords(domain);
      
      res.json({ success: true, dnsRecords });
    } catch (error) {
      console.error('Error getting DNS records:', error);
      res.status(500).json({ 
        message: "Failed to get DNS records",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Webhook endpoint for receiving emails from Mailgun
   */
  app.post("/api/webhooks/mailgun/email", async (req: Request, res: Response) => {
    try {
      console.log('🚨 ===== WEBHOOK PRODUÇÃO CHAMADO ===== 🚨');
      console.log('📧 User-Agent:', req.headers['user-agent']);
      console.log('📧 Content-Type:', req.headers['content-type']);
      console.log('📧 Body keys:', Object.keys(req.body));
      console.log('📧 Email details:', {
        from: req.body.sender,
        to: req.body.recipient,  
        subject: req.body.subject,
        timestamp: req.body.timestamp
      });
      console.log('🚨 =============================🚨');

      // Verify webhook signature (simplified - in production use crypto verification)
      const token = req.body.token;
      const timestamp = req.body.timestamp;
      const signature = req.body.signature;

      // Process the email
      const result = await customerSupportService.processIncomingEmail({
        from: req.body.sender,
        to: req.body.recipient,
        subject: req.body.subject,
        textBody: req.body['body-plain'],
        htmlBody: req.body['body-html'],
        messageId: req.body['Message-Id'],
        inReplyTo: req.body['In-Reply-To'],
        references: req.body.References,
        timestamp: new Date(parseInt(timestamp) * 1000)
      });

      if (result.success) {
        res.status(200).json({ message: 'Email processed successfully' });
      } else {
        console.error('❌ Failed to process email:', result.error);
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error('❌ Webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
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

  /**
   * ENDPOINT DE TESTE - Simular email recebido para diagnosticar problemas
   */
  app.post("/api/webhooks/test-email-processing", async (req: Request, res: Response) => {
    try {
      console.log('🧪 TESTE DE PROCESSAMENTO DE EMAIL - INICIADO');
      
      // Simular um email de teste para o domínio configurado
      const testEmail = {
        from: 'teste.sofia@gmail.com',
        to: 'suporte@garriguesmilano.com', // Domínio configurado no banco
        subject: 'Preciso cancelar minha compra urgente',
        textBody: 'Olá, preciso cancelar minha compra de hoje. Por favor me ajudem!',
        htmlBody: '<p>Olá, preciso cancelar minha compra de hoje. Por favor me ajudem!</p>',
        messageId: `test-${Date.now()}@test.com`,
        inReplyTo: undefined,
        references: undefined,
        timestamp: new Date()
      };

      console.log('🧪 Email de teste:', testEmail);
      
      // Processar o email usando o mesmo fluxo do webhook
      const result = await customerSupportService.processIncomingEmail(testEmail);
      
      console.log('🧪 Resultado do processamento:', result);
      
      if (result.success) {
        res.status(200).json({ 
          success: true, 
          message: 'Teste concluído com sucesso!', 
          ticketId: result.ticketId,
          result 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: result.error, 
          message: 'Teste falhou!' 
        });
      }
      
    } catch (error) {
      console.error('🧪 Erro no teste:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        message: 'Teste quebrou!'
      });
    }
  });

  /**
   * Get design configuration for an operation
   */
  app.get("/api/customer-support/:operationId/design-config", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId } = req.params;
      
      const designConfig = await customerSupportService.getDesignConfig(operationId);
      
      res.json(designConfig || {
        logo: "/images/n1-lblue.png",
        primaryColor: "#2563eb",
        backgroundColor: "#f8fafc",
        textColor: "#333333"
      });
    } catch (error) {
      console.error('Error getting design config:', error);
      res.status(500).json({ 
        message: "Failed to get design configuration",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Save design configuration for an operation
   */
  app.put("/api/customer-support/:operationId/design-config", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId } = req.params;
      console.log('💄 Saving design config for operation', operationId, ':', req.body);
      
      const designConfig = await customerSupportService.saveDesignConfig(operationId, {
        ...req.body,
        updatedAt: new Date().toISOString()
      });
      
      res.json({
        success: true,
        designConfig
      });
    } catch (error) {
      console.error('Error saving design config:', error);
      res.status(500).json({ 
        message: "Failed to save design configuration",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Mark ticket as read
   */
  app.patch("/api/customer-support/:operationId/tickets/:ticketId/mark-read", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId, ticketId } = req.params;
      
      console.log('📖 Marking ticket as read:', { operationId, ticketId });
      
      const result = await customerSupportService.markTicketAsRead(operationId, ticketId);
      
      if (result.success) {
        res.json({ success: true, message: "Ticket marked as read" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
      
    } catch (error) {
      console.error('❌ Error marking ticket as read:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to mark ticket as read",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Send new message (creates new ticket)
   */
  app.post("/api/customer-support/:operationId/send-message", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId } = req.params;
      const { recipient, message } = req.body;
      
      console.log('📧 CustomerSupportRoutes: Send new message...', { operationId, recipient, message });
      
      if (!recipient || !message) {
        return res.status(400).json({ 
          success: false, 
          error: "Recipient and message are required" 
        });
      }

      // Delegate to support service for actual email sending and ticket creation
      const supportService = (await import('./support-service')).default;
      
      const result = await supportService.sendNewMessage(
        recipient.trim(),
        message.trim(),
        'Equipe de Suporte'
      );
      
      console.log('✅ CustomerSupportRoutes: New message sent successfully');
      
      res.json({ 
        success: true, 
        message: "Mensagem enviada com sucesso!",
        ticketId: result.ticketId
      });
      
    } catch (error) {
      console.error('❌ Error sending new message:', error);
      res.status(500).json({ 
        success: false,
        message: "Falha ao enviar mensagem",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Get AI directives for an operation
   */
  app.get("/api/customer-support/:operationId/ai-directives", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId } = req.params;

      const directives = await db
        .select()
        .from(aiDirectives)
        .where(eq(aiDirectives.operationId, operationId))
        .orderBy(aiDirectives.sortOrder, aiDirectives.createdAt);

      res.json(directives);
    } catch (error) {
      console.error('Error getting AI directives:', error);
      res.status(500).json({ 
        message: "Failed to get AI directives",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Save AI directives for an operation
   */
  app.post("/api/customer-support/:operationId/ai-directives", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId } = req.params;
      const { directives } = req.body;

      if (!Array.isArray(directives)) {
        return res.status(400).json({ message: "Directives must be an array" });
      }

      // Delete existing directives for this operation
      await db
        .delete(aiDirectives)
        .where(eq(aiDirectives.operationId, operationId));

      // Insert new directives
      if (directives.length > 0) {
        const directivesToInsert = directives.map((directive, index) => ({
          operationId,
          type: directive.type,
          title: directive.title,
          content: directive.content,
          isActive: directive.isActive,
          sortOrder: index
        }));

        await db.insert(aiDirectives).values(directivesToInsert);
      }

      // Return the updated directives
      const updatedDirectives = await db
        .select()
        .from(aiDirectives)
        .where(eq(aiDirectives.operationId, operationId))
        .orderBy(aiDirectives.sortOrder, aiDirectives.createdAt);

      res.json({ 
        success: true,
        message: "AI directives saved successfully",
        directives: updatedDirectives
      });
    } catch (error) {
      console.error('Error saving AI directives:', error);
      res.status(500).json({ 
        message: "Failed to save AI directives",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Activate customer support service for an operation
   */
  app.post("/api/customer-support/:operationId/activate", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { operationId } = req.params;
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }
      
      const operation = await customerSupportService.updateServiceStatus(operationId, isActive);
      
      res.json({
        success: true,
        operation,
        message: isActive ? "Service activated successfully" : "Service deactivated successfully"
      });
    } catch (error) {
      console.error('Error updating service status:', error);
      res.status(500).json({ 
        message: "Failed to update service status",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Populate default AI directives for existing operations that don't have any
   * This is an admin route to fix production environments
   */
  app.post("/api/customer-support/admin/populate-default-directives", authenticateToken, async (req: Request, res: Response) => {
    try {
      console.log('🚀 Admin: Populating default AI directives for existing operations...');
      
      const result = await storage.populateDirectivesForExistingOperations();
      
      res.json({
        success: true,
        message: `Population completed: ${result.success} operations updated, ${result.errors} errors`,
        details: result
      });
    } catch (error) {
      console.error('❌ Admin: Error populating default directives:', error);
      res.status(500).json({ 
        message: "Failed to populate default directives",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}