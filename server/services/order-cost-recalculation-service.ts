/**
 * Serviço para recalcular custos de pedidos quando produtos são vinculados
 */

import { db } from '../db';
import { orders } from '@shared/schema';
import { eq, and, sql, or, like } from 'drizzle-orm';
import { extractAllSkusFromProducts } from '../utils/sku-parser';

/**
 * Recalcula custos de todos os pedidos existentes que contêm um SKU específico
 * @param sku - SKU do produto vinculado
 * @param storeId - ID da loja
 * @param operationId - ID da operação
 * @returns Quantidade de pedidos atualizados
 */
export async function recalculateOrderCostsForSku(
  sku: string,
  storeId: string,
  operationId: string
): Promise<number> {
  try {
    // Normalizar SKU para minúsculas antes de buscar
    const { normalizeSku } = await import('../utils/sku-parser');
    const normalizedSku = normalizeSku(sku);
    
    console.log(`🔄 Recalculando custos de pedidos para SKU "${sku}" (normalizado: "${normalizedSku}") na operação ${operationId}...`);
    
    const { pool } = await import("../db");
    
    // Buscar todos os pedidos da operação que contêm o SKU
    // O SKU pode estar:
    // 1. Diretamente no campo products como array JSONB com objetos que têm "sku"
    // 2. Em SKUs concatenados (ex: "sku1+sku2+sku3")
    // Precisamos buscar pedidos onde o SKU aparece em qualquer lugar do JSONB products
    // Usar LOWER() para comparação case-insensitive
    
    // Buscar pedidos que contêm o SKU no campo products (JSONB array)
    // O SKU pode estar:
    // 1. Diretamente: {"sku": "valor"}
    // 2. Concatenado: {"sku": "valor+outro"} ou {"sku": "outro+valor"}
    
    // Escape do SKU normalizado para uso em LIKE (escape % e _ para evitar problemas)
    const escapedSku = normalizedSku.replace(/%/g, '\\%').replace(/_/g, '\\_').replace(/'/g, "''");
    
    // Usar LOWER() na comparação para case-insensitive
    const ordersResult = await pool.query(`
      SELECT 
        id,
        status,
        total,
        products,
        product_cost,
        shipping_cost,
        operation_id
      FROM orders
      WHERE operation_id = $1
        AND products IS NOT NULL
        AND jsonb_typeof(products) = 'array'
        AND (
          -- Buscar em cada elemento do array JSONB (case-insensitive)
          -- SKU exato: "sku":"valor" (com ou sem aspas duplas)
          LOWER(products::text) LIKE $2
          OR LOWER(products::text) LIKE $3
          -- SKU concatenado: "sku":"valor+outro" ou "sku":"outro+valor"
          OR LOWER(products::text) LIKE $4
          OR LOWER(products::text) LIKE $5
          -- SKU no início de string concatenada (caso tenha espaço)
          OR LOWER(products::text) LIKE $6
        )
    `, [
      operationId,
      `%"sku":"${escapedSku}"%`,              // SKU exato com aspas duplas (já normalizado)
      `%"sku": "${escapedSku}"%`,             // SKU exato com espaço (já normalizado)
      `%"sku":"${escapedSku}+%`,              // SKU no início de concatenado (já normalizado)
      `%+${escapedSku}"%`,                    // SKU no meio/fim de concatenado (já normalizado)
      `%"sku": "${escapedSku}+%`,             // SKU no início de concatenado com espaço (já normalizado)
    ]);

    const ordersToUpdate = ordersResult.rows;
    
    if (ordersToUpdate.length === 0) {
      console.log(`ℹ️ Nenhum pedido encontrado com SKU "${sku}" na operação ${operationId}`);
      return 0;
    }

    console.log(`📦 Encontrados ${ordersToUpdate.length} pedido(s) com SKU "${sku}" para recalcular custos`);

    let updatedCount = 0;

    // Para cada pedido, recalcular custos
    for (const order of ordersToUpdate) {
      try {
        const products = order.products || [];
        
        if (!Array.isArray(products) || products.length === 0) {
          console.warn(`⚠️ Pedido ${order.id} não tem produtos válidos, pulando...`);
          continue;
        }

        // Extrair todos os SKUs do pedido (incluindo concatenados)
        // extractAllSkusFromProducts já normaliza para minúsculas
        const allSkus = extractAllSkusFromProducts(products);
        
        if (allSkus.length === 0) {
          console.warn(`⚠️ Pedido ${order.id} não tem SKUs válidos, pulando...`);
          continue;
        }

        // Calcular custos usando a mesma lógica do smart-sync-service
        let totalProductCostBase = 0;
        let totalShippingCostBase = 0;

        for (const orderSku of allSkus) {
          // orderSku já está normalizado em minúsculas por extractAllSkusFromProducts
          // Busca custos customizados do produto primeiro (user_products)
          // Usar LOWER() para comparação case-insensitive
          const customCostsResult = await pool.query(`
            SELECT 
              up.custom_cost_price,
              up.custom_shipping_cost,
              p.cost_price,
              p.shipping_cost
            FROM user_products up
            JOIN products p ON up.product_id = p.id
            WHERE LOWER(up.sku) = $1 AND up.store_id = $2 AND up.is_active = true
            LIMIT 1
          `, [orderSku, storeId]);

          let productCostBase = 0;
          let shippingCostBase = 0;

          if (customCostsResult.rows.length > 0) {
            const costs = customCostsResult.rows[0];
            // Usa custo customizado se disponível, senão usa o custo padrão do produto
            productCostBase = parseFloat(costs.custom_cost_price) || parseFloat(costs.cost_price) || 0;
            shippingCostBase = parseFloat(costs.custom_shipping_cost) || parseFloat(costs.shipping_cost) || 0;
            totalProductCostBase += productCostBase;
            totalShippingCostBase += shippingCostBase;
          } else {
            // Fallback: busca diretamente na tabela products
            // Usar LOWER() para comparação case-insensitive
            const productResult = await pool.query(`
              SELECT cost_price, shipping_cost
              FROM products 
              WHERE LOWER(sku) = $1 AND store_id = $2 
              LIMIT 1
            `, [orderSku, storeId]);

            if (productResult.rows.length > 0) {
              const costs = productResult.rows[0];
              productCostBase = parseFloat(costs.cost_price) || 0;
              shippingCostBase = parseFloat(costs.shipping_cost) || 0;
              totalProductCostBase += productCostBase;
              totalShippingCostBase += shippingCostBase;
            }
          }
        }

        // Aplica custos baseado no status do pedido (mesma lógica do smart-sync-service)
        const status = order.status?.toLowerCase() || '';
        const productCost = ['confirmed', 'delivered', 'shipped', 'in transit', 'in delivery', 'pending'].includes(status) ?
          totalProductCostBase : 0.00;
        
        const shippingCost = ['shipped', 'delivered', 'in transit', 'in delivery', 'pending'].includes(status) ?
          totalShippingCostBase : 0.00;

        // Verificar se os custos mudaram antes de atualizar (evita updates desnecessários)
        const currentProductCost = parseFloat(order.product_cost || '0') || 0;
        const currentShippingCost = parseFloat(order.shipping_cost || '0') || 0;
        
        // Atualizar apenas se os custos mudaram (tolerância de 0.01 para evitar problemas de ponto flutuante)
        if (Math.abs(currentProductCost - productCost) > 0.01 || 
            Math.abs(currentShippingCost - shippingCost) > 0.01) {
          await db
            .update(orders)
            .set({
              productCost: productCost.toFixed(2),
              shippingCost: shippingCost.toFixed(2),
              updatedAt: new Date()
            })
            .where(eq(orders.id, order.id));

          updatedCount++;
          console.log(`✅ Pedido ${order.id} atualizado: ProductCost=€${productCost.toFixed(2)} (era €${currentProductCost.toFixed(2)}), ShippingCost=€${shippingCost.toFixed(2)} (era €${currentShippingCost.toFixed(2)})`);
        } else {
          console.log(`ℹ️ Pedido ${order.id} já tem custos atualizados, pulando...`);
        }
      } catch (error) {
        console.error(`❌ Erro ao recalcular custos do pedido ${order.id}:`, error);
        // Continua processando outros pedidos mesmo se um falhar
      }
    }

    console.log(`✅ Recalculação concluída: ${updatedCount} pedido(s) atualizado(s) para SKU "${sku}"`);
    return updatedCount;
  } catch (error) {
    console.error(`❌ Erro ao recalcular custos de pedidos para SKU "${sku}":`, error);
    throw error;
  }
}

/**
 * Recalcula custos de TODOS os pedidos de uma operação que têm produtos vinculados
 * Útil quando produtos são vinculados mas os pedidos ainda não têm custos calculados
 * @param storeId - ID da loja
 * @param operationId - ID da operação
 * @returns Quantidade de pedidos atualizados
 */
export async function recalculateAllOrderCostsForOperation(
  storeId: string,
  operationId: string
): Promise<number> {
  try {
    console.log(`🔄 Recalculando custos de TODOS os pedidos da operação ${operationId}...`);
    
    const { pool } = await import("../db");
    
    // Buscar todos os pedidos da operação que têm produtos
    // Focar nos pedidos entregues primeiro, pois são os que contam para o dashboard
    const ordersResult = await pool.query(`
      SELECT 
        id,
        status,
        total,
        products,
        product_cost,
        shipping_cost,
        operation_id
      FROM orders
      WHERE operation_id = $1
        AND products IS NOT NULL
        AND jsonb_typeof(products) = 'array'
      ORDER BY 
        CASE WHEN LOWER(status) = 'delivered' THEN 0 ELSE 1 END,
        order_date DESC NULLS LAST
    `, [operationId]);

    const ordersToUpdate = ordersResult.rows;
    
    if (ordersToUpdate.length === 0) {
      console.log(`ℹ️ Nenhum pedido encontrado na operação ${operationId}`);
      return 0;
    }

    console.log(`📦 Encontrados ${ordersToUpdate.length} pedido(s) para recalcular custos`);

    let updatedCount = 0;
    let skippedNoProducts = 0;
    let skippedNoSkus = 0;
    let skippedNoLinked = 0;
    let ordersWithCosts = 0;

    // Para cada pedido, recalcular custos
    for (const order of ordersToUpdate) {
      try {
        const products = order.products || [];
        
        if (!Array.isArray(products) || products.length === 0) {
          skippedNoProducts++;
          continue;
        }

        // Extrair todos os SKUs do pedido (incluindo concatenados)
        // extractAllSkusFromProducts já normaliza para minúsculas
        const allSkus = extractAllSkusFromProducts(products);
        
        if (allSkus.length === 0) {
          skippedNoSkus++;
          continue;
        }

        // Calcular custos usando a mesma lógica do smart-sync-service
        let totalProductCostBase = 0;
        let totalShippingCostBase = 0;
        let hasLinkedProducts = false;
        const foundSkus: string[] = [];
        const notFoundSkus: string[] = [];

        for (const orderSku of allSkus) {
          // orderSku já está normalizado em minúsculas por extractAllSkusFromProducts
          // Busca custos customizados do produto primeiro (user_products)
          // Usar LOWER() para comparação case-insensitive
          const customCostsResult = await pool.query(`
            SELECT 
              up.custom_cost_price,
              up.custom_shipping_cost,
              p.cost_price,
              p.shipping_cost
            FROM user_products up
            JOIN products p ON up.product_id = p.id
            WHERE LOWER(up.sku) = $1 AND up.store_id = $2 AND up.is_active = true
            LIMIT 1
          `, [orderSku, storeId]);

          let productCostBase = 0;
          let shippingCostBase = 0;

          if (customCostsResult.rows.length > 0) {
            const costs = customCostsResult.rows[0];
            // Usa custo customizado se disponível, senão usa o custo padrão do produto
            productCostBase = parseFloat(costs.custom_cost_price) || parseFloat(costs.cost_price) || 0;
            shippingCostBase = parseFloat(costs.custom_shipping_cost) || parseFloat(costs.shipping_cost) || 0;
            totalProductCostBase += productCostBase;
            totalShippingCostBase += shippingCostBase;
            hasLinkedProducts = true;
            foundSkus.push(orderSku);
            console.log(`✅ Pedido ${order.id}, SKU "${orderSku}" encontrado em user_products: ProductCost=${productCostBase}, ShippingCost=${shippingCostBase}`);
          } else {
            // Fallback: busca diretamente na tabela products
            // Usar LOWER() para comparação case-insensitive
            const productResult = await pool.query(`
              SELECT cost_price, shipping_cost
              FROM products 
              WHERE LOWER(sku) = $1 AND store_id = $2 
              LIMIT 1
            `, [orderSku, storeId]);

            if (productResult.rows.length > 0) {
              const costs = productResult.rows[0];
              productCostBase = parseFloat(costs.cost_price) || 0;
              shippingCostBase = parseFloat(costs.shipping_cost) || 0;
              totalProductCostBase += productCostBase;
              totalShippingCostBase += shippingCostBase;
              hasLinkedProducts = true;
              foundSkus.push(orderSku);
              console.log(`✅ Pedido ${order.id}, SKU "${orderSku}" encontrado em products: ProductCost=${productCostBase}, ShippingCost=${shippingCostBase}`);
            } else {
              notFoundSkus.push(orderSku);
              console.warn(`⚠️ Pedido ${order.id}, SKU "${orderSku}": produto não encontrado em user_products nem products`);
            }
          }
        }

        // Se não há produtos vinculados, pular este pedido
        if (!hasLinkedProducts) {
          skippedNoLinked++;
          console.warn(`⚠️ Pedido ${order.id}: nenhum produto vinculado encontrado. SKUs do pedido: ${allSkus.join(', ')}. SKUs não encontrados: ${notFoundSkus.join(', ')}`);
          continue;
        }

        // Aplica custos baseado no status do pedido (mesma lógica do smart-sync-service)
        const status = order.status?.toLowerCase() || '';
        const productCost = ['confirmed', 'delivered', 'shipped', 'in transit', 'in delivery', 'pending'].includes(status) ?
          totalProductCostBase : 0.00;
        
        const shippingCost = ['shipped', 'delivered', 'in transit', 'in delivery', 'pending'].includes(status) ?
          totalShippingCostBase : 0.00;

        // Verificar se os custos mudaram antes de atualizar (evita updates desnecessários)
        const currentProductCost = parseFloat(order.product_cost || '0') || 0;
        const currentShippingCost = parseFloat(order.shipping_cost || '0') || 0;
        
        // Atualizar apenas se os custos mudaram (tolerância de 0.01 para evitar problemas de ponto flutuante)
        if (Math.abs(currentProductCost - productCost) > 0.01 || 
            Math.abs(currentShippingCost - shippingCost) > 0.01) {
          await db
            .update(orders)
            .set({
              productCost: productCost.toFixed(2),
              shippingCost: shippingCost.toFixed(2),
              updatedAt: new Date()
            })
            .where(eq(orders.id, order.id));

          updatedCount++;
          ordersWithCosts++;
          console.log(`✅ Pedido ${order.id} atualizado: ProductCost=${productCost.toFixed(2)} (era ${currentProductCost.toFixed(2)}), ShippingCost=${shippingCost.toFixed(2)} (era ${currentShippingCost.toFixed(2)}). SKUs encontrados: ${foundSkus.join(', ')}`);
        } else {
          ordersWithCosts++;
          console.log(`ℹ️ Pedido ${order.id} já tem custos atualizados: ProductCost=${currentProductCost.toFixed(2)}, ShippingCost=${currentShippingCost.toFixed(2)}. SKUs encontrados: ${foundSkus.join(', ')}`);
        }
      } catch (error) {
        console.error(`❌ Erro ao recalcular custos do pedido ${order.id}:`, error);
        // Continua processando outros pedidos mesmo se um falhar
      }
    }

    console.log(`✅ Recalculação concluída para operação ${operationId}:`);
    console.log(`   - Pedidos atualizados: ${updatedCount}`);
    console.log(`   - Pedidos com custos: ${ordersWithCosts}`);
    console.log(`   - Pulados (sem produtos): ${skippedNoProducts}`);
    console.log(`   - Pulados (sem SKUs): ${skippedNoSkus}`);
    console.log(`   - Pulados (sem produtos vinculados): ${skippedNoLinked}`);
    console.log(`   - Total processado: ${ordersToUpdate.length}`);
    
    return updatedCount;
  } catch (error) {
    console.error(`❌ Erro ao recalcular custos de pedidos para operação ${operationId}:`, error);
    throw error;
  }
}

