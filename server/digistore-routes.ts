import { Router, Request, Response } from "express";
import { z } from "zod";
import { DigistoreService, DigistoreCredentials } from "./digistore-service";
import { db } from "./db";
import { digistoreIntegrations, orders } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authenticateToken } from "./auth-middleware";
import { validateOperationAccess } from "./middleware/operation-access";
import { digistoreFulfillmentService } from "./services/digistore-fulfillment-service";

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
    const { operationId, customOrderId } = req.query;

    if (!operationId || typeof operationId !== "string") {
      return res.status(400).json({ error: "Operation ID é obrigatório" });
    }

    const timestamp = Date.now();
    const rawCustomId =
      typeof customOrderId === "string" ? customOrderId.trim() : "";
    const orderId = rawCustomId.length > 0 ? rawCustomId : `TEST-${timestamp}`;
    const urlSafeOrderId =
      orderId.replace(/[^a-zA-Z0-9_-]/g, "-") || `TEST-${timestamp}`;
    const paymentId =
      rawCustomId.length > 0
        ? `PAYID-${urlSafeOrderId}`
        : `PAYID-TEST-${timestamp}`;
    const transactionId =
      rawCustomId.length > 0 ? `${urlSafeOrderId}-${timestamp}` : `${timestamp}`;
    const orderSlug =
      rawCustomId.length > 0 ? urlSafeOrderId : `TEST${timestamp}`;

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

    const timestamp = Date.now();
    const customOrderId =
      typeof req.query.customOrderId === "string"
        ? req.query.customOrderId.trim()
        : "";
    const orderId = customOrderId.length > 0 ? customOrderId : `TEST-${timestamp}`;
    const orderSlug =
      orderId.replace(/[^a-zA-Z0-9_-]/g, "-") || `TEST${timestamp}`;
    const paymentId =
      customOrderId.length > 0
        ? `PAYID-${orderSlug}`
        : `PAYID-TEST-${timestamp}`;
    const transactionId =
      customOrderId.length > 0 ? `${orderSlug}-${timestamp}` : `${timestamp}`;

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
 * Rota de teste - Simula recebimento de webhook IPN
 * TEMPORÁRIA - apenas para desenvolvimento/debug
 */
router.post("/digistore/test-webhook", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { operationId } = req.query;

    if (!operationId || typeof operationId !== "string") {
      return res.status(400).json({ error: "Operation ID é obrigatório" });
    }

    const timestamp = Date.now();
    const rawCustomOrderId =
      typeof req.query.customOrderId === "string"
        ? req.query.customOrderId.trim()
        : "";
    const orderId =
      rawCustomOrderId.length > 0 ? rawCustomOrderId : `TEST-${timestamp}`;
    const orderSlug =
      orderId.replace(/[^a-zA-Z0-9_-]/g, "-") || `TEST${timestamp}`;
    const paymentId =
      rawCustomOrderId.length > 0
        ? `PAYID-${orderSlug}`
        : `PAYID-TEST-${timestamp}`;
    const transactionId =
      rawCustomOrderId.length > 0 ? `${orderSlug}-${timestamp}` : `${timestamp}`;

    console.log(`🧪 [TEST] Simulando webhook IPN Digistore24 para operação: ${operationId}`);

    // Payload de teste idêntico ao webhook real
    const testPayload = {
      add_url: `https://www.checkout-ds24.com/order/add/${orderSlug}/3KTP6LRQ`,
      address_city: "New York",
      address_company: "",
      address_country: "US",
      address_country_name: "United States",
      address_first_name: "Jeremias",
      address_id: "42780891",
      address_last_name: "Thompson",
      address_mobile_no: "",
      address_phone_no: "+138938383",
      address_salutation: "",
      address_salutation_name: "",
      address_state: "NY",
      address_street: "200 East 20th Street",
      address_street2: "",
      address_street_name: "East 20th Street",
      address_street_number: "200",
      address_tax_id: "",
      address_title: "",
      address_zipcode: "10003",
      affiliate_id: "",
      affiliate_name: "",
      amount: "10.89",
      amount_affiliate: "0.00",
      amount_brutto: "10.89",
      amount_credited: "0.00",
      amount_fee: "0.00",
      amount_main_affiliate: "0.00",
      amount_netto: "10.00",
      amount_partner: "0.00",
      amount_payout: "8.14",
      amount_provider: "1.86",
      amount_vat: "0.89",
      amount_vendor: "8.14",
      api_mode: "test",
      billing_city: "New York",
      billing_company: "",
      billing_country: "US",
      billing_descriptor: "",
      billing_first_name: "Jeremias",
      billing_id: "42780891",
      billing_last_name: "Thompson",
      billing_mobile_no: "",
      billing_phone_no: "+138938383",
      billing_salutation: "",
      billing_salutation_name: "",
      billing_state: "NY",
      billing_status: "completed",
      billing_street: "200 East 20th Street",
      billing_street2: "",
      billing_street_name: "East 20th Street",
      billing_street_number: "200",
      billing_tax_id: "",
      billing_title: "",
      billing_type: "single_payment",
      billing_zipcode: "10003",
      buyer_address_city: "New York",
      buyer_address_company: "",
      buyer_address_country: "US",
      buyer_address_id: "42780891",
      buyer_address_mobile_no: "",
      buyer_address_phone_no: "+138938383",
      buyer_address_state: "NY",
      buyer_address_street: "200 East 20th Street",
      buyer_address_street2: "",
      buyer_address_tax_id: "",
      buyer_address_zipcode: "10003",
      buyer_email: "test@example.com",
      buyer_first_name: "Jeremias",
      buyer_id: "35994875",
      buyer_language: "en",
      buyer_last_name: "Thompson",
      campaignkey: "",
      click_id: "",
      country: "US",
      currency: "USD",
      custom: "",
      custom_key: "35994875-TEST",
      customer_affiliate_name: "user35994875",
      customer_affiliate_promo_url: "https://www.checkout-ds24.com/redir/646570/user35994875/",
      email: "test@example.com",
      event: "on_payment",
      event_label: "Pagamento",
      first_amount: "10.89",
      first_vat_amount: "0.89",
      function_call: "on_payment",
      has_custom_forms: "N",
      image_url: "/pb/img/merchant_4335044/image/product/711GIGM8.png",
      invoice_url: `https://www.digistore24.com/invoice/${orderSlug}/102999804/S2Y2RSUQ.pdf`,
      ipn_config_id: "293127",
      ipn_config_product_ids: "all",
      ipn_version: "1.6",
      is_gdpr_country: "N",
      is_payment_planned: "N",
      item_count: "1",
      language: "en",
      language_name: "Inglês",
      license_accessdata_keys: "",
      merchant_id: "4335044",
      merchant_name: "LUKERED",
      monthly_amount: "0.00",
      monthly_vat_amount: "0.00",
      newsletter_choice: "none",
      newsletter_choice_msg: "Sem indicação",
      number_of_installments: "1",
      order_date: new Date().toISOString().split('T')[0],
      order_date_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
      order_details_url: `https://www.digistore24-app.com/vendor/reports/transactions/order/${orderSlug}`,
      order_id: orderId,
      order_item_id: "66384497",
      order_time: new Date().toTimeString().substring(0, 8),
      order_type: "regular",
      orderform_id: "220953",
      other_amounts: "0.00",
      other_vat_amounts: "0.00",
      parent_transaction_id: "102999802",
      pay_method: "test",
      pay_sequence_no: "0",
      payment_id: paymentId,
      payplan_id: "1328818",
      product_amount: "10.89",
      product_delivery_type: "shipping",
      product_id: "646570",
      product_language: "en",
      product_name: "Black Cotton T-Shirt (TEST)",
      product_name_intern: "Black Cotton T-Shirt (TEST)",
      product_netto_amount: "10",
      product_shipping_amount: "0",
      product_txn_amount: "10.89",
      product_txn_netto_amount: "10",
      product_txn_shipping: "0",
      product_txn_vat_amount: "0.89",
      product_vat_amount: "0.89",
      purchase_key: "3KTP6LRQ",
      quantity: "1",
      rebill_stop_noted_at: "",
      rebilling_stop_url: "",
      receipt_url: `https://www.checkout-ds24.com/receipt/646570/${orderSlug}/3KTP6LRQ`,
      refund_days: "60",
      renew_url: `https://www.checkout-ds24.com/renew/${orderSlug}/3KTP6LRQ`,
      request_refund_url: `https://www.digistore24.com/order/cancel/${orderSlug}/XQ466QEY`,
      salesteam_id: "",
      salesteam_name: "",
      sha_sign: "no_signature_passphrase_provided",
      store_url: "https://awesometshirts.store/",
      support_url: `https://www.digistore24.com/support/${orderSlug}/3KTP6LRQ`,
      switch_pay_interval_url: `https://www.checkout-ds24.com/order/switch/${orderSlug}/3KTP6LRQ`,
      tag: "blacktshirt",
      tags: "blacktshirt",
      trackingkey: "",
      transaction_amount: "10.89",
      transaction_currency: "USD",
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_id: transactionId,
      transaction_time: new Date().toTimeString().substring(0, 8),
      transaction_type: "payment",
      transaction_vat_amount: "0.89",
      upgrade_key: "RKTpojTwBbUY",
      upsell_no: "0",
      upsell_path: "",
      vat_amount: "0.89",
      vat_rate: "8.90",
      voucher_code: ""
    };

    // Importar webhook service e processar
    const { digistoreWebhookService } = await import('./services/digistore-webhook-service');
    
    console.log(`🧪 [TEST] Processando payload de teste...`);
    const result = await digistoreWebhookService.processIPNEvent(testPayload, operationId);
    
    if (result.success) {
      console.log(`✅ [TEST] Webhook de teste processado com sucesso`);
      res.json({
        success: true,
        message: "Webhook de teste processado com sucesso",
        orderId: testPayload.order_id
      });
    } else {
      console.error(`❌ [TEST] Erro ao processar webhook de teste:`, result.error);
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error("❌ [TEST] Erro ao simular webhook:", error);
    res.status(500).json({
      error: "Erro ao simular webhook",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

/**
 * Rota de teste para enviar tracking number à Digistore24
 * TEMPORÁRIA - apenas para validação manual
 */
router.post("/digistore/test-tracking", authenticateToken, validateOperationAccess, async (req, res) => {
  try {
    const { operationId } = req.query;
    const { orderId } = req.body ?? {};

    if (!operationId || typeof operationId !== "string") {
      return res.status(400).json({ error: "Operation ID é obrigatório" });
    }

    if (!orderId || typeof orderId !== "string") {
      return res.status(400).json({ error: "orderId é obrigatório" });
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    if (order.operationId !== operationId) {
      return res.status(403).json({ error: "Pedido não pertence a esta operação" });
    }

    if (order.dataSource !== "digistore24" || !order.digistoreOrderId) {
      return res.status(400).json({ error: "Pedido não é da Digistore24" });
    }

    const trackingNumber = `DS24${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const trackingUrl = `https://tracking.n1global.app/${trackingNumber}`;

    const result = await digistoreFulfillmentService.updateDeliveryStatus(
      orderId,
      "shipped",
      trackingNumber,
      trackingUrl,
      "Teste-Digistore24"
    );

    if (!result.success) {
      return res.status(502).json({
        error: "Falha ao enviar tracking para Digistore24",
        details: result.error || "Erro desconhecido"
      });
    }

    res.json({
      success: true,
      trackingNumber,
      trackingUrl,
      message: "Tracking de teste enviado para Digistore24."
    });
  } catch (error) {
    console.error("❌ Erro ao enviar tracking de teste Digistore24:", error);
    res.status(500).json({
      error: "Erro interno ao enviar tracking",
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

