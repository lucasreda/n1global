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
import { eq, and, or, desc, count, sql, like, ilike } from "drizzle-orm";
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
      conditions.push(eq(customerSupportTickets.categoryName, category));
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
   * Configure Mailgun domain for operation (placeholder for future implementation)
   */
  async configureMailgunDomain(
    operationId: string,
    domainName: string,
    isCustomDomain: boolean = false
  ): Promise<{ success: boolean; domain?: any; error?: string }> {
    try {
      // This is a placeholder - in production you'd use Mailgun API
      // to create and verify domains
      
      await db.update(customerSupportOperations)
        .set({
          emailDomain: domainName,
          isCustomDomain,
          mailgunDomainName: domainName,
          domainVerified: false, // Would be true after Mailgun verification
        })
        .where(eq(customerSupportOperations.operationId, operationId));

      return { success: true };
    } catch (error) {
      console.error('Error configuring Mailgun domain:', error);
      return { success: false, error: 'Failed to configure domain' };
    }
  }

  /**
   * Send email reply to customer (simplified implementation)
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

      // For now, just save the message - in production this would send via Mailgun
      await this.addMessage(operationId, ticketId, {
        sender: 'agent',
        senderName,
        senderEmail,
        subject,
        content,
        htmlContent: content.replace(/\n/g, '<br>'),
        sentViaEmail: true,
        emailSentAt: new Date(),
      });

      return { success: true };
    } catch (error) {
      console.error('Error sending email reply:', error);
      return { success: false, error: 'Failed to send email' };
    }
  }
}

export const customerSupportService = new CustomerSupportService();