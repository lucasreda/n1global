import { Router } from "express";
import { z } from "zod";
import { db } from "./db";
import { 
  funnelIntegrations, 
  funnels, 
  funnelTemplates,
  funnelDeployments,
  funnelAnalytics,
  insertFunnelIntegrationSchema,
  insertFunnelSchema,
  insertFunnelTemplateSchema,
  insertFunnelDeploymentSchema
} from "@shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { authenticateToken } from "./auth-middleware";
import { validateOperationAccess } from "./middleware/operation-access";
import { vercelService } from "./vercel-service";
import { aiFunnelGenerator } from "./ai-funnel-generator";
import { templateGenerator } from "./template-generator";

const router = Router();

// In-memory state storage for OAuth CSRF protection
// In production, use Redis or database with expiry
const oauthStates = new Map<string, { userId: string; createdAt: number; operationId?: string }>();

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

// Validation schemas
const connectVercelSchema = z.object({
  operationId: z.string().uuid("Operation ID deve ser um UUID válido"),
  code: z.string().min(1, "Authorization code é obrigatório"),
  state: z.string().min(1, "State é obrigatório para validação de segurança"),
});

const createFunnelSchema = z.object({
  operationId: z.string().uuid("Operation ID deve ser um UUID válido"),
  name: z.string().min(1, "Nome do funil é obrigatório"),
  description: z.string().optional(),
  templateId: z.string().uuid("Template ID deve ser um UUID válido").optional(),
  productInfo: z.object({
    name: z.string().min(1, "Nome do produto é obrigatório"),
    description: z.string().min(1, "Descrição do produto é obrigatória"),
    price: z.number().positive("Preço deve ser positivo"),
    currency: z.string().length(3, "Moeda deve ter 3 caracteres"),
    targetAudience: z.string().min(1, "Público-alvo é obrigatório"),
    mainBenefits: z.array(z.string()).min(1, "Pelo menos um benefício é obrigatório"),
    objections: z.array(z.string()).min(1, "Pelo menos uma objeção é obrigatória"),
    testimonials: z.array(z.string()).optional(),
  }),
  trackingConfig: z.object({
    facebookPixelId: z.string().optional(),
    googleAnalyticsId: z.string().optional(),
    googleTagManagerId: z.string().optional(),
    tiktokPixelId: z.string().optional(),
    customTracking: z.array(z.object({
      name: z.string(),
      code: z.string(),
    })).optional(),
  }).optional(),
});

const deployFunnelSchema = z.object({
  funnelId: z.string().uuid("Funnel ID deve ser um UUID válido"),
  customDomain: z.string().optional(),
});

/**
 * Get Vercel OAuth URL for connecting integration
 */
router.get("/funnels/vercel/oauth-url", authenticateToken, (req, res) => {
  try {
    const userId = (req as any).user.id;
    // Use current working domain (can be overridden with VERCEL_OAUTH_REDIRECT_HOST env var)
    const host = process.env.VERCEL_OAUTH_REDIRECT_HOST || req.get('host');
    const redirectUri = `https://${host}/api/funnels/vercel/callback`;
    const state = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; // Secure random state
    
    // Store state for CSRF validation
    oauthStates.set(state, {
      userId,
      createdAt: Date.now(),
      operationId: req.query.operationId as string || undefined,
    });
    
    const oauthUrl = vercelService.getOAuthUrl(redirectUri, state);
    
    // Debug OAuth configuration
    console.log(`🔍 OAuth URL gerada: ${oauthUrl}`);
    
    res.json({
      success: true,
      oauthUrl,
    });
  } catch (error) {
    console.error("❌ Erro ao gerar URL OAuth:", error);
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Connect Vercel integration via OAuth
 */
router.post("/funnels/vercel/connect", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const validation = connectVercelSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: "Dados inválidos",
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }

    const { operationId, code, state } = validation.data;
    const userId = (req as any).user.id;

    console.log(`🔐 Connecting Vercel for operation: ${operationId}`);

    // Validate state for CSRF protection
    const storedState = oauthStates.get(state);
    if (!storedState) {
      return res.status(400).json({
        success: false,
        error: "Estado OAuth inválido ou expirado",
        details: "Token de segurança não encontrado ou expirou"
      });
    }

    if (storedState.userId !== userId) {
      return res.status(400).json({
        success: false,
        error: "Estado OAuth inválido",
        details: "Token não pertence ao usuário atual"
      });
    }

    // Remove state after use (single-use)
    oauthStates.delete(state);

    // Generate server-side redirectUri (secure)
    // Use current working domain (can be overridden with VERCEL_OAUTH_REDIRECT_HOST env var)
    const host = process.env.VERCEL_OAUTH_REDIRECT_HOST || req.get('host');
    const redirectUri = `https://${host}/api/funnels/vercel/callback`;

    // Exchange OAuth code for access token
    const oauthResult = await vercelService.exchangeOAuthCode(code, redirectUri);
    
    // Check if integration already exists for this operation
    const [existingIntegration] = await db
      .select()
      .from(funnelIntegrations)
      .where(eq(funnelIntegrations.operationId, operationId))
      .limit(1);

    if (existingIntegration) {
      // Update existing integration
      await db
        .update(funnelIntegrations)
        .set({
          vercelAccessToken: oauthResult.accessToken,
          vercelTeamId: oauthResult.teamId || null,
          vercelUserId: oauthResult.user.id,
          lastUsed: new Date(),
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(funnelIntegrations.id, existingIntegration.id));
    } else {
      // Create new integration
      await db
        .insert(funnelIntegrations)
        .values({
          operationId,
          storeId: (req as any).storeId,
          vercelAccessToken: oauthResult.accessToken,
          vercelTeamId: oauthResult.teamId || null,
          vercelUserId: oauthResult.user.id,
          isActive: true,
        });
    }

    console.log(`✅ Vercel integration connected successfully for operation: ${operationId}`);

    res.json({
      success: true,
      message: "Integração Vercel conectada com sucesso",
      user: {
        id: oauthResult.user.id,
        name: oauthResult.user.name,
        email: oauthResult.user.email,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao conectar Vercel:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao conectar com Vercel",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Handle Vercel OAuth callback
 */
router.get("/funnels/vercel/callback", async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    // Handle OAuth errors
    if (error) {
      console.error("❌ OAuth error:", error);
      return res.redirect(`/funnels?error=oauth_denied`);
    }
    
    if (!code || !state) {
      console.error("❌ Missing OAuth parameters");
      return res.redirect(`/funnels?error=missing_params`);
    }
    
    // Extract user ID from state for security validation
    const stateParts = (state as string).split('_');
    if (stateParts.length < 2) {
      console.error("❌ Invalid OAuth state format");
      return res.redirect(`/funnels?error=invalid_state`);
    }
    
    const userId = stateParts[0];
    
    // Redirect to frontend with standard OAuth parameters
    const successUrl = `/funnels?code=${encodeURIComponent(code as string)}&state=${encodeURIComponent(state as string)}`;
    
    console.log(`✅ OAuth callback received with state: ${state}`);
    return res.redirect(successUrl);
    
  } catch (error) {
    console.error("❌ Callback processing error:", error);
    return res.redirect(`/funnels?error=callback_failed`);
  }
});

/**
 * Get Vercel integration status for an operation
 */
router.get("/funnels/vercel/status", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { operationId } = req.query;

    if (!operationId || typeof operationId !== "string") {
      return res.status(400).json({ 
        success: false,
        error: "Operation ID é obrigatório" 
      });
    }

    const [integration] = await db
      .select({
        id: funnelIntegrations.id,
        vercelUserId: funnelIntegrations.vercelUserId,
        vercelTeamId: funnelIntegrations.vercelTeamId,
        connectedAt: funnelIntegrations.connectedAt,
        lastUsed: funnelIntegrations.lastUsed,
        isActive: funnelIntegrations.isActive,
      })
      .from(funnelIntegrations)
      .where(eq(funnelIntegrations.operationId, operationId))
      .limit(1);

    if (!integration) {
      return res.json({
        success: true,
        connected: false,
        message: "Integração Vercel não configurada"
      });
    }

    // Test if token is still valid
    const isValid = await vercelService.validateToken(integration.vercelUserId);
    
    res.json({
      success: true,
      connected: integration.isActive && isValid,
      integration: {
        id: integration.id,
        connectedAt: integration.connectedAt,
        lastUsed: integration.lastUsed,
        isActive: integration.isActive,
        teamId: integration.vercelTeamId,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao verificar status Vercel:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao verificar status da integração",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Get all funnel templates
 */
router.get("/funnels/templates", authenticateToken, async (req, res) => {
  try {
    const templates = await db
      .select()
      .from(funnelTemplates)
      .where(eq(funnelTemplates.isActive, true))
      .orderBy(funnelTemplates.createdAt);

    res.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar templates:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar templates",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Get funnels for an operation
 */
router.get("/funnels", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { operationId } = req.query;

    if (!operationId || typeof operationId !== "string") {
      return res.status(400).json({ 
        success: false,
        error: "Operation ID é obrigatório" 
      });
    }

    const funnelsData = await db
      .select({
        id: funnels.id,
        name: funnels.name,
        description: funnels.description,
        status: funnels.status,
        isActive: funnels.isActive,
        aiCost: funnels.aiCost,
        generatedAt: funnels.generatedAt,
        createdAt: funnels.createdAt,
        updatedAt: funnels.updatedAt,
        // Template info
        templateId: funnels.templateId,
        templateName: funnelTemplates.name,
        // Latest deployment
        deploymentUrl: funnelDeployments.deploymentUrl,
        deploymentStatus: funnelDeployments.status,
      })
      .from(funnels)
      .leftJoin(funnelTemplates, eq(funnels.templateId, funnelTemplates.id))
      .leftJoin(funnelDeployments, eq(funnels.id, funnelDeployments.funnelId))
      .where(and(
        eq(funnels.operationId, operationId),
        eq(funnels.isActive, true)
      ))
      .orderBy(desc(funnels.createdAt));

    res.json({
      success: true,
      funnels: funnelsData,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar funis:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar funis",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Create a new funnel with AI-generated content
 */
router.post("/funnels", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const validation = createFunnelSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: "Dados inválidos",
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }

    const { operationId, name, description, templateId, productInfo, trackingConfig } = validation.data;

    console.log(`🎯 Creating AI funnel: ${name} for operation: ${operationId}`);

    // Check if Vercel integration exists
    const [integration] = await db
      .select()
      .from(funnelIntegrations)
      .where(and(
        eq(funnelIntegrations.operationId, operationId),
        eq(funnelIntegrations.isActive, true)
      ))
      .limit(1);

    if (!integration) {
      return res.status(400).json({
        success: false,
        error: "Integração Vercel não encontrada",
        message: "Conecte sua conta Vercel antes de criar funis"
      });
    }

    // Get template configuration if templateId provided
    let templateConfig = {
      sections: ['hero', 'benefits', 'testimonials', 'faq', 'cta'],
      colorScheme: 'modern',
      layout: 'single_page',
      conversionGoal: 'purchase'
    };

    if (templateId) {
      const [template] = await db
        .select()
        .from(funnelTemplates)
        .where(eq(funnelTemplates.id, templateId))
        .limit(1);
      
      if (template?.templateConfig) {
        templateConfig = { ...templateConfig, ...template.templateConfig };
      }
    }

    // Create funnel record with "generating" status
    const [newFunnel] = await db
      .insert(funnels)
      .values({
        operationId,
        storeId: (req as any).storeId,
        name,
        description: description || null,
        templateId: templateId || null,
        productInfo,
        trackingConfig: trackingConfig || null,
        status: 'generating',
        isActive: true,
      })
      .returning();

    // Start AI content generation in background
    generateFunnelContent(newFunnel.id, productInfo, templateConfig);

    res.json({
      success: true,
      message: "Funil criado com sucesso! Conteúdo sendo gerado pela IA...",
      funnel: {
        id: newFunnel.id,
        name: newFunnel.name,
        status: newFunnel.status,
        createdAt: newFunnel.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao criar funil:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao criar funil",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Deploy funnel to Vercel
 */
router.post("/funnels/deploy", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const validation = deployFunnelSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: "Dados inválidos",
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }

    const { funnelId, customDomain } = validation.data;

    console.log(`🚀 Deploying funnel: ${funnelId}`);

    // Get funnel data
    const [funnel] = await db
      .select()
      .from(funnels)
      .where(eq(funnels.id, funnelId))
      .limit(1);

    if (!funnel) {
      return res.status(404).json({
        success: false,
        error: "Funil não encontrado"
      });
    }

    if (funnel.status !== 'ready') {
      return res.status(400).json({
        success: false,
        error: "Funil não está pronto para deploy",
        message: `Status atual: ${funnel.status}`
      });
    }

    // Get Vercel integration
    const [integration] = await db
      .select()
      .from(funnelIntegrations)
      .where(eq(funnelIntegrations.operationId, funnel.operationId))
      .limit(1);

    if (!integration) {
      return res.status(400).json({
        success: false,
        error: "Integração Vercel não encontrada"
      });
    }

    // Start deployment process in background
    deployToVercel(funnel, integration, customDomain);

    res.json({
      success: true,
      message: "Deploy iniciado! Acompanhe o progresso na lista de funis.",
      funnelId,
    });
  } catch (error) {
    console.error("❌ Erro ao iniciar deploy:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao iniciar deploy",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Get funnel details including generated content
 */
router.get("/funnels/:funnelId", authenticateToken, async (req, res) => {
  try {
    const { funnelId } = req.params;

    const [funnel] = await db
      .select()
      .from(funnels)
      .where(eq(funnels.id, funnelId))
      .limit(1);

    if (!funnel) {
      return res.status(404).json({
        success: false,
        error: "Funil não encontrado"
      });
    }

    // Get deployments
    const deployments = await db
      .select()
      .from(funnelDeployments)
      .where(eq(funnelDeployments.funnelId, funnelId))
      .orderBy(desc(funnelDeployments.createdAt));

    res.json({
      success: true,
      funnel,
      deployments,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar detalhes do funil:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar detalhes do funil",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

// Background functions

/**
 * Generate AI content for funnel
 */
async function generateFunnelContent(
  funnelId: string, 
  productInfo: any, 
  templateConfig: any
) {
  try {
    console.log(`🤖 Generating AI content for funnel: ${funnelId}`);

    // Generate content with AI
    const { content, cost } = await aiFunnelGenerator.generateLandingPageContent(
      productInfo,
      templateConfig
    );

    // Update funnel with generated content
    await db
      .update(funnels)
      .set({
        generatedContent: content,
        aiCost: cost.toString(),
        status: 'ready',
        generatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(funnels.id, funnelId));

    console.log(`✅ AI content generated successfully for funnel: ${funnelId}`);
  } catch (error) {
    console.error(`❌ Error generating AI content for funnel ${funnelId}:`, error);

    // Update funnel status to error
    await db
      .update(funnels)
      .set({
        status: 'error',
        updatedAt: new Date(),
      })
      .where(eq(funnels.id, funnelId));
  }
}

/**
 * Deploy funnel to Vercel
 */
async function deployToVercel(
  funnel: any,
  integration: any,
  customDomain?: string
) {
  try {
    console.log(`🚀 Starting Vercel deployment for funnel: ${funnel.id}`);

    // Update funnel status
    await db
      .update(funnels)
      .set({
        status: 'deploying',
        updatedAt: new Date(),
      })
      .where(eq(funnels.id, funnel.id));

    // Generate landing page files
    const templateOptions = {
      colorScheme: 'modern' as const,
      layout: 'single_page' as const,
      trackingConfig: funnel.trackingConfig,
    };

    const landingPageFiles = templateGenerator.generateLandingPage(
      funnel.generatedContent,
      funnel.productInfo,
      templateOptions
    );

    // Create unique project name
    const projectName = `funnel-${funnel.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;

    // Deploy to Vercel
    const deployment = await vercelService.deployLandingPage(
      integration.vercelAccessToken,
      projectName,
      {
        name: projectName,
        framework: 'nextjs',
        files: landingPageFiles,
      },
      integration.vercelTeamId
    );

    // Save deployment record
    const [deploymentRecord] = await db
      .insert(funnelDeployments)
      .values({
        funnelId: funnel.id,
        vercelProjectId: projectName,
        vercelProjectName: projectName,
        vercelDeploymentId: deployment.uid,
        vercelUrl: deployment.url,
        status: deployment.state.toLowerCase(),
        deploymentUrl: `https://${deployment.url}`,
        sslEnabled: true,
        deployedAt: new Date(),
      })
      .returning();

    // Add custom domain if provided
    if (customDomain && deployment.state === 'READY') {
      try {
        await vercelService.addDomain(
          integration.vercelAccessToken,
          projectName,
          customDomain,
          integration.vercelTeamId
        );
        
        await db
          .update(funnelDeployments)
          .set({
            customDomain,
            customDomainStatus: 'pending',
          })
          .where(eq(funnelDeployments.id, deploymentRecord.id));
      } catch (domainError) {
        console.error(`⚠️ Failed to add custom domain: ${domainError}`);
      }
    }

    // Update funnel status
    await db
      .update(funnels)
      .set({
        status: 'deployed',
        updatedAt: new Date(),
      })
      .where(eq(funnels.id, funnel.id));

    console.log(`✅ Funnel deployed successfully: https://${deployment.url}`);
  } catch (error) {
    console.error(`❌ Deployment failed for funnel ${funnel.id}:`, error);

    // Update funnel status to error
    await db
      .update(funnels)
      .set({
        status: 'error',
        updatedAt: new Date(),
      })
      .where(eq(funnels.id, funnel.id));
  }
}

export { router as funnelRoutes };