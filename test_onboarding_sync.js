import http from 'http';

// Disable SSL verification for development
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

async function makeRequest(url, method, body, headers) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testOnboardingSync() {
  console.log('🧪 Testando sincronização do onboarding...');
  
  try {
    // 1. Login para obter token
    console.log('🔐 Fazendo login...');
    const loginResponse = await makeRequest(
      'http://localhost:5000/api/auth/login',
      'POST',
      { email: 'admin@test.com', password: 'admin123' },
      { 'Content-Type': 'application/json' }
    );
    
    if (!loginResponse.data.token) {
      console.error('❌ Falha no login:', loginResponse.data);
      return;
    }
    
    console.log('✅ Login realizado com sucesso');
    const token = loginResponse.data.token;
    
    // 2. Testar sincronização do onboarding
    console.log('🔄 Iniciando teste de sincronização...');
    const syncResponse = await makeRequest(
      'http://localhost:5000/api/onboarding/test-sync',
      'POST',
      { 
        operationId: '14396a68-5a0b-4b98-83fa-f150c5832b5a',
        maxOrders: 30 // 2 páginas de teste
      },
      { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    );
    
    console.log('📊 Resultado da sincronização:');
    console.log(JSON.stringify(syncResponse.data, null, 2));
    
    if (syncResponse.data.success) {
      console.log('✅ Teste de sincronização concluído com sucesso!');
      console.log(`📈 ${syncResponse.data.details.newOrders} novos pedidos importados`);
      console.log(`🔄 ${syncResponse.data.details.updatedOrders} pedidos atualizados`);
      console.log(`📄 ${syncResponse.data.details.pagesScanned} páginas processadas`);
      console.log(`🚀 Onboarding completed: ${syncResponse.data.details.onboardingCompleted}`);
    } else {
      console.error('❌ Falha no teste de sincronização:', syncResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ Erro durante teste:', error.message);
  }
}

testOnboardingSync();