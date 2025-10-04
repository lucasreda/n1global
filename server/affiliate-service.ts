import { db } from "./db";
import { eq, and, or, sql, desc, isNull } from "drizzle-orm";
import {
  affiliateProfiles,
  affiliateMemberships,
  affiliateConversions,
  affiliateCommissionRules,
  affiliatePayouts,
  users,
  products,
  operations,
  type AffiliateProfile,
  type AffiliateMembership,
  type AffiliateConversion,
  type AffiliateCommissionRule,
  type InsertAffiliateProfile,
  type InsertAffiliateMembership,
} from "@shared/schema";

export class AffiliateService {
  /**
   * Create or update affiliate profile
   */
  async upsertAffiliateProfile(
    userId: string,
    data: Partial<InsertAffiliateProfile>
  ): Promise<AffiliateProfile> {
    // Check if profile already exists
    const existing = await db
      .select()
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing profile
      const updated = await db
        .update(affiliateProfiles)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(affiliateProfiles.userId, userId))
        .returning();
      return updated[0];
    } else {
      // Create new profile
      const inserted = await db
        .insert(affiliateProfiles)
        .values({
          userId,
          ...data,
        } as any)
        .returning();
      return inserted[0];
    }
  }

  /**
   * Get affiliate profile by user ID
   */
  async getAffiliateProfileByUserId(userId: string): Promise<AffiliateProfile | null> {
    const result = await db
      .select()
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.userId, userId))
      .limit(1);
    
    return result[0] || null;
  }

  /**
   * Get affiliate profile by ID
   */
  async getAffiliateProfileById(profileId: string): Promise<AffiliateProfile | null> {
    const result = await db
      .select()
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.id, profileId))
      .limit(1);
    
    return result[0] || null;
  }

  /**
   * List all affiliates (for admin)
   */
  async listAffiliates(filters?: {
    storeId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<AffiliateProfile[]> {
    let query = db.select().from(affiliateProfiles);

    const conditions = [];
    if (filters?.storeId) {
      conditions.push(eq(affiliateProfiles.storeId, filters.storeId));
    }
    if (filters?.status) {
      conditions.push(eq(affiliateProfiles.status, filters.status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(affiliateProfiles.createdAt)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    return query;
  }

  /**
   * Approve affiliate profile
   */
  async approveAffiliate(profileId: string, adminUserId: string): Promise<AffiliateProfile> {
    const updated = await db
      .update(affiliateProfiles)
      .set({
        status: "approved",
        approvedByUserId: adminUserId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(affiliateProfiles.id, profileId))
      .returning();
    
    return updated[0];
  }

  /**
   * Suspend affiliate profile
   */
  async suspendAffiliate(
    profileId: string,
    reason: string
  ): Promise<AffiliateProfile> {
    const updated = await db
      .update(affiliateProfiles)
      .set({
        status: "suspended",
        suspendedReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(affiliateProfiles.id, profileId))
      .returning();
    
    return updated[0];
  }

  /**
   * Get product catalog for affiliate (products they can promote)
   */
  async getProductCatalog(filters?: {
    storeId?: string;
    operationId?: string;
    limit?: number;
  }): Promise<any[]> {
    let query = db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        currency: products.currency,
        imageUrl: products.imageUrl,
        operationId: products.operationId,
        operationName: operations.name,
      })
      .from(products)
      .leftJoin(operations, eq(products.operationId, operations.id));

    const conditions = [];
    if (filters?.storeId) {
      conditions.push(eq(operations.storeId, filters.storeId));
    }
    if (filters?.operationId) {
      conditions.push(eq(products.operationId, filters.operationId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    return query;
  }

  /**
   * Create affiliate membership (affiliate joins product/operation)
   */
  async createMembership(
    data: InsertAffiliateMembership
  ): Promise<AffiliateMembership> {
    const inserted = await db
      .insert(affiliateMemberships)
      .values(data as any)
      .returning();
    
    return inserted[0];
  }

  /**
   * Get affiliate memberships
   */
  async getAffiliateMemberships(affiliateId: string): Promise<any[]> {
    const memberships = await db
      .select({
        id: affiliateMemberships.id,
        affiliateId: affiliateMemberships.affiliateId,
        operationId: affiliateMemberships.operationId,
        productId: affiliateMemberships.productId,
        status: affiliateMemberships.status,
        customCommissionPercent: affiliateMemberships.customCommissionPercent,
        approvedAt: affiliateMemberships.approvedAt,
        createdAt: affiliateMemberships.createdAt,
        operationName: operations.name,
        productName: products.name,
      })
      .from(affiliateMemberships)
      .leftJoin(operations, eq(affiliateMemberships.operationId, operations.id))
      .leftJoin(products, eq(affiliateMemberships.productId, products.id))
      .where(eq(affiliateMemberships.affiliateId, affiliateId))
      .orderBy(desc(affiliateMemberships.createdAt));

    return memberships;
  }

  /**
   * Check if affiliate has membership for operation/product
   */
  async hasMembership(
    affiliateId: string,
    operationId: string,
    productId?: string | null
  ): Promise<boolean> {
    const conditions = [
      eq(affiliateMemberships.affiliateId, affiliateId),
      eq(affiliateMemberships.operationId, operationId),
      eq(affiliateMemberships.status, "active"),
    ];

    if (productId) {
      conditions.push(eq(affiliateMemberships.productId, productId));
    } else {
      conditions.push(isNull(affiliateMemberships.productId));
    }

    const result = await db
      .select()
      .from(affiliateMemberships)
      .where(and(...conditions))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Get affiliate dashboard stats
   */
  async getAffiliateStats(affiliateId: string): Promise<{
    totalClicks: number;
    totalConversions: number;
    conversionRate: number;
    pendingCommissions: string;
    approvedCommissions: string;
    paidCommissions: string;
  }> {
    // Get clicks count
    const clicksResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(affiliateConversions)
      .where(eq(affiliateConversions.affiliateId, affiliateId));
    
    const totalClicks = clicksResult[0]?.count || 0;

    // Get conversions count
    const conversionsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(affiliateConversions)
      .where(eq(affiliateConversions.affiliateId, affiliateId));
    
    const totalConversions = conversionsResult[0]?.count || 0;

    // Calculate conversion rate
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    // Get commission sums by status
    const pendingResult = await db
      .select({ sum: sql<string>`COALESCE(SUM(commission_amount), 0)` })
      .from(affiliateConversions)
      .where(
        and(
          eq(affiliateConversions.affiliateId, affiliateId),
          eq(affiliateConversions.status, "pending")
        )
      );
    
    const approvedResult = await db
      .select({ sum: sql<string>`COALESCE(SUM(commission_amount), 0)` })
      .from(affiliateConversions)
      .where(
        and(
          eq(affiliateConversions.affiliateId, affiliateId),
          eq(affiliateConversions.status, "approved")
        )
      );
    
    const paidResult = await db
      .select({ sum: sql<string>`COALESCE(SUM(commission_amount), 0)` })
      .from(affiliateConversions)
      .where(
        and(
          eq(affiliateConversions.affiliateId, affiliateId),
          eq(affiliateConversions.status, "paid")
        )
      );

    return {
      totalClicks,
      totalConversions,
      conversionRate: Math.round(conversionRate * 100) / 100,
      pendingCommissions: pendingResult[0]?.sum || "0",
      approvedCommissions: approvedResult[0]?.sum || "0",
      paidCommissions: paidResult[0]?.sum || "0",
    };
  }
}

export const affiliateService = new AffiliateService();
