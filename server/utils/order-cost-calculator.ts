/**
 * Utilitário compartilhado para calcular custos de produto e envio de pedidos
 * Usado por todas as plataformas (Shopify, CartPanda, Digistore24, European Fulfillment)
 */

import { extractAllSkusFromProducts } from './sku-parser';

/**
 * Calcula custos de produto e envio baseado no status e produtos do pedido
 * Suporta múltiplos SKUs concatenados (ex: "sku1+sku2+sku3")
 * 
 * @param status - Status do pedido (delivered, shipped, confirmed, etc.)
 * @param products - Array de produtos do pedido (deve ter campo 'sku')
 * @param storeId - ID da loja para buscar produtos vinculados
 * @returns Objeto com productCost e shippingCost calculados
 */
export async function calculateOrderCosts(
  status: string,
  products: any[],
  storeId: string
): Promise<{ productCost: number; shippingCost: number }> {
  // Se não há produtos, retorna custos zerados
  if (!products || products.length === 0) {
    return { productCost: 0, shippingCost: 0 };
  }

  // Extrai todos os SKUs únicos de todos os produtos (incluindo concatenados)
  // extractAllSkusFromProducts já normaliza para minúsculas
  const allSkus = extractAllSkusFromProducts(products);
  
  if (allSkus.length === 0) {
    console.warn('⚠️ Nenhum SKU encontrado nos produtos, usando custos padrão');
    return { productCost: 0, shippingCost: 0 };
  }

  console.log(`📦 Processando ${allSkus.length} SKU(s) para cálculo de custos:`, allSkus);

  try {
    const { pool } = await import("../db");
    
    let totalProductCostBase = 0;
    let totalShippingCostBase = 0;
    const foundSkus: string[] = [];
    const notFoundSkus: string[] = [];

    // Para cada SKU, buscar os custos
    for (const sku of allSkus) {
      // sku já está normalizado em minúsculas por extractAllSkusFromProducts
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
      `, [sku, storeId]);

      let productCostBase = 0;
      let shippingCostBase = 0;

      if (customCostsResult.rows.length > 0) {
        const costs = customCostsResult.rows[0];
        // Usa custo customizado se disponível, senão usa o custo padrão do produto
        productCostBase = parseFloat(costs.custom_cost_price) || parseFloat(costs.cost_price) || 0;
        shippingCostBase = parseFloat(costs.custom_shipping_cost) || parseFloat(costs.shipping_cost) || 0;
        totalProductCostBase += productCostBase;
        totalShippingCostBase += shippingCostBase;
        foundSkus.push(sku);
        console.log(`💰 Custos encontrados para SKU "${sku}": Produto: €${productCostBase}, Envio: €${shippingCostBase}`);
      } else {
        // Fallback: busca diretamente na tabela products
        // Usar LOWER() para comparação case-insensitive
        const productResult = await pool.query(`
          SELECT cost_price, shipping_cost
          FROM products 
          WHERE LOWER(sku) = $1 AND store_id = $2 
          LIMIT 1
        `, [sku, storeId]);

        if (productResult.rows.length > 0) {
          const costs = productResult.rows[0];
          productCostBase = parseFloat(costs.cost_price) || 0;
          shippingCostBase = parseFloat(costs.shipping_cost) || 0;
          totalProductCostBase += productCostBase;
          totalShippingCostBase += shippingCostBase;
          foundSkus.push(sku);
          console.log(`💰 Custos padrão para SKU "${sku}": Produto: €${productCostBase}, Envio: €${shippingCostBase}`);
        } else {
          notFoundSkus.push(sku);
          console.warn(`⚠️ Produto com SKU "${sku}" não encontrado na base de dados`);
        }
      }
    }

    // Aplica custos baseado no status do pedido
    // ProductCost: aplicado para pedidos confirmados, entregues, enviados, em trânsito, em entrega ou pendentes
    // ShippingCost: aplicado para pedidos enviados, entregues, em trânsito, em entrega ou pendentes
    const normalizedStatus = status?.toLowerCase() || '';
    
    const productCost = ['confirmed', 'delivered', 'shipped', 'in transit', 'in delivery', 'pending'].includes(normalizedStatus) ?
      totalProductCostBase : 0.00;
    
    const shippingCost = ['shipped', 'delivered', 'in transit', 'in delivery', 'pending'].includes(normalizedStatus) ?
      totalShippingCostBase : 0.00;

    if (foundSkus.length > 0) {
      console.log(`✅ Custos calculados: ProductCost=€${productCost.toFixed(2)}, ShippingCost=€${shippingCost.toFixed(2)} (Status: ${status})`);
    }

    if (notFoundSkus.length > 0) {
      console.warn(`⚠️ ${notFoundSkus.length} SKU(s) não encontrado(s): ${notFoundSkus.join(', ')}`);
    }

    return {
      productCost: Math.round(productCost * 100) / 100, // Arredonda para 2 casas decimais
      shippingCost: Math.round(shippingCost * 100) / 100
    };
  } catch (error) {
    console.error('❌ Erro ao calcular custos do pedido:', error);
    // Em caso de erro, retorna custos zerados para não bloquear a criação do pedido
    return { productCost: 0, shippingCost: 0 };
  }
}

