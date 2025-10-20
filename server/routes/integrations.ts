import { Router, Request, Response } from 'express';
import { db } from '../db';
import { integrationConfigs, insertIntegrationConfigSchema } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { WebhookService } from '../services/webhook-service';
import crypto from 'crypto';

interface AuthRequest extends Request {
  user?: any;
}

export const integrationsRouter = Router();

/**
 * GET /api/integrations/operational-app
 * Get operational app integration config for a specific operation
 */
integrationsRouter.get('/operational-app', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const operationId = req.query.operationId as string;

    if (!operationId) {
      return res.status(400).json({ message: 'operationId é obrigatório' });
    }

    const [config] = await db
      .select({
        id: integrationConfigs.id,
        webhookUrl: integrationConfigs.webhookUrl,
        operationId: integrationConfigs.operationId,
        isActive: integrationConfigs.isActive,
        createdAt: integrationConfigs.createdAt,
        updatedAt: integrationConfigs.updatedAt,
        // Don't expose the secret
      })
      .from(integrationConfigs)
      .where(
        and(
          eq(integrationConfigs.userId, userId),
          eq(integrationConfigs.operationId, operationId),
          eq(integrationConfigs.integrationType, 'operational_app')
        )
      )
      .limit(1);

    if (!config) {
      return res.json({ config: null });
    }

    res.json({ config });
  } catch (error) {
    console.error('Error fetching integration config:', error);
    res.status(500).json({ message: 'Erro ao buscar configuração' });
  }
});

/**
 * POST /api/integrations/operational-app
 * Create or update operational app integration config
 */
integrationsRouter.post('/operational-app', async (req: AuthRequest, res: Response) => {
  console.log('🚀 POST /operational-app route hit!');
  console.log('📦 Request body:', req.body);
  console.log('👤 User:', req.user);
  
  try {
    const userId = req.user!.id;
    const { webhookUrl, webhookSecret, isActive, operationId } = req.body;

    // Validate inputs
    if (!webhookUrl) {
      return res.status(400).json({ message: 'URL do webhook é obrigatória' });
    }

    if (!operationId) {
      return res.status(400).json({ message: 'operationId é obrigatório' });
    }

    // Validate URL format
    try {
      new URL(webhookUrl);
    } catch {
      return res.status(400).json({ message: 'URL inválida' });
    }

    // In production, ensure HTTPS
    if (process.env.NODE_ENV === 'production' && !webhookUrl.startsWith('https://')) {
      return res.status(400).json({ message: 'URL deve usar HTTPS em produção' });
    }

    // Generate secret if not provided
    const secret = webhookSecret || crypto.randomBytes(32).toString('hex');

    // Check if config exists for this operation
    const [existing] = await db
      .select()
      .from(integrationConfigs)
      .where(
        and(
          eq(integrationConfigs.userId, userId),
          eq(integrationConfigs.operationId, operationId),
          eq(integrationConfigs.integrationType, 'operational_app')
        )
      )
      .limit(1);

    if (existing) {
      // Update existing config
      const [updated] = await db
        .update(integrationConfigs)
        .set({
          webhookUrl,
          webhookSecret: secret,
          isActive: isActive ?? existing.isActive,
          updatedAt: new Date(),
        })
        .where(eq(integrationConfigs.id, existing.id))
        .returning({
          id: integrationConfigs.id,
          webhookUrl: integrationConfigs.webhookUrl,
          operationId: integrationConfigs.operationId,
          isActive: integrationConfigs.isActive,
          createdAt: integrationConfigs.createdAt,
          updatedAt: integrationConfigs.updatedAt,
        });

      res.json({ 
        config: updated,
        secret: webhookSecret ? undefined : secret, // Only return secret if auto-generated
      });
    } else {
      // Create new config
      const [created] = await db
        .insert(integrationConfigs)
        .values({
          userId,
          operationId,
          integrationType: 'operational_app',
          webhookUrl,
          webhookSecret: secret,
          isActive: isActive ?? false,
        })
        .returning({
          id: integrationConfigs.id,
          webhookUrl: integrationConfigs.webhookUrl,
          operationId: integrationConfigs.operationId,
          isActive: integrationConfigs.isActive,
          createdAt: integrationConfigs.createdAt,
          updatedAt: integrationConfigs.updatedAt,
        });

      res.json({ 
        config: created,
        secret, // Return the generated secret
      });
    }
  } catch (error) {
    console.error('Error saving integration config:', error);
    res.status(500).json({ message: 'Erro ao salvar configuração' });
  }
});

/**
 * POST /api/integrations/operational-app/test
 * Test webhook connection
 */
integrationsRouter.post('/operational-app/test', async (req: AuthRequest, res: Response) => {
  try {
    const { webhookUrl, webhookSecret } = req.body;

    if (!webhookUrl || !webhookSecret) {
      return res.status(400).json({ message: 'URL e secret são obrigatórios' });
    }

    const result = await WebhookService.testWebhook(webhookUrl, webhookSecret);

    res.json(result);
  } catch (error) {
    console.error('Error testing webhook:', error);
    res.status(500).json({ message: 'Erro ao testar conexão' });
  }
});

/**
 * GET /api/integrations/operational-app/logs
 * Get webhook logs for a specific operation
 */
integrationsRouter.get('/operational-app/logs', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const operationId = req.query.operationId as string;

    if (!operationId) {
      return res.status(400).json({ message: 'operationId é obrigatório' });
    }

    // Get operation's config first
    const [config] = await db
      .select()
      .from(integrationConfigs)
      .where(
        and(
          eq(integrationConfigs.userId, userId),
          eq(integrationConfigs.operationId, operationId),
          eq(integrationConfigs.integrationType, 'operational_app')
        )
      )
      .limit(1);

    if (!config) {
      return res.json({ logs: [] });
    }

    const logs = await WebhookService.getWebhookLogs(config.id, 50);

    res.json({ logs });
  } catch (error) {
    console.error('Error fetching webhook logs:', error);
    res.status(500).json({ message: 'Erro ao buscar logs' });
  }
});
