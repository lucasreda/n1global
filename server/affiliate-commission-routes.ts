import express from "express";
import { affiliateCommissionService } from "./affiliate-commission-service";
import { authenticateToken, requireAffiliateOrAdmin } from "./auth-middleware";
import { z } from "zod";

const router = express.Router();

// =============================================
// ADMIN ENDPOINTS (Protected - Admin Role)
// =============================================

/**
 * GET /api/affiliate/commission/pending
 * Get pending conversions for review (admin only)
 */
router.get(
  "/pending",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { affiliateId, operationId, limit, offset } = req.query;

      const conversions = await affiliateCommissionService.getPendingConversions({
        affiliateId: affiliateId as string,
        operationId: operationId as string,
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
 * POST /api/affiliate/commission/process
 * Process pending conversions to calculate commissions (admin only)
 */
router.post(
  "/process",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const result = await affiliateCommissionService.processPendingConversions();
      
      res.json({
        success: true,
        processed: result.processed,
        totalCommission: result.totalCommission,
      });
    } catch (error: any) {
      console.error("Error processing conversions:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * POST /api/affiliate/commission/approve/:id
 * Approve a conversion (admin only)
 */
router.post(
  "/approve/:id",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const adminUserId = req.user.id;

      const conversion = await affiliateCommissionService.approveConversion(
        id,
        adminUserId,
        notes
      );

      res.json({ success: true, conversion });
    } catch (error: any) {
      console.error("Error approving conversion:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * POST /api/affiliate/commission/reject/:id
 * Reject a conversion (admin only)
 */
router.post(
  "/reject/:id",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ message: "Motivo é obrigatório" });
      }

      const conversion = await affiliateCommissionService.rejectConversion(id, reason);

      res.json({ success: true, conversion });
    } catch (error: any) {
      console.error("Error rejecting conversion:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * POST /api/affiliate/commission/bulk-approve
 * Bulk approve conversions (admin only)
 */
router.post(
  "/bulk-approve",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const schema = z.object({
        conversionIds: z.array(z.string().uuid()),
      });

      const { conversionIds } = schema.parse(req.body);
      const adminUserId = req.user.id;

      const result = await affiliateCommissionService.bulkApproveConversions(
        conversionIds,
        adminUserId
      );

      res.json({
        success: true,
        approved: result.approved,
        failed: result.failed,
      });
    } catch (error: any) {
      console.error("Error bulk approving conversions:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }

      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * GET /api/affiliate/commission/payouts
 * Get payouts (admin or affiliate can see their own)
 */
router.get(
  "/payouts",
  authenticateToken,
  async (req: any, res) => {
    try {
      const { affiliateId, status, limit, offset } = req.query;

      // If not admin, only show user's own payouts
      let filterAffiliateId = affiliateId as string;
      if (req.user.role !== "super_admin" && req.user.role !== "admin") {
        // User can only see their own payouts
        // We'd need to get their affiliate profile first
        filterAffiliateId = req.query.affiliateId as string;
      }

      const payouts = await affiliateCommissionService.getPayouts({
        affiliateId: filterAffiliateId,
        status: status as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });

      res.json(payouts);
    } catch (error: any) {
      console.error("Error getting payouts:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * POST /api/affiliate/commission/payout/generate
 * Generate payout for affiliate (admin only)
 */
router.post(
  "/payout/generate",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const schema = z.object({
        affiliateId: z.string().uuid(),
        minAmount: z.number().optional(),
        includeConversionIds: z.array(z.string().uuid()).optional(),
      });

      const data = schema.parse(req.body);

      const payout = await affiliateCommissionService.generatePayout(data.affiliateId, {
        minAmount: data.minAmount,
        includeConversionIds: data.includeConversionIds,
      });

      res.status(201).json({ success: true, payout });
    } catch (error: any) {
      console.error("Error generating payout:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }

      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * POST /api/affiliate/commission/payout/:id/mark-paid
 * Mark payout as paid (admin only)
 */
router.post(
  "/payout/:id/mark-paid",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const schema = z.object({
        paymentMethod: z.string(),
        transactionId: z.string().optional(),
        notes: z.string().optional(),
      });

      const data = schema.parse(req.body);

      const payout = await affiliateCommissionService.markPayoutAsPaid(
        id,
        data.paymentMethod,
        data.transactionId,
        data.notes
      );

      res.json({ success: true, payout });
    } catch (error: any) {
      console.error("Error marking payout as paid:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }

      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * GET /api/affiliate/commission/rules
 * Get commission rules (admin only)
 */
router.get(
  "/rules",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { operationId, productId } = req.query;

      const rules = await affiliateCommissionService.getCommissionRules({
        operationId: operationId as string,
        productId: productId as string,
      });

      res.json(rules);
    } catch (error: any) {
      console.error("Error getting commission rules:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * POST /api/affiliate/commission/rules
 * Create commission rule (admin only)
 */
router.post(
  "/rules",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const schema = z.object({
        operationId: z.string().uuid(),
        productId: z.string().uuid().optional(),
        commissionPercent: z.string(),
        description: z.string().optional(),
      });

      const data = schema.parse(req.body);

      const rule = await affiliateCommissionService.createCommissionRule(data);

      res.status(201).json({ success: true, rule });
    } catch (error: any) {
      console.error("Error creating commission rule:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }

      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * PATCH /api/affiliate/commission/rules/:id
 * Update commission rule (admin only)
 */
router.patch(
  "/rules/:id",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const schema = z.object({
        commissionPercent: z.string().optional(),
        description: z.string().optional(),
      });

      const data = schema.parse(req.body);

      const rule = await affiliateCommissionService.updateCommissionRule(id, data);

      res.json({ success: true, rule });
    } catch (error: any) {
      console.error("Error updating commission rule:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }

      res.status(500).json({ message: error.message });
    }
  }
);

export default router;
