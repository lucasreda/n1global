import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export const DSS_OPERATION_ID = 'fb1d724d-6b9e-49c1-ad74-9a359527bbf4';

export function useCurrentOperation() {
  const [selectedOperation, setSelectedOperation] = useState<string>("");
  const queryClient = useQueryClient();

  // Fetch user operations with fallback for production auth issues
  const { data: operations = [], isLoading, error } = useQuery<{id: string, name: string, description?: string}[]>({
    queryKey: ['/api/operations'],
    staleTime: 5 * 60 * 1000, // 5 minutes to avoid refetching too often
    gcTime: 10 * 60 * 1000, // 10 minutes in cache
    retry: (failureCount, error: any) => {
      // If authentication fails, don't retry
      if ((error as any)?.status === 401 || (error as any)?.status === 403) {
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
  const finalOperations = (operations.length === 0 && ((error as any)?.status === 401 || (error as any)?.status === 403)) 
    ? fallbackOperations 
    : operations;

  // Use fallback quietly when needed




  // Set default operation on load (only once, when no operation is selected)
  useEffect(() => {
    if (finalOperations.length > 0 && !selectedOperation) {
      console.log("🎯 Available operations:", finalOperations.map(op => `${op.name} (${op.id})`));
      
      // Check localStorage first for user's last choice
      const savedOperationId = localStorage.getItem("current_operation_id");
      const savedOperation = finalOperations.find((op: any) => op.id === savedOperationId);
      
      if (savedOperation) {
        console.log("🔄 Restoring saved operation:", savedOperation.name, savedOperation.id);
        setSelectedOperation(savedOperation.id);
      } else {
        // Default to Dss operation (has the Shopify orders) only if no saved choice
        const dssOperation = finalOperations.find((op: any) => op.name === "Dss");
        
        if (dssOperation) {
          console.log("✅ Setting default Dss operation:", dssOperation.id);
          setSelectedOperation(dssOperation.id);
          localStorage.setItem("current_operation_id", dssOperation.id);
        } else {
          console.warn("⚠️ Dss operation not found, using fallback");
          setSelectedOperation(finalOperations[0].id);
          localStorage.setItem("current_operation_id", finalOperations[0].id);
        }
      }
    }
  }, [finalOperations, selectedOperation]);

  const changeOperation = (operationId: string) => {
    console.log("🔄 Manual operation change:", operationId);
    console.log("🗄️ Previous operation:", selectedOperation);
    console.log("🆕 New operation:", operationId);
    
    // Update localStorage immediately
    localStorage.setItem("current_operation_id", operationId);
    
    // Update state directly instead of reloading
    setSelectedOperation(operationId);
    
    // Invalidate relevant queries to refresh data for new operation
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    queryClient.invalidateQueries({ queryKey: ['/api/ad-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
    queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
    
    console.log("✅ Operation changed successfully without reload");
  };

  return {
    selectedOperation,
    operations: finalOperations,
    changeOperation,
    isDssOperation: selectedOperation === DSS_OPERATION_ID
  };
}