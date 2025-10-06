import { Router } from "express";
import { z } from "zod";
import { authenticateToken, requireAffiliateOrAdmin, requireSuperAdmin } from "./auth-middleware";
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

router.post(
  "/:id/reconvert",
  authenticateToken,
  requireAffiliateOrAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      
      console.log(`🔄 Reconverting landing page ${id} with improved HTML converter...`);
      const landingPage = await affiliateLandingService.convertHtmlToModel(id, true);
      
      console.log(`✅ Landing page reconverted successfully`);
      res.json({
        success: true,
        message: "Landing page reconvertida com sucesso",
        landingPage,
      });
    } catch (error: any) {
      console.error("Error reconverting landing page:", error);
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

router.post(
  "/:id/convert-to-visual",
  authenticateToken,
  requireSuperAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      
      console.log("🔄 Converting landing page to visual model:", id);
      
      const convertedLandingPage = await affiliateLandingService.convertHtmlToModel(id);
      
      res.json({
        success: true,
        landingPage: convertedLandingPage,
        message: "Landing page convertida para modelo visual com sucesso",
      });
    } catch (error: any) {
      console.error("Error converting landing page to visual model:", error);
      
      if (error.message.includes("não encontrada")) {
        return res.status(404).json({ 
          success: false,
          message: error.message 
        });
      }
      
      if (error.message.includes("já possui um modelo visual")) {
        return res.status(400).json({ 
          success: false,
          message: error.message 
        });
      }
      
      if (error.message.includes("não possui conteúdo HTML")) {
        return res.status(400).json({ 
          success: false,
          message: error.message 
        });
      }
      
      res.status(500).json({ 
        success: false,
        message: "Erro ao converter landing page para modelo visual",
        error: error.message 
      });
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
// AI Generation Endpoints
// =============================================

router.post(
  "/generate-ai",
  authenticateToken,
  async (req: any, res) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const sendProgress = (message: string) => {
        res.write(`data: ${JSON.stringify({ type: 'progress', message })}\n\n`);
      };

      const sendComplete = (data: any) => {
        res.write(`data: ${JSON.stringify({ type: 'complete', data })}\n\n`);
      };

      const sendError = (message: string) => {
        res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
      };

      try {
        sendProgress('Analyzing your requirements...');

        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        sendProgress('Generating page structure...');

        const systemPrompt = `You are a landing page expert. Generate a complete PageModelV2 structure based on the user's prompt.

Return ONLY a valid JSON object with this exact structure:
{
  "version": 2,
  "layout": "single_page",
  "sections": [
    {
      "id": "unique_section_id",
      "type": "hero" | "content" | "cta" | "custom",
      "name": "Section Name",
      "rows": [
        {
          "id": "unique_row_id",
          "columns": [
            {
              "id": "unique_column_id",
              "width": "12",
              "elements": [
                {
                  "id": "unique_element_id",
                  "type": "heading" | "text" | "button" | "image",
                  "props": {},
                  "content": { "text": "Content here" },
                  "styles": {
                    "fontSize": "2rem",
                    "fontWeight": "700",
                    "textAlign": "center",
                    "marginBottom": "1rem",
                    "color": "#1a1a1a"
                  }
                }
              ],
              "styles": {}
            }
          ],
          "styles": {}
        }
      ],
      "styles": {
        "padding": "4rem 2rem",
        "backgroundColor": "#ffffff"
      },
      "settings": {
        "containerWidth": "container"
      }
    }
  ],
  "theme": {
    "colors": {
      "primary": "#3b82f6",
      "secondary": "#8b5cf6",
      "accent": "#f59e0b",
      "background": "#ffffff",
      "text": "#1a1a1a",
      "muted": "#6b7280"
    },
    "typography": {
      "headingFont": "Inter",
      "bodyFont": "Inter",
      "fontSize": {
        "xs": "0.75rem",
        "sm": "0.875rem",
        "base": "1rem",
        "lg": "1.125rem",
        "xl": "1.25rem",
        "2xl": "1.5rem",
        "3xl": "1.875rem",
        "4xl": "2.25rem"
      }
    },
    "spacing": {
      "xs": "0.25rem",
      "sm": "0.5rem",
      "md": "1rem",
      "lg": "1.5rem",
      "xl": "2rem",
      "2xl": "3rem"
    },
    "borderRadius": {
      "sm": "0.25rem",
      "md": "0.5rem",
      "lg": "1rem"
    }
  }
}

IMPORTANT:
- Use descriptive IDs (e.g., "section_hero_main", "row_features_1", "col_left", "heading_main_title")
- Include realistic content based on the user's prompt
- Use appropriate colors from the theme
- Set appropriate styles for responsive design
- Column widths must add up to 12 in each row
- Button elements should have content.text, not just text
- All elements must have a "props" object (can be empty {})
- All elements must have "content" as an object with "text" property`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 4000,
        });

        sendProgress('Processing AI response...');

        const generatedText = response.choices[0].message.content?.trim();
        
        if (!generatedText) {
          throw new Error('No content generated');
        }

        // Extract JSON from potential markdown code blocks
        let jsonText = generatedText;
        if (generatedText.includes('```')) {
          const match = generatedText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
          if (match) {
            jsonText = match[1];
          }
        }

        sendProgress('Validating generated structure...');

        const pageModel = JSON.parse(jsonText);

        // Basic validation
        if (!pageModel.version || !pageModel.sections || !pageModel.theme) {
          throw new Error('Invalid page model structure');
        }

        sendProgress('Page generated successfully!');
        sendComplete({ pageModel });

        res.write('data: [DONE]\n\n');
        res.end();

      } catch (error: any) {
        console.error('AI generation error:', error);
        sendError(error.message || 'Generation failed');
        res.end();
      }

    } catch (error: any) {
      console.error('AI generation setup error:', error);
      res.status(500).json({ error: error.message });
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

// =============================================
// TEMPORARY: Reconvert Landing Page
// =============================================
router.post(
  "/:id/reconvert",
  authenticateToken,
  requireSuperAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;
      
      console.log(`🔄 Reconverting landing page: ${id}`);
      
      const result = await affiliateLandingService.reconvertLandingPage(id);
      
      res.json({
        success: true,
        message: "Landing page reconverted successfully",
        ...result,
      });
    } catch (error: any) {
      console.error("Error reconverting landing page:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

export default router;
