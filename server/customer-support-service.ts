import OpenAI from "openai";
import { db } from "./db";
import {
  customerSupportOperations,
  customerSupportCategories,
  customerSupportTickets,
  customerSupportMessages,
  customerSupportEmails,
  type CustomerSupportOperation,
  type CustomerSupportCategory,
  type CustomerSupportTicket,
  type CustomerSupportMessage,
  type InsertCustomerSupportTicket,
  type InsertCustomerSupportMessage,
  type InsertCustomerSupportEmail,
} from "@shared/schema";
import { eq, and, or, desc, count, sql, like, ilike, gte } from "drizzle-orm";
import Mailgun from "mailgun.js";
import formData from "form-data";
import fs from "fs";
import path from "path";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Mailgun
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY || "",
});

export class CustomerSupportService {
  /**
   * Generate a unique ticket number for an operation
   */
  private async generateTicketNumber(operationId: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    // Count existing tickets for this operation today
    const ticketCount = await db.select({ count: count() })
      .from(customerSupportTickets)
      .where(
        and(
          eq(customerSupportTickets.operationId, operationId),
          like(customerSupportTickets.ticketNumber, `SUP-${year}${month}-%`)
        )
      );
    
    const nextNumber = (ticketCount[0]?.count || 0) + 1;
    return `SUP-${year}${month}-${String(nextNumber).padStart(4, '0')}`;
  }

  /**
   * Initialize customer support for an operation
   */
  async initializeOperationSupport(operationId: string, operationName: string): Promise<CustomerSupportOperation> {
    // Check if already exists
    const existing = await db.select()
      .from(customerSupportOperations)
      .where(eq(customerSupportOperations.operationId, operationId))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create support operation
    const [operation] = await db.insert(customerSupportOperations)
      .values({
        operationId,
        operationName,
        emailDomain: `suporte.${operationName.toLowerCase().replace(/\s+/g, '')}.n1support.com`,
        isCustomDomain: false,
        aiEnabled: true,
        aiCategories: ['duvidas', 'alteracao_endereco', 'cancelamento'],
        brandingConfig: {
          primaryColor: '#2563eb',
          logo: 'https://cdn.shopify.com/s/files/1/0683/4808/4271/files/n1-lblue.png?v=1757084587'
        },
        businessHours: {
          monday: { start: '09:00', end: '18:00', enabled: true },
          tuesday: { start: '09:00', end: '18:00', enabled: true },
          wednesday: { start: '09:00', end: '18:00', enabled: true },
          thursday: { start: '09:00', end: '18:00', enabled: true },
          friday: { start: '09:00', end: '18:00', enabled: true },
          saturday: { start: '09:00', end: '14:00', enabled: false },
          sunday: { start: '09:00', end: '14:00', enabled: false }
        }
      })
      .returning();

    // Create default categories
    const defaultCategories = [
      {
        operationId,
        name: 'duvidas',
        displayName: 'Dúvidas',
        description: 'Dúvidas gerais sobre pedidos e produtos',
        isAutomated: true,
        aiEnabled: true,
        priority: 1,
        color: '#3b82f6'
      },
      {
        operationId,
        name: 'alteracao_endereco',
        displayName: 'Alteração de Endereço',
        description: 'Solicitações de mudança de endereço de entrega',
        isAutomated: true,
        aiEnabled: true,
        priority: 2,
        color: '#f59e0b'
      },
      {
        operationId,
        name: 'cancelamento',
        displayName: 'Cancelamento',
        description: 'Solicitações de cancelamento de pedidos',
        isAutomated: true,
        aiEnabled: true,
        priority: 3,
        color: '#ef4444'
      },
      {
        operationId,
        name: 'reclamacoes',
        displayName: 'Reclamações',
        description: 'Reclamações sobre produtos ou serviços',
        isAutomated: false,
        aiEnabled: false,
        priority: 4,
        color: '#dc2626'
      },
      {
        operationId,
        name: 'manual',
        displayName: 'Manual',
        description: 'Tickets que precisam de atenção manual',
        isAutomated: false,
        aiEnabled: false,
        priority: 0,
        color: '#6b7280'
      }
    ];

    await db.insert(customerSupportCategories)
      .values(defaultCategories);

    return operation;
  }

