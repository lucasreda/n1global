import { Router } from "express";
import { z } from "zod";
import { authenticateToken } from "./auth-middleware";
import { requireAffiliateOrAdmin } from "./auth-middleware";
import { affiliateLandingService } from "./affiliate-landing-service";
import { affiliateVercelDeployService } from "./affiliate-vercel-deploy-service";
import { vercelService } from "./vercel-service";
import { db } from "./db";
import { funnelIntegrations } from "@shared/schema";
import { insertAffiliateLandingPageSchema } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

// In-memory state storage for OAuth CSRF protection
const oauthStates = new Map<string, { userId: string; createdAt: number }>();

// Clean expired states (states valid for 10 minutes)
setInterval(() => {
  const now = Date.now();
  const tenMinutesAgo = now - (10 * 60 * 1000);
  
  Array.from(oauthStates.entries()).forEach(([state, data]) => {
    if (data.createdAt < tenMinutesAgo) {
      oauthStates.delete(state);
    }
  });
}, 60000); // Clean every minute

// =============================================
// Vercel OAuth Integration Endpoints
// =============================================

router.get(
  "/vercel/oauth-url",
  authenticateToken,
  requireAffiliateOrAdmin,
  (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const host = process.env.VERCEL_OAUTH_REDIRECT_HOST || req.get('host');
      const redirectUri = `https://${host}/api/affiliate/landing-pages/vercel/callback`;
      
      const state = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      oauthStates.set(state, {
        userId,
        createdAt: Date.now(),
      });
      
      const oauthUrl = vercelService.getOAuthUrl(redirectUri, state);
      
      console.log(`🔐 Generated Vercel OAuth URL for user ${userId}`);
      
      res.json({
        success: true,
        oauthUrl,
        state,
      });
    } catch (error: any) {
      console.error("Error generating OAuth URL:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

router.get(
  "/vercel/callback",
  async (req: any, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.status(400).send("Missing code or state parameter");
      }
      
      const stateData = oauthStates.get(state as string);
      
      if (!stateData) {
        return res.status(400).send("Invalid or expired state");
      }
      
      oauthStates.delete(state as string);
      
      const host = process.env.VERCEL_OAUTH_REDIRECT_HOST || req.get('host');
      const redirectUri = `https://${host}/api/affiliate/landing-pages/vercel/callback`;
      
      const tokenData = await vercelService.exchangeOAuthCode(
        code as string,
        redirectUri
      );
      
      const existingIntegrations = await db
        .select()
        .from(funnelIntegrations)
        .where(eq(funnelIntegrations.vercelUserId, tokenData.user.id))
        .limit(1);
      
      if (existingIntegrations.length > 0) {
        await db
          .update(funnelIntegrations)
          .set({
            vercelAccessToken: tokenData.accessToken,
            vercelTeamId: tokenData.teamId || null,
            isActive: true,
            lastUsed: new Date(),
          })
          .where(eq(funnelIntegrations.id, existingIntegrations[0].id));
        
        console.log(`✅ Updated existing Vercel integration for user ${tokenData.user.id}`);
      } else {
        const [user] = await db
          .select()
          .from((await import("@shared/schema")).users)
          .where(eq((await import("@shared/schema")).users.id, stateData.userId))
          .limit(1);
        
        if (!user?.storeId) {
          throw new Error("User store not found");
        }
        
        await db.insert(funnelIntegrations).values({
          operationId: null as any,
          storeId: user.storeId,
          vercelAccessToken: tokenData.accessToken,
          vercelTeamId: tokenData.teamId || null,
          vercelUserId: tokenData.user.id,
          isActive: true,
        });
        
        console.log(`✅ Created new Vercel integration for user ${tokenData.user.id}`);
      }
      
      res.redirect('/inside/affiliates/landing-pages?vercel_connected=true');
    } catch (error: any) {
      console.error("OAuth callback error:", error);
      res.redirect('/inside/affiliates/landing-pages?vercel_error=true');
    }
  }
);

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

router.put(
  "/:id",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const { model } = req.body;
      
      if (!model) {
        return res.status(400).json({ 
          success: false,
          error: "Model is required for visual editor updates" 
        });
      }
      
      const landingPage = await affiliateLandingService.updateLandingPageModel(id, model);
      
      res.json({
        success: true,
        landingPage,
      });
    } catch (error: any) {
      console.error("Error updating landing page model:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false,
          error: "Dados inválidos", 
          details: error.errors 
        });
      }
      
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
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

// =============================================
// Product Linking Endpoints
// =============================================

router.get(
  "/:id/products",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const products = await affiliateLandingService.getProductsByLandingPage(id);
      
      res.json(products);
    } catch (error: any) {
      console.error("Error getting landing page products:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

router.post(
  "/:id/products/:productId",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { id, productId } = req.params;
      
      await affiliateLandingService.linkProductToLandingPage(id, productId);
      
      res.json({ success: true, message: "Produto vinculado com sucesso" });
    } catch (error: any) {
      console.error("Error linking product to landing page:", error);
      
      if (error.message.includes("já vinculado")) {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ message: error.message });
    }
  }
);

router.delete(
  "/:id/products/:productId",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { id, productId } = req.params;
      
      await affiliateLandingService.unlinkProductFromLandingPage(id, productId);
      
      res.json({ success: true, message: "Produto desvinculado com sucesso" });
    } catch (error: any) {
      console.error("Error unlinking product from landing page:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// =============================================
// Vercel Configuration Endpoints
// =============================================

router.get(
  "/vercel/status",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const activeIntegrations = await db
        .select()
        .from(funnelIntegrations)
        .where(eq(funnelIntegrations.isActive, true))
        .orderBy(desc(funnelIntegrations.connectedAt))
        .limit(1);
      
      const hasIntegration = activeIntegrations.length > 0;
      const integration = activeIntegrations[0];
      
      res.json({
        configured: hasIntegration,
        hasToken: hasIntegration,
        integration: integration ? {
          vercelUserId: integration.vercelUserId,
          vercelTeamId: integration.vercelTeamId,
          connectedAt: integration.connectedAt,
          lastUsed: integration.lastUsed,
        } : null,
        message: hasIntegration 
          ? "Conta Vercel conectada" 
          : "Nenhuma conta Vercel conectada",
      });
    } catch (error: any) {
      console.error("Error checking Vercel status:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;
