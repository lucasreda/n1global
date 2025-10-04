import { Router } from "express";
import { z } from "zod";
import { authenticateToken } from "./auth-middleware";
import { requireAffiliateOrAdmin } from "./auth-middleware";
import { affiliateLandingService } from "./affiliate-landing-service";
import { affiliateVercelDeployService } from "./affiliate-vercel-deploy-service";
import { insertAffiliateLandingPageSchema } from "@shared/schema";

const router = Router();

// =============================================
// ADMIN ENDPOINTS - Landing Page Management
// =============================================

router.post(
  "/",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const validatedData = insertAffiliateLandingPageSchema.parse({
        ...req.body,
        createdByUserId: userId,
      });
      
      const landingPage = await affiliateLandingService.createLandingPage(validatedData);
      
      res.status(201).json(landingPage);
    } catch (error: any) {
      console.error("Error creating landing page:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      
      res.status(500).json({ message: error.message });
    }
  }
);

router.get(
  "/",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { status, limit, offset } = req.query;
      
      const landingPages = await affiliateLandingService.listLandingPages({
        status: status as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });
      
      res.json(landingPages);
    } catch (error: any) {
      console.error("Error listing landing pages:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

router.get(
  "/:id",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const landingPage = await affiliateLandingService.getLandingPageById(id);
      
      if (!landingPage) {
        return res.status(404).json({ message: "Landing page não encontrada" });
      }
      
      res.json(landingPage);
    } catch (error: any) {
      console.error("Error getting landing page:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

router.patch(
  "/:id",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const validatedData = insertAffiliateLandingPageSchema.partial().parse(req.body);
      
      const landingPage = await affiliateLandingService.updateLandingPage(id, validatedData);
      
      res.json(landingPage);
    } catch (error: any) {
      console.error("Error updating landing page:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      
      res.status(500).json({ message: error.message });
    }
  }
);

router.patch(
  "/:id/activate",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const landingPage = await affiliateLandingService.activateLandingPage(id);
      
      res.json(landingPage);
    } catch (error: any) {
      console.error("Error activating landing page:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

router.patch(
  "/:id/archive",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const landingPage = await affiliateLandingService.archiveLandingPage(id);
      
      res.json(landingPage);
    } catch (error: any) {
      console.error("Error archiving landing page:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

router.delete(
  "/:id",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      
      await affiliateLandingService.deleteLandingPage(id);
      
      res.json({ success: true, message: "Landing page deletada com sucesso" });
    } catch (error: any) {
      console.error("Error deleting landing page:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

router.post(
  "/:id/deploy",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const { affiliatePixel } = req.body;
      
      const deployment = await affiliateVercelDeployService.deployLandingPageForAffiliate(
        id,
        affiliatePixel
      );
      
      res.json({
        success: true,
        deploymentUrl: deployment.deploymentUrl,
        projectId: deployment.projectId,
        message: "Landing page deployada com sucesso na Vercel",
      });
    } catch (error: any) {
      console.error("Error deploying landing page:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;