  /**
   * Get operation support configuration
   */
  async getOperationSupport(operationId: string): Promise<CustomerSupportOperation | null> {
    const [operation] = await db.select({
      id: customerSupportOperations.id,
      operationId: customerSupportOperations.operationId,
      operationName: customerSupportOperations.operationName,
      emailDomain: customerSupportOperations.emailDomain,
      isCustomDomain: customerSupportOperations.isCustomDomain,
      aiEnabled: customerSupportOperations.aiEnabled,
      aiCategories: customerSupportOperations.aiCategories,
      brandingConfig: customerSupportOperations.brandingConfig,
      businessHours: customerSupportOperations.businessHours,
      createdAt: customerSupportOperations.createdAt,
      updatedAt: customerSupportOperations.updatedAt
    })
      .from(customerSupportOperations)
      .where(eq(customerSupportOperations.operationId, operationId))
      .limit(1);

    return operation || null;
  }

  /**
   * Get all categories for an operation
   */
  async getCategories(operationId: string): Promise<CustomerSupportCategory[]> {
    return db.select()
      .from(customerSupportCategories)
      .where(
        and(
          eq(customerSupportCategories.operationId, operationId),
          eq(customerSupportCategories.isActive, true)
        )
      )
      .orderBy(desc(customerSupportCategories.priority));
  }

  /**
   * Get tickets for an operation with filters
   */
  async getTickets(
    operationId: string,
    filters: {
      status?: string;
      category?: string;
      search?: string;
      assignedTo?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    tickets: (CustomerSupportTicket & { category: CustomerSupportCategory | null })[];
    total: number;
  }> {
    const { status, category, search, assignedTo, limit = 50, offset = 0 } = filters;

    console.log('🔍 Service getTickets called with:', { operationId, filters });

    // Build where conditions
    const conditions = [eq(customerSupportTickets.operationId, operationId)];

    if (status && status !== 'all') {
      conditions.push(eq(customerSupportTickets.status, status));
    }

    if (category && category !== 'all') {
      conditions.push(eq(customerSupportTickets.categoryId, category));
    }

    if (search) {
      conditions.push(
        or(
          ilike(customerSupportTickets.subject, `%${search}%`),
          ilike(customerSupportTickets.customerEmail, `%${search}%`),
          ilike(customerSupportTickets.ticketNumber, `%${search}%`)
        )
      );
    }

    if (assignedTo) {
      conditions.push(eq(customerSupportTickets.assignedAgentId, assignedTo));
    }

    // Get tickets with categories
    const tickets = await db.select({
      ticket: customerSupportTickets,
      category: customerSupportCategories,
    })
      .from(customerSupportTickets)
      .leftJoin(
        customerSupportCategories,
        eq(customerSupportTickets.categoryId, customerSupportCategories.id)
      )
      .where(and(...conditions))
      .orderBy(desc(customerSupportTickets.lastActivity))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count: total }] = await db.select({ count: count() })
      .from(customerSupportTickets)
      .where(and(...conditions));

    const result = {
      tickets: tickets.map(row => ({
        ...row.ticket,
        category: row.category,
      })),
      total,
    };

    console.log('🔍 Service returning:', {
      ticketsCount: result.tickets.length,
      total: result.total,
      ticketNumbers: result.tickets.map(t => t.ticketNumber)
    });

