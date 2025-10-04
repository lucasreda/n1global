import jwt from "jsonwebtoken";
import { db } from "./db";
import { eq, and, sql, desc } from "drizzle-orm";
import {
  affiliateClicks,
  affiliateConversions,
  affiliateProfiles,
  affiliateMemberships,
  orders,
  type AffiliateClick,
  type AffiliateConversion,
  type InsertAffiliateClick,
  type InsertAffiliateConversion,
} from "@shared/schema";
import { nanoid } from "nanoid";

const JWT_SECRET = process.env.JWT_SECRET || "cod-dashboard-secret-key-development-2025";

interface AffiliateTrackingToken {
  affiliateId: string;
  productId?: string;
  operationId?: string;
  campaignId?: string;
  metadata?: Record<string, any>;
  iat?: number;
  exp?: number;
}

export class AffiliateTrackingService {
  /**
   * Generate JWT-signed tracking link for affiliate
   */
  generateTrackingLink(
    affiliateId: string,
    baseUrl: string,
    options?: {
      productId?: string;
      operationId?: string;
      campaignId?: string;
      metadata?: Record<string, any>;
      expiresIn?: string; // e.g. "30d", "1y"
    }
  ): string {
    const payload: AffiliateTrackingToken = {
      affiliateId,
      productId: options?.productId,
      operationId: options?.operationId,
      campaignId: options?.campaignId,
      metadata: options?.metadata,
    };

    // Generate JWT token with expiration (default 90 days)
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: options?.expiresIn || "90d",
    });

    // Create tracking ID
    const trackingId = nanoid(16);

    // Build tracking URL with both token and trackingId
    const url = new URL(baseUrl);
    url.searchParams.set("aff", token);
    url.searchParams.set("ref", trackingId);

    return url.toString();
  }

  /**
   * Verify and decode affiliate tracking token
   */
  verifyTrackingToken(token: string): AffiliateTrackingToken | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AffiliateTrackingToken;
      return decoded;
    } catch (error) {
      console.error("Invalid affiliate tracking token:", error);
      return null;
    }
  }

  /**
   * Register a click when someone visits an affiliate link
   */
  async registerClick(
    token: string,
    trackingId: string,
    metadata: {
      ipAddress?: string;
      userAgent?: string;
      referer?: string;
      landingUrl?: string;
    }
  ): Promise<AffiliateClick | null> {
    try {
      // Decode and verify token
      const decoded = this.verifyTrackingToken(token);
      if (!decoded) {
        console.error("Invalid affiliate token");
        return null;
      }

      // Check if affiliate profile exists and is approved
      const profile = await db
        .select()
        .from(affiliateProfiles)
        .where(eq(affiliateProfiles.id, decoded.affiliateId))
        .limit(1);

      if (profile.length === 0 || profile[0].status !== "approved") {
        console.error("Affiliate not found or not approved");
        return null;
      }

      // Check for duplicate click from same IP within last 24 hours (basic fraud prevention)
      if (metadata.ipAddress) {
        const recentClick = await db
          .select()
          .from(affiliateClicks)
          .where(
            and(
              eq(affiliateClicks.affiliateId, decoded.affiliateId),
              eq(affiliateClicks.ipAddress, metadata.ipAddress),
              sql`clicked_at > NOW() - INTERVAL '24 hours'`
            )
          )
          .limit(1);

        if (recentClick.length > 0) {
          console.log("Duplicate click detected from same IP within 24h");
          // Still allow but flag it
        }
      }

      // Register click
      const clickData: InsertAffiliateClick = {
        affiliateId: decoded.affiliateId,
        trackingId,
        productId: decoded.productId || null,
        operationId: decoded.operationId || null,
        campaignId: decoded.campaignId || null,
        ipAddress: metadata.ipAddress || null,
        userAgent: metadata.userAgent || null,
        referer: metadata.referer || null,
        landingUrl: metadata.landingUrl || null,
      };

      const inserted = await db
        .insert(affiliateClicks)
        .values(clickData as any)
        .returning();

      return inserted[0];
    } catch (error) {
      console.error("Error registering affiliate click:", error);
      return null;
    }
  }

  /**
   * Register a conversion when an order is placed through affiliate link
   */
  async registerConversion(data: {
    orderId: string;
    affiliateToken: string;
    trackingId: string;
    productId: string;
    operationId: string;
    orderTotal: string;
    currency: string;
    customerEmail?: string;
    metadata?: Record<string, any>;
  }): Promise<AffiliateConversion | null> {
    try {
      // Decode and verify token
      const decoded = this.verifyTrackingToken(data.affiliateToken);
      if (!decoded) {
        console.error("Invalid affiliate token for conversion");
        return null;
      }

      // Verify affiliate has active membership for this product/operation
      const membership = await db
        .select()
        .from(affiliateMemberships)
        .where(
          and(
            eq(affiliateMemberships.affiliateId, decoded.affiliateId),
            eq(affiliateMemberships.operationId, data.operationId),
            eq(affiliateMemberships.status, "active")
          )
        )
        .limit(1);

      if (membership.length === 0) {
        console.error("Affiliate does not have active membership for this operation");
        return null;
      }

      // Check for duplicate conversion (same order ID)
      const existingConversion = await db
        .select()
        .from(affiliateConversions)
        .where(eq(affiliateConversions.orderId, data.orderId))
        .limit(1);

      if (existingConversion.length > 0) {
        console.log("Conversion already registered for this order");
        return existingConversion[0];
      }

      // Get click data if exists
      const clickData = await db
        .select()
        .from(affiliateClicks)
        .where(eq(affiliateClicks.trackingId, data.trackingId))
        .orderBy(desc(affiliateClicks.clickedAt))
        .limit(1);

      // Calculate commission (will be finalized by commission engine)
      // For now, just store order total - actual commission calculated separately
      const conversionData: InsertAffiliateConversion = {
        affiliateId: decoded.affiliateId,
        orderId: data.orderId,
        productId: data.productId,
        operationId: data.operationId,
        clickId: clickData[0]?.id || null,
        trackingId: data.trackingId,
        orderTotal: data.orderTotal,
        currency: data.currency,
        commissionAmount: "0", // Will be calculated by commission engine
        commissionPercent: membership[0].customCommissionPercent || null,
        status: "pending",
        customerEmail: data.customerEmail || null,
        conversionMetadata: data.metadata || null,
      };

      const inserted = await db
        .insert(affiliateConversions)
        .values(conversionData as any)
        .returning();

      // Update order with affiliate attribution
      await db
        .update(orders)
        .set({
          affiliateId: decoded.affiliateId,
          affiliateTrackingId: data.trackingId,
          landingSource: "affiliate",
        })
        .where(eq(orders.id, data.orderId));

      return inserted[0];
    } catch (error) {
      console.error("Error registering affiliate conversion:", error);
      return null;
    }
  }

  /**
   * Get click statistics for affiliate
   */
  async getClickStats(
    affiliateId: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<{
    totalClicks: number;
    uniqueIps: number;
    topProducts: Array<{ productId: string; clicks: number }>;
  }> {
    let whereConditions = [eq(affiliateClicks.affiliateId, affiliateId)];

    if (dateRange) {
      whereConditions.push(
        sql`clicked_at >= ${dateRange.startDate.toISOString()}`
      );
      whereConditions.push(
        sql`clicked_at <= ${dateRange.endDate.toISOString()}`
      );
    }

    // Total clicks
    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(affiliateClicks)
      .where(and(...whereConditions));

    // Unique IPs
    const uniqueIpsResult = await db
      .select({ count: sql<number>`count(DISTINCT ip_address)::int` })
      .from(affiliateClicks)
      .where(and(...whereConditions));

    // Top products by clicks
    const topProductsResult = await db
      .select({
        productId: affiliateClicks.productId,
        clicks: sql<number>`count(*)::int`,
      })
      .from(affiliateClicks)
      .where(and(...whereConditions))
      .groupBy(affiliateClicks.productId)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    return {
      totalClicks: totalResult[0]?.count || 0,
      uniqueIps: uniqueIpsResult[0]?.count || 0,
      topProducts: topProductsResult
        .filter((p) => p.productId !== null)
        .map((p) => ({
          productId: p.productId!,
          clicks: p.clicks,
        })),
    };
  }

  /**
   * Get conversions for affiliate
   */
  async getConversions(
    affiliateId: string,
    filters?: {
      status?: string;
      dateRange?: { startDate: Date; endDate: Date };
      limit?: number;
      offset?: number;
    }
  ): Promise<AffiliateConversion[]> {
    let whereConditions = [eq(affiliateConversions.affiliateId, affiliateId)];

    if (filters?.status) {
      whereConditions.push(eq(affiliateConversions.status, filters.status));
    }

    if (filters?.dateRange) {
      whereConditions.push(
        sql`converted_at >= ${filters.dateRange.startDate.toISOString()}`
      );
      whereConditions.push(
        sql`converted_at <= ${filters.dateRange.endDate.toISOString()}`
      );
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
}

export const affiliateTrackingService = new AffiliateTrackingService();
