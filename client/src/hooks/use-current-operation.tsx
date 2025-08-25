import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

export const DSS_OPERATION_ID = 'fb1d724d-6b9e-49c1-ad74-9a359527bbf4';

export function useCurrentOperation() {
  const [selectedOperation, setSelectedOperation] = useState<string>("");

  // Fetch user operations
  const { data: operations = [], isLoading, error } = useQuery<{id: string, name: string, description?: string}[]>({
    queryKey: ['/api/operations'],
  });


  // Force Dss operation on load (only once)
  useEffect(() => {
    if (operations.length > 0 && !selectedOperation) {
      console.log("🎯 Available operations:", operations.map(op => `${op.name} (${op.id})`));
      
      // Always force Dss operation (has the Shopify orders)
      const dssOperation = operations.find((op: any) => op.name === "Dss");
      
      if (dssOperation) {
        console.log("✅ Forcing Dss operation:", dssOperation.id);
        setSelectedOperation(dssOperation.id);
        localStorage.setItem("current_operation_id", dssOperation.id);
      } else {
        console.warn("⚠️ Dss operation not found, using fallback");
        setSelectedOperation(operations[0].id);
        localStorage.setItem("current_operation_id", operations[0].id);
      }
    }
  }, [operations, selectedOperation]);

  const changeOperation = (operationId: string) => {
    console.log("🔄 Manual operation change:", operationId);
    setSelectedOperation(operationId);
    localStorage.setItem("current_operation_id", operationId);
    
    // Invalidate all dashboard-related queries
    queryClient.invalidateQueries();
  };

  return {
    selectedOperation,
    operations,
    changeOperation,
    isDssOperation: selectedOperation === DSS_OPERATION_ID
  };
}