// Test payment creation directly
const { FinanceService } = require('./server/finance-service.ts');

async function testPayment() {
  try {
    const financeService = new FinanceService();
    
    console.log('Testing supplier balance...');
    const balance = await financeService.getSupplierBalance('e8620ec7-5633-4fdb-8d65-f1eb372f8e81');
    console.log('Balance:', JSON.stringify(balance, null, 2));
    
    if (balance && balance.pendingAmount > 0) {
      console.log('\nTesting payment creation...');
      const paymentData = {
        supplierId: 'e8620ec7-5633-4fdb-8d65-f1eb372f8e81',
        amount: balance.pendingAmount,
        currency: 'EUR',
        paymentMethod: 'bank_transfer',
        description: 'Teste de pagamento',
        notes: 'Pagamento de teste',
        dueDate: '2025-08-30',
        orderIds: []
      };
      
      const payment = await financeService.createSupplierPayment(paymentData, 'default-store-id');
      console.log('Payment created:', JSON.stringify(payment, null, 2));
    } else {
      console.log('No pending balance found');
    }
  } catch (error) {
    console.error('Test error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testPayment();