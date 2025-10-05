import { db } from "./db";
import { eq, and, or, sql, desc, isNull } from "drizzle-orm";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  affiliateProfiles,
  affiliateMemberships,
  affiliateConversions,
  affiliateCommissionRules,
  affiliatePayouts,
  affiliateLandingPages,
  affiliateLandingPageProducts,
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

// Base62 character set for short code generation
const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Generate a short tracking code using crypto random bytes and base62 encoding
 * @param length Target length of the code (default 8)
 * @returns A random base62 string of the specified length
 */
function generateShortCode(length: number = 8): string {
  // Generate 6 random bytes (48 bits of entropy)
  const bytes = crypto.randomBytes(6);
  
  // Convert bytes to base62
  let result = '';
  let num = BigInt('0x' + bytes.toString('hex'));
  
  while (num > 0n && result.length < length) {
    const remainder = Number(num % 62n);
    result = BASE62_CHARS[remainder] + result;
    num = num / 62n;
  }
  
  // Pad with leading zeros if needed
  while (result.length < length) {
    result = BASE62_CHARS[0] + result;
  }
  
  return result;
}

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
   * Get affiliate profile by referral code
   * Used for universal tracking via URL parameters
   */
  async getAffiliateByReferralCode(referralCode: string): Promise<AffiliateProfile | null> {
    const result = await db
      .select()
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.referralCode, referralCode))
      .limit(1);
    
    return result[0] || null;
  }

  /**
   * Generate and assign a unique short code to a membership
   * Uses collision detection to ensure uniqueness
   */
  async generateMembershipShortCode(membershipId: string): Promise<string> {
    const maxRetries = 10;
    
    for (let i = 0; i < maxRetries; i++) {
      const shortCode = generateShortCode(8);
      
      // Check if this code already exists
      const existing = await db
        .select()
        .from(affiliateMemberships)
        .where(eq(affiliateMemberships.shortCode, shortCode))
        .limit(1);
      
      if (existing.length === 0) {
        // Code is unique, assign it to the membership
        await db
          .update(affiliateMemberships)
          .set({ 
            shortCode,
            updatedAt: new Date(),
          })
          .where(eq(affiliateMemberships.id, membershipId));
        
        return shortCode;
      }
      
      // Collision detected, try again
      console.log(`Short code collision detected (${shortCode}), retrying...`);
    }
    
    throw new Error('Failed to generate unique short code after maximum retries');
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
        productImageUrl: products.imageUrl,
        productPrice: products.price,
        productDescription: products.description,
      })
      .from(affiliateMemberships)
      .leftJoin(operations, eq(affiliateMemberships.operationId, operations.id))
      .leftJoin(products, eq(affiliateMemberships.productId, products.id))
      .where(eq(affiliateMemberships.affiliateId, affiliateId))
      .orderBy(desc(affiliateMemberships.createdAt));

    return memberships;
  }

  /**
   * Get affiliate details with products
   */
  async getAffiliateDetailsWithProducts(affiliateId: string): Promise<any> {
    // Get affiliate profile
    const profile = await this.getAffiliateProfileById(affiliateId);
    
    if (!profile) {
      throw new Error("Afiliado não encontrado");
    }

    // Get user info
    const user = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, profile.userId))
      .limit(1);

    // Get memberships with product details
    const memberships = await this.getAffiliateMemberships(affiliateId);

    return {
      ...profile,
      userName: user[0]?.name,
      userEmail: user[0]?.email,
      memberships,
    };
  }

  /**
   * Get products with membership and commission info for affiliate
   */
  async getProductsWithMembershipInfo(affiliateId: string): Promise<any[]> {
    // Get all active products
    const allProducts = await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        imageUrl: products.imageUrl,
        status: sql<string>`CASE WHEN ${products.isActive} THEN 'active' ELSE 'inactive' END`,
        storeId: products.storeId,
        operationId: products.operationId,
        operationName: operations.name,
      })
      .from(products)
      .leftJoin(operations, eq(products.operationId, operations.id))
      .where(eq(products.isActive, true));

    // Get memberships for this affiliate
    const memberships = await db
      .select()
      .from(affiliateMemberships)
      .where(eq(affiliateMemberships.affiliateId, affiliateId));

    // Get commission rules
    const commissionRules = await db.select().from(affiliateCommissionRules);

    // Build membership and commission maps
    const membershipMap = new Map();
    memberships.forEach((m) => {
      if (m.productId) {
        membershipMap.set(m.productId, m);
      }
    });

    const commissionMap = new Map();
    commissionRules.forEach((rule) => {
      if (rule.productId) {
        commissionMap.set(rule.productId, rule);
      }
    });

    // Combine data
    return allProducts.map((product) => {
      const membership = membershipMap.get(product.id);
      const commissionRule = commissionMap.get(product.id);
      
      const commissionPercentage = membership?.customCommissionPercent 
        ? Number(membership.customCommissionPercent)
        : commissionRule?.commissionPercentage 
        ? Number(commissionRule.commissionPercentage)
        : 10; // default 10%

      const price = Number(product.price) || 0;
      const estimatedCommission = (price * commissionPercentage) / 100;

      return {
        ...product,
        price: Number(product.price),
        commissionRule: commissionRule || undefined,
        membership: membership || undefined,
        estimatedCommission,
        isMember: !!membership,
        membershipStatus: membership?.status || undefined,
      };
    });
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

  /**
   * Get admin program statistics
   */
  async getAdminProgramStats() {
    // Total affiliates by status
    const totalAffiliates = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(affiliateProfiles);

    const activeAffiliates = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.status, "active"));

    const pendingAffiliates = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.status, "pending"));

    // Total conversions
    const totalConversions = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(affiliateConversions);

    const pendingConversions = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(affiliateConversions)
      .where(eq(affiliateConversions.status, "pending"));

    const approvedConversions = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(affiliateConversions)
      .where(eq(affiliateConversions.status, "approved"));

    // Total commissions
    const totalCommissions = await db
      .select({ sum: sql<string>`COALESCE(SUM(commission_amount), 0)::text` })
      .from(affiliateConversions)
      .where(eq(affiliateConversions.status, "approved"));

    const pendingCommissions = await db
      .select({ sum: sql<string>`COALESCE(SUM(commission_amount), 0)::text` })
      .from(affiliateConversions)
      .where(eq(affiliateConversions.status, "pending"));

    // This month's conversions
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const monthConversions = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(affiliateConversions)
      .where(sql`${affiliateConversions.createdAt} >= ${firstDayOfMonth}`);

    return {
      totalAffiliates: totalAffiliates[0]?.count || 0,
      activeAffiliates: activeAffiliates[0]?.count || 0,
      pendingAffiliates: pendingAffiliates[0]?.count || 0,
      totalConversions: totalConversions[0]?.count || 0,
      pendingConversions: pendingConversions[0]?.count || 0,
      approvedConversions: approvedConversions[0]?.count || 0,
      totalCommissions: parseFloat(totalCommissions[0]?.sum || "0"),
      pendingCommissions: parseFloat(pendingCommissions[0]?.sum || "0"),
      monthConversions: monthConversions[0]?.count || 0,
    };
  }

  async getPendingConversions(filters?: {
    limit?: number;
    offset?: number;
  }) {
    const conversions = await db
      .select({
        id: affiliateConversions.id,
        orderId: affiliateConversions.orderId,
        affiliateId: affiliateConversions.affiliateId,
        trackingId: affiliateConversions.trackingId,
        orderValue: affiliateConversions.orderValue,
        commissionAmount: affiliateConversions.commissionAmount,
        commissionRate: affiliateConversions.commissionRate,
        status: affiliateConversions.status,
        createdAt: affiliateConversions.createdAt,
        affiliateName: users.username,
        affiliateEmail: users.email,
      })
      .from(affiliateConversions)
      .leftJoin(affiliateProfiles, eq(affiliateConversions.affiliateId, affiliateProfiles.id))
      .leftJoin(users, eq(affiliateProfiles.userId, users.id))
      .where(eq(affiliateConversions.status, "pending"))
      .orderBy(sql`${affiliateConversions.createdAt} DESC`)
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    return conversions;
  }

  /**
   * Get membership requests (for admin)
   */
  async getMembershipRequests(filters?: {
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = db
      .select({
        id: affiliateMemberships.id,
        affiliateId: affiliateMemberships.affiliateId,
        operationId: affiliateMemberships.operationId,
        productId: affiliateMemberships.productId,
        status: affiliateMemberships.status,
        customCommissionPercent: affiliateMemberships.customCommissionPercent,
        approvedAt: affiliateMemberships.approvedAt,
        createdAt: affiliateMemberships.createdAt,
        updatedAt: affiliateMemberships.updatedAt,
        affiliateName: users.name,
        affiliateEmail: users.email,
        operationName: operations.name,
        productName: products.name,
      })
      .from(affiliateMemberships)
      .leftJoin(affiliateProfiles, eq(affiliateMemberships.affiliateId, affiliateProfiles.id))
      .leftJoin(users, eq(affiliateProfiles.userId, users.id))
      .leftJoin(operations, eq(affiliateMemberships.operationId, operations.id))
      .leftJoin(products, eq(affiliateMemberships.productId, products.id))
      .orderBy(desc(affiliateMemberships.createdAt)) as any;

    if (filters?.status) {
      query = query.where(eq(affiliateMemberships.status, filters.status)) as any;
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
   * Approve membership request
   */
  async approveMembershipRequest(
    membershipId: string,
    customCommissionPercent?: number
  ): Promise<AffiliateMembership> {
    const updateData: any = {
      status: "active",
      approvedAt: new Date(),
      updatedAt: new Date(),
    };

    if (customCommissionPercent !== undefined) {
      updateData.customCommissionPercent = customCommissionPercent.toString();
    }

    const [updated] = await db
      .update(affiliateMemberships)
      .set(updateData)
      .where(eq(affiliateMemberships.id, membershipId))
      .returning();

    if (!updated) {
      throw new Error("Solicitação de afiliação não encontrada");
    }

    // Generate short code for tracking if not already present
    if (!updated.shortCode) {
      await this.generateMembershipShortCode(membershipId);
      
      // Fetch the updated membership with the new short code
      const [refreshed] = await db
        .select()
        .from(affiliateMemberships)
        .where(eq(affiliateMemberships.id, membershipId))
        .limit(1);
      
      return refreshed || updated;
    }

    return updated;
  }

  /**
   * Reject membership request
   */
  async rejectMembershipRequest(
    membershipId: string,
    reason?: string
  ): Promise<AffiliateMembership> {
    const [updated] = await db
      .update(affiliateMemberships)
      .set({
        status: "terminated",
        updatedAt: new Date(),
      })
      .where(eq(affiliateMemberships.id, membershipId))
      .returning();

    if (!updated) {
      throw new Error("Solicitação de afiliação não encontrada");
    }

    return updated;
  }

  async assignLandingPageToAffiliate(
    affiliateId: string,
    landingPageId: string,
    landingPageUrl: string
  ): Promise<AffiliateProfile> {
    const [updated] = await db
      .update(affiliateProfiles)
      .set({
        landingPageId,
        landingPageUrl,
        updatedAt: new Date(),
      })
      .where(eq(affiliateProfiles.id, affiliateId))
      .returning();

    if (!updated) {
      throw new Error("Afiliado não encontrado");
    }

    return updated;
  }

  async unassignLandingPageFromAffiliate(
    affiliateId: string
  ): Promise<AffiliateProfile> {
    const [updated] = await db
      .update(affiliateProfiles)
      .set({
        landingPageId: null,
        landingPageUrl: null,
        updatedAt: new Date(),
      })
      .where(eq(affiliateProfiles.id, affiliateId))
      .returning();

    if (!updated) {
      throw new Error("Afiliado não encontrado");
    }

    return updated;
  }

  /**
   * Get product details with landing pages
   */
  async getProductDetailsWithLandingPages(productId: string, affiliateId: string): Promise<any> {
    // Get product info
    const product = await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        price: products.price,
        imageUrl: products.imageUrl,
        status: sql<string>`CASE WHEN ${products.isActive} THEN 'active' ELSE 'inactive' END`,
        operationId: products.operationId,
        operationName: operations.name,
      })
      .from(products)
      .leftJoin(operations, eq(products.operationId, operations.id))
      .where(eq(products.id, productId))
      .limit(1);

    if (!product[0]) {
      return null;
    }

    // Get commission rules for this product
    const commissionRules = await db
      .select()
      .from(affiliateCommissionRules)
      .where(
        and(
          eq(affiliateCommissionRules.productId, productId),
          eq(affiliateCommissionRules.isActive, true)
        )
      );

    // Get membership info for this affiliate
    const membershipResult = await db
      .select()
      .from(affiliateMemberships)
      .where(
        and(
          eq(affiliateMemberships.affiliateId, affiliateId),
          eq(affiliateMemberships.productId, productId)
        )
      )
      .limit(1);

    const membership = membershipResult[0] || null;

    // Get landing pages associated with this product
    const landingPages = await db
      .select({
        id: affiliateLandingPages.id,
        name: affiliateLandingPages.name,
        description: affiliateLandingPages.description,
        thumbnailUrl: affiliateLandingPages.thumbnailUrl,
        deployedUrl: affiliateLandingPages.vercelDeploymentUrl,
        status: affiliateLandingPages.status,
      })
      .from(affiliateLandingPages)
      .innerJoin(
        affiliateLandingPageProducts,
        eq(affiliateLandingPageProducts.landingPageId, affiliateLandingPages.id)
      )
      .where(
        and(
          eq(affiliateLandingPageProducts.productId, productId),
          eq(affiliateLandingPages.status, 'active')
        )
      );

    // Get or generate short code for tracking
    let trackingCode = membership?.shortCode;
    
    // If membership exists but doesn't have a short code yet, generate one
    if (membership && !trackingCode && membership.status === 'active') {
      trackingCode = await this.generateMembershipShortCode(membership.id);
    }

    // Add tracking parameter to each landing page URL
    const landingPagesWithTracking = landingPages.map(lp => ({
      ...lp,
      deployedUrl: lp.deployedUrl && trackingCode 
        ? `https://${lp.deployedUrl}?ref=${trackingCode}` 
        : lp.deployedUrl ? `https://${lp.deployedUrl}` : null,
    }));

    return {
      ...product[0],
      commissionRule: commissionRules[0] || null,
      membership: membership,
      landingPages: landingPagesWithTracking,
    };
  }

  /**
   * Generate tracking link for affiliate and product
   * @param affiliateId Affiliate ID
   * @param productId Product ID
   * @param landingPageId Optional landing page ID to use (if not specified, uses oldest active landing page)
   */
  async generateTrackingLink(
    affiliateId: string, 
    productId: string,
    landingPageId?: string
  ): Promise<string> {
    // Get affiliate profile
    const profile = await this.getAffiliateProfileById(affiliateId);
    
    if (!profile) {
      throw new Error("Perfil de afiliado não encontrado");
    }

    // Check if affiliate has membership for this product
    const membershipResult = await db
      .select()
      .from(affiliateMemberships)
      .where(
        and(
          eq(affiliateMemberships.affiliateId, affiliateId),
          eq(affiliateMemberships.productId, productId),
          eq(affiliateMemberships.status, 'active')
        )
      )
      .limit(1);

    if (!membershipResult[0]) {
      throw new Error("Você precisa ter aprovação para este produto antes de gerar um link de rastreamento");
    }

    const membership = membershipResult[0];

    // Get or generate short code for tracking
    let shortCode = membership.shortCode;
    if (!shortCode) {
      shortCode = await this.generateMembershipShortCode(membership.id);
    }

    // Build where conditions for landing page query
    const whereConditions = [
      eq(affiliateLandingPageProducts.productId, productId),
      eq(affiliateLandingPages.status, 'active')
    ];

    // If a specific landing page is requested, add it to the filter
    if (landingPageId) {
      whereConditions.push(eq(affiliateLandingPages.id, landingPageId));
    }

    // Get active landing page for this product (ordered by creation date for consistency)
    const landingPageResult = await db
      .select({
        deployedUrl: affiliateLandingPages.vercelDeploymentUrl,
        name: affiliateLandingPages.name,
        id: affiliateLandingPages.id,
      })
      .from(affiliateLandingPages)
      .innerJoin(
        affiliateLandingPageProducts,
        eq(affiliateLandingPageProducts.landingPageId, affiliateLandingPages.id)
      )
      .where(and(...whereConditions))
      .orderBy(affiliateLandingPages.createdAt)
      .limit(1);

    if (!landingPageResult[0] || !landingPageResult[0].deployedUrl) {
      throw new Error("Nenhuma landing page ativa encontrada para este produto");
    }

    // Build tracking link with short code
    const trackingLink = `https://${landingPageResult[0].deployedUrl}?ref=${shortCode}`;

    return trackingLink;
  }
}

export const affiliateService = new AffiliateService();
