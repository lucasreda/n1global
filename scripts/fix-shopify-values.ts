/**
 * Script para atualizar valores dos pedidos do Shopify
 * Executa um sync completo para pegar current_total_price ao invés de total_price
 */

import { ShopifySyncService } from '../server/shopify-sync-service';

async function main() {
  const operationId = '0ec8b197-0cbb-4bba-8601-94c4c1822046';
  
  console.log('🔄 Iniciando sync do Shopify para corrigir valores...');
  console.log('📊 Operação:', operationId);
  
  const syncService = new ShopifySyncService();
  
  try {
    const result = await syncService.importShopifyOrders(operationId);
    
    console.log('\n✅ Sync concluído!');
    console.log('📊 Estatísticas:');
    console.log(`   - Novos pedidos: ${result.imported}`);
    console.log(`   - Pedidos atualizados: ${result.updated}`);
    console.log(`   - Total processado: ${result.imported + result.updated}`);
    
  } catch (error) {
    console.error('❌ Erro ao fazer sync:', error);
    process.exit(1);
  }
}

main();
