// Quick script to force user to Dss operation
const dssOperationId = 'fb1d724d-6b9e-49c1-ad74-9a359527bbf4';
console.log('Setting operation to Dss:', dssOperationId);

// Clear localStorage and set to Dss
localStorage.clear();
localStorage.setItem('current_operation_id', dssOperationId);

// Force page reload to apply changes
window.location.reload();