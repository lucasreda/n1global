import { Router } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { 
  funnelIntegrations, 
  funnels, 
  funnelTemplates,
  // funnelDeployments, // TODO: Enable when table is created
  funnelAnalytics,
  funnelPageTemplates,
  funnelPages,
  funnelPageRevisions,
  insertFunnelIntegrationSchema,
  insertFunnelSchema,
  insertFunnelTemplateSchema,
  insertFunnelPageTemplateSchema,
  insertFunnelPageSchema,
  insertFunnelPageRevisionSchema,
  // insertFunnelDeploymentSchema, // TODO: Enable when table is created
  operations,
  users
} from "@shared/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { authenticateToken } from "./auth-middleware";
import { validateOperationAccess } from "./middleware/operation-access";
import { vercelService } from "./vercel-service";
import { aiFunnelGenerator } from "./ai-funnel-generator";
import { templateGenerator } from "./template-generator";
import { AIPageOrchestrator } from "./ai/AIPageOrchestrator";

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
  type: z.enum(["ecommerce", "nutraceutico", "infoproduto"], {
    errorMap: () => ({ message: "Tipo deve ser: ecommerce, nutraceutico ou infoproduto" })
  }),
  language: z.string().min(2, "Idioma é obrigatório"),
  currency: z.string().length(3, "Moeda deve ter 3 caracteres"),
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
  }).optional(),
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

const createAIPageSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  pageType: z.enum(["landing", "checkout", "upsell", "downsell", "thankyou"]),
  product: z.string().min(1, "Produto/serviço é obrigatório"),
  targetAudience: z.string().min(1, "Público-alvo é obrigatório"),
  mainGoal: z.string().min(1, "Objetivo principal é obrigatório"),
  additionalInfo: z.string().optional(),
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
    const operationId = req.query.operationId as string;
    
    if (!operationId) {
      return res.status(400).json({
        success: false,
        error: "Operation ID é obrigatório"
      });
    }
    
    // Use current working domain (can be overridden with VERCEL_OAUTH_REDIRECT_HOST env var)
    const host = process.env.VERCEL_OAUTH_REDIRECT_HOST || req.get('host');
    const redirectUri = `https://${host}/api/funnels/vercel/callback`;
    
    // Include operationId in state for recovery after callback
    const state = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${operationId}`; // Include operationId
    
    // Store state for CSRF validation
    oauthStates.set(state, {
      userId,
      createdAt: Date.now(),
      operationId: operationId,
    });
    
    const oauthUrl = vercelService.getOAuthUrl(redirectUri, state);
    
    // Debug OAuth configuration
    console.log(`🔍 OAuth URL gerada com operation ${operationId}: ${oauthUrl}`);
    
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
router.post("/funnels/vercel/connect", authenticateToken, async (req, res) => {
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

    console.log(`🔐 Connecting Vercel for operation: ${operationId}, state: ${state}`);

    // Validate state for CSRF protection
    const storedState = oauthStates.get(state);
    if (!storedState) {
      console.error(`❌ State not found in cache: ${state}`);
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

    // Don't remove state immediately to allow retries if the connection fails
    // State will be cleaned up automatically after 10 minutes
    // oauthStates.delete(state);

    // Generate server-side redirectUri (secure)
    // Use current working domain (can be overridden with VERCEL_OAUTH_REDIRECT_HOST env var)
    const host = process.env.VERCEL_OAUTH_REDIRECT_HOST || req.get('host');
    const redirectUri = `https://${host}/api/funnels/vercel/callback`;

    // Exchange OAuth code for access token
    const oauthResult = await vercelService.exchangeOAuthCode(code, redirectUri);
    
    // Get user's storeId
    const [userInfo] = await db
      .select({ storeId: users.storeId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!userInfo || !userInfo.storeId) {
      return res.status(400).json({
        success: false,
        error: "Usuário não tem loja associada"
      });
    }
    
    // Check if integration already exists for this operation
    const [existingIntegration] = await db
      .select({
        id: funnelIntegrations.id,
        operationId: funnelIntegrations.operationId,
        storeId: funnelIntegrations.storeId,
        vercelAccessToken: funnelIntegrations.vercelAccessToken,
        vercelUserId: funnelIntegrations.vercelUserId,
        vercelTeamId: funnelIntegrations.vercelTeamId,
        connectedAt: funnelIntegrations.connectedAt,
        lastUsed: funnelIntegrations.lastUsed,
        isActive: funnelIntegrations.isActive,
        createdAt: funnelIntegrations.createdAt,
        updatedAt: funnelIntegrations.updatedAt
      })
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
          storeId: userInfo.storeId,
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
router.get("/funnels/vercel/status", authenticateToken, async (req, res) => {
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
        vercelAccessToken: funnelIntegrations.vercelAccessToken,
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
    const isValid = await vercelService.validateToken(integration.vercelAccessToken);
    
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
router.get("/funnels", authenticateToken, async (req, res) => {
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
        // Latest deployment - TODO: Enable when deployment table is created
        // deploymentUrl: funnelDeployments.deploymentUrl,
        // deploymentStatus: funnelDeployments.status,
      })
      .from(funnels)
      .leftJoin(funnelTemplates, eq(funnels.templateId, funnelTemplates.id))
      // .leftJoin(funnelDeployments, eq(funnels.id, funnelDeployments.funnelId))
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

    const { operationId, name, type, language, currency, description, templateId, productInfo, trackingConfig } = validation.data;

    console.log(`🎯 Creating AI funnel: ${name} (${type}) for operation: ${operationId}`);

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
        type,
        language,
        currency,
        description: description || null,
        templateId: templateId || null,
        productInfo: productInfo || null,
        trackingConfig: trackingConfig || null,
        status: 'generating',
        isActive: true,
      })
      .returning();

    // Start AI content generation in background (if productInfo is available)
    if (productInfo) {
      generateFunnelContent(newFunnel.id, productInfo, templateConfig);
    } else {
      // Generate basic content based on type and language
      console.log(`📝 Generating basic content for funnel ${newFunnel.id} (${type} in ${language})`);
      // For now, just set status to ready - will implement AI generation later
      await db
        .update(funnels)
        .set({ 
          status: 'ready',
          generatedContent: {
            hero: {
              title: `Bem-vindo ao ${name}`,
              subtitle: 'Conteúdo será gerado pela IA em breve...',
              cta: 'Começar agora'
            },
            benefits: [],
            testimonials: [],
            faq: [],
            cta: {
              primary: 'Começar agora',
              secondary: 'Saiba mais'
            }
          },
          generatedAt: new Date()
        })
        .where(eq(funnels.id, newFunnel.id));
    }

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

    // TODO: Get deployments when table is available
    // const deployments = await db
    //   .select()
    //   .from(funnelDeployments)
    //   .where(eq(funnelDeployments.funnelId, funnelId))
    //   .orderBy(desc(funnelDeployments.createdAt));

    res.json({
      success: true,
      funnel,
      deployments: [], // Empty for now
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
    // TODO: Insert deployment record when table is available
    // const [deploymentRecord] = await db
    //   .insert(funnelDeployments)
    //   .values({
    //     funnelId: funnel.id,
    //     vercelProjectId: projectName,
    //     vercelProjectName: projectName,
    //     vercelDeploymentId: deployment.uid,
    //     vercelUrl: deployment.url,
    //     status: deployment.state.toLowerCase(),
    //     deploymentUrl: `https://${deployment.url}`,
    //     sslEnabled: true,
    //     deployedAt: new Date(),
    //   })
    //   .returning();

    // Add custom domain if provided
    if (customDomain && deployment.state === 'READY') {
      try {
        await vercelService.addDomain(
          integration.vercelAccessToken,
          projectName,
          customDomain,
          integration.vercelTeamId
        );
        
        // TODO: Update deployment record when table is available
        // await db
        //   .update(funnelDeployments)
        //   .set({
        //     customDomain,
        //     customDomainStatus: 'pending',
        //   })
        //   .where(eq(funnelDeployments.id, deploymentRecord.id));
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

// Get single funnel by ID
router.get("/funnels/:id", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const operationId = req.validatedOperationId;

    const [funnel] = await db
      .select()
      .from(funnels)
      .where(
        and(
          eq(funnels.id, id),
          eq(funnels.operationId, operationId)
        )
      )
      .limit(1);

    if (!funnel) {
      return res.status(404).json({
        success: false,
        error: "Funil não encontrado"
      });
    }

    return res.json({
      success: true,
      funnel
    });
  } catch (error) {
    console.error('❌ Erro ao buscar funil:', error);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor"
    });
  }
});

// Update funnel
router.put("/funnels/:id", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const operationId = req.validatedOperationId;

    // Validate that funnel exists and belongs to this operation
    const [existingFunnel] = await db
      .select()
      .from(funnels)
      .where(
        and(
          eq(funnels.id, id),
          eq(funnels.operationId, operationId)
        )
      )
      .limit(1);

    if (!existingFunnel) {
      return res.status(404).json({
        success: false,
        error: "Funil não encontrado"
      });
    }

    // Extract updateable fields from request body
    const {
      name,
      description,
      isActive,
      productInfo,
      trackingConfig
    } = req.body;

    const updateData: any = {
      updatedAt: new Date()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (productInfo !== undefined) updateData.productInfo = productInfo;
    if (trackingConfig !== undefined) updateData.trackingConfig = trackingConfig;

    // Update the funnel
    const [updatedFunnel] = await db
      .update(funnels)
      .set(updateData)
      .where(
        and(
          eq(funnels.id, id),
          eq(funnels.operationId, operationId)
        )
      )
      .returning();

    return res.json({
      success: true,
      message: "Funil atualizado com sucesso",
      funnel: updatedFunnel
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar funil:', error);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor"
    });
  }
});

// ================================
// FUNNEL PAGES CRUD ROUTES
// ================================

/**
 * Get all pages for a funnel
 */
router.get("/funnels/:funnelId/pages", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { funnelId } = req.params;
    const operationId = req.validatedOperationId;

    // Validate funnel exists and belongs to operation
    const [funnel] = await db
      .select()
      .from(funnels)
      .where(
        and(
          eq(funnels.id, funnelId),
          eq(funnels.operationId, operationId)
        )
      )
      .limit(1);

    if (!funnel) {
      return res.status(404).json({
        success: false,
        error: "Funil não encontrado"
      });
    }

    // Get all pages for this funnel
    const pages = await db
      .select()
      .from(funnelPages)
      .where(eq(funnelPages.funnelId, funnelId))
      .orderBy(funnelPages.createdAt);

    return res.json({
      success: true,
      pages
    });
  } catch (error) {
    console.error('❌ Erro ao buscar páginas:', error);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor"
    });
  }
});

/**
 * Create a new page for a funnel
 */
router.post("/funnels/:funnelId/pages", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { funnelId } = req.params;
    const operationId = req.validatedOperationId;
    const userId = (req as any).user.id;

    // Validate funnel exists and belongs to operation
    const [funnel] = await db
      .select()
      .from(funnels)
      .where(
        and(
          eq(funnels.id, funnelId),
          eq(funnels.operationId, operationId)
        )
      )
      .limit(1);

    if (!funnel) {
      return res.status(404).json({
        success: false,
        error: "Funil não encontrado"
      });
    }

    // Validate required fields
    const pageData = insertFunnelPageSchema.parse({
      ...req.body,
      funnelId,
      lastEditedBy: userId
    });

    // Check if path is unique within this funnel
    const [existingPage] = await db
      .select()
      .from(funnelPages)
      .where(
        and(
          eq(funnelPages.funnelId, funnelId),
          eq(funnelPages.path, pageData.path)
        )
      )
      .limit(1);

    if (existingPage) {
      return res.status(400).json({
        success: false,
        error: "Já existe uma página com este caminho neste funil"
      });
    }

    // Create the page
    const [newPage] = await db
      .insert(funnelPages)
      .values([pageData])
      .returning();

    // Create initial revision
    await db
      .insert(funnelPageRevisions)
      .values([{
        pageId: newPage.id,
        version: 1,
        changeType: 'manual',
        model: newPage.model,
        changeDescription: 'Página criada',
        createdBy: userId
      }]);

    return res.status(201).json({
      success: true,
      message: "Página criada com sucesso",
      page: newPage
    });
  } catch (error) {
    console.error('❌ Erro ao criar página:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Dados inválidos",
        details: error.errors
      });
    }

    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor"
    });
  }
});

/**
 * Create a new page using AI generation
 */
router.post("/funnels/:funnelId/pages/ai-generate", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { funnelId } = req.params;
    const operationId = req.validatedOperationId;
    const userId = (req as any).user.id;

    console.log(`🤖 Creating AI-generated page for funnel: ${funnelId}`);

    // Validate funnel exists and belongs to operation
    const [funnel] = await db
      .select()
      .from(funnels)
      .where(
        and(
          eq(funnels.id, funnelId),
          eq(funnels.operationId, operationId)
        )
      )
      .limit(1);

    if (!funnel) {
      return res.status(404).json({
        success: false,
        error: "Funil não encontrado"
      });
    }

    // Validate AI page data
    const aiPageData = createAIPageSchema.parse(req.body);
    
    // Generate unique path based on page name
    const basePath = `/${aiPageData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
    let path = basePath;
    let counter = 1;
    
    // Ensure path is unique within this funnel
    while (true) {
      const [existingPage] = await db
        .select()
        .from(funnelPages)
        .where(
          and(
            eq(funnelPages.funnelId, funnelId),
            eq(funnelPages.path, path)
          )
        )
        .limit(1);

      if (!existingPage) break;
      path = `${basePath}-${counter}`;
      counter++;
    }

    // Generate AI content using OpenAI
    const aiGeneratedModel = await generateAIPageModel(aiPageData, funnel);

    // Create the page with AI-generated model
    const pageData = {
      funnelId,
      name: aiPageData.name,
      pageType: aiPageData.pageType,
      path,
      model: aiGeneratedModel,
      status: "draft" as const,
      lastEditedBy: userId
    };

    // Create the page
    const [newPage] = await db
      .insert(funnelPages)
      .values([pageData])
      .returning();

    // Create initial revision
    await db
      .insert(funnelPageRevisions)
      .values([{
        pageId: newPage.id,
        version: 1,
        changeType: 'ai_generated',
        model: newPage.model,
        changeDescription: `Página criada com IA: ${aiPageData.pageType} para ${aiPageData.product}`,
        createdBy: userId
      }]);

    return res.status(201).json({
      success: true,
      message: "Página criada com IA com sucesso",
      page: newPage
    });
  } catch (error) {
    console.error('❌ Erro ao criar página com IA:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Dados inválidos",
        details: error.errors
      });
    }

    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor"
    });
  }
});


/**
 * Get a specific page
 */
router.get("/funnels/:funnelId/pages/:pageId", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { funnelId, pageId } = req.params;
    const operationId = req.validatedOperationId;

    console.log('🔍 GET PAGE Debug:', { funnelId, pageId, operationId });

    // Validate funnel exists and belongs to operation
    const [funnel] = await db
      .select()
      .from(funnels)
      .where(
        and(
          eq(funnels.id, funnelId),
          eq(funnels.operationId, operationId)
        )
      )
      .limit(1);

    console.log('🔍 Funnel check:', { found: !!funnel, funnelId: funnel?.id });

    if (!funnel) {
      console.log('❌ Funnel not found');
      return res.status(404).json({
        success: false,
        error: "Funil não encontrado"
      });
    }

    // Get the page
    const [page] = await db
      .select()
      .from(funnelPages)
      .where(
        and(
          eq(funnelPages.id, pageId),
          eq(funnelPages.funnelId, funnelId)
        )
      )
      .limit(1);

    console.log('🔍 Page check:', { found: !!page, pageId: page?.id, hasModel: !!page?.model });

    if (!page) {
      console.log('❌ Page not found');
      return res.status(404).json({
        success: false,
        error: "Página não encontrada"
      });
    }

    // Parse the model JSON string if it exists
    let parsedPage = { ...page };
    if (page.model && typeof page.model === 'string') {
      try {
        parsedPage.model = JSON.parse(page.model);
        console.log('✅ Model parsed successfully, sections:', parsedPage.model.sections?.length);
      } catch (error) {
        console.error('❌ Erro ao fazer parse do model JSON:', error);
        // Keep the original string if parsing fails
      }
    }

    console.log('📦 Returning page data:', {
      id: parsedPage.id,
      name: parsedPage.name,
      hasModel: !!parsedPage.model,
      modelType: typeof parsedPage.model
    });

    return res.json({
      success: true,
      page: parsedPage
    });
  } catch (error) {
    console.error('❌ Erro ao buscar página:', error);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor"
    });
  }
});

/**
 * Update a page
 */
router.put("/funnels/:funnelId/pages/:pageId", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { funnelId, pageId } = req.params;
    const operationId = req.validatedOperationId;
    const userId = (req as any).user.id;

    // Validate funnel exists and belongs to operation
    const [funnel] = await db
      .select()
      .from(funnels)
      .where(
        and(
          eq(funnels.id, funnelId),
          eq(funnels.operationId, operationId)
        )
      )
      .limit(1);

    if (!funnel) {
      return res.status(404).json({
        success: false,
        error: "Funil não encontrado"
      });
    }

    // Get current page
    const [currentPage] = await db
      .select()
      .from(funnelPages)
      .where(
        and(
          eq(funnelPages.id, pageId),
          eq(funnelPages.funnelId, funnelId)
        )
      )
      .limit(1);

    if (!currentPage) {
      return res.status(404).json({
        success: false,
        error: "Página não encontrada"
      });
    }

    // Extract updateable fields
    const {
      name,
      pageType,
      path,
      model,
      templateId,
      status,
      isActive,
      lastAiPrompt
    } = req.body;

    const updateData: any = {
      lastEditedBy: userId,
      updatedAt: new Date()
    };

    if (name !== undefined) updateData.name = name;
    if (pageType !== undefined) updateData.pageType = pageType;
    if (path !== undefined) {
      // Check path uniqueness if changed
      if (path !== currentPage.path) {
        const [existingPage] = await db
          .select()
          .from(funnelPages)
          .where(
            and(
              eq(funnelPages.funnelId, funnelId),
              eq(funnelPages.path, path)
            )
          )
          .limit(1);

        if (existingPage) {
          return res.status(400).json({
            success: false,
            error: "Já existe uma página com este caminho neste funil"
          });
        }
      }
      updateData.path = path;
    }
    if (model !== undefined) {
      updateData.model = model;
      updateData.version = currentPage.version + 1;
    }
    if (templateId !== undefined) updateData.templateId = templateId;
    if (status !== undefined) updateData.status = status;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (lastAiPrompt !== undefined) updateData.lastAiPrompt = lastAiPrompt;

    // Update the page
    const [updatedPage] = await db
      .update(funnelPages)
      .set(updateData)
      .where(
        and(
          eq(funnelPages.id, pageId),
          eq(funnelPages.funnelId, funnelId)
        )
      )
      .returning();

    // Create revision if model changed
    if (model !== undefined) {
      await db
        .insert(funnelPageRevisions)
        .values([{
          pageId: pageId,
          version: updatedPage.version,
          changeType: lastAiPrompt ? 'ai_patch' : 'manual',
          model: updatedPage.model,
          aiPrompt: lastAiPrompt,
          changeDescription: lastAiPrompt ? 'Modificação por IA' : 'Edição manual',
          createdBy: userId
        }]);
    }

    return res.json({
      success: true,
      message: "Página atualizada com sucesso",
      page: updatedPage
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar página:', error);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor"
    });
  }
});

/**
 * Duplicate a page
 */
router.post("/funnels/:funnelId/pages/:pageId/duplicate", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { funnelId, pageId } = req.params;
    const operationId = req.validatedOperationId;
    const userId = (req as any).user.id;

    // Validate funnel exists and belongs to operation
    const [funnel] = await db
      .select()
      .from(funnels)
      .where(and(
        eq(funnels.id, funnelId),
        eq(funnels.operationId, operationId)
      ))
      .limit(1);

    if (!funnel) {
      return res.status(404).json({
        success: false,
        error: "Funil não encontrado",
      });
    }

    // Get original page
    const [originalPage] = await db
      .select()
      .from(funnelPages)
      .where(and(
        eq(funnelPages.id, pageId),
        eq(funnelPages.funnelId, funnelId)
      ))
      .limit(1);

    if (!originalPage) {
      return res.status(404).json({
        success: false,
        error: "Página não encontrada"
      });
    }

    // Create path for duplicate
    const basePath = originalPage.path.replace(/(_copy_\d+)?$/, '');
    const copyNumber = await db
      .select({ count: sql`count(*)` })
      .from(funnelPages)
      .where(and(
        eq(funnelPages.funnelId, funnelId),
        sql`${funnelPages.path} LIKE ${basePath + '_copy_%'}`
      ));

    const nextCopyNumber = Number(copyNumber[0].count) + 1;
    const newPath = `${basePath}_copy_${nextCopyNumber}`;

    // Create duplicate page
    const [duplicatedPage] = await db
      .insert(funnelPages)
      .values({
        funnelId,
        templateId: originalPage.templateId,
        name: `${originalPage.name} (Cópia)`,
        path: newPath,
        pageType: originalPage.pageType,
        status: 'draft',
        model: originalPage.model,
      })
      .returning();

    // Create initial revision for duplicated page
    await db
      .insert(funnelPageRevisions)
      .values({
        pageId: duplicatedPage.id,
        version: 1,
        changeType: 'manual',
        model: originalPage.model,
        changeDescription: `Página duplicada de ${originalPage.name}`,
        createdBy: userId,
      });

    return res.json({
      success: true,
      message: "Página duplicada com sucesso",
      page: duplicatedPage
    });
  } catch (error) {
    console.error('❌ Erro ao duplicar página:', error);
    return res.status(500).json({
      success: false,
      error: "Erro ao duplicar página"
    });
  }
});

/**
 * Delete a page
 */
router.delete("/funnels/:funnelId/pages/:pageId", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { funnelId, pageId } = req.params;
    const operationId = req.validatedOperationId;

    // Validate funnel exists and belongs to operation
    const [funnel] = await db
      .select()
      .from(funnels)
      .where(
        and(
          eq(funnels.id, funnelId),
          eq(funnels.operationId, operationId)
        )
      )
      .limit(1);

    if (!funnel) {
      return res.status(404).json({
        success: false,
        error: "Funil não encontrado"
      });
    }

    // Check if page exists
    const [page] = await db
      .select()
      .from(funnelPages)
      .where(
        and(
          eq(funnelPages.id, pageId),
          eq(funnelPages.funnelId, funnelId)
        )
      )
      .limit(1);

    if (!page) {
      return res.status(404).json({
        success: false,
        error: "Página não encontrada"
      });
    }

    // Delete the page (cascade will handle revisions)
    await db
      .delete(funnelPages)
      .where(
        and(
          eq(funnelPages.id, pageId),
          eq(funnelPages.funnelId, funnelId)
        )
      );

    return res.json({
      success: true,
      message: "Página excluída com sucesso"
    });
  } catch (error) {
    console.error('❌ Erro ao excluir página:', error);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor"
    });
  }
});

/**
 * Get page revision history
 */
router.get("/funnels/:funnelId/pages/:pageId/revisions", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { funnelId, pageId } = req.params;
    const operationId = req.validatedOperationId;

    // Validate funnel exists and belongs to operation
    const [funnel] = await db
      .select()
      .from(funnels)
      .where(
        and(
          eq(funnels.id, funnelId),
          eq(funnels.operationId, operationId)
        )
      )
      .limit(1);

    if (!funnel) {
      return res.status(404).json({
        success: false,
        error: "Funil não encontrado"
      });
    }

    // Check if page exists
    const [page] = await db
      .select()
      .from(funnelPages)
      .where(
        and(
          eq(funnelPages.id, pageId),
          eq(funnelPages.funnelId, funnelId)
        )
      )
      .limit(1);

    if (!page) {
      return res.status(404).json({
        success: false,
        error: "Página não encontrada"
      });
    }

    // Get revision history
    const revisions = await db
      .select({
        id: funnelPageRevisions.id,
        version: funnelPageRevisions.version,
        changeType: funnelPageRevisions.changeType,
        aiPrompt: funnelPageRevisions.aiPrompt,
        changeDescription: funnelPageRevisions.changeDescription,
        createdAt: funnelPageRevisions.createdAt,
        createdBy: users.email
      })
      .from(funnelPageRevisions)
      .leftJoin(users, eq(funnelPageRevisions.createdBy, users.id))
      .where(eq(funnelPageRevisions.pageId, pageId))
      .orderBy(desc(funnelPageRevisions.version));

    return res.json({
      success: true,
      revisions
    });
  } catch (error) {
    console.error('❌ Erro ao buscar histórico:', error);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor"
    });
  }
});

/**
 * Get specific revision content
 */
router.get("/funnels/:funnelId/pages/:pageId/revisions/:revisionId", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { funnelId, pageId, revisionId } = req.params;
    const operationId = req.validatedOperationId;

    // Validate funnel exists and belongs to operation
    const [funnel] = await db
      .select()
      .from(funnels)
      .where(
        and(
          eq(funnels.id, funnelId),
          eq(funnels.operationId, operationId)
        )
      )
      .limit(1);

    if (!funnel) {
      return res.status(404).json({
        success: false,
        error: "Funil não encontrado"
      });
    }

    // Get specific revision
    const [revision] = await db
      .select()
      .from(funnelPageRevisions)
      .where(
        and(
          eq(funnelPageRevisions.id, revisionId),
          eq(funnelPageRevisions.pageId, pageId)
        )
      )
      .limit(1);

    if (!revision) {
      return res.status(404).json({
        success: false,
        error: "Revisão não encontrada"
      });
    }

    return res.json({
      success: true,
      revision
    });
  } catch (error) {
    console.error('❌ Erro ao buscar revisão:', error);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor"
    });
  }
});

// ================================
// FUNNEL PAGE TEMPLATES ROUTES
// ================================

/**
 * Get all available page templates
 */
router.get("/funnels/page-templates", authenticateToken, async (req, res) => {
  try {
    const pageType = req.query.pageType as string;
    const category = req.query.category as string;
    
    // Build WHERE conditions
    const whereConditions = [
      eq(funnelPageTemplates.isActive, true)
    ];
    
    if (pageType) {
      whereConditions.push(eq(funnelPageTemplates.pageType, pageType));
    }
    
    if (category) {
      whereConditions.push(eq(funnelPageTemplates.category, category));
    }
    
    const templates = await db
      .select()
      .from(funnelPageTemplates)
      .where(and(...whereConditions))
      .orderBy(funnelPageTemplates.name);

    return res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('❌ Erro ao buscar templates:', error);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor"
    });
  }
});

/**
 * Get a specific page template
 */
router.get("/funnels/page-templates/:templateId", authenticateToken, async (req, res) => {
  try {
    const { templateId } = req.params;

    const [template] = await db
      .select()
      .from(funnelPageTemplates)
      .where(
        and(
          eq(funnelPageTemplates.id, templateId),
          eq(funnelPageTemplates.isActive, true)
        )
      )
      .limit(1);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: "Template não encontrado"
      });
    }

    return res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('❌ Erro ao buscar template:', error);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor"
    });
  }
});

/**
 * Apply a template to a page
 */
router.post("/funnels/:funnelId/pages/:pageId/apply-template", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { funnelId, pageId } = req.params;
    const { templateId } = req.body;
    const operationId = req.validatedOperationId;
    const userId = (req as any).user.id;

    if (!templateId) {
      return res.status(400).json({
        success: false,
        error: "Template ID é obrigatório"
      });
    }

    // Validate funnel exists and belongs to operation
    const [funnel] = await db
      .select()
      .from(funnels)
      .where(
        and(
          eq(funnels.id, funnelId),
          eq(funnels.operationId, operationId)
        )
      )
      .limit(1);

    if (!funnel) {
      return res.status(404).json({
        success: false,
        error: "Funil não encontrado"
      });
    }

    // Get current page
    const [currentPage] = await db
      .select()
      .from(funnelPages)
      .where(
        and(
          eq(funnelPages.id, pageId),
          eq(funnelPages.funnelId, funnelId)
        )
      )
      .limit(1);

    if (!currentPage) {
      return res.status(404).json({
        success: false,
        error: "Página não encontrada"
      });
    }

    // Get template
    const [template] = await db
      .select()
      .from(funnelPageTemplates)
      .where(
        and(
          eq(funnelPageTemplates.id, templateId),
          eq(funnelPageTemplates.isActive, true)
        )
      )
      .limit(1);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: "Template não encontrado"
      });
    }

    // Merge template model with existing page data
    const mergedModel = {
      ...template.defaultModel,
      seo: {
        ...template.defaultModel.seo,
        title: currentPage.model.seo?.title || template.defaultModel.seo?.title || currentPage.name,
        description: currentPage.model.seo?.description || template.defaultModel.seo?.description || "",
        keywords: currentPage.model.seo?.keywords || template.defaultModel.seo?.keywords || []
      }
    };

    // Update the page with template
    const [updatedPage] = await db
      .update(funnelPages)
      .set({
        model: mergedModel,
        templateId: templateId,
        pageType: template.pageType,
        version: currentPage.version + 1,
        lastEditedBy: userId,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(funnelPages.id, pageId),
          eq(funnelPages.funnelId, funnelId)
        )
      )
      .returning();

    // Create revision for template application
    await db
      .insert(funnelPageRevisions)
      .values([{
        pageId: pageId,
        version: updatedPage.version,
        changeType: 'template_apply',
        model: updatedPage.model,
        changeDescription: `Template "${template.name}" aplicado`,
        createdBy: userId
      }]);

    return res.json({
      success: true,
      message: "Template aplicado com sucesso",
      page: updatedPage
    });
  } catch (error) {
    console.error('❌ Erro ao aplicar template:', error);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor"
    });
  }
});

/**
 * Create a new page template (admin only)
 */
router.post("/funnels/page-templates", authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    
    // Only allow admins to create global page templates
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: "Acesso negado. Apenas administradores podem criar templates."
      });
    }
    
    const templateData = insertFunnelPageTemplateSchema.parse(req.body);

    const [newTemplate] = await db
      .insert(funnelPageTemplates)
      .values([templateData])
      .returning();

    return res.status(201).json({
      success: true,
      message: "Template criado com sucesso",
      template: newTemplate
    });
  } catch (error) {
    console.error('❌ Erro ao criar template:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Dados inválidos",
        details: error.errors
      });
    }

    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor"
    });
  }
});

/**
 * Generate AI-powered PageModelV2 using the advanced AI Orchestrator system
 */
async function generateAIPageModel(aiPageData: any, funnel: any): Promise<any> {
  try {
    console.log(`🚀 Generating AI page with advanced orchestrator system...`);
    
    const orchestrator = new AIPageOrchestrator();
    
    // Convert aiPageData to the brief format expected by the orchestrator
    const briefData = {
      productInfo: {
        name: aiPageData.product,
        description: aiPageData.additionalInfo || `${aiPageData.pageType} para ${aiPageData.product}`,
        price: 199, // Default price - could be enhanced to extract from funnel data
        currency: funnel.currency || 'BRL',
        targetAudience: aiPageData.targetAudience,
        mainBenefits: [],
        objections: []
      },
      conversionGoal: aiPageData.mainGoal,
      pageType: aiPageData.pageType,
      industry: 'general', // Could be enhanced to detect from product info
      language: funnel.language || 'pt-BR'
    };

    // Generate the page using the full AI orchestrator system
    const aiRequest = {
      funnelId: funnel.id,
      pageId: crypto.randomUUID(),
      operationId: funnel.operationId,
      userId: '4caffecf-9f5a-4c47-bc24-b40ae5686aa6', // TODO: Get from request context
      briefData
    };
    const result = await orchestrator.generatePage(aiRequest);
    
    console.log(`✅ Advanced AI system generated page:
      - Quality Score: ${result.qualityScore}/10
      - Status: ${result.status}
      - Total Cost: $${result.totalCost.toFixed(4)}
    `);

    // Convert the orchestrator result to PageModelV2 format  
    const pageModel = convertToPageModelV2(result.generatedModel, aiPageData);
    
    return pageModel;

  } catch (error) {
    console.error('❌ Advanced AI generation failed, falling back to simple model:', error);
    
    // Fallback to a simple default structure
    return {
      version: 2,
      layout: "single_page",
      sections: [
        {
          id: crypto.randomUUID(),
          type: "hero",
          rows: [
            {
              id: crypto.randomUUID(),
              columns: [
                {
                  id: crypto.randomUUID(),
                  width: "full",
                  elements: [
                    {
                      id: crypto.randomUUID(),
                      type: "heading",
                      props: {
                        text: aiPageData.name,
                        tag: "h1",
                        align: "center"
                      },
                      styles: {
                        fontSize: "3rem",
                        fontWeight: "bold",
                        color: "#1F2937",
                        textAlign: "center",
                        marginBottom: "1rem"
                      }
                    },
                    {
                      id: crypto.randomUUID(),
                      type: "text",
                      props: {
                        content: `Página ${aiPageData.pageType} para ${aiPageData.product} (sistema básico)`,
                        align: "center"
                      },
                      styles: {
                        fontSize: "1.25rem",
                        color: "#6B7280",
                        textAlign: "center",
                        marginBottom: "2rem"
                      }
                    },
                    {
                      id: crypto.randomUUID(),
                      type: "button",
                      props: {
                        text: "Começar Agora",
                        variant: "primary",
                        size: "large"
                      },
                      styles: {
                        backgroundColor: "#3B82F6",
                        color: "#FFFFFF",
                        padding: "1rem 2rem",
                        borderRadius: "0.5rem",
                        fontSize: "1.125rem"
                      }
                    }
                  ],
                  styles: {}
                }
              ],
              styles: {}
            }
          ],
          styles: {
            padding: "4rem 1rem",
            backgroundColor: "#F9FAFB"
          }
        }
      ],
      theme: {
        colors: {
          primary: "#3B82F6",
          secondary: "#1E40AF",
          accent: "#F59E0B",
          background: "#FFFFFF",
          text: "#1F2937",
          muted: "#6B7280"
        },
        fonts: {
          primary: "Inter",
          heading: "Inter"
        },
        spacing: {
          xs: "0.5rem",
          sm: "1rem",
          md: "1.5rem",
          lg: "2rem",
          xl: "3rem"
        }
      },
      seo: {
        title: aiPageData.name,
        description: `${aiPageData.pageType} para ${aiPageData.product}`,
        keywords: [aiPageData.product, aiPageData.pageType]
      }
    };
  }
}

/**
 * Convert orchestrator result to PageModelV2 format
 */
function convertToPageModelV2(finalContent: any, aiPageData: any): any {
  try {
    // If finalContent already has version and sections, use it directly
    if (finalContent.version && finalContent.sections) {
      return finalContent;
    }

    // Otherwise convert from orchestrator format to PageModelV2
    const sections = [];
    
    if (finalContent.sections && Array.isArray(finalContent.sections)) {
      for (const section of finalContent.sections) {
        const pageSection = {
          id: crypto.randomUUID(),
          type: mapSectionType(section.type),
          rows: [
            {
              id: crypto.randomUUID(),
              columns: [
                {
                  id: crypto.randomUUID(),
                  width: "full",
                  elements: convertSectionToElements(section),
                  styles: {}
                }
              ],
              styles: {}
            }
          ],
          styles: section.style || {}
        };
        
        sections.push(pageSection);
      }
    }

    return {
      version: 2,
      layout: "single_page",
      sections: sections.length > 0 ? sections : [createDefaultHeroSection(aiPageData)],
      theme: finalContent.style || getDefaultTheme(),
      seo: finalContent.seo || getDefaultSEO(aiPageData)
    };

  } catch (error) {
    console.error('❌ Error converting to PageModelV2:', error);
    return {
      version: 2,
      layout: "single_page",
      sections: [createDefaultHeroSection(aiPageData)],
      theme: getDefaultTheme(),
      seo: getDefaultSEO(aiPageData)
    };
  }
}

function mapSectionType(type: string): string {
  const typeMap = {
    'hero': 'hero',
    'problema': 'content',
    'solução': 'content',
    'benefícios': 'content',
    'prova-social': 'content',
    'objeções': 'content',
    'cta': 'cta',
    'guarantee': 'content'
  };
  return typeMap[type] || 'content';
}

function convertSectionToElements(section: any): any[] {
  const elements = [];
  
  if (section.content) {
    // Add heading if present (AI generates 'headline')
    if (section.content.headline || section.content.title) {
      elements.push({
        id: crypto.randomUUID(),
        type: "heading",
        props: {
          text: section.content.headline || section.content.title,
          tag: section.type === "hero" ? "h1" : "h2",
          align: "center"
        },
        styles: {
          fontSize: section.type === "hero" ? "3rem" : "2rem",
          fontWeight: "bold",
          color: "#1F2937",
          textAlign: "center",
          marginBottom: "1rem"
        }
      });
    }

    // Add content text (AI generates 'subheadline')
    if (section.content.subheadline || section.content.description || section.content.subtitle) {
      elements.push({
        id: crypto.randomUUID(),
        type: "text",
        props: {
          content: section.content.subheadline || section.content.description || section.content.subtitle,
          align: "center"
        },
        styles: {
          fontSize: "1.125rem",
          lineHeight: "1.6",
          color: "#4B5563",
          textAlign: "center",
          marginBottom: "1.5rem"
        }
      });
    }

    // Add CTA if present (AI generates 'ctaText')
    if (section.content.ctaText || section.content.cta) {
      elements.push({
        id: crypto.randomUUID(),
        type: "button",
        props: {
          text: section.content.ctaText || section.content.cta,
          variant: "primary",
          size: "large"
        },
        styles: {
          backgroundColor: "#FF6B35",
          color: "#FFFFFF",
          padding: "1rem 2rem",
          borderRadius: "0.5rem",
          fontSize: "1.125rem",
          fontWeight: "semibold"
        }
      });
    }

    // Add benefits if present
    if (section.content.benefits && Array.isArray(section.content.benefits)) {
      elements.push({
        id: crypto.randomUUID(),
        type: "benefits",
        props: {
          title: "Benefícios Principais",
          items: section.content.benefits.map(benefit => ({
            icon: "check",
            title: benefit.title || benefit,
            description: benefit.description || ""
          }))
        },
        styles: {
          gap: "1rem",
          textAlign: "center"
        }
      });
    }

    // Add testimonials if present
    if (section.content.testimonials && Array.isArray(section.content.testimonials)) {
      elements.push({
        id: crypto.randomUUID(),
        type: "reviews",
        props: {
          title: "Depoimentos de Clientes",
          testimonials: section.content.testimonials.map(testimonial => ({
            name: testimonial.name || "Cliente Satisfeito",
            text: testimonial.text || testimonial.comment || testimonial,
            rating: testimonial.rating || 5,
            avatar: testimonial.avatar || "",
            location: testimonial.location || "",
            profession: testimonial.profession || ""
          }))
        },
        styles: {
          gap: "1.5rem",
          layout: "grid"
        }
      });
    }
  }

  return elements.length > 0 ? elements : [createDefaultTextElement()];
}

function createDefaultHeroSection(aiPageData: any): any {
  return {
    id: crypto.randomUUID(),
    type: "hero",
    rows: [
      {
        id: crypto.randomUUID(),
        columns: [
          {
            id: crypto.randomUUID(),
            width: "full",
            elements: [
              {
                id: crypto.randomUUID(),
                type: "heading",
                props: {
                  text: aiPageData.name,
                  tag: "h1",
                  align: "center"
                },
                styles: {
                  fontSize: "3rem",
                  fontWeight: "bold",
                  color: "#1F2937",
                  textAlign: "center",
                  marginBottom: "1rem"
                }
              },
              {
                id: crypto.randomUUID(),
                type: "text",
                props: {
                  content: `${aiPageData.pageType} para ${aiPageData.product}`,
                  align: "center"
                },
                styles: {
                  fontSize: "1.25rem",
                  color: "#6B7280",
                  textAlign: "center",
                  marginBottom: "2rem"
                }
              },
              {
                id: crypto.randomUUID(),
                type: "button",
                props: {
                  text: "Começar Agora",
                  variant: "primary",
                  size: "large"
                },
                styles: {
                  backgroundColor: "#FF6B35",
                  color: "#FFFFFF",
                  padding: "1rem 2rem",
                  borderRadius: "0.5rem",
                  fontSize: "1.125rem"
                }
              }
            ],
            styles: {}
          }
        ],
        styles: {}
      }
    ],
    styles: {
      padding: "4rem 1rem",
      backgroundColor: "#F9FAFB"
    }
  };
}

function createDefaultTextElement(): any {
  return {
    id: crypto.randomUUID(),
    type: "text",
    props: {
      content: "Conteúdo gerado pela IA",
      align: "center"
    },
    styles: {
      fontSize: "1.125rem",
      color: "#4B5563",
      textAlign: "center",
      marginBottom: "1rem"
    }
  };
}

function getDefaultTheme(): any {
  return {
    colors: {
      primary: "#FF6B35",
      secondary: "#004E89",
      accent: "#FFC107",
      success: "#28A745",
      danger: "#DC3545",
      background: "#FFFFFF",
      text: "#2C3E50",
      muted: "#6C757D"
    },
    fonts: {
      primary: "Inter",
      heading: "Poppins"
    },
    spacing: {
      xs: "0.5rem",
      sm: "1rem", 
      md: "1.5rem",
      lg: "2rem",
      xl: "3rem"
    }
  };
}

function getDefaultSEO(aiPageData: any): any {
  return {
    title: `${aiPageData.product} - ${aiPageData.name}`,
    description: `${aiPageData.pageType} para ${aiPageData.product}. ${aiPageData.mainGoal}`,
    keywords: [aiPageData.product, aiPageData.pageType, "conversão", "alta performance"]
  };
}

export { router as funnelRoutes };