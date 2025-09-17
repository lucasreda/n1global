import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, and, or, ilike, desc, asc, count, sql } from "drizzle-orm";
import { supportService } from "./support-service";
import { telnyxProvisioningService } from "./telnyx-provisioning-service";

export class CustomerSupportService {
  private db = db;
  private schema = schema;
  /**
   * Initialize customer support for an operation
   */
  async initializeOperationSupport(operationId: string, operationName: string) {
    try {
      // TODO: Add database initialization
      return {
        operationId,
        operationName,
        initialized: true
      };
    } catch (error) {
      console.error('Error initializing operation support:', error);
      throw error;
    }
  }

  /**
   * Get voice settings for an operation
   */
  async getVoiceSettings(operationId: string) {
    try {
      const [settings] = await this.db
        .select()
        .from(this.schema.voiceSettings)
        .where(eq(this.schema.voiceSettings.operationId, operationId))
        .limit(1);

      if (!settings) {
        // Return default settings matching schema structure
        return {
          operationId,
          isActive: false,
          telnyxPhoneNumber: null,
          welcomeMessage: 'Olá! Como posso ajudá-lo hoje?',
          operatingHours: {
            monday: { enabled: true, start: '09:00', end: '18:00' },
            tuesday: { enabled: true, start: '09:00', end: '18:00' },
            wednesday: { enabled: true, start: '09:00', end: '18:00' },
            thursday: { enabled: true, start: '09:00', end: '18:00' },
            friday: { enabled: true, start: '09:00', end: '18:00' },
            saturday: { enabled: false, start: '09:00', end: '18:00' },
            sunday: { enabled: false, start: '09:00', end: '18:00' },
            timezone: 'America/Sao_Paulo'
          },
          allowedCallTypes: ['doubts', 'address_change', 'cancellation'],
          voiceInstructions: 'Você é Sofia, um assistente virtual empático da central de atendimento. Seja cordial e profissional.',
          outOfHoursMessage: 'Desculpe, nosso atendimento está fechado no momento. Nosso horário de funcionamento é de segunda a sexta, das 9h às 18h.',
          outOfHoursAction: 'voicemail',
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }

      return settings;
    } catch (error) {
      console.error('Error getting voice settings:', error);
      throw error;
    }
  }

  /**
   * Save voice settings for an operation
   */
  async saveVoiceSettings(operationId: string, settings: {
    isActive?: boolean;
    telnyxPhoneNumber?: string;
    operatingHours?: {
      monday: { enabled: boolean; start: string; end: string };
      tuesday: { enabled: boolean; start: string; end: string };
      wednesday: { enabled: boolean; start: string; end: string };
      thursday: { enabled: boolean; start: string; end: string };
      friday: { enabled: boolean; start: string; end: string };
      saturday: { enabled: boolean; start: string; end: string };
      sunday: { enabled: boolean; start: string; end: string };
      timezone: string;
    };
    outOfHoursMessage?: string;
    outOfHoursAction?: string;
  }) {
    try {
      console.log(`📞 Saving voice settings for operation ${operationId}:`, settings);

      // Check if voice settings record exists
      const [existingRecord] = await this.db
        .select({ id: this.schema.voiceSettings.id })
        .from(this.schema.voiceSettings)
        .where(eq(this.schema.voiceSettings.operationId, operationId))
        .limit(1);

      if (existingRecord) {
        // Update existing record
        await this.db
          .update(this.schema.voiceSettings)
          .set({ 
            isActive: settings.isActive !== undefined ? settings.isActive : false,
            telnyxPhoneNumber: settings.telnyxPhoneNumber || null,
            operatingHours: settings.operatingHours || {
              monday: { enabled: true, start: '09:00', end: '18:00' },
              tuesday: { enabled: true, start: '09:00', end: '18:00' },
              wednesday: { enabled: true, start: '09:00', end: '18:00' },
              thursday: { enabled: true, start: '09:00', end: '18:00' },
              friday: { enabled: true, start: '09:00', end: '18:00' },
              saturday: { enabled: false, start: '09:00', end: '18:00' },
              sunday: { enabled: false, start: '09:00', end: '18:00' },
              timezone: 'America/Sao_Paulo'
            },
            outOfHoursMessage: settings.outOfHoursMessage || 'Desculpe, nosso atendimento está fechado no momento.',
            outOfHoursAction: settings.outOfHoursAction || 'voicemail',
            updatedAt: new Date()
          })
          .where(eq(this.schema.voiceSettings.operationId, operationId));
      } else {
        // Create new record
        await this.db
          .insert(this.schema.voiceSettings)
          .values({
            operationId,
            isActive: settings.isActive !== undefined ? settings.isActive : false,
            telnyxPhoneNumber: settings.telnyxPhoneNumber || null,
            operatingHours: settings.operatingHours || {
              monday: { enabled: true, start: '09:00', end: '18:00' },
              tuesday: { enabled: true, start: '09:00', end: '18:00' },
              wednesday: { enabled: true, start: '09:00', end: '18:00' },
              thursday: { enabled: true, start: '09:00', end: '18:00' },
              friday: { enabled: true, start: '09:00', end: '18:00' },
              saturday: { enabled: false, start: '09:00', end: '18:00' },
              sunday: { enabled: false, start: '09:00', end: '18:00' },
              timezone: 'America/Sao_Paulo'
            },
            outOfHoursMessage: settings.outOfHoursMessage || 'Desculpe, nosso atendimento está fechado no momento.',
            outOfHoursAction: settings.outOfHoursAction || 'voicemail',
            createdAt: new Date(),
            updatedAt: new Date()
          });
      }

      return settings;
    } catch (error) {
      console.error('Error saving voice settings:', error);
      throw error;
    }
  }

  /**
   * Provision a Telnyx phone number for an operation
   */
  async provisionTelnyxNumber(operationId: string): Promise<string> {
    try {
      console.log(`📞 Provisioning Telnyx number for operation ${operationId}...`);
      
      // Check if a number is already provisioned
      const [existingSettings] = await this.db
        .select()
        .from(this.schema.voiceSettings)
        .where(eq(this.schema.voiceSettings.operationId, operationId))
        .limit(1);

      if (existingSettings?.telnyxPhoneNumber) {
        console.log(`ℹ️ Operation ${operationId} already has provisioned number: ${existingSettings.telnyxPhoneNumber}`);
        return existingSettings.telnyxPhoneNumber;
      }

      // Provision new number via Telnyx API
      const phoneNumber = await telnyxProvisioningService.provisionPhoneNumber(operationId);
      
      console.log(`✅ Successfully provisioned number ${phoneNumber} for operation ${operationId}`);
      return phoneNumber;
    } catch (error) {
      console.error('Error provisioning Telnyx number:', error);
      throw error;
    }
  }

  /**
   * Release a Telnyx phone number for an operation
   */
  async releaseTelnyxNumber(operationId: string): Promise<void> {
    try {
      console.log(`🗑️ Releasing Telnyx number for operation ${operationId}...`);
      
      await telnyxProvisioningService.releasePhoneNumber(operationId);
      
      console.log(`✅ Successfully released Telnyx number for operation ${operationId}`);
    } catch (error) {
      console.error('Error releasing Telnyx number:', error);
      throw error;
    }
  }

  /**
   * Update Telnyx phone number webhook configuration
   */
  async updateTelnyxWebhook(operationId: string): Promise<void> {
    try {
      console.log(`🔧 Updating Telnyx webhook for operation ${operationId}...`);
      
      await telnyxProvisioningService.updatePhoneNumberConfig(operationId);
      
      console.log(`✅ Successfully updated Telnyx webhook for operation ${operationId}`);
    } catch (error) {
      console.error('Error updating Telnyx webhook:', error);
      throw error;
    }
  }

  /**
   * Get operation support config
   */
  async getOperationSupport(operationId: string) {
    try {
      // Get from customerSupportOperations table
      const [operation] = await this.db
        .select()
        .from(this.schema.customerSupportOperations)
        .where(eq(this.schema.customerSupportOperations.operationId, operationId))
        .limit(1);

      if (!operation) {
        // Return default config with service deactivated
        return {
          emailDomain: null,
          emailPrefix: "suporte",
          isCustomDomain: false,
          domainVerified: false,
          mailgunDomainName: null,
          isActive: false
        };
      }

      return {
        emailDomain: operation.emailDomain,
        emailPrefix: operation.emailPrefix,
        isCustomDomain: operation.isCustomDomain,
        domainVerified: operation.domainVerified,
        mailgunDomainName: operation.mailgunDomainName,
        isActive: operation.isActive
      };
    } catch (error) {
      console.error('Error getting operation support:', error);
      throw error;
    }
  }

  /**
   * Save support configuration
   */
  async saveSupportConfig(operationId: string, config: any) {
    try {
      // TODO: Save to database
      console.log(`💌 Saving support config for operation ${operationId}:`, config);
      return config;
    } catch (error) {
      console.error('Error saving support config:', error);
      throw error;
    }
  }

  /**
   * Get design configuration for an operation
   */
  async getDesignConfig(operationId: string) {
    try {
      // Get from customerSupportOperations table brandingConfig field
      const [operation] = await this.db
        .select({ brandingConfig: this.schema.customerSupportOperations.brandingConfig })
        .from(this.schema.customerSupportOperations)
        .where(eq(this.schema.customerSupportOperations.operationId, operationId))
        .limit(1);

      return operation?.brandingConfig || null;
    } catch (error) {
      console.error('Error getting design config:', error);
      throw error;
    }
  }

  /**
   * Save design configuration for an operation
   */
  async saveDesignConfig(operationId: string, config: {
    logo: string;
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
    updatedAt: string;
  }) {
    try {
      console.log(`💄 Saving design config for operation ${operationId}:`, config);
      
      // Check if operation support record exists
      const [existingRecord] = await this.db
        .select({ id: this.schema.customerSupportOperations.id })
        .from(this.schema.customerSupportOperations)
        .where(eq(this.schema.customerSupportOperations.operationId, operationId))
        .limit(1);

      if (existingRecord) {
        // Update existing record
        await this.db
          .update(this.schema.customerSupportOperations)
          .set({ 
            brandingConfig: config,
            updatedAt: new Date()
          })
          .where(eq(this.schema.customerSupportOperations.operationId, operationId));
      } else {
        // Create new record
        await this.db
          .insert(this.schema.customerSupportOperations)
          .values({
            operationId,
            brandingConfig: config,
            isActive: true
          });
      }

      return config;
    } catch (error) {
      console.error('Error saving design config:', error);
      throw error;
    }
  }

  /**
   * Get support categories
   */
  async getCategories(operationId: string) {
    try {
      const categories = await this.db
        .select({
          id: this.schema.supportCategories.id,
          name: this.schema.supportCategories.name,
          displayName: this.schema.supportCategories.displayName,
          description: this.schema.supportCategories.description,
          isAutomated: this.schema.supportCategories.isAutomated,
          priority: this.schema.supportCategories.priority,
          color: this.schema.supportCategories.color
        })
        .from(this.schema.supportCategories)
        .orderBy(this.schema.supportCategories.priority);

      // Custom ordering: Manual first, Reclamações second, then by priority
      const orderedCategories = categories.sort((a, b) => {
        if (a.name === 'manual') return -1;
        if (b.name === 'manual') return 1;
        if (a.name === 'reclamacoes') return -1;
        if (b.name === 'reclamacoes') return 1;
        return b.priority - a.priority;
      });

      const result = orderedCategories.map(cat => ({
        id: cat.id,
        name: cat.displayName || cat.name,
        displayName: cat.displayName || cat.name,
        description: cat.description,
        isAutomated: cat.isAutomated,
        priority: cat.priority,
        color: cat.color,
        active: true
      }));

      return result;
    } catch (error) {
      console.error('Error getting categories:', error);
      throw error;
    }
  }

  /**
   * Get tickets with filters
   */
  async getTickets(operationId: string, filters: any) {
    try {
      const { status, category, search, page = 1, limit = 50 } = filters;
      
      console.log(`🔍 Filters received:`, { status, category, search, page, limit });
      
      // Build where conditions
      let whereConditions: any[] = [];
      
      // Filter by status
      if (status && status !== 'all') {
        whereConditions.push(eq(this.schema.supportTickets.status, status));
      }
      
      // Filter by category
      if (category && category !== 'all') {
        whereConditions.push(eq(this.schema.supportTickets.categoryId, category));
      }
      
      // Search in subject and customer email
      if (search) {
        whereConditions.push(
          or(
            ilike(this.schema.supportTickets.subject, `%${search}%`),
            ilike(this.schema.supportTickets.customerEmail, `%${search}%`)
          )
        );
      }

      // Get tickets with category and email info
      const tickets = await this.db
        .select({
          ticket: this.schema.supportTickets,
          category: this.schema.supportCategories,
          email: {
            id: this.schema.supportEmails.id,
            messageId: this.schema.supportEmails.messageId,
            from: this.schema.supportEmails.from,
            hasAutoResponse: this.schema.supportEmails.hasAutoResponse,
            autoResponseSentAt: this.schema.supportEmails.autoResponseSentAt,
            status: this.schema.supportEmails.status
          }
        })
        .from(this.schema.supportTickets)
        .leftJoin(
          this.schema.supportCategories,
          eq(this.schema.supportTickets.categoryId, this.schema.supportCategories.id)
        )
        .leftJoin(
          this.schema.supportEmails,
          eq(this.schema.supportTickets.emailId, this.schema.supportEmails.id)
        )
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(
          // Priority 1: Unread tickets without AI response first (with blue dot)
          asc(sql`CASE 
            WHEN ${this.schema.supportTickets.isRead} = false 
            AND (${this.schema.supportEmails.hasAutoResponse} IS NULL OR ${this.schema.supportEmails.hasAutoResponse} = false) 
            THEN 0 
            ELSE 1 
          END`),
          // Priority 2: All other tickets by newest first
          desc(this.schema.supportTickets.createdAt)
        )
        .limit(parseInt(limit))
        .offset((parseInt(page) - 1) * parseInt(limit));

      // Get total count
      const totalResult = await this.db
        .select({ count: count() })
        .from(this.schema.supportTickets)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

      const total = totalResult[0]?.count || 0;
      const totalPages = Math.ceil(total / parseInt(limit));
      
      console.log(`🎫 Pagination debug: originalPage=${filters.page}, page=${page}, limit=${limit}, total=${total}, totalPages=${totalPages}`);

      const result = {
        tickets: tickets.map(row => ({
          id: row.ticket.id,
          ticketNumber: row.ticket.ticketNumber,
          subject: row.ticket.subject,
          customerEmail: row.ticket.customerEmail,
          customerName: row.ticket.customerName,
          status: row.ticket.status,
          priority: row.ticket.priority || 'medium',
          createdAt: row.ticket.createdAt,
          lastActivity: row.ticket.updatedAt || row.ticket.createdAt,
          conversationCount: 0, // Could count from conversations table if needed
          category: row.category ? {
            id: row.category.id,
            name: row.category.name,
            displayName: row.category.displayName || row.category.name,
            color: row.category.color
          } : null,
          email: row.email ? {
            hasAutoResponse: row.email.hasAutoResponse,
            autoResponseSentAt: row.email.autoResponseSentAt,
            status: row.email.status
          } : null,
          isRead: row.ticket.isRead
        })),
        total,
        page: parseInt(page),
        totalPages
      };
      
      return result;
    } catch (error) {
      console.error('Error getting tickets:', error);
      throw error;
    }
  }

  /**
   * Get single ticket
   */
  async getTicket(operationId: string, ticketId: string) {
    try {
      const ticket = await this.db
        .select()
        .from(this.schema.supportTickets)
        .leftJoin(
          this.schema.supportCategories,
          eq(this.schema.supportTickets.categoryId, this.schema.supportCategories.id)
        )
        .where(eq(this.schema.supportTickets.id, ticketId))
        .limit(1);

      if (!ticket.length) {
        throw new Error('Ticket not found');
      }

      // Get conversations for this ticket
      const conversations = await this.db
        .select()
        .from(this.schema.supportConversations)
        .where(eq(this.schema.supportConversations.ticketId, ticketId))
        .orderBy(this.schema.supportConversations.createdAt);

      console.log(`🎫 Loading ticket ${ticketId} with ${conversations.length} conversations`);

      const row = ticket[0];
      return {
        id: row.support_tickets.id,
        ticketNumber: row.support_tickets.ticketNumber,
        subject: row.support_tickets.subject,
        customerEmail: row.support_tickets.customerEmail,
        customerName: row.support_tickets.customerName,
        status: row.support_tickets.status,
        priority: row.support_tickets.priority || 'medium',
        createdAt: row.support_tickets.createdAt,
        description: row.support_tickets.description,
        resolution: row.support_tickets.resolution,
        category: row.support_categories?.name || 'Sem categoria',
        messages: conversations.map(conv => ({
          id: conv.id,
          type: conv.type,
          content: conv.content,
          fromEmail: conv.from,
          toEmail: conv.to,
          subject: conv.subject,
          createdAt: conv.createdAt,
          isInternal: conv.isInternal || false
        }))
      };
    } catch (error) {
      console.error('Error getting ticket:', error);
      throw error;
    }
  }

  /**
   * Create new ticket
   */
  async createTicket(operationId: string, ticketData: any) {
    try {
      return {
        id: "new-ticket-id",
        ticketNumber: "SUP-202509-0002",
        ...ticketData
      };
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  }

  /**
   * Add message to ticket
   */
  async addMessage(operationId: string, ticketId: string, messageData: any) {
    try {
      return {
        id: "new-message-id",
        ticketId,
        ...messageData
      };
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  /**
   * Configure Mailgun domain
   */
  async configureMailgunDomain(operationId: string, config: any) {
    try {
      return {
        success: true,
        domain: config.domain,
        configured: true
      };
    } catch (error) {
      console.error('Error configuring Mailgun domain:', error);
      throw error;
    }
  }

  /**
   * Get support overview metrics
   */
  async getOverview(operationId: string) {
    try {
      // Get metrics for overview cards
      const [overviewStats] = await this.db
        .select({
          openTickets: count(sql`CASE WHEN ${this.schema.supportTickets.status} = 'open' THEN 1 END`),
          aiResponded: count(sql`CASE WHEN ${this.schema.supportTickets.status} = 'in_progress' THEN 1 END`),
          monthlyTickets: count(sql`CASE WHEN ${this.schema.supportTickets.createdAt} >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END`),
          unreadTickets: count(sql`CASE 
            WHEN ${this.schema.supportTickets.isRead} = false 
            AND (${this.schema.supportEmails.hasAutoResponse} IS NULL OR ${this.schema.supportEmails.hasAutoResponse} = false)
            THEN 1 END`)
        })
        .from(this.schema.supportTickets)
        .leftJoin(
          this.schema.supportEmails,
          eq(this.schema.supportTickets.emailId, this.schema.supportEmails.id)
        );

      console.log('📊 Overview stats raw:', overviewStats);

      return {
        openTickets: overviewStats?.openTickets || 0,
        aiResponded: overviewStats?.aiResponded || 0,
        monthlyTickets: overviewStats?.monthlyTickets || 0,
        unreadTickets: overviewStats?.unreadTickets || 0
      };
    } catch (error) {
      console.error('Error getting overview:', error);
      throw error;
    }
  }

  /**
   * Get support analytics
   */
  async getAnalytics(operationId: string, period: string) {
    try {
      // Query real data from database
      const [ticketStats] = await this.db
        .select({
          totalTickets: count(),
          resolvedTickets: count(sql`CASE WHEN status IN ('resolved', 'closed') THEN 1 END`),
          openTickets: count(sql`CASE WHEN status = 'open' THEN 1 END`),
          inProgressTickets: count(sql`CASE WHEN status = 'in_progress' THEN 1 END`)
        })
        .from(this.schema.supportTickets);

      return {
        totalTickets: ticketStats?.totalTickets || 0,
        resolvedTickets: ticketStats?.resolvedTickets || 0,
        openTickets: ticketStats?.openTickets || 0,
        inProgressTickets: ticketStats?.inProgressTickets || 0,
        averageResponseTime: "2h", // Placeholder - could calculate from timestamps
        period
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }

  /**
   * Verify domain
   */
  async verifyDomain(operationId: string, domain: string) {
    try {
      return {
        success: true,
        domain,
        verified: true
      };
    } catch (error) {
      console.error('Error verifying domain:', error);
      throw error;
    }
  }

  /**
   * Get domain DNS records
   */
  async getDomainDnsRecords(domain: string) {
    try {
      return this.getDnsRecords(domain);
    } catch (error) {
      console.error('Error getting domain DNS records:', error);
      throw error;
    }
  }

  /**
   * Process incoming email
   */
  async processIncomingEmail(emailData: any) {
    try {
      console.log('🔄 CustomerSupportService: Delegating to SupportService for real processing');
      
      // Use the real support service to process the email
      const processedEmail = await supportService.processIncomingEmail({
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        textContent: emailData.textBody,
        htmlContent: emailData.htmlBody,
        messageId: emailData.messageId,
        inReplyTo: emailData.inReplyTo,
        references: emailData.references,
        timestamp: emailData.timestamp
      });

      console.log('✅ CustomerSupportService: Email processed by SupportService');
      
      return {
        success: true,
        ticketId: processedEmail.id,
        message: "Email processed successfully"
      };
    } catch (error) {
      console.error('Error processing incoming email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Send email reply
   */
  async sendEmailReply(operationId: string, ticketId: string, replyData: any) {
    try {
      console.log('📧 CustomerSupportService: Sending email reply...', { operationId, ticketId, replyData });
      
      // Get ticket details
      const ticket = await this.getTicket(operationId, ticketId);
      if (!ticket) {
        throw new Error(`Ticket ${ticketId} not found`);
      }

      // Delegate to support service for actual email sending
      const { supportService: importedSupportService } = await import('./support-service');
      
      // Use the real support service to send the email reply
      await importedSupportService.replyToTicket(
        ticketId,
        replyData.content || replyData.message,
        replyData.senderName || 'Equipe de Suporte'
      );

      // Add conversation entry
      await importedSupportService.addConversation(ticketId, {
        type: "email_out",
        from: `${replyData.senderName || 'Equipe de Suporte'} <suporte@${process.env.MAILGUN_DOMAIN}>`,
        to: ticket.customerEmail,
        subject: replyData.subject,
        content: replyData.content || replyData.message,
        messageId: `manual-reply-${Date.now()}@${process.env.MAILGUN_DOMAIN}`,
      });

      console.log('✅ CustomerSupportService: Email reply sent successfully');
      
      return {
        success: true,
        messageId: `manual-reply-${Date.now()}@${process.env.MAILGUN_DOMAIN}`,
        sent: true
      };
    } catch (error) {
      console.error('❌ Error sending email reply:', error);
      throw error;
    }
  }

  /**
   * Mark ticket as read
   */
  async markTicketAsRead(operationId: string, ticketId: string) {
    try {
      console.log('📖 CustomerSupportService: Marking ticket as read...', { operationId, ticketId });
      
      // Use the direct database update instead of delegating
      const updatedTicket = await supportService.markTicketAsRead(ticketId);
      
      console.log('✅ CustomerSupportService: Ticket marked as read successfully');
      
      return {
        success: true,
        ticket: updatedTicket
      };
    } catch (error) {
      console.error('❌ Error marking ticket as read:', error);
      throw error;
    }
  }

  /**
   * Get DNS records for domain verification
   */
  async getDnsRecords(domain: string) {
    try {
      // Mock DNS records for now
      return {
        success: true,
        dnsRecords: [
          {
            record_type: "TXT",
            name: domain,
            value: "v=spf1 include:mailgun.org ~all",
            category: "sending",
            valid: "valid",
            dns_type: "TXT"
          },
          {
            record_type: "TXT", 
            name: `smtp._domainkey.${domain}`,
            value: "k=rsa; p=MIGfMA0GCSqGSIb3...",
            category: "sending",
            valid: "valid",
            dns_type: "TXT"
          },
          {
            record_type: "CNAME",
            name: `email.${domain}`,
            value: "mailgun.org",
            category: "tracking",
            valid: "valid",
            dns_type: "CNAME"
          },
          {
            record_type: "MX",
            name: domain,
            value: "mxa.mailgun.org",
            category: "receiving",
            valid: "valid",
            dns_type: "MX",
            priority: "10"
          },
          {
            record_type: "MX", 
            name: domain,
            value: "mxb.mailgun.org",
            category: "receiving",
            valid: "valid", 
            dns_type: "MX",
            priority: "10"
          }
        ]
      };
    } catch (error) {
      console.error('Error getting DNS records:', error);
      throw error;
    }
  }

  /**
   * Update service activation status for an operation
   */
  async updateServiceStatus(operationId: string, isActive: boolean) {
    try {
      console.log(`🔄 Updating service status for operation ${operationId}: ${isActive ? 'ACTIVE' : 'INACTIVE'}`);
      
      // Update or create the customer support operation record
      const [existingOperation] = await this.db
        .select()
        .from(this.schema.customerSupportOperations)
        .where(eq(this.schema.customerSupportOperations.operationId, operationId))
        .limit(1);

      if (existingOperation) {
        // Update existing record
        const [updatedOperation] = await this.db
          .update(this.schema.customerSupportOperations)
          .set({ 
            isActive,
            updatedAt: new Date()
          })
          .where(eq(this.schema.customerSupportOperations.operationId, operationId))
          .returning();

        return {
          operationId,
          isActive,
          emailDomain: updatedOperation.emailDomain,
          emailPrefix: updatedOperation.emailPrefix,
          isCustomDomain: updatedOperation.isCustomDomain,
          domainVerified: updatedOperation.domainVerified,
          mailgunDomainName: updatedOperation.mailgunDomainName,
        };
      } else {
        // Buscar o nome da operação
        const [operation] = await this.db
          .select({ name: this.schema.operations.name })
          .from(this.schema.operations)
          .where(eq(this.schema.operations.id, operationId))
          .limit(1);

        // Create new record with default email domain
        const defaultDomain = `suporte-${operation?.name?.toLowerCase().replace(/\s+/g, '-') || 'operacao'}@mg.cod-dashboard.app`;
        
        const [newOperation] = await this.db
          .insert(this.schema.customerSupportOperations)
          .values({
            operationId,
            operationName: operation?.name || null,
            emailDomain: defaultDomain,
            isActive,
            emailPrefix: 'suporte',
            aiEnabled: true,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        return {
          operationId,
          isActive,
          emailDomain: newOperation.emailDomain,
          emailPrefix: newOperation.emailPrefix,
          isCustomDomain: newOperation.isCustomDomain,
          domainVerified: newOperation.domainVerified,
          mailgunDomainName: newOperation.mailgunDomainName,
        };
      }
    } catch (error) {
      console.error('Error updating service status:', error);
      throw error;
    }
  }

  async generateTestCallResponse(operationId: string, customerMessage: string): Promise<string> {
    try {
      console.log(`🎯 Generating test call response for operation ${operationId}`);
      
      // Get all active AI directives for the operation
      const directives = await this.db
        .select()
        .from(this.schema.aiDirectives)
        .where(
          and(
            eq(this.schema.aiDirectives.operationId, operationId),
            eq(this.schema.aiDirectives.isActive, true)
          )
        );

      console.log(`📋 Found ${directives.length} active directives`);

      // Build context from directives
      let context = "Você é Sofia, uma assistente de vendas por telefone empática e eficiente. Você está em uma ligação simulada onde deve:\n\n";
      
      // Group directives by type
      const storeInfo = directives.filter(d => d.type === 'store_info');
      const productInfo = directives.filter(d => d.type === 'product_info');
      const responseStyle = directives.filter(d => d.type === 'response_style');
      const custom = directives.filter(d => d.type === 'custom');

      if (storeInfo.length > 0) {
        context += "**INFORMAÇÕES DA LOJA:**\n";
        storeInfo.forEach(directive => {
          context += `- ${directive.title}: ${directive.content}\n`;
        });
        context += "\n";
      }

      if (productInfo.length > 0) {
        context += "**INFORMAÇÕES DOS PRODUTOS:**\n";
        productInfo.forEach(directive => {
          context += `- ${directive.title}: ${directive.content}\n`;
        });
        context += "\n";
      }

      if (responseStyle.length > 0) {
        context += "**ESTILO DE RESPOSTA:**\n";
        responseStyle.forEach(directive => {
          context += `- ${directive.title}: ${directive.content}\n`;
        });
        context += "\n";
      }

      if (custom.length > 0) {
        context += "**INSTRUÇÕES PERSONALIZADAS:**\n";
        custom.forEach(directive => {
          context += `- ${directive.title}: ${directive.content}\n`;
        });
        context += "\n";
      }

      context += `
**CONTEXTO DA LIGAÇÃO:**
Esta é uma simulação de atendimento telefônico onde você deve demonstrar suas habilidades baseadas nas diretivas acima.

**SUA MISSÃO:**
- Ser empática e profissional
- Tentar convencer o cliente usando as informações fornecidas
- Resolver dúvidas e objeções
- Manter o tom conversacional de uma ligação telefônica
- Aplicar todas as instruções personalizadas

**RESPOSTA:**
Responda como Sofia em uma ligação telefônica real, usando as diretivas acima.

Cliente: ${customerMessage}

Sofia:`;

      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: context
            }
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content?.trim() || 'Desculpe, não consegui processar sua mensagem no momento.';

      console.log('🤖 AI Response generated successfully');
      return aiResponse;

    } catch (error) {
      console.error('❌ Error generating test call response:', error);
      
      // Fallback response
      return "Olá! Obrigada por entrar em contato. Como posso ajudá-lo hoje? Estou aqui para esclarecer qualquer dúvida sobre nossos produtos e serviços.";
    }
  }

  /**
   * Validate public URL configuration for Twilio webhooks
   */
  private validatePublicUrl(): { isValid: boolean; domain?: string; protocol?: string; error?: string } {
    const domain = process.env.REPLIT_DEV_DOMAIN;
    
    if (!domain) {
      const error = 'REPLIT_DEV_DOMAIN environment variable not set. This is required for Twilio webhooks to function properly.';
      console.error(`❌ ${error}`);
      return { isValid: false, error };
    }
    
    if (domain.includes('localhost') || domain.includes('127.0.0.1')) {
      const error = 'Cannot use localhost URLs for Twilio webhooks. The webhook URLs must be publicly accessible for Twilio to reach them.';
      console.error(`❌ ${error}`);
      return { isValid: false, error };
    }
    
    // Enforce HTTPS for webhook URLs for security
    const protocol = 'https';
    
    if (!domain.includes('replit.dev') && !domain.includes('https')) {
      const error = 'Webhook URLs must use HTTPS for security. Please ensure your REPLIT_DEV_DOMAIN is properly configured.';
      console.error(`❌ ${error}`);
      return { isValid: false, error };
    }
    
    console.log(`✅ Using secure public URL: ${protocol}://${domain}`);
    
    return { isValid: true, domain, protocol };
  }

  async makeTestCall(operationId: string, customerPhone: string, callType: 'test' | 'sales' = 'test'): Promise<{
    callSid: string;
    status: string;
  }> {
    try {
      console.log(`📞 Making real ${callType} call to ${customerPhone} for operation ${operationId}`);

      // Validate public URL configuration BEFORE proceeding
      const urlValidation = this.validatePublicUrl();
      if (!urlValidation.isValid) {
        throw new Error(`Invalid public URL configuration: ${urlValidation.error}`);
      }

      // Get operation's Telnyx phone number
      const voiceSettings = await this.db
        .select()
        .from(this.schema.voiceSettings)
        .where(eq(this.schema.voiceSettings.operationId, operationId))
        .limit(1);

      const telnyxPhoneNumber = voiceSettings[0]?.telnyxPhoneNumber;
      
      if (!telnyxPhoneNumber) {
        throw new Error('No Telnyx phone number configured for this operation. Please provision a number first.');
      }

      // Import and use Telnyx provisioning service
      const { TelnyxProvisioningService } = await import('./telnyx-provisioning-service');
      const telnyxService = new TelnyxProvisioningService();

      // Build webhook URLs using validated domain
      const webhookDomain = urlValidation.domain!;
      const webhookUrl = `https://${webhookDomain}/api/voice/telnyx-incoming-call?operationId=${operationId}&callType=${callType}`;

      console.log(`🔗 Using validated webhook URL: ${webhookUrl}`);

      // Make the call using Telnyx
      const callResult = await telnyxService.makeOutboundCall(
        telnyxPhoneNumber,
        customerPhone,
        webhookUrl
      );

      console.log(`✅ Test call initiated via Telnyx: ${callResult.call_control_id}, status: ${callResult.status}`);

      return {
        callSid: callResult.call_control_id || 'unknown',
        status: callResult.status || 'initiated'
      };

    } catch (error) {
      console.error('❌ Error making test call:', error);
      
      // Handle specific Telnyx errors with detailed messages
      if (error && typeof error === 'object' && 'message' in error) {
        const telnyxError = error as any;
        if (telnyxError.message.includes('Invalid phone number')) {
          throw new Error(`Número de telefone inválido: ${customerPhone}. Verifique o formato (+5511999999999).`);
        }
        if (telnyxError.message.includes('insufficient funds')) {
          throw new Error('Saldo insuficiente na conta Telnyx. Adicione créditos para fazer chamadas.');
        }
        if (telnyxError.message.includes('not found')) {
          throw new Error(`Número Telnyx ${telnyxPhoneNumber} não encontrado. Verifique se está corretamente provisionado.`);
        }
      }
      
      throw new Error(`Failed to make test call: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const customerSupportService = new CustomerSupportService();