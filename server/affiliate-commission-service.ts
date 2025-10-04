import { db } from "./db";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import {
  affiliateConversions,
  affiliateCommissionRules,
  affiliateMemberships,
  affiliatePayouts,
  type AffiliateConversion,
  type AffiliateCommissionRule,
  type AffiliatePayout,
  type InsertAffiliatePayout,
} from "@shared/schema";

export class AffiliateCommissionService {
  /**
   * Calculate commission for a conversion based on rules and membership
   */
  async calculateCommission(conversionId: string): Promise<{
    commissionAmount: string;
    commissionPercent: string;
  }> {
    // Get conversion details
    const conversion = await db
      .select()
      .from(affiliateConversions)
      .where(eq(affiliateConversions.id, conversionId))
      .limit(1);

    if (conversion.length === 0) {
      throw new Error("Conversão não encontrada");
    }

    const conv = conversion[0];

    // Check if there's a custom commission from membership
    const membership = await db
      .select()
      .from(affiliateMemberships)
      .where(
        and(
          eq(affiliateMemberships.affiliateId, conv.affiliateId),
          eq(affiliateMemberships.operationId, conv.operationId),
          eq(affiliateMemberships.status, "active")
        )
      )
      .limit(1);

    let commissionPercent = "10.00"; // Default 10%

    if (membership.length > 0 && membership[0].customCommissionPercent) {
      commissionPercent = membership[0].customCommissionPercent;
    } else {
      // Check for commission rule for this operation/product
      const ruleConditions = [
        eq(affiliateCommissionRules.operationId, conv.operationId),
      ];

      if (conv.productId) {
        ruleConditions.push(eq(affiliateCommissionRules.productId, conv.productId));
      }

      const rule = await db
        .select()
        .from(affiliateCommissionRules)
        .where(and(...ruleConditions))
        .orderBy(desc(affiliateCommissionRules.createdAt))
        .limit(1);

      if (rule.length > 0) {
        commissionPercent = rule[0].commissionPercent;
      }
    }

    // Calculate commission amount
    const orderTotal = parseFloat(conv.orderTotal);
    const percent = parseFloat(commissionPercent);
    const commissionAmount = (orderTotal * percent / 100).toFixed(2);

    return {
      commissionAmount,
      commissionPercent,
    };
  }

  /**
   * Apply commission calculation to a conversion
   */
  async applyCommission(conversionId: string): Promise<AffiliateConversion> {
    const { commissionAmount, commissionPercent } = await this.calculateCommission(conversionId);

    const updated = await db
      .update(affiliateConversions)
      .set({
        commissionAmount,
        commissionPercent,
      })
      .where(eq(affiliateConversions.id, conversionId))
      .returning();

    return updated[0];
  }

  /**
   * Process all pending conversions to calculate commissions
   */
  async processPendingConversions(): Promise<{
    processed: number;
    totalCommission: string;
  }> {
    // Get all pending conversions with commission = 0
    const pending = await db
      .select()
      .from(affiliateConversions)
      .where(
        and(
          eq(affiliateConversions.status, "pending"),
          eq(affiliateConversions.commissionAmount, "0")
        )
      );

    let totalCommission = 0;

    for (const conv of pending) {
      try {
        const { commissionAmount } = await this.calculateCommission(conv.id);
        
        await db
          .update(affiliateConversions)
          .set({
            commissionAmount,
          })
          .where(eq(affiliateConversions.id, conv.id));

        totalCommission += parseFloat(commissionAmount);
      } catch (error) {
        console.error(`Error processing conversion ${conv.id}:`, error);
      }
    }

    return {
      processed: pending.length,
      totalCommission: totalCommission.toFixed(2),
    };
  }

  /**
   * Approve a conversion
   */
  async approveConversion(
    conversionId: string,
    approvedByUserId: string,
    notes?: string
  ): Promise<AffiliateConversion> {
    // First, ensure commission is calculated
    const conversion = await db
      .select()
      .from(affiliateConversions)
      .where(eq(affiliateConversions.id, conversionId))
      .limit(1);

    if (conversion.length === 0) {
      throw new Error("Conversão não encontrada");
    }

    // If commission is not calculated, calculate it
    if (parseFloat(conversion[0].commissionAmount) === 0) {
      await this.applyCommission(conversionId);
    }

    // Approve the conversion
    const updated = await db
      .update(affiliateConversions)
      .set({
        status: "approved",
        approvedAt: new Date(),
        approvalNotes: notes || null,
      })
      .where(eq(affiliateConversions.id, conversionId))
      .returning();

    return updated[0];
  }

  /**
   * Reject a conversion
   */
  async rejectConversion(
    conversionId: string,
    reason: string
  ): Promise<AffiliateConversion> {
    const updated = await db
      .update(affiliateConversions)
      .set({
        status: "rejected",
        approvalNotes: reason,
      })
      .where(eq(affiliateConversions.id, conversionId))
      .returning();

    return updated[0];
  }

  /**
   * Bulk approve conversions
   */
  async bulkApproveConversions(
    conversionIds: string[],
    approvedByUserId: string
  ): Promise<{ approved: number; failed: number }> {
    let approved = 0;
    let failed = 0;

    for (const conversionId of conversionIds) {
      try {
        await this.approveConversion(conversionId, approvedByUserId);
        approved++;
      } catch (error) {
        console.error(`Error approving conversion ${conversionId}:`, error);
        failed++;
      }
    }

    return { approved, failed };
  }

  /**
   * Generate payout for affiliate
   */
  async generatePayout(
    affiliateId: string,
    options?: {
      minAmount?: number;
      includeConversionIds?: string[];
    }
  ): Promise<AffiliatePayout> {
    // Get all approved conversions for this affiliate that are not in a payout yet
    let query = db
      .select()
      .from(affiliateConversions)
      .where(
        and(
          eq(affiliateConversions.affiliateId, affiliateId),
          eq(affiliateConversions.status, "approved"),
          sql`payout_id IS NULL`
        )
      );

    // If specific conversions specified, filter to those
    if (options?.includeConversionIds && options.includeConversionIds.length > 0) {
      query = db
        .select()
        .from(affiliateConversions)
        .where(
          and(
            eq(affiliateConversions.affiliateId, affiliateId),
            eq(affiliateConversions.status, "approved"),
            sql`payout_id IS NULL`,
            inArray(affiliateConversions.id, options.includeConversionIds)
          )
        ) as any;
    }

    const conversions = await query;

    if (conversions.length === 0) {
      throw new Error("Nenhuma conversão aprovada disponível para payout");
    }

    // Calculate total amount
    const totalAmount = conversions.reduce(
      (sum, conv) => sum + parseFloat(conv.commissionAmount),
      0
    );

    // Check minimum amount
    if (options?.minAmount && totalAmount < options.minAmount) {
      throw new Error(
        `Valor total (${totalAmount.toFixed(2)}) é menor que o mínimo (${options.minAmount})`
      );
    }

    // Get currency from first conversion (assume all same currency)
    const currency = conversions[0].currency;

    // Create payout
    const payoutData: InsertAffiliatePayout = {
      affiliateId,
      amount: totalAmount.toFixed(2),
      currency,
      status: "pending",
      conversionCount: conversions.length,
    };

    const payout = await db
      .insert(affiliatePayouts)
      .values(payoutData as any)
      .returning();

    // Link conversions to payout
    await db
      .update(affiliateConversions)
      .set({
        status: "paid",
        payoutId: payout[0].id,
      })
      .where(
        inArray(
          affiliateConversions.id,
          conversions.map((c) => c.id)
        )
      );

    return payout[0];
  }

  /**
   * Mark payout as paid
   */
  async markPayoutAsPaid(
    payoutId: string,
    paymentMethod: string,
    transactionId?: string,
    notes?: string
  ): Promise<AffiliatePayout> {
    const updated = await db
      .update(affiliatePayouts)
      .set({
        status: "paid",
        paidAt: new Date(),
        paymentMethod,
        transactionId: transactionId || null,
        notes: notes || null,
      })
      .where(eq(affiliatePayouts.id, payoutId))
      .returning();

    return updated[0];
  }

  /**
   * Get pending conversions for admin review
   */
  async getPendingConversions(filters?: {
    affiliateId?: string;
    operationId?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let whereConditions = [eq(affiliateConversions.status, "pending")];

    if (filters?.affiliateId) {
      whereConditions.push(eq(affiliateConversions.affiliateId, filters.affiliateId));
    }

    if (filters?.operationId) {
      whereConditions.push(eq(affiliateConversions.operationId, filters.operationId));
    }

    let query = db
      .select()
      .from(affiliateConversions)
      .where(and(...whereConditions))
      .orderBy(desc(affiliateConversions.convertedAt));

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    return query;
  }

  /**
   * Get payouts
   */
  async getPayouts(filters?: {
    affiliateId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<AffiliatePayout[]> {
    let whereConditions = [];

    if (filters?.affiliateId) {
      whereConditions.push(eq(affiliatePayouts.affiliateId, filters.affiliateId));
    }

    if (filters?.status) {
      whereConditions.push(eq(affiliatePayouts.status, filters.status));
    }

    let query = db
      .select()
      .from(affiliatePayouts)
      .orderBy(desc(affiliatePayouts.createdAt));

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions)) as any;
    }

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    return query;
  }

  /**
   * Get commission rules
   */
  async getCommissionRules(filters?: {
    operationId?: string;
    productId?: string;
  }): Promise<AffiliateCommissionRule[]> {
    let whereConditions = [];

    if (filters?.operationId) {
      whereConditions.push(eq(affiliateCommissionRules.operationId, filters.operationId));
    }

    if (filters?.productId) {
      whereConditions.push(eq(affiliateCommissionRules.productId, filters.productId));
    }

    let query = db
      .select()
      .from(affiliateCommissionRules)
      .orderBy(desc(affiliateCommissionRules.createdAt));

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions)) as any;
    }

    return query;
  }

  /**
   * Create commission rule
   */
  async createCommissionRule(data: {
    operationId: string;
    productId?: string;
    commissionPercent: string;
    description?: string;
  }): Promise<AffiliateCommissionRule> {
    const inserted = await db
      .insert(affiliateCommissionRules)
      .values({
        operationId: data.operationId,
        productId: data.productId || null,
        commissionPercent: data.commissionPercent,
        description: data.description || null,
      } as any)
      .returning();

    return inserted[0];
  }

  /**
   * Update commission rule
   */
  async updateCommissionRule(
    ruleId: string,
    data: Partial<{
      commissionPercent: string;
      description: string;
    }>
  ): Promise<AffiliateCommissionRule> {
    const updated = await db
      .update(affiliateCommissionRules)
      .set(data)
      .where(eq(affiliateCommissionRules.id, ruleId))
      .returning();

    return updated[0];
  }
}

export const affiliateCommissionService = new AffiliateCommissionService();