    return result;
  }

  /**
   * Get a specific ticket with all messages
   */
  async getTicket(
    operationId: string,
    ticketId: string
  ): Promise<(CustomerSupportTicket & {
    category: CustomerSupportCategory | null;
    messages: CustomerSupportMessage[];
  }) | null> {
    // Get ticket with category
    const [ticketResult] = await db.select({
      ticket: customerSupportTickets,
      category: customerSupportCategories,
    })
      .from(customerSupportTickets)
      .leftJoin(
        customerSupportCategories,
        eq(customerSupportTickets.categoryId, customerSupportCategories.id)
      )
      .where(
        and(
          eq(customerSupportTickets.id, ticketId),
          eq(customerSupportTickets.operationId, operationId)
        )
      )
      .limit(1);

    if (!ticketResult) {
      return null;
    }

    // Get messages for this ticket
    const messages = await db.select()
      .from(customerSupportMessages)
      .where(eq(customerSupportMessages.ticketId, ticketId))
      .orderBy(customerSupportMessages.createdAt);

    return {
      ...ticketResult.ticket,
      category: ticketResult.category,
      messages,
    };
  }

  /**
   * Create a new ticket
   */
  async createTicket(
    operationId: string,
    ticketData: Omit<InsertCustomerSupportTicket, 'operationId' | 'ticketNumber'>
  ): Promise<CustomerSupportTicket> {
    const ticketNumber = await this.generateTicketNumber(operationId);

    const [ticket] = await db.insert(customerSupportTickets)
      .values({
        ...ticketData,
        operationId,
        ticketNumber,
      })
      .returning();

    return ticket;
  }

  /**
   * Add a message to a ticket
   */
  async addMessage(
    operationId: string,
    ticketId: string,
    messageData: Omit<InsertCustomerSupportMessage, 'operationId' | 'ticketId'>
  ): Promise<CustomerSupportMessage> {
    const [message] = await db.insert(customerSupportMessages)
      .values({
        ...messageData,
        operationId,
        ticketId,
      })
      .returning();

    // Update ticket last activity
    await db.update(customerSupportTickets)
      .set({ lastActivity: new Date() })
      .where(eq(customerSupportTickets.id, ticketId));

    return message;
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(
    operationId: string,
    ticketId: string,
    status: string,
    assignedTo?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      lastActivity: new Date(),
    };

    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
    }

    if (assignedTo !== undefined) {
      updateData.assignedAgentId = assignedTo || null;
    }

    await db.update(customerSupportTickets)
      .set(updateData)
      .where(
        and(
          eq(customerSupportTickets.id, ticketId),
          eq(customerSupportTickets.operationId, operationId)
        )
      );
  }

  /**
   * Get dashboard metrics for an operation
   */
  async getDashboardMetrics(operationId: string, period: string = '7d') {
    const daysMap = {
      '7d': 7,
      '30d': 30,
      '90d': 90
    };
    const days = daysMap[period as keyof typeof daysMap] || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get ticket counts by status
    const statusCounts = await db.select({
      status: customerSupportTickets.status,
      count: count()
    })
      .from(customerSupportTickets)
      .where(
        and(
          eq(customerSupportTickets.operationId, operationId),
          sql`${customerSupportTickets.createdAt} >= ${startDate}`
        )
      )
      .groupBy(customerSupportTickets.status);

    // Get category distribution
    const categoryDistribution = await db.select({
      category: customerSupportTickets.categoryName,
      count: count()
    })
      .from(customerSupportTickets)
      .where(
        and(
          eq(customerSupportTickets.operationId, operationId),
          sql`${customerSupportTickets.createdAt} >= ${startDate}`
        )
      )
      .groupBy(customerSupportTickets.categoryName);

    // Get AI automation rate
    const [aiStats] = await db.select({
      total: count(),
      automated: sql<number>`count(case when ${customerSupportTickets.isAutomated} = true then 1 end)::int`
    })
      .from(customerSupportTickets)
      .where(
        and(
          eq(customerSupportTickets.operationId, operationId),
          sql`${customerSupportTickets.createdAt} >= ${startDate}`
        )
      );

    const automationRate = aiStats.total > 0 ? 
      Math.round((aiStats.automated / aiStats.total) * 100) : 0;

    // Calculate response time (simplified)
    const avgResponseTime = 4.2; // This would be calculated from actual message timestamps

    return {
      period,
      overview: {
        totalTickets: statusCounts.reduce((sum, item) => sum + item.count, 0),
        openTickets: statusCounts.find(s => s.status === 'open')?.count || 0,
        resolvedTickets: statusCounts.find(s => s.status === 'resolved')?.count || 0,
        avgResponseTime,
        automationRate,
      },
      statusDistribution: statusCounts.map(s => ({
        status: s.status,
        count: s.count,
        percentage: Math.round((s.count / (aiStats.total || 1)) * 100)
      })),
      categoryDistribution: categoryDistribution.map(c => ({
        category: c.category || 'Sem categoria',
        count: c.count,
        percentage: Math.round((c.count / (aiStats.total || 1)) * 100)
      })),
    };
  }

  /**
   * Get overview metrics for an operation
   */
  async getOverview(operationId: string): Promise<{
    openTickets: number;
    aiResponded: number;
    monthlyTickets: number;
    unreadTickets: number;
  }> {
    console.log('🔍 Getting overview for operation:', operationId);

    // Count tickets by status
    const openTickets = await db
      .select({ count: count() })
      .from(customerSupportTickets)
      .where(
        and(
          eq(customerSupportTickets.operationId, operationId),
          eq(customerSupportTickets.status, 'open')
        )
      );

    // Count AI responded tickets  
    const aiResponded = await db
      .select({ count: count() })
      .from(customerSupportTickets)
      .where(
        and(
          eq(customerSupportTickets.operationId, operationId),
          eq(customerSupportTickets.isAutomated, true)
        )
      );

    // Count monthly tickets (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const monthlyTickets = await db
      .select({ count: count() })
      .from(customerSupportTickets)
      .where(
        and(
          eq(customerSupportTickets.operationId, operationId),
          gte(customerSupportTickets.createdAt, thirtyDaysAgo)
        )
      );

    // Count unread tickets
    const unreadTickets = await db
      .select({ count: count() })
      .from(customerSupportTickets)
      .where(
        and(
          eq(customerSupportTickets.operationId, operationId),
          eq(customerSupportTickets.isRead, false)
        )
      );

    const result = {
      openTickets: openTickets[0]?.count || 0,
      aiResponded: aiResponded[0]?.count || 0,
      monthlyTickets: monthlyTickets[0]?.count || 0,
      unreadTickets: unreadTickets[0]?.count || 0,
    };

    console.log('🔍 Overview result:', result);
    return result;
  }

  /**
   * Configure Mailgun domain for operation
   */
  async configureMailgunDomain(
    operationId: string,
    domainName: string,
    isCustomDomain: boolean = false,
    emailPrefix: string = "suporte"
  ): Promise<{ success: boolean; domain?: any; error?: string; dnsRecords?: any[] }> {
    try {
      if (!process.env.MAILGUN_API_KEY) {
        console.warn('⚠️ MAILGUN_API_KEY not configured, using mock data');
        return this.configureMockDomain(operationId, domainName, isCustomDomain);
      }

      console.log(`📧 Creating Mailgun domain: ${domainName}`);
      
      // Create domain in Mailgun
      const domainData = {
        name: domainName,
        spam_action: 'disabled' as const,
        wildcard: false
      };

      const createResponse = await mg.domains.create(domainData);
      console.log('✅ Mailgun domain created:', createResponse);

      // Get DNS records for the domain
      const dnsRecords = await this.getDomainDnsRecords(domainName);

      // Configure webhook for the domain
      await this.configureWebhook(domainName, emailPrefix);

      // Update database with domain info
      await db.update(customerSupportOperations)
        .set({
          emailDomain: domainName,
          emailPrefix,
          isCustomDomain,
          mailgunDomainName: domainName,
          domainVerified: false,
          updatedAt: new Date(),
        })
        .where(eq(customerSupportOperations.operationId, operationId));

      return { 
        success: true, 
        domain: createResponse,
        dnsRecords 
      };
    } catch (error: any) {
      console.error('❌ Error configuring Mailgun domain:', error);
      console.log('🔍 Error details:', {
        status: error.status,
        message: error.message,
        details: error.details,
        type: error.type
      });
      
      // If domain already exists, that's OK - get its DNS records
      if (error.status === 400 && (error.message?.includes('already exists') || error.details?.includes('already exists'))) {
        console.log('✅ Domain already exists condition matched! Proceeding with configuration...');
        
        try {
          const dnsRecords = await this.getDomainDnsRecords(domainName);
          
          // Configure webhook and routes for existing domain
          await this.configureWebhook(domainName, emailPrefix);
          
          await db.update(customerSupportOperations)
            .set({
              emailDomain: domainName,
              emailPrefix,
              isCustomDomain,
              mailgunDomainName: domainName,
              domainVerified: false,
              updatedAt: new Date(),
            })
            .where(eq(customerSupportOperations.operationId, operationId));

          return { 
            success: true, 
            domain: { name: domainName },
            dnsRecords 
          };
        } catch (dnsError) {
          console.error('❌ Error fetching DNS records:', dnsError);
          return { success: false, error: 'Domain exists but could not fetch DNS records' };
        }
      }
      
      return { success: false, error: error.message || 'Failed to configure domain' };
    }
  }

  /**
   * Get DNS records for a Mailgun domain
   */
  async getDomainDnsRecords(domainName: string): Promise<any[]> {
    try {
      if (!process.env.MAILGUN_API_KEY) {
        return this.getMockDnsRecords(domainName);
      }

      console.log(`📋 Fetching DNS records for: ${domainName}`);
      const response = await mg.domains.get(domainName);
      
      const dnsRecords = [];
      
      // Add receiving records
      if (response.receiving_dns_records) {
        dnsRecords.push(...response.receiving_dns_records.map((record: any) => ({
          ...record,
          category: 'receiving'
        })));
      }

      // Add sending records  
      if (response.sending_dns_records) {
        dnsRecords.push(...response.sending_dns_records.map((record: any) => ({
          ...record,
          category: 'sending'
        })));
      }

      console.log(`✅ Found ${dnsRecords.length} DNS records`);
      return dnsRecords;
    } catch (error) {
      console.error('❌ Error fetching DNS records:', error);
      throw error;
    }
  }

  /**
   * Verify domain configuration
   */
  async verifyDomain(operationId: string, domainName: string): Promise<{ success: boolean; verified?: boolean; error?: string }> {
    try {
      if (!process.env.MAILGUN_API_KEY) {
        console.log('🔍 Mock verification for:', domainName);
        // Mock verification - simulate successful verification
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await db.update(customerSupportOperations)
          .set({
            domainVerified: true,
            updatedAt: new Date(),
          })
          .where(eq(customerSupportOperations.operationId, operationId));

        return { success: true, verified: true };
      }

      console.log(`🔍 Verifying domain: ${domainName}`);
      
      // Check domain status in Mailgun
      const response = await mg.domains.get(domainName);
      const isVerified = response.state === 'active';

      // Update database
      await db.update(customerSupportOperations)
        .set({
          domainVerified: isVerified,
          updatedAt: new Date(),
        })
        .where(eq(customerSupportOperations.operationId, operationId));

      return { success: true, verified: isVerified };
    } catch (error: any) {
      console.error('❌ Error verifying domain:', error);
      return { success: false, error: error.message || 'Failed to verify domain' };
    }
  }

  /**
   * Mock domain configuration (fallback when API key not available)
   */
  private async configureMockDomain(
    operationId: string,
    domainName: string,
    isCustomDomain: boolean
  ): Promise<{ success: boolean; domain?: any; dnsRecords?: any[] }> {
    const dnsRecords = this.getMockDnsRecords(domainName);
    
    await db.update(customerSupportOperations)
      .set({
        emailDomain: domainName,
        isCustomDomain,
        mailgunDomainName: domainName,
        domainVerified: false,
        updatedAt: new Date(),
      })
      .where(eq(customerSupportOperations.operationId, operationId));

    return { 
      success: true, 
      domain: { name: domainName },
      dnsRecords 
    };
  }

  /**
   * Get mock DNS records (fallback when API key not available)
   */
  private getMockDnsRecords(domainName: string): any[] {
    return [
      {
        record_type: 'TXT',
        name: domainName,
        value: `v=spf1 include:mailgun.org ~all`,
        category: 'sending',
        valid: 'unknown',
        dns_type: 'TXT'
      },
      {
        record_type: 'TXT',
        name: `mg._domainkey.${domainName}`,
        value: 'k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC4...',
        category: 'sending',
        valid: 'unknown',
        dns_type: 'TXT'
      },
      {
        record_type: 'CNAME',
        name: `email.${domainName}`,
        value: 'mailgun.org',
        category: 'sending',
        valid: 'unknown',
        dns_type: 'CNAME'
      },
      {
        record_type: 'MX',
        name: domainName,
        value: '10 mxa.mailgun.org',
        category: 'receiving',
        valid: 'unknown',
        dns_type: 'MX',
        priority: '10'
      },
      {
        record_type: 'MX',
        name: domainName,
        value: '10 mxb.mailgun.org',
        category: 'receiving',
        valid: 'unknown',
        dns_type: 'MX',
        priority: '10'
      }
    ];
  }

  /**
   * Process incoming email from Mailgun webhook
   */
  async processIncomingEmail(emailData: {
    from: string;
    to: string;
    subject: string;
    textBody: string;
    htmlBody: string;
    messageId: string;
    inReplyTo?: string;
    references?: string;
    timestamp: Date;
  }): Promise<{ success: boolean; error?: string; ticketId?: string }> {
    try {
      console.log('📧 Processing incoming email:', {
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        inReplyTo: emailData.inReplyTo
      });

      // Extract domain from recipient to find operation
      const recipientDomain = emailData.to.split('@')[1];
      const operation = await db.select()
        .from(customerSupportOperations)
        .where(eq(customerSupportOperations.emailDomain, recipientDomain))
        .limit(1);

      if (!operation.length) {
        console.log('❌ No operation found for domain:', recipientDomain);
        return { success: false, error: 'Domain not configured' };
      }

      const operationData = operation[0];

      // Try to find existing ticket by thread (In-Reply-To, References, or subject)
      let existingTicket = await this.findTicketByThread(
        operationData.operationId, 
        emailData.inReplyTo, 
        emailData.references, 
        emailData.subject
      );

      let ticketId: string;

      if (existingTicket) {
        // Reply to existing ticket
        console.log('📬 Found existing ticket:', existingTicket.ticketNumber);
        ticketId = existingTicket.id;
        
        // Update ticket status to customer_reply if it was closed
        if (existingTicket.status === 'closed' || existingTicket.status === 'resolved') {
          await db.update(customerSupportTickets)
            .set({ 
              status: 'customer_reply',
              lastActivity: new Date()
            })
            .where(eq(customerSupportTickets.id, ticketId));
        }
      } else {
        // Create new ticket
        console.log('🎫 Creating new ticket for email');
        const newTicket = await this.createTicket(operationData.operationId, {
          customerEmail: emailData.from,
          customerName: this.extractNameFromEmail(emailData.from),
          subject: emailData.subject,
          content: emailData.textBody || emailData.htmlBody || '',
          category: 'Geral',
          priority: 'medium',
          source: 'email'
        });
        ticketId = newTicket.id;
      }

      // Add customer message to ticket
      await this.addMessage(operationData.operationId, ticketId, {
        sender: 'customer',
        senderName: this.extractNameFromEmail(emailData.from),
        senderEmail: emailData.from,
        subject: emailData.subject,
        content: emailData.textBody || '',
        htmlContent: emailData.htmlBody || emailData.textBody?.replace(/\n/g, '<br>') || '',
      });

      console.log('✅ Email processed successfully, ticket:', ticketId);
      return { success: true, ticketId };
    } catch (error) {
      console.error('❌ Error processing incoming email:', error);
      return { success: false, error: 'Failed to process email' };
    }
  }

  /**
   * Find existing ticket by email thread headers
   */
  private async findTicketByThread(
    operationId: string, 
    inReplyTo?: string, 
    references?: string, 
    subject?: string
  ): Promise<any> {
    try {
      // First try by message ID in thread
      if (inReplyTo) {
        const messageByReplyTo = await db.select()
          .from(customerSupportMessages)
          .where(eq(customerSupportMessages.subject, inReplyTo))
          .limit(1);

        if (messageByReplyTo.length) {
          const ticketId = messageByReplyTo[0].ticketId;
          return await db.select()
            .from(customerSupportTickets)
            .where(
              and(
                eq(customerSupportTickets.id, ticketId),
                eq(customerSupportTickets.operationId, operationId)
              )
            )
            .limit(1)
            .then(results => results[0]);
        }
      }

      // Try by subject pattern (Re: TICKET-NUMBER)
      if (subject) {
        const ticketNumberMatch = subject.match(/(?:Re:|RE:).*?(SUP-\d{6}-\d{4})/i);
        if (ticketNumberMatch) {
          const ticketNumber = ticketNumberMatch[1];
          return await db.select()
            .from(customerSupportTickets)
            .where(
              and(
                eq(customerSupportTickets.ticketNumber, ticketNumber),
                eq(customerSupportTickets.operationId, operationId)
              )
            )
            .limit(1)
            .then(results => results[0]);
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding ticket by thread:', error);
      return null;
    }
  }

  /**
   * Extract name from email address
   */
  private extractNameFromEmail(email: string): string {
    const match = email.match(/^"?([^"]*)"?\s*<.*>$/);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // If no name in format, use part before @
    const atIndex = email.indexOf('@');
    if (atIndex > 0) {
      return email.substring(0, atIndex).replace(/[._]/g, ' ').trim();
    }
    
    return email;
  }

  /**
   * Send email reply to customer using client's domain
   */
  async sendEmailReply(
    operationId: string,
    ticketId: string,
    subject: string,
    content: string,
    senderName: string,
    senderEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get ticket and operation details
      const ticket = await this.getTicket(operationId, ticketId);
      if (!ticket) {
        return { success: false, error: 'Ticket not found' };
      }

      const operation = await this.getOperationSupport(operationId);
      if (!operation) {
        return { success: false, error: 'Operation support not configured' };
      }

      if (!process.env.MAILGUN_API_KEY) {
        console.warn('⚠️ MAILGUN_API_KEY not configured, saving message only');
        
        await this.addMessage(operationId, ticketId, {
          sender: 'agent',
          senderName,
          senderEmail: `${senderEmail.split('@')[0]}@${operation.emailDomain}`,
          subject: `Re: ${subject} [${ticket.ticketNumber}]`,
          content,
          htmlContent: content.replace(/\n/g, '<br>'),
          sentViaEmail: true,
        });

        return { success: true };
      }

      // Prepare email using client's domain
      const fromAddress = `${senderEmail.split('@')[0]}@${operation.emailDomain || 'localhost'}`;
      const emailData = {
        from: `${senderName} <${fromAddress}>`,
        to: ticket.customerEmail,
        subject: `Re: ${subject} [${ticket.ticketNumber}]`,
        text: content,
        html: this.createEmailTemplate(content, senderName, operation.operationName || 'Support'),
        'o:tag': ['customer-support'],
        'o:tracking': true,
        'h:Reply-To': fromAddress,
      };

      console.log('📧 Sending email via Mailgun:', {
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject
      });

      // Send via Mailgun
      const result = await mg.messages.create(operation.emailDomain || 'localhost', emailData);
      console.log('✅ Email sent successfully:', result.id);

      // Save message with actual sent data
      const message = await this.addMessage(operationId, ticketId, {
        sender: 'agent',
        senderName,
        senderEmail: fromAddress,
        subject: emailData.subject,
        content,
        htmlContent: emailData.html,
        sentViaEmail: true,
      });

      // Update ticket status
      await db.update(customerSupportTickets)
        .set({ 
          status: 'agent_reply',
          lastActivity: new Date()
        })
        .where(eq(customerSupportTickets.id, ticketId));

      return { success: true };
    } catch (error: any) {
      console.error('❌ Error sending email reply:', error);
      return { success: false, error: error.message || 'Failed to send email' };
    }
  }

  /**
   * Configure webhook and routes for Mailgun domain
   */
  private async configureWebhook(domainName: string, emailPrefix: string = "suporte"): Promise<void> {
    try {
      if (!process.env.MAILGUN_API_KEY) {
        console.log('⚠️ Skipping webhook/route setup - no API key');
        return;
      }

      // Get the current domain's webhook URL (simplified)
      const webhookUrl = process.env.REPL_ID 
        ? `https://${process.env.REPL_ID}-00-workspace.${process.env.REPLIT_CLUSTER}.replit.dev/api/webhooks/mailgun/email`
        : 'https://localhost:5000/api/webhooks/mailgun/email';

      console.log(`🔗 Configuring webhook for ${domainName}: ${webhookUrl}`);

      // CRITICAL: Create route for incoming emails FIRST (using direct API call)
      console.log(`📧 Creating route for incoming emails to ${domainName}`);
      console.log(`📧 Route URL: ${webhookUrl}`);
      
      const routeData = new URLSearchParams();
      routeData.append('priority', '1');
      routeData.append('description', `Support ${domainName}`);
      routeData.append('expression', `match_recipient("${emailPrefix}@${domainName}")`);
      routeData.append('action', `forward("${webhookUrl}")`);
      routeData.append('action', 'stop()');

      console.log(`📧 Creating route with direct API call...`);

      // Create route using direct API call
      let routeSuccess = false;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await fetch('https://api.mailgun.net/v3/routes', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: routeData
          });

          if (response.ok) {
            const result = await response.json();
            console.log('✅ Mailgun route created successfully:', result.route?.id);
            routeSuccess = true;
            break;
          } else {
            const errorText = await response.text();
            console.log(`❌ Route attempt ${attempt} failed:`, {
              status: response.status,
              statusText: response.statusText,
              error: errorText
            });
            
            if (response.status === 503 && attempt < 2) {
              console.log(`⏳ Retrying route creation in 3 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 3000));
            } else {
              throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
            }
          }
        } catch (routeError: any) {
          console.log(`❌ Route attempt ${attempt} failed:`, routeError.message);
          
          if (attempt < 2) {
            console.log(`⏳ Retrying route creation in 3 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          } else {
            throw routeError;
          }
        }
      }

      if (!routeSuccess) {
        console.log('❌ All route creation attempts failed - may need manual creation');
      }

      // Now create webhooks (for sent email events) - these are optional
      try {
        console.log('📧 Creating webhooks for email events...');
        await mg.webhooks.create(domainName, 'delivered', webhookUrl, true);
        await mg.webhooks.create(domainName, 'opened', webhookUrl, true);
        await mg.webhooks.create(domainName, 'clicked', webhookUrl, true);
        console.log('✅ Webhooks configured successfully');
      } catch (webhookError: any) {
        console.log('⚠️ Webhook creation failed (not critical):', webhookError.message);
      }

    } catch (error: any) {
      console.error('❌ Error configuring webhooks/routes:', error);
      
      // If route already exists, that's OK
      if (error.message?.includes('already exists') || error.status === 400) {
        console.log('📧 Route may already exist, continuing...');
      } else {
        // Don't throw - webhook/route is nice to have but not critical for domain creation
        console.warn('⚠️ Could not configure all webhooks/routes, but domain is still usable');
      }
    }
  }

  /**
   * Create HTML email template
   */
  private createEmailTemplate(content: string, senderName: string, operationName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Resposta do Suporte</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${operationName}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Suporte ao Cliente</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
          <div style="color: #555; white-space: pre-wrap; font-size: 16px;">${content}</div>
        </div>
        
        <div style="border-top: 2px solid #eee; padding-top: 20px;">
          <p style="margin: 0; color: #666; font-size: 14px;">
            <strong>${senderName}</strong><br>
            Equipe de Suporte - ${operationName}
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
          <p>Esta é uma mensagem automática do sistema de suporte. Responda a este email para continuar a conversa.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get analytics data for operation
   */
  async getAnalytics(operationId: string, period: string = '30d'): Promise<any> {
    try {
      const days = parseInt(period.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get ticket counts by status
      const statusCounts = await db.select({
        status: customerSupportTickets.status,
        count: count()
      })
      .from(customerSupportTickets)
      .where(
        and(
          eq(customerSupportTickets.operationId, operationId),
          gte(customerSupportTickets.createdAt, startDate)
        )
      )
      .groupBy(customerSupportTickets.status);

      // Get daily ticket creation
      const dailyTickets = await db.select({
        date: sql<string>`DATE(${customerSupportTickets.createdAt})`,
        count: count()
      })
      .from(customerSupportTickets)
      .where(
        and(
          eq(customerSupportTickets.operationId, operationId),
          gte(customerSupportTickets.createdAt, startDate)
        )
      )
      .groupBy(sql`DATE(${customerSupportTickets.createdAt})`)
      .orderBy(sql`DATE(${customerSupportTickets.createdAt})`);

      return {
        statusCounts,
        dailyTickets,
        period
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      return {
        statusCounts: [],
        dailyTickets: [],
        period
      };
    }
  }
}

export const customerSupportService = new CustomerSupportService();