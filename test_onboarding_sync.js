// Script para testar sincronização do zero pelo onboarding
import fetch from 'node-fetch';

const baseUrl = 'http://localhost:5000';

async function testOnboardingSync() {
  try {
    console.log('🧪 TESTE: Sincronização do Zero pelo Onboarding');
    console.log('==========================================');
    
    // 1. Verificar estado inicial do banco
    console.log('\n1. Verificando estado inicial do banco...');
    
    // 2. Simular o passo 5 do onboarding (sincronização de dados)
    console.log('\n2. Iniciando sincronização de teste...');
    
    const syncResponse = await fetch(`${baseUrl}/api/european-fulfillment/sync-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        country: 'SPAIN',
        maxPages: 3 // Limitamos a 3 páginas para teste (45 pedidos)
      })
    });
    
    if (syncResponse.ok) {
      const syncResult = await syncResponse.json();
      console.log('✅ Resultado da sincronização:', syncResult);
    } else {
      console.log('❌ Erro na sincronização:', await syncResponse.text());
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testOnboardingSync();