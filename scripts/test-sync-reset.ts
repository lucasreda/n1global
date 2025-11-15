/**
 * Script para resetar pedidos da transportadora e testar a sincronização do zero
 * 
 * Uso: npm run test:reset-sync <userId> [limit]
 *      ou: npx tsx scripts/test-sync-reset.ts <userId> [limit]
 * 
 * Exemplo:
 *   npm run test:reset-sync b206f1ca-b7ae-4bd8-842e-8a968b32c2b7 10
 * 
 * Isso vai resetar até 10 pedidos da transportadora para permitir testar o matching novamente
 */

import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL!);

async function resetStagingOrders(userId: string, limit: number = 10) {
  console.log(`🔄 Resetando até ${limit} pedidos da transportadora para user ${userId}...\n`);

  try {
    // Buscar conta de warehouse do usuário
    const accounts = await sql`
      SELECT id FROM user_warehouse_accounts 
      WHERE user_id = ${userId} 
      AND status IN ('active', 'pending')
      LIMIT 1
    `;

    if (accounts.length === 0) {
      console.error('❌ Nenhuma conta de warehouse ativa encontrada para este usuário');
      process.exit(1);
    }

    const accountId = accounts[0].id;
    console.log(`✅ Conta encontrada: ${accountId}\n`);

    // Mostrar estatísticas antes do reset
    const statsBefore = await sql`
      SELECT 
        (SELECT COUNT(*) FROM european_fulfillment_orders 
         WHERE account_id = ${accountId} AND processed_to_orders = false) as unprocessed,
        (SELECT COUNT(*) FROM european_fulfillment_orders 
         WHERE account_id = ${accountId} AND processed_to_orders = true) as processed,
        (SELECT COUNT(*) FROM european_fulfillment_orders 
         WHERE account_id = ${accountId}) as total
    `;

    const totalProcessed = Number(statsBefore[0].processed || 0);
    const totalUnprocessed = Number(statsBefore[0].unprocessed || 0);
    const totalOrders = Number(statsBefore[0].total || 0);

    console.log(`📊 Estatísticas ANTES do reset:`);
    console.log(`   Não processados: ${totalUnprocessed}`);
    console.log(`   Processados: ${totalProcessed}`);
    console.log(`   Total: ${totalOrders}\n`);

    // Se limit é maior que o disponível, ajustar
    if (limit > totalProcessed) {
      console.log(`⚠️  Aviso: Você pediu para resetar ${limit} pedidos, mas apenas ${totalProcessed} estão processados.`);
      console.log(`    Vou resetar todos os ${totalProcessed} pedidos disponíveis.\n`);
      // limit = totalProcessed; // Não ajustar automaticamente, deixar o usuário decidir
    }

    // Resetar pedidos do European Fulfillment (mais comum)
    // Usar CTE (Common Table Expression) para limitar os registros antes de atualizar
    // IMPORTANTE: Garantir que o campo failedMatch seja removido ou definido como false explicitamente
    const efResult = await sql`
      WITH orders_to_reset AS (
        SELECT id, order_number, european_order_id, raw_data
        FROM european_fulfillment_orders
        WHERE account_id = ${accountId}
          AND processed_to_orders = true
        LIMIT ${limit}
      )
      UPDATE european_fulfillment_orders
      SET 
        processed_to_orders = false,
        processed_at = NULL,
        raw_data = CASE 
          WHEN european_fulfillment_orders.raw_data IS NULL THEN jsonb_build_object()
          WHEN european_fulfillment_orders.raw_data::jsonb ? 'failedMatch' THEN european_fulfillment_orders.raw_data::jsonb - 'failedMatch' - 'failedMatchReason' - 'failedMatchAt'
          ELSE european_fulfillment_orders.raw_data::jsonb
        END
      FROM orders_to_reset
      WHERE european_fulfillment_orders.id = orders_to_reset.id
      RETURNING european_fulfillment_orders.order_number, european_fulfillment_orders.european_order_id, european_fulfillment_orders.raw_data
    `;

    console.log(`✅ European Fulfillment: ${efResult.length} pedido(s) resetado(s)`);
    if (efResult.length > 0) {
      console.log(`   Pedidos: ${efResult.slice(0, 10).map((r: any) => r.order_number).join(', ')}${efResult.length > 10 ? ` ... (+${efResult.length - 10} mais)` : ''}\n`);
      
      // Verificar se failedMatch foi removido corretamente
      const sampleOrder = efResult[0];
      const rawData = sampleOrder.raw_data as any;
      const hasFailedMatch = rawData && rawData.failedMatch === true;
      
      if (hasFailedMatch) {
        console.warn(`⚠️  AVISO: O pedido ${sampleOrder.order_number} ainda tem failedMatch=true após reset!`);
        console.warn(`   Isso pode impedir que ele seja processado. Verificando outros pedidos...\n`);
      } else {
        console.log(`✅ Verificado: Campo failedMatch removido corretamente do primeiro pedido\n`);
      }
    }

    // Mostrar estatísticas após o reset
    const statsAfter = await sql`
      SELECT 
        (SELECT COUNT(*) FROM european_fulfillment_orders 
         WHERE account_id = ${accountId} AND processed_to_orders = false) as unprocessed,
        (SELECT COUNT(*) FROM european_fulfillment_orders 
         WHERE account_id = ${accountId}) as total
    `;

    const newUnprocessed = Number(statsAfter[0].unprocessed || 0);
    const newTotal = Number(statsAfter[0].total || 0);

    // Verificar quantos pedidos realmente não têm failedMatch
    const verifiedStats = await sql`
      SELECT 
        COUNT(*) as total_unprocessed,
        COUNT(*) FILTER (WHERE (raw_data->>'failedMatch')::boolean IS NOT TRUE) as without_failed_match
      FROM european_fulfillment_orders
      WHERE account_id = ${accountId}
        AND processed_to_orders = false
    `;
    
    const totalUnprocessedAfter = Number(verifiedStats[0]?.total_unprocessed || 0);
    const withoutFailedMatch = Number(verifiedStats[0]?.without_failed_match || 0);
    
    console.log(`📊 Estatísticas APÓS o reset:`);
    console.log(`   Não processados: ${totalUnprocessedAfter}`);
    console.log(`   Sem failedMatch: ${withoutFailedMatch}`);
    console.log(`   Com failedMatch (bloqueados): ${totalUnprocessedAfter - withoutFailedMatch}`);
    console.log(`   Total: ${newTotal}`);
    
    if (efResult.length === 0) {
      console.log(`\n⚠️  Nenhum pedido foi resetado!`);
      console.log(`   Isso pode significar que:`);
      console.log(`   - Todos os pedidos já têm failedMatch=true`);
      console.log(`   - Não há pedidos processados para resetar`);
      console.log(`   - Os pedidos foram processados recentemente pelos workers automáticos\n`);
    } else {
      console.log(`\n✅ Pronto! ${efResult.length} pedido(s) foram resetados com sucesso!`);
      
      // Verificar novamente após um pequeno delay para ver se os workers automáticos já processaram
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalCheck = await sql`
        SELECT 
          COUNT(*) as total_unprocessed,
          COUNT(*) FILTER (WHERE (raw_data->>'failedMatch')::boolean IS NOT TRUE) as without_failed_match
        FROM european_fulfillment_orders
        WHERE account_id = ${accountId}
          AND processed_to_orders = false
      `;
      
      const finalUnprocessed = Number(finalCheck[0]?.total_unprocessed || 0);
      const finalWithoutFailedMatch = Number(finalCheck[0]?.without_failed_match || 0);
      
      console.log(`\n⏱️  Verificação final após 1 segundo:`);
      console.log(`   Pedidos não processados: ${finalUnprocessed}`);
      console.log(`   Sem failedMatch: ${finalWithoutFailedMatch}`);
      
      if (withoutFailedMatch < efResult.length) {
        console.warn(`\n⚠️  ATENÇÃO: ${efResult.length - withoutFailedMatch} pedido(s) resetado(s) ainda têm failedMatch=true!`);
        console.warn(`   Isso significa que eles NÃO serão processados pela sync.`);
        console.warn(`   O problema pode ser que os workers automáticos os processaram antes da sync manual.\n`);
        console.warn(`   SOLUÇÃO: Execute a sync IMEDIATAMENTE após resetar, ou desabilite temporariamente os workers.\n`);
      } else if (finalUnprocessed === 0 || finalUnprocessed < efResult.length) {
        console.warn(`\n⚠️  ATENÇÃO CRÍTICA: Os workers automáticos já processaram ${efResult.length - finalUnprocessed} pedido(s) em 1 segundo!`);
        console.warn(`   Pedidos restantes: ${finalUnprocessed} de ${efResult.length} resetados`);
        console.warn(`   Isso significa que os workers automáticos estão processando muito rapidamente.\n`);
        console.warn(`   SOLUÇÃO:`);
        console.warn(`   1. Execute "Sync Completo" no dashboard AGORA (dentro de 30 segundos)`);
        console.warn(`   2. OU resete novamente mais pedidos para compensar\n`);
      } else {
        console.log(`\n✅ Verificado: ${finalWithoutFailedMatch} pedido(s) estão prontos para processamento.`);
        console.log(`   ⏱️  ATENÇÃO: Execute "Sync Completo" no dashboard AGORA!`);
        console.log(`   Os workers automáticos rodam a cada 2 minutos e podem processar estes pedidos.\n`);
      }
      
      if (efResult.length < limit) {
        console.log(`⚠️  Nota: Apenas ${efResult.length} de ${limit} pedidos foram resetados.`);
        console.log(`   Isso significa que não havia ${limit} pedidos processados disponíveis para resetar.\n`);
      }
    }

  } catch (error) {
    console.error('❌ Erro ao resetar pedidos:', error);
    process.exit(1);
  }
}

// Parse arguments
const userId = process.argv[2];
const limit = parseInt(process.argv[3] || '10', 10);

if (!userId) {
  console.error('❌ Uso: npm run test:reset-sync <userId> [limit]');
  console.error('   Exemplo: npm run test:reset-sync b206f1ca-b7ae-4bd8-842e-8a968b32c2b7 10');
  process.exit(1);
}

resetStagingOrders(userId, limit).catch(console.error);

