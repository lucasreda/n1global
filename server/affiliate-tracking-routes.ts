import express from "express";
import { affiliateTrackingService } from "./affiliate-tracking-service";
import { affiliateService } from "./affiliate-service";
import { authenticateToken, requireAffiliate } from "./auth-middleware";
import { z } from "zod";

const router = express.Router();

// =============================================
// PUBLIC ENDPOINTS (No Authentication)
// =============================================

/**
 * POST /api/affiliate/tracking/click/:affiliateRef
 * Register a click using affiliate reference (universal tracking)
 * PUBLIC - No authentication required
 * Used by universal tracking script on landing pages
 */
router.post("/click/:affiliateRef", async (req, res) => {
  try {
    const { affiliateRef } = req.params;
    const { referrer, landingUrl, userAgent, timestamp } = req.body;

    // Get IP from headers
    const ipAddress =
      req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
      req.headers["x-real-ip"]?.toString() ||
      req.socket.remoteAddress;

    // Find affiliate profile by referral code or email
    const profile = await affiliateService.getAffiliateByReferralCode(affiliateRef);
    
    if (!profile) {
      return res.status(404).json({ 
        success: false,
        message: "Referência de afiliado não encontrada" 
      });
    }

    // Generate unique tracking ID for this click
    const trackingId = `trk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Register click using the new simplified method
    const click = await affiliateTrackingService.registerSimpleClick({
      affiliateId: profile.id,
      trackingId,
      ipAddress,
      userAgent: userAgent || req.headers["user-agent"]?.toString(),
      referer: referrer || req.headers.referer?.toString(),
      landingUrl,
    });

    if (!click) {
      return res.status(400).json({ 
        success: false,
        message: "Falha ao registrar clique" 
      });
    }

    res.status(201).json({ 
      success: true, 
      clickId: click.id,
      trackingId: trackingId,
      affiliateId: profile.id
    });
  } catch (error: any) {
    console.error("Error registering universal affiliate click:", error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

/**
 * POST /api/affiliate/tracking/click
 * Register a click when someone visits an affiliate link (legacy JWT-based)
 * PUBLIC - No authentication required
 */
router.post("/click", async (req, res) => {
  try {
    const { token, trackingId, ipAddress, userAgent, referer, landingUrl } = req.body;

    if (!token || !trackingId) {
      return res.status(400).json({ message: "Token e trackingId são obrigatórios" });
    }

    // Get IP from headers if not provided
    const ip =
      ipAddress ||
      req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
      req.headers["x-real-ip"]?.toString() ||
      req.socket.remoteAddress;

    const click = await affiliateTrackingService.registerClick(token, trackingId, {
      ipAddress: ip,
      userAgent: userAgent || req.headers["user-agent"],
      referer: referer || req.headers.referer,
      landingUrl,
    });

    if (!click) {
      return res.status(400).json({ message: "Falha ao registrar clique" });
    }

    res.status(201).json({ success: true, clickId: click.id });
  } catch (error: any) {
    console.error("Error registering affiliate click:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/affiliate/tracking/conversion
 * Register a conversion when an order is placed
 * PUBLIC - Called by external checkout or Vercel-hosted checkout
 */
router.post("/conversion", async (req, res) => {
  try {
    const conversionSchema = z.object({
      orderId: z.string().uuid(),
      affiliateToken: z.string(),
      trackingId: z.string(),
      productId: z.string().uuid(),
      operationId: z.string().uuid(),
      orderTotal: z.string(),
      currency: z.string().length(3),
      customerEmail: z.string().email().optional(),
      metadata: z.record(z.any()).optional(),
    });

    const validatedData = conversionSchema.parse(req.body);

    const conversion = await affiliateTrackingService.registerConversion(validatedData);

    if (!conversion) {
      return res.status(400).json({ message: "Falha ao registrar conversão" });
    }

    res.status(201).json({ success: true, conversionId: conversion.id });
  } catch (error: any) {
    console.error("Error registering affiliate conversion:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
    }

    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/affiliate/tracking/verify/:token
 * Verify an affiliate tracking token
 * PUBLIC - Used by checkouts to validate tokens
 */
router.get("/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const decoded = affiliateTrackingService.verifyTrackingToken(token);

    if (!decoded) {
      return res.status(400).json({ valid: false, message: "Token inválido ou expirado" });
    }

    res.json({ valid: true, data: decoded });
  } catch (error: any) {
    console.error("Error verifying affiliate token:", error);
    res.status(500).json({ message: error.message });
  }
});

// =============================================
// AFFILIATE ENDPOINTS (Protected - Affiliate Role)
// =============================================

/**
 * POST /api/affiliate/tracking/link
 * Generate a tracking link for affiliate
 */
router.post("/link", authenticateToken, requireAffiliate, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Get affiliate profile
    const profile = await affiliateService.getAffiliateProfileByUserId(userId);
    if (!profile) {
      return res.status(404).json({ message: "Perfil de afiliado não encontrado" });
    }

    if (profile.status !== "approved") {
      return res.status(403).json({ message: "Seu perfil precisa ser aprovado para gerar links" });
    }

    const linkSchema = z.object({
      baseUrl: z.string().url(),
      productId: z.string().uuid().optional(),
      operationId: z.string().uuid().optional(),
      campaignId: z.string().optional(),
      metadata: z.record(z.any()).optional(),
      expiresIn: z.string().optional(),
    });

    const validatedData = linkSchema.parse(req.body);

    const trackingLink = affiliateTrackingService.generateTrackingLink(
      profile.id,
      validatedData.baseUrl,
      {
        productId: validatedData.productId,
        operationId: validatedData.operationId,
        campaignId: validatedData.campaignId,
        metadata: validatedData.metadata,
        expiresIn: validatedData.expiresIn,
      }
    );

    res.json({ trackingLink });
  } catch (error: any) {
    console.error("Error generating tracking link:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
    }

    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/affiliate/tracking/clicks/stats
 * Get click statistics for current affiliate
 */
router.get("/clicks/stats", authenticateToken, requireAffiliate, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Get affiliate profile
    const profile = await affiliateService.getAffiliateProfileByUserId(userId);
    if (!profile) {
      return res.status(404).json({ message: "Perfil de afiliado não encontrado" });
    }

    const { startDate, endDate } = req.query;

    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };
    }

    const stats = await affiliateTrackingService.getClickStats(profile.id, dateRange);

    res.json(stats);
  } catch (error: any) {
    console.error("Error getting click stats:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/affiliate/tracking/conversions
 * Get conversions for current affiliate
 */
router.get("/conversions", authenticateToken, requireAffiliate, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Get affiliate profile
    const profile = await affiliateService.getAffiliateProfileByUserId(userId);
    if (!profile) {
      return res.status(404).json({ message: "Perfil de afiliado não encontrado" });
    }

    const { status, startDate, endDate, limit, offset } = req.query;

    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };
    }

    const conversions = await affiliateTrackingService.getConversions(profile.id, {
      status: status as string,
      dateRange,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });

    res.json(conversions);
  } catch (error: any) {
    console.error("Error getting conversions:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
