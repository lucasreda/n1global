import { Router } from "express";
import { z } from "zod";
import { CartPandaService, CartPandaCredentials } from "./cartpanda-service";
import { db } from "./db";
import { cartpandaIntegrations, orders } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authenticateToken } from "./auth-middleware";
import { validateOperationAccess } from "./middleware/operation-access";

const router = Router();

// Schema para validação
const testConnectionSchema = z.object({
  storeSlug: z.string().min(1, "Store slug é obrigatório"),
  bearerToken: z.string().min(1, "Bearer token é obrigatório"),
});

const saveIntegrationSchema = z.object({
  operationId: z.string().uuid("Operation ID deve ser um UUID válido"),
  storeSlug: z.string().min(1, "Store slug é obrigatório"),
  bearerToken: z.string().min(1, "Bearer token é obrigatório"),
});

/**
 * Buscar integração CartPanda por operação
 */
router.get("/cartpanda", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { operationId } = req.query;

    if (!operationId || typeof operationId !== "string") {
      return res.status(400).json({ error: "Operation ID é obrigatório" });
    }

    console.log(`🔍 Buscando integração CartPanda para operação: ${operationId}`);

    const [integration] = await db
      .select()
      .from(cartpandaIntegrations)
      .where(eq(cartpandaIntegrations.operationId, operationId))
      .limit(1);

    if (!integration) {
      return res.status(404).json({ error: "Integração CartPanda não encontrada" });
    }

    // Não retornar o token por segurança
    const { bearerToken, ...safeIntegration } = integration;

    res.json(safeIntegration);
  } catch (error) {
    console.error("❌ Erro ao buscar integração CartPanda:", error);
    res.status(500).json({ 
      error: "Erro interno do servidor",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Testar conexão com CartPanda
 */
router.post("/cartpanda/test", authenticateToken, async (req, res) => {
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

    const { storeSlug, bearerToken } = validation.data;

    console.log(`🔗 Testando conexão CartPanda: ${storeSlug}`);

    const cartpandaService = new CartPandaService({ storeSlug, bearerToken });
    const result = await cartpandaService.testConnection();

    if (result.success) {
      res.json({
        success: true,
        message: "Conexão com CartPanda estabelecida com sucesso",
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || "Erro ao conectar com CartPanda"
      });
    }
  } catch (error) {
    console.error("❌ Erro ao testar conexão CartPanda:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Salvar/atualizar integração CartPanda
 */
router.post("/cartpanda", authenticateToken, validateOperationAccess, async (req, res) => {
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

    const { operationId, storeSlug, bearerToken } = validation.data;

    console.log(`💾 Salvando integração CartPanda para operação: ${operationId}`);

    // Primeiro, testar a conexão
    const cartpandaService = new CartPandaService({ storeSlug, bearerToken });
    const testResult = await cartpandaService.testConnection();

    if (!testResult.success) {
      return res.status(400).json({
        success: false,
        error: testResult.error || "Falha na conexão com CartPanda"
      });
    }

    // Verificar se já existe integração para essa operação
    const [existingIntegration] = await db
      .select()
      .from(cartpandaIntegrations)
      .where(eq(cartpandaIntegrations.operationId, operationId))
      .limit(1);

    let integration;

    if (existingIntegration) {
      // Atualizar integração existente
      console.log(`🔄 Atualizando integração CartPanda: ${existingIntegration.id}`);
      
      [integration] = await db
        .update(cartpandaIntegrations)
        .set({
          storeSlug,
          bearerToken,
          status: "active",
          lastSyncAt: null, // Reset last sync since credentials changed
          syncErrors: null,
          metadata: {
            storeUrl: `https://${storeSlug}.mycartpanda.com`
          },
          updatedAt: new Date()
        })
        .where(eq(cartpandaIntegrations.id, existingIntegration.id))
        .returning();
    } else {
      // Criar nova integração
      console.log(`➕ Criando nova integração CartPanda para: ${operationId}`);
      
      [integration] = await db
        .insert(cartpandaIntegrations)
        .values({
          operationId,
          storeSlug,
          bearerToken,
          status: "active",
          metadata: {
            storeUrl: `https://${storeSlug}.mycartpanda.com`
          }
        })
        .returning();
    }

    // Não retornar o token por segurança
    const { bearerToken: _, ...safeIntegration } = integration;

    res.json({
      success: true,
      message: existingIntegration ? "Integração CartPanda atualizada com sucesso" : "Integração CartPanda criada com sucesso",
      integration: safeIntegration
    });

  } catch (error) {
    console.error("❌ Erro ao salvar integração CartPanda:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Sincronizar pedidos da CartPanda
 */
router.post("/cartpanda/sync", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { operationId } = req.query;

    if (!operationId || typeof operationId !== "string") {
      return res.status(400).json({ error: "Operation ID é obrigatório" });
    }

    console.log(`🔄 Iniciando sincronização CartPanda para operação: ${operationId}`);

    // Buscar integração
    const [integration] = await db
      .select()
      .from(cartpandaIntegrations)
      .where(eq(cartpandaIntegrations.operationId, operationId))
      .limit(1);

    if (!integration) {
      return res.status(404).json({ error: "Integração CartPanda não encontrada" });
    }

    if (integration.status !== "active") {
      return res.status(400).json({ error: "Integração CartPanda não está ativa" });
    }

    // Criar serviço CartPanda
    const cartpandaService = new CartPandaService({
      storeSlug: integration.storeSlug,
      bearerToken: integration.bearerToken
    });

    // Buscar TODOS os pedidos sem filtro de data
    console.log('🔍 Testando sem filtro de data...');
    const cartpandaOrders = await cartpandaService.listOrders({
      limit: 100
      // Removendo filtro de data para testar
    });

    console.log(`📊 ${cartpandaOrders.length} pedidos encontrados na CartPanda`);

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // Importar pedidos para a tabela orders
    for (const cartpandaOrder of cartpandaOrders) {
      try {
        // Verificar se o pedido já existe
        const existingOrder = await db
          .select()
          .from(orders)
          .where(eq(orders.id, `cartpanda_${cartpandaOrder.id}`))
          .limit(1);

        const orderData = {
          id: `cartpanda_${cartpandaOrder.id}`,
          storeId: '4a4377cc-38ed-44d2-a925-cd043c63fc31', // default store ID
          operationId: operationId,
          dataSource: 'cartpanda',
          
          // Customer information
          customerId: cartpandaOrder.customer?.id?.toString() || null,
          customerName: cartpandaOrder.customer ? `${cartpandaOrder.customer.first_name || ''} ${cartpandaOrder.customer.last_name || ''}`.trim() || 'Cliente CartPanda' : 'Cliente CartPanda',
          customerEmail: cartpandaOrder.email || cartpandaOrder.customer?.email || null,
          customerPhone: cartpandaOrder.customer?.phone || null,
          customerAddress: cartpandaOrder.billing_address ? JSON.stringify(cartpandaOrder.billing_address) : null,
          customerCity: null, // Extrair da billing_address se necessário
          customerState: null, // Extrair da billing_address se necessário
          customerCountry: null, // Extrair da billing_address se necessário 
          customerZip: null, // Extrair da billing_address se necessário
          
          // Order details
          status: mapCartPandaStatus(cartpandaOrder.status || 'pending'),
          paymentStatus: mapCartPandaPaymentStatus((cartpandaOrder as any).payment_status || 'unpaid'),
          paymentMethod: (cartpandaOrder as any).payment_method || 'unknown',
          
          // Financial
          total: (cartpandaOrder as any).total || (cartpandaOrder as any).total_price || '0.00',
          currency: (cartpandaOrder as any).currency || 'BRL',
          
          // Products
          products: (cartpandaOrder as any).items || (cartpandaOrder as any).line_items || [],
          
          // Provider
          provider: 'cartpanda',
          providerOrderId: cartpandaOrder.id?.toString(),
          
          // Timestamps
          orderDate: new Date(cartpandaOrder.created_at || Date.now()),
          lastStatusUpdate: new Date(cartpandaOrder.updated_at || Date.now()),
          
          // Store complete CartPanda data
          providerData: cartpandaOrder,
          
          // Standard timestamps
          createdAt: new Date(),
          updatedAt: new Date()
        };

        if (existingOrder.length > 0) {
          // Atualizar pedido existente
          await db
            .update(orders)
            .set({
              ...orderData,
              updatedAt: new Date()
            })
            .where(eq(orders.id, `cartpanda_${cartpandaOrder.id}`));
          updatedCount++;
          console.log(`🔄 Pedido atualizado: ${cartpandaOrder.id}`);
        } else {
          // Criar novo pedido
          await db.insert(orders).values(orderData);
          importedCount++;
          console.log(`✅ Pedido importado: ${cartpandaOrder.id}`);
        }

      } catch (error) {
        console.error(`❌ Erro ao importar pedido ${cartpandaOrder.id}:`, error);
        skippedCount++;
      }
    }

    console.log(`🎯 Importação concluída: ${importedCount} novos, ${updatedCount} atualizados, ${skippedCount} erros`);

    // Atualizar timestamp da última sincronização
    await db
      .update(cartpandaIntegrations)
      .set({
        lastSyncAt: new Date(),
        syncErrors: null,
        updatedAt: new Date()
      })
      .where(eq(cartpandaIntegrations.id, integration.id));

    res.json({
      success: true,
      message: `Sincronização concluída: ${importedCount} novos, ${updatedCount} atualizados, ${skippedCount} erros`,
      data: {
        ordersCount: cartpandaOrders.length,
        importedCount,
        updatedCount, 
        skippedCount,
        syncedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("❌ Erro na sincronização CartPanda:", error);

    // Registrar erro na integração
    if (req.query.operationId) {
      try {
        await db
          .update(cartpandaIntegrations)
          .set({
            syncErrors: error instanceof Error ? error.message : "Erro desconhecido",
            updatedAt: new Date()
          })
          .where(eq(cartpandaIntegrations.operationId, req.query.operationId as string));
      } catch (updateError) {
        console.error("❌ Erro ao atualizar status de erro:", updateError);
      }
    }

    res.status(500).json({
      error: "Erro na sincronização",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Buscar pedidos da CartPanda (para interface)
 */
router.get("/cartpanda/orders", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { operationId, limit = "50" } = req.query;

    if (!operationId || typeof operationId !== "string") {
      return res.status(400).json({ error: "Operation ID é obrigatório" });
    }

    // Buscar integração
    const [integration] = await db
      .select()
      .from(cartpandaIntegrations)
      .where(eq(cartpandaIntegrations.operationId, operationId))
      .limit(1);

    if (!integration) {
      return res.status(404).json({ error: "Integração CartPanda não encontrada" });
    }

    if (integration.status !== "active") {
      return res.status(400).json({ error: "Integração CartPanda não está ativa" });
    }

    // Criar serviço CartPanda
    const cartpandaService = new CartPandaService({
      storeSlug: integration.storeSlug,
      bearerToken: integration.bearerToken
    });

    const orders = await cartpandaService.listOrders({
      limit: parseInt(limit as string, 10)
    });

    res.json({
      success: true,
      orders,
      count: orders.length
    });

  } catch (error) {
    console.error("❌ Erro ao buscar pedidos CartPanda:", error);
    res.status(500).json({
      error: "Erro ao buscar pedidos",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Buscar detalhes de um pedido específico
 */
router.get("/cartpanda/orders/:orderId", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { operationId } = req.query;
    const { orderId } = req.params;

    if (!operationId || typeof operationId !== "string") {
      return res.status(400).json({ error: "Operation ID é obrigatório" });
    }

    // Buscar integração
    const [integration] = await db
      .select()
      .from(cartpandaIntegrations)
      .where(eq(cartpandaIntegrations.operationId, operationId))
      .limit(1);

    if (!integration) {
      return res.status(404).json({ error: "Integração CartPanda não encontrada" });
    }

    if (integration.status !== "active") {
      return res.status(400).json({ error: "Integração CartPanda não está ativa" });
    }

    // Criar serviço CartPanda
    const cartpandaService = new CartPandaService({
      storeSlug: integration.storeSlug,
      bearerToken: integration.bearerToken
    });

    const order = await cartpandaService.getOrder(orderId);

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error("❌ Erro ao buscar pedido CartPanda:", error);
    res.status(500).json({
      error: "Erro ao buscar pedido",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Criar fulfillment para um pedido
 */
router.post("/cartpanda/fulfillments", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { operationId } = req.query;
    const fulfillmentData = req.body;

    if (!operationId || typeof operationId !== "string") {
      return res.status(400).json({ error: "Operation ID é obrigatório" });
    }

    // Validar dados do fulfillment
    const fulfillmentSchema = z.object({
      order_id: z.string().min(1, "Order ID é obrigatório"),
      tracking_company: z.string().min(1, "Transportadora é obrigatória"),
      tracking_number: z.string().min(1, "Código de rastreamento é obrigatório"),
      tracking_url: z.string().url().optional(),
      line_items: z.array(z.object({
        variant_id: z.number(),
        quantity: z.number().min(1)
      })).min(1, "Itens são obrigatórios")
    });

    const validation = fulfillmentSchema.safeParse(fulfillmentData);
    if (!validation.success) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }

    // Buscar integração
    const [integration] = await db
      .select()
      .from(cartpandaIntegrations)
      .where(eq(cartpandaIntegrations.operationId, operationId))
      .limit(1);

    if (!integration) {
      return res.status(404).json({ error: "Integração CartPanda não encontrada" });
    }

    if (integration.status !== "active") {
      return res.status(400).json({ error: "Integração CartPanda não está ativa" });
    }

    // Criar serviço CartPanda
    const cartpandaService = new CartPandaService({
      storeSlug: integration.storeSlug,
      bearerToken: integration.bearerToken
    });

    const fulfillment = await cartpandaService.createFulfillment(validation.data);

    res.json({
      success: true,
      fulfillment
    });

  } catch (error) {
    console.error("❌ Erro ao criar fulfillment CartPanda:", error);
    res.status(500).json({
      error: "Erro ao criar fulfillment",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Atualizar fulfillment
 */
router.put("/cartpanda/fulfillments/:fulfillmentId", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { operationId } = req.query;
    const { fulfillmentId } = req.params;
    const updateData = req.body;

    if (!operationId || typeof operationId !== "string") {
      return res.status(400).json({ error: "Operation ID é obrigatório" });
    }

    // Validar dados de atualização
    const updateSchema = z.object({
      tracking_company: z.string().optional(),
      tracking_number: z.string().optional(),
      tracking_url: z.string().url().optional()
    });

    const validation = updateSchema.safeParse(updateData);
    if (!validation.success) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }

    // Buscar integração
    const [integration] = await db
      .select()
      .from(cartpandaIntegrations)
      .where(eq(cartpandaIntegrations.operationId, operationId))
      .limit(1);

    if (!integration) {
      return res.status(404).json({ error: "Integração CartPanda não encontrada" });
    }

    if (integration.status !== "active") {
      return res.status(400).json({ error: "Integração CartPanda não está ativa" });
    }

    // Criar serviço CartPanda
    const cartpandaService = new CartPandaService({
      storeSlug: integration.storeSlug,
      bearerToken: integration.bearerToken
    });

    const fulfillment = await cartpandaService.updateFulfillment(fulfillmentId, validation.data);

    res.json({
      success: true,
      fulfillment
    });

  } catch (error) {
    console.error("❌ Erro ao atualizar fulfillment CartPanda:", error);
    res.status(500).json({
      error: "Erro ao atualizar fulfillment",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Listar fulfillments
 */
router.get("/cartpanda/fulfillments", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { operationId, order_id } = req.query;

    if (!operationId || typeof operationId !== "string") {
      return res.status(400).json({ error: "Operation ID é obrigatório" });
    }

    // Buscar integração
    const [integration] = await db
      .select()
      .from(cartpandaIntegrations)
      .where(eq(cartpandaIntegrations.operationId, operationId))
      .limit(1);

    if (!integration) {
      return res.status(404).json({ error: "Integração CartPanda não encontrada" });
    }

    if (integration.status !== "active") {
      return res.status(400).json({ error: "Integração CartPanda não está ativa" });
    }

    // Criar serviço CartPanda
    const cartpandaService = new CartPandaService({
      storeSlug: integration.storeSlug,
      bearerToken: integration.bearerToken
    });

    const fulfillments = await cartpandaService.listFulfillments(order_id as string);

    res.json({
      success: true,
      fulfillments,
      count: fulfillments.length
    });

  } catch (error) {
    console.error("❌ Erro ao listar fulfillments CartPanda:", error);
    res.status(500).json({
      error: "Erro ao listar fulfillments",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Mapear status do CartPanda para status interno
 */
function mapCartPandaStatus(cartpandaStatus: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'pending',
    'confirmed': 'confirmed', 
    'processing': 'confirmed',
    'shipped': 'shipped',
    'delivered': 'delivered',
    'cancelled': 'cancelled',
    'refunded': 'cancelled',
    'fulfilled': 'delivered'
  };
  
  return statusMap[cartpandaStatus?.toLowerCase()] || 'pending';
}

/**
 * Mapear status de pagamento do CartPanda para status interno
 */
function mapCartPandaPaymentStatus(financialStatus: string): string {
  const paymentMap: Record<string, string> = {
    'paid': 'paid',
    'pending': 'unpaid',
    'refunded': 'refunded',
    'partially_refunded': 'paid',
    'unpaid': 'unpaid'
  };
  
  return paymentMap[financialStatus?.toLowerCase()] || 'unpaid';
}

export { router as cartpandaRoutes };