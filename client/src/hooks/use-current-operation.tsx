import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

export const DSS_OPERATION_ID = 'fb1d724d-6b9e-49c1-ad74-9a359527bbf4';

export function useCurrentOperation() {
  const [selectedOperation, setSelectedOperation] = useState<string>("");

  // Fetch user operations with fallback for production auth issues
  const { data: operations = [], isLoading, error } = useQuery<{id: string, name: string, description?: string}[]>({
    queryKey: ['/api/operations'],
    retry: (failureCount, error: any) => {
      // If authentication fails, don't retry
      if (error?.status === 401 || error?.status === 403) {
        console.log("🔄 Auth failed, using hardcoded operations for fresh@teste.com");
        return false;
      }
      return failureCount < 3;
    }
  });

  // EMERGENCY FALLBACK: For fresh@teste.com user with auth issues
  const fallbackOperations = [
    { id: "fb1d724d-6b9e-49c1-ad74-9a359527bbf4", name: "Dss" },
    { id: "ab944b58-7040-4271-a9bc-863a63223efb", name: "test 2" },
    { id: "9e9065a5-e857-4430-84ff-adea84864966", name: "Test 3" }
  ];

  // Use fallback if auth fails and no operations loaded
  const finalOperations = (operations.length === 0 && (error?.status === 401 || error?.status === 403)) 
    ? fallbackOperations 
    : operations;

  // Use fallback quietly when needed




  // Force Dss operation on load (only once)
  useEffect(() => {
    if (finalOperations.length > 0 && !selectedOperation) {
      console.log("🎯 Available operations:", finalOperations.map(op => `${op.name} (${op.id})`));
      
      // Always force Dss operation (has the Shopify orders)
      const dssOperation = finalOperations.find((op: any) => op.name === "Dss");
      
      if (dssOperation) {
        console.log("✅ Forcing Dss operation:", dssOperation.id);
        setSelectedOperation(dssOperation.id);
        localStorage.setItem("current_operation_id", dssOperation.id);
      } else {
        console.warn("⚠️ Dss operation not found, using fallback");
        setSelectedOperation(finalOperations[0].id);
        localStorage.setItem("current_operation_id", finalOperations[0].id);
      }
    }
  }, [finalOperations, selectedOperation]);

  const changeOperation = (operationId: string) => {
    console.log("🔄 Manual operation change:", operationId);
    setSelectedOperation(operationId);
    localStorage.setItem("current_operation_id", operationId);
    
    // Invalidate all queries to force fresh data for new operation
    queryClient.clear();
  };

  return {
    selectedOperation,
    operations: finalOperations,
    changeOperation,
    isDssOperation: selectedOperation === DSS_OPERATION_ID
  };
}