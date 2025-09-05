import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, Settings, Plus } from "lucide-react";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { apiRequest } from "@/lib/queryClient";

export default function CustomerSupportPage() {
  const { selectedOperation, operations } = useCurrentOperation();
  const currentOperationId = selectedOperation;
  const currentOperationName = operations.find(op => op.id === selectedOperation)?.name;
  const queryClient = useQueryClient();
  
  const [isInitializing, setIsInitializing] = useState(false);

  // Initialize support for current operation
  const handleInitializeSupport = async () => {
    try {
      setIsInitializing(true);
      
      const response = await fetch('/api/customer-support/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          operationId: currentOperationId,
          operationName: currentOperationName
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Suporte Inicializado",
          description: "Sistema de suporte de clientes foi configurado com sucesso",
        });
        
        // Refresh the page after success
        window.location.reload();
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.message || "Falha ao configurar suporte",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error initializing support:', error);
      toast({
        title: "Erro",
        description: "Erro interno ao configurar suporte",
        variant: "destructive"
      });
    } finally {
      setIsInitializing(false);
    }
  };

  // Create test data
  const handleCreateTestData = async () => {
    try {
      const response = await fetch(`/api/customer-support/${currentOperationId}/test-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });

      if (response.ok) {
        toast({
          title: "Dados de Teste Criados",
          description: "Tickets de exemplo foram criados com sucesso",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.message || "Falha ao criar dados de teste",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating test data:', error);
      toast({
        title: "Erro", 
        description: "Erro interno ao criar dados de teste",
        variant: "destructive"
      });
    }
  };

  // Get support configuration with error handling
  const { data: supportConfig, isLoading: isLoadingConfig, error: configError } = useQuery({
    queryKey: [`/api/customer-support/config/${currentOperationId}`],
    enabled: !!currentOperationId,
    retry: false,
    throwOnError: false, // Don't throw on error
  });

  if (!currentOperationId) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Selecione uma operação para ver o suporte de clientes</p>
      </div>
    );
  }

  if (isLoadingConfig) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando configuração...</p>
        </div>
      </div>
    );
  }

  // Check if support is not configured (404 error or no data)
  const isNotConfigured = !supportConfig || (configError as any)?.response?.status === 404;

  if (isNotConfigured) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Suporte de Clientes Não Configurado</h2>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto">
            Configure o sistema de suporte de clientes para sua operação. Isso inclui categorização automática,
            respostas com IA e gerenciamento de tickets.
          </p>
          <Button 
            onClick={handleInitializeSupport}
            disabled={isInitializing}
            className="mt-6"
          >
            {isInitializing ? "Configurando..." : "Configurar Suporte"}
          </Button>
        </div>
      </div>
    );
  }

  // Support is configured - show dashboard
  return (
    <div className="container mx-auto p-6" data-testid="customer-support-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Suporte de Clientes</h1>
          <p className="text-muted-foreground">{currentOperationName}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCreateTestData}
            data-testid="button-create-test-data"
          >
            <Plus className="w-4 h-4 mr-2" />
            Dados de Teste
          </Button>
          <Button data-testid="button-settings">
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </Button>
        </div>
      </div>

      {/* Support Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuração do Suporte
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Domínio de Email</label>
              <p className="font-medium">{(supportConfig as any)?.emailDomain || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">IA Habilitada</label>
              <p className="font-medium">
                {(supportConfig as any)?.aiEnabled ? "Ativa" : "Desativada"}
              </p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="text-green-800 font-medium">✅ Sistema Configurado</h3>
            <p className="text-green-700 text-sm mt-1">
              O sistema de suporte de clientes está ativo e funcionando para esta operação.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}