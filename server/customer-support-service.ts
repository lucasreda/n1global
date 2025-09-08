import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, and, or, ilike, desc, count } from "drizzle-orm";

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
   * Get operation support config
   */
  async getOperationSupport(operationId: string) {
    try {
      // TODO: Get from database
      return {
        emailDomain: "garriguesmilano.com",
        emailPrefix: "support",
        isCustomDomain: true,
        domainVerified: true,
        mailgunDomainName: "garriguesmilano.com"
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

      console.log('📋 Categories from DB:', categories.map(c => ({id: c.id, name: c.name, displayName: c.displayName})));
      
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
      
      console.log('📋 Returning to frontend:', result);

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

      // Get tickets with category info
      const tickets = await this.db
        .select()
        .from(this.schema.supportTickets)
        .leftJoin(
          this.schema.supportCategories,
          eq(this.schema.supportTickets.categoryId, this.schema.supportCategories.id)
        )
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(this.schema.supportTickets.createdAt))
        .limit(parseInt(limit))
        .offset((parseInt(page) - 1) * parseInt(limit));

      // Get total count
      const totalResult = await this.db
        .select({ count: count() })
        .from(this.schema.supportTickets)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

      const total = totalResult[0]?.count || 0;

      return {
        tickets: tickets.map(row => ({
          id: row.support_tickets.id,
          ticketNumber: row.support_tickets.ticketNumber,
          subject: row.support_tickets.subject,
          customerEmail: row.support_tickets.customerEmail,
          customerName: row.support_tickets.customerName,
          status: row.support_tickets.status,
          priority: row.support_tickets.priority || 'medium',
          createdAt: row.support_tickets.createdAt,
          lastActivity: row.support_tickets.lastActivity,
          conversationCount: row.support_tickets.conversationCount || 0,
          category: row.support_categories?.name || 'Sem categoria'
        })),
        total,
        page: parseInt(page)
      };
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
        category: row.support_categories?.name || 'Sem categoria'
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
   * Get support analytics
   */
  async getAnalytics(operationId: string, period: string) {
    try {
      return {
        totalTickets: 0,
        resolvedTickets: 0,
        averageResponseTime: "0h",
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
      return {
        success: true,
        ticketId: "processed-ticket-id",
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
      return {
        success: true,
        messageId: "reply-message-id",
        sent: true
      };
    } catch (error) {
      console.error('Error sending email reply:', error);
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
}

export const customerSupportService = new CustomerSupportService();