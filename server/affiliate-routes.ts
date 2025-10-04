import express from "express";
import { affiliateService } from "./affiliate-service";
import { authenticateToken, requireAffiliate, requireAffiliateOrAdmin } from "./auth-middleware";
import { insertAffiliateProfileSchema, insertAffiliateMembershipSchema } from "@shared/schema";
import { z } from "zod";

const router = express.Router();

// =============================================
// AFFILIATE ENDPOINTS (Protected - Affiliate Role)
// =============================================

/**
 * GET /api/affiliate/profile
 * Get current affiliate's profile
 */
router.get(
  "/profile",
  authenticateToken,
  requireAffiliate,
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profile = await affiliateService.getAffiliateProfileByUserId(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Perfil de afiliado não encontrado" });
      }

      res.json(profile);
    } catch (error: any) {
      console.error("Error getting affiliate profile:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * POST /api/affiliate/profile
 * Create or update affiliate profile
 */
router.post(
  "/profile",
  authenticateToken,
  requireAffiliate,
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Validate input
      const validatedData = insertAffiliateProfileSchema.partial().parse(req.body);
      
      const profile = await affiliateService.upsertAffiliateProfile(userId, validatedData);
      
      res.json(profile);
    } catch (error: any) {
      console.error("Error creating/updating affiliate profile:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * GET /api/affiliate/catalog
 * Get product catalog available for affiliation
 */
router.get(
  "/catalog",
  authenticateToken,
  requireAffiliate,
  async (req: any, res) => {
    try {
      const { operationId, limit } = req.query;
      
      const catalog = await affiliateService.getProductCatalog({
        operationId: operationId as string,
        limit: limit ? parseInt(limit as string) : 50,
      });
      
      res.json(catalog);
    } catch (error: any) {
      console.error("Error getting product catalog:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * GET /api/affiliate/memberships
 * Get affiliate's memberships (products they're promoting)
 */
router.get(
  "/memberships",
  authenticateToken,
  requireAffiliate,
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get affiliate profile
      const profile = await affiliateService.getAffiliateProfileByUserId(userId);
      if (!profile) {
        return res.status(404).json({ message: "Perfil de afiliado não encontrado" });
      }
      
      const memberships = await affiliateService.getAffiliateMemberships(profile.id);
      
      res.json(memberships);
    } catch (error: any) {
      console.error("Error getting affiliate memberships:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * POST /api/affiliate/memberships
 * Create membership (affiliate joins product/operation)
 */
router.post(
  "/memberships",
  authenticateToken,
  requireAffiliate,
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get affiliate profile
      const profile = await affiliateService.getAffiliateProfileByUserId(userId);
      if (!profile) {
        return res.status(404).json({ message: "Perfil de afiliado não encontrado. Crie um perfil primeiro." });
      }
      
      if (profile.status !== "approved") {
        return res.status(403).json({ message: "Seu perfil de afiliado precisa ser aprovado antes de se afiliar a produtos." });
      }
      
      // Validate input
      const validatedData = insertAffiliateMembershipSchema.parse({
        ...req.body,
        affiliateId: profile.id,
      });
      
      // Check if membership already exists
      const exists = await affiliateService.hasMembership(
        profile.id,
        validatedData.operationId,
        validatedData.productId
      );
      
      if (exists) {
        return res.status(400).json({ message: "Você já está afiliado a este produto/operação" });
      }
      
      const membership = await affiliateService.createMembership(validatedData);
      
      res.status(201).json(membership);
    } catch (error: any) {
      console.error("Error creating affiliate membership:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * GET /api/affiliate/stats
 * Get affiliate dashboard statistics
 */
router.get(
  "/stats",
  authenticateToken,
  requireAffiliate,
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get affiliate profile
      const profile = await affiliateService.getAffiliateProfileByUserId(userId);
      if (!profile) {
        return res.status(404).json({ message: "Perfil de afiliado não encontrado" });
      }
      
      const stats = await affiliateService.getAffiliateStats(profile.id);
      
      res.json(stats);
    } catch (error: any) {
      console.error("Error getting affiliate stats:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// =============================================
// ADMIN ENDPOINTS (Protected - Admin Role)
// =============================================

/**
 * GET /api/affiliate/admin/list
 * List all affiliates (admin only)
 */
router.get(
  "/admin/list",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { status, storeId, limit, offset } = req.query;
      
      const affiliates = await affiliateService.listAffiliates({
        status: status as string,
        storeId: storeId as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });
      
      res.json(affiliates);
    } catch (error: any) {
      console.error("Error listing affiliates:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * PATCH /api/affiliate/admin/:id/approve
 * Approve affiliate profile (admin only)
 */
router.patch(
  "/admin/:id/approve",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const adminUserId = req.user.id;
      
      const profile = await affiliateService.approveAffiliate(id, adminUserId);
      
      res.json(profile);
    } catch (error: any) {
      console.error("Error approving affiliate:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * PATCH /api/affiliate/admin/:id/suspend
 * Suspend affiliate profile (admin only)
 */
router.patch(
  "/admin/:id/suspend",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ message: "Motivo da suspensão é obrigatório" });
      }
      
      const profile = await affiliateService.suspendAffiliate(id, reason);
      
      res.json(profile);
    } catch (error: any) {
      console.error("Error suspending affiliate:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;
