import express from "express";
import { affiliateService } from "./affiliate-service";
import { affiliateVercelDeployService } from "./affiliate-vercel-deploy-service";
import { affiliateLandingService } from "./affiliate-landing-service";
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
 * GET /api/affiliate/products
 * Get products with commission and membership info for the affiliate
 */
router.get(
  "/products",
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
      
      // Get all products with commission rules and membership status
      const productsWithInfo = await affiliateService.getProductsWithMembershipInfo(profile.id);
      
      res.json(productsWithInfo);
    } catch (error: any) {
      console.error("Error getting products:", error);
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
 * GET /api/affiliate/products/:productId/details
 * Get detailed product information including landing pages
 */
router.get(
  "/products/:productId/details",
  authenticateToken,
  requireAffiliate,
  async (req: any, res) => {
    try {
      const { productId } = req.params;
      const userId = req.user.id;
      
      // Get affiliate profile
      const profile = await affiliateService.getAffiliateProfileByUserId(userId);
      if (!profile) {
        return res.status(404).json({ message: "Perfil de afiliado não encontrado" });
      }
      
      // Get product details with landing pages
      const productDetails = await affiliateService.getProductDetailsWithLandingPages(productId, profile.id);
      
      if (!productDetails) {
        return res.status(404).json({ message: "Produto não encontrado" });
      }
      
      res.json(productDetails);
    } catch (error: any) {
      console.error("Error getting product details:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * GET /api/affiliate/products/:productId/tracking-link
 * Generate affiliate tracking link for a product
 */
router.get(
  "/products/:productId/tracking-link",
  authenticateToken,
  requireAffiliate,
  async (req: any, res) => {
    try {
      const { productId } = req.params;
      const userId = req.user.id;
      
      // Get affiliate profile
      const profile = await affiliateService.getAffiliateProfileByUserId(userId);
      if (!profile) {
        return res.status(404).json({ message: "Perfil de afiliado não encontrado" });
      }
      
      // Generate tracking link
      const trackingLink = await affiliateService.generateTrackingLink(profile.id, productId);
      
      res.json({ trackingLink });
    } catch (error: any) {
      console.error("Error generating tracking link:", error);
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

/**
 * PATCH /api/affiliate/tracking-pixel
 * Update tracking pixel code for affiliate
 */
router.patch(
  "/tracking-pixel",
  authenticateToken,
  requireAffiliate,
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const schema = z.object({
        trackingPixel: z.string().optional(),
      });

      const { trackingPixel } = schema.parse(req.body);

      const profile = await affiliateService.upsertAffiliateProfile(userId, {
        trackingPixel,
      });

      res.json({ success: true, trackingPixel: profile.trackingPixel });
    } catch (error: any) {
      console.error("Error updating tracking pixel:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }

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

/**
 * GET /api/affiliate/admin/stats
 * Get overall affiliate program statistics (admin only)
 */
router.get(
  "/admin/stats",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const stats = await affiliateService.getAdminProgramStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Error getting admin stats:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * POST /api/affiliate/admin/:id/assign-landing-page
 * Deploy and assign landing page to affiliate (admin only)
 */
router.post(
  "/admin/:id/assign-landing-page",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { id: affiliateId } = req.params;
      const { landingPageId } = req.body;

      if (!landingPageId) {
        return res.status(400).json({ message: "landingPageId é obrigatório" });
      }

      const profile = await affiliateService.getAffiliateProfileById(affiliateId);
      if (!profile) {
        return res.status(404).json({ message: "Afiliado não encontrado" });
      }

      const deployment = await affiliateVercelDeployService.deployLandingPageForAffiliate(
        landingPageId,
        profile.trackingPixel || undefined
      );

      const updatedProfile = await affiliateService.assignLandingPageToAffiliate(
        affiliateId,
        landingPageId,
        deployment.deploymentUrl
      );

      res.json({
        success: true,
        profile: updatedProfile,
        deployment: {
          url: deployment.deploymentUrl,
          projectId: deployment.projectId,
        },
        message: "Landing page atribuída e deployada com sucesso",
      });
    } catch (error: any) {
      console.error("Error assigning landing page to affiliate:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * DELETE /api/affiliate/admin/:id/landing-page
 * Remove landing page assignment from affiliate (admin only)
 */
router.delete(
  "/admin/:id/landing-page",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { id: affiliateId } = req.params;

      const updatedProfile = await affiliateService.unassignLandingPageFromAffiliate(affiliateId);

      res.json({
        success: true,
        profile: updatedProfile,
        message: "Landing page removida do afiliado com sucesso",
      });
    } catch (error: any) {
      console.error("Error removing landing page from affiliate:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * GET /api/affiliate/admin/conversions/pending
 * Get pending conversions (admin only)
 */
router.get(
  "/admin/conversions/pending",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { limit, offset } = req.query;
      
      const conversions = await affiliateService.getPendingConversions({
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });
      
      res.json(conversions);
    } catch (error: any) {
      console.error("Error getting pending conversions:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * GET /api/affiliate/admin/membership-requests
 * Get all membership requests (admin only)
 */
router.get(
  "/admin/membership-requests",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { status, limit, offset } = req.query;
      
      const requests = await affiliateService.getMembershipRequests({
        status: status as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });
      
      res.json(requests);
    } catch (error: any) {
      console.error("Error getting membership requests:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * GET /api/affiliate/admin/:id/details
 * Get affiliate details with products (admin only)
 */
router.get(
  "/admin/:id/details",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const details = await affiliateService.getAffiliateDetailsWithProducts(id);
      
      res.json(details);
    } catch (error: any) {
      console.error("Error getting affiliate details:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * PATCH /api/affiliate/admin/membership-requests/:id/approve
 * Approve membership request (admin only)
 */
router.patch(
  "/admin/membership-requests/:id/approve",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const { customCommissionPercent } = req.body;
      
      const membership = await affiliateService.approveMembershipRequest(
        id, 
        customCommissionPercent ? Number(customCommissionPercent) : undefined
      );
      
      res.json(membership);
    } catch (error: any) {
      console.error("Error approving membership request:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * PATCH /api/affiliate/admin/membership-requests/:id/reject
 * Reject membership request (admin only)
 */
router.patch(
  "/admin/membership-requests/:id/reject",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const membership = await affiliateService.rejectMembershipRequest(id, reason);
      
      res.json(membership);
    } catch (error: any) {
      console.error("Error rejecting membership request:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * GET /api/affiliate/products
 * Get products with commission info and membership status
 */
router.get(
  "/products",
  authenticateToken,
  requireAffiliate,
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profile = await affiliateService.getAffiliateProfileByUserId(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Perfil de afiliado não encontrado" });
      }

      // Mock data - replace with actual implementation
      res.json([]);
    } catch (error: any) {
      console.error("Error getting products:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * POST /api/affiliate/membership/join
 * Request to join a product
 */
router.post(
  "/membership/join",
  authenticateToken,
  requireAffiliate,
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { productId } = req.body;
      
      if (!productId) {
        return res.status(400).json({ message: "productId é obrigatório" });
      }

      const profile = await affiliateService.getAffiliateProfileByUserId(userId);
      if (!profile) {
        return res.status(404).json({ message: "Perfil de afiliado não encontrado" });
      }

      // Create membership request (productId is optional, operationId is required)
      // For now, we'll just return success without creating - this needs product/operation logic
      // const membership = await affiliateService.createMembership({
      //   affiliateId: profile.id,
      //   operationId: "", // Required field
      //   productId,
      //   status: "pending",
      // });

      res.status(201).json({ success: true, message: "Solicitação enviada com sucesso" });
    } catch (error: any) {
      console.error("Error joining product:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * GET /api/affiliate/analytics
 * Get analytics data for affiliate
 */
router.get(
  "/analytics",
  authenticateToken,
  requireAffiliate,
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { dateRange = '30d' } = req.query;
      
      const profile = await affiliateService.getAffiliateProfileByUserId(userId);
      if (!profile) {
        return res.status(404).json({ message: "Perfil de afiliado não encontrado" });
      }

      // Mock data - replace with actual implementation
      const mockStats = {
        totalClicks: 0,
        totalConversions: 0,
        totalCommission: 0,
        conversionRate: 0,
        averageOrderValue: 0,
        earningsPerClick: 0,
        clicksChange: 0,
        conversionsChange: 0,
        commissionChange: 0,
        dailyStats: [],
        productStats: [],
        sourceStats: [],
      };

      res.json(mockStats);
    } catch (error: any) {
      console.error("Error getting analytics:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * GET /api/affiliate/payment-stats
 * Get payment statistics for affiliate
 */
router.get(
  "/payment-stats",
  authenticateToken,
  requireAffiliate,
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profile = await affiliateService.getAffiliateProfileByUserId(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Perfil de afiliado não encontrado" });
      }

      // Mock data - replace with actual implementation
      const mockStats = {
        pendingAmount: 0,
        processingAmount: 0,
        paidAmount: 0,
        totalEarnings: 0,
        minimumPayout: 50,
        pendingConversions: 0,
        approvedConversions: 0,
      };

      res.json(mockStats);
    } catch (error: any) {
      console.error("Error getting payment stats:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * POST /api/affiliate/payout-request
 * Request a payout
 */
router.post(
  "/payout-request",
  authenticateToken,
  requireAffiliate,
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { paymentMethod, paymentDetails } = req.body;
      
      if (!paymentMethod || !paymentDetails) {
        return res.status(400).json({ message: "paymentMethod e paymentDetails são obrigatórios" });
      }

      const profile = await affiliateService.getAffiliateProfileByUserId(userId);
      if (!profile) {
        return res.status(404).json({ message: "Perfil de afiliado não encontrado" });
      }

      // Mock response - implement actual payout request logic
      res.status(201).json({ 
        success: true,
        message: "Solicitação de saque criada com sucesso"
      });
    } catch (error: any) {
      console.error("Error requesting payout:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * GET /api/affiliate/landing-page/assigned
 * Get assigned landing page for current affiliate
 */
router.get(
  "/landing-page/assigned",
  authenticateToken,
  requireAffiliate,
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profile = await affiliateService.getAffiliateProfileByUserId(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Perfil de afiliado não encontrado" });
      }

      if (!profile.landingPageId) {
        return res.status(404).json({ message: "Nenhuma landing page atribuída" });
      }

      // Get landing page details
      const landingPage = await affiliateLandingService.getLandingPageById(profile.landingPageId);
      
      if (!landingPage) {
        return res.status(404).json({ message: "Landing page não encontrada" });
      }

      res.json(landingPage);
    } catch (error: any) {
      console.error("Error getting assigned landing page:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;
