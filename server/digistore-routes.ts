import { Router, Request, Response } from "express";
import { z } from "zod";
import { DigistoreService, DigistoreCredentials } from "./digistore-service";
import { db } from "./db";
import { digistoreIntegrations, orders } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authenticateToken } from "./auth-middleware";
import { validateOperationAccess } from "./middleware/operation-access";

interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

const router = Router();
const publicRouter = Router(); // Router para rotas públicas (webhooks)

// Schema para validação
const testConnectionSchema = z.object({
  apiKey: z.string().min(1, "API Key é obrigatória"),
});

const saveIntegrationSchema = z.object({
  operationId: z.string().uuid("Operation ID deve ser um UUID válido"),
  apiKey: z.string().min(1, "API Key é obrigatória"),
});

/**
 * Buscar integração Digistore24 por operação
 */
router.get("/digistore", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { operationId } = req.query;

    if (!operationId || typeof operationId !== "string") {
      return res.status(400).json({ error: "Operation ID é obrigatório" });
    }

    console.log(`🔍 Buscando integração Digistore24 para operação: ${operationId}`);

    const [integration] = await db
      .select()
      .from(digistoreIntegrations)
      .where(eq(digistoreIntegrations.operationId, operationId))
      .limit(1);

    if (!integration) {
      return res.status(404).json({ error: "Integração Digistore24 não encontrada" });
    }

    // Não retornar a API key por segurança
    const { apiKey, ...safeIntegration } = integration;

    res.json(safeIntegration);
  } catch (error) {
    console.error("❌ Erro ao buscar integração Digistore24:", error);
    res.status(500).json({ 
      error: "Erro interno do servidor",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Testar conexão com Digistore24
 */
router.post("/digistore/test", authenticateToken, async (req, res) => {
  try {
    const validation = testConnectionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }

    const { apiKey } = validation.data;

    console.log(`🔗 Testando conexão Digistore24`);

    const digistoreService = new DigistoreService({ apiKey });
    const result = await digistoreService.testConnection();

    if (result.success) {
      res.json({
        success: true,
        message: "Conexão com Digistore24 estabelecida com sucesso",
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || "Erro ao conectar com Digistore24"
      });
    }
  } catch (error) {
    console.error("❌ Erro ao testar conexão Digistore24:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Salvar/atualizar integração Digistore24
 */
router.post("/digistore", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const validation = saveIntegrationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }

    const { operationId, apiKey } = validation.data;

    console.log(`💾 Salvando integração Digistore24 para operação: ${operationId}`);

    // Primeiro, testar a conexão
    const digistoreService = new DigistoreService({ apiKey });
    const testResult = await digistoreService.testConnection();

    if (!testResult.success) {
      return res.status(400).json({
        success: false,
        error: testResult.error || "Falha na conexão com Digistore24"
      });
    }

    // Verificar se já existe integração para essa operação
    const [existingIntegration] = await db
      .select()
      .from(digistoreIntegrations)
      .where(eq(digistoreIntegrations.operationId, operationId))
      .limit(1);

    let integration;

    if (existingIntegration) {
      // Atualizar integração existente
      console.log(`🔄 Atualizando integração Digistore24: ${existingIntegration.id}`);
      
      const [updated] = await db
        .update(digistoreIntegrations)
        .set({
          apiKey: apiKey.trim(),
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(digistoreIntegrations.id, existingIntegration.id))
        .returning();

      integration = updated;
    } else {
      // Criar nova integração
      console.log(`✨ Criando nova integração Digistore24 para operação: ${operationId}`);
      
      const [created] = await db
        .insert(digistoreIntegrations)
        .values({
          operationId,
          apiKey: apiKey.trim(),
          status: "active",
        })
        .returning();

      integration = created;
    }

    // Não retornar a API key por segurança
    const { apiKey: _, ...safeIntegration } = integration;

    console.log(`✅ Integração Digistore24 salva com sucesso: ${integration.id}`);

    res.json({
      success: true,
      message: existingIntegration 
        ? "Integração Digistore24 atualizada com sucesso" 
        : "Integração Digistore24 criada com sucesso",
      integration: safeIntegration
    });
  } catch (error) {
    console.error("❌ Erro ao salvar integração Digistore24:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Sincronizar pedidos manualmente
 */
router.post("/digistore/sync", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { operationId } = req.query;

    if (!operationId || typeof operationId !== "string") {
      return res.status(400).json({ error: "Operation ID é obrigatório" });
    }

    console.log(`🔄 Iniciando sincronização manual Digistore24 para operação: ${operationId}`);

    // Buscar integração
    const [integration] = await db
      .select()
      .from(digistoreIntegrations)
      .where(eq(digistoreIntegrations.operationId, operationId))
      .limit(1);

    if (!integration) {
      return res.status(404).json({ error: "Integração Digistore24 não encontrada" });
    }

    if (integration.status !== "active") {
      return res.status(400).json({ 
        error: "Integração não está ativa",
        status: integration.status 
      });
    }

    // Criar serviço e buscar entregas pendentes
    const digistoreService = new DigistoreService({ apiKey: integration.apiKey });
    
    // Buscar entregas dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const deliveries = await digistoreService.listOrders({
      from: thirtyDaysAgo.toISOString().split('T')[0], // YYYY-MM-DD
      type: 'request,in_progress' // Apenas entregas pendentes
    });

    console.log(`📦 ${deliveries.length} entregas pendentes encontradas`);

    // Importar schema
    const { digistoreOrders: digistoreOrdersTable } = await import('@shared/schema');
    const { and } = await import('drizzle-orm');

    // Salvar na staging table
    let created = 0;
    let updated = 0;

    for (const delivery of deliveries) {
      // Usar delivery_id como identificador principal
      const deliveryId = delivery.id?.toString() || delivery.delivery_id?.toString();
      const purchaseId = delivery.purchase_id;

      if (!deliveryId || !purchaseId) {
        console.warn(`⚠️ Entrega sem ID válido, pulando:`, delivery);
        continue;
      }

      const [existing] = await db
        .select()
        .from(digistoreOrdersTable)
        .where(
          and(
            eq(digistoreOrdersTable.integrationId, integration.id),
            eq(digistoreOrdersTable.orderId, deliveryId)
          )
        )
        .limit(1);

      // Extrair dados do endereço de entrega
      const deliveryAddress = delivery.delivery_address || {};
      const recipientName = `${deliveryAddress.first_name || ''} ${deliveryAddress.last_name || ''}`.trim();

      const orderData = {
        integrationId: integration.id,
        orderId: deliveryId, // delivery_id
        transactionId: purchaseId, // purchase_id
        status: delivery.delivery_type || 'request',
        tracking: delivery.tracking?.[0]?.tracking_id || null,
        value: '0', // Digistore24 não retorna valor em listDeliveries
        recipient: {
          name: recipientName || 'N/A',
          email: deliveryAddress.email || '',
          phone: deliveryAddress.phone_no || ''
        },
        items: [],
        rawData: delivery
      };

      if (existing) {
        await db.update(digistoreOrdersTable)
          .set({
            ...orderData,
            processedToOrders: false,
            processedAt: null,
            updatedAt: new Date()
          })
          .where(eq(digistoreOrdersTable.id, existing.id));
        updated++;
      } else {
        await db.insert(digistoreOrdersTable).values({
          ...orderData,
          processedToOrders: false
        });
        created++;
      }
    }

    // Atualizar lastSyncAt
    await db
      .update(digistoreIntegrations)
      .set({
        lastSyncAt: new Date(),
        syncErrors: null,
      })
      .where(eq(digistoreIntegrations.id, integration.id));

    res.json({
      success: true,
      message: `Sincronização concluída. ${created} novos, ${updated} atualizados.`,
      ordersCount: deliveries.length,
      created,
      updated
    });
  } catch (error) {
    console.error("❌ Erro na sincronização Digistore24:", error);
    
    // Registrar erro na integração
    if (req.query.operationId && typeof req.query.operationId === "string") {
      const [integration] = await db
        .select()
        .from(digistoreIntegrations)
        .where(eq(digistoreIntegrations.operationId, req.query.operationId))
        .limit(1);

      if (integration) {
        await db
          .update(digistoreIntegrations)
          .set({
            syncErrors: error instanceof Error ? error.message : "Erro desconhecido",
          })
          .where(eq(digistoreIntegrations.id, integration.id));
      }
    }

    res.status(500).json({
      error: "Erro na sincronização",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Webhook IPN da Digistore24
 * Recebe notificações em tempo real sobre eventos de pedidos
 * NOTA: Esta rota é PÚBLICA e não requer autenticação
 */
publicRouter.post("/digistore/webhook", async (req, res) => {
  try {
    console.log(`📥 Webhook IPN Digistore24 recebido`);
    console.log(`📋 Payload:`, JSON.stringify(req.body, null, 2));

    // Importar webhook service
    const { digistoreWebhookService } = await import('./services/digistore-webhook-service');
    
    // Processar evento IPN
    const result = await digistoreWebhookService.processIPNEvent(req.body);
    
    if (!result.success) {
      console.error(`❌ Erro ao processar webhook Digistore24:`, result.error);
    }

    // Digistore24 espera resposta em texto simples "OK"
    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Erro ao processar webhook Digistore24:", error);
    // Mesmo com erro, retornar OK para não bloquear o webhook
    res.status(200).send("OK");
  }
});

export { router as digistoreRoutes, publicRouter as digistorePublicRoutes };

