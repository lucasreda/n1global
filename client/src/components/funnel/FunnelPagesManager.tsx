import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentOperation } from "@/hooks/use-current-operation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText } from "lucide-react";
import { PageCard } from "./PageCard";
import { CreatePageModal } from "./CreatePageModal";
import { authenticatedApiRequest } from "@/lib/auth";

interface FunnelPage {
  id: string;
  funnelId: string;
  name: string;
  slug: string;
  pageType: string;
  status: 'draft' | 'published' | 'archived';
  order: number;
  model: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface FunnelPagesManagerProps {
  funnelId: string;
}

export function FunnelPagesManager({ funnelId }: FunnelPagesManagerProps) {
  console.log('📋 FunnelPagesManager: RENDERED with funnelId:', funnelId);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { selectedOperation } = useCurrentOperation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pages
  const { data: pagesData, isLoading, error } = useQuery({
    queryKey: ['/api/funnels', funnelId, 'pages'],
    queryFn: async () => {
      console.log('📋 FunnelPagesManager: Fetching pages for funnelId:', funnelId, 'operation:', selectedOperation);
      const response = await authenticatedApiRequest('GET', `/api/funnels/${funnelId}/pages?operationId=${selectedOperation}`);
      if (!response.ok) {
        throw new Error('Falha ao carregar páginas');
      }
      const result = await response.json();
      console.log('📋 FunnelPagesManager: Pages loaded:', result);
      return result;
    },
    enabled: !!funnelId && !!selectedOperation,
  });

  console.log('📋 FunnelPagesManager: Query state:', { isLoading, error: error?.message, pagesCount: pagesData?.pages?.length });

  // Delete page mutation
  const deletePageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const response = await authenticatedApiRequest('DELETE', `/api/funnels/${funnelId}/pages/${pageId}?operationId=${selectedOperation}`);
      if (!response.ok) {
        throw new Error('Falha ao deletar página');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Página deletada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/funnels', funnelId, 'pages'] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Duplicate page mutation
  const duplicatePageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const response = await authenticatedApiRequest('POST', `/api/funnels/${funnelId}/pages/${pageId}/duplicate?operationId=${selectedOperation}`);
      if (!response.ok) {
        throw new Error('Falha ao duplicar página');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Página duplicada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/funnels', funnelId, 'pages'] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pages: FunnelPage[] = pagesData?.pages || [];

  const handleDeletePage = (pageId: string) => {
    if (window.confirm('Tem certeza que deseja deletar esta página? Esta ação não pode ser desfeita.')) {
      deletePageMutation.mutate(pageId);
    }
  };

  const handleDuplicatePage = (pageId: string) => {
    duplicatePageMutation.mutate(pageId);
  };

  const getPageTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'landing': 'Landing Page',
      'checkout': 'Checkout',
      'upsell': 'Upsell',
      'downsell': 'Downsell',
      'thank_you': 'Obrigado',
      'custom': 'Personalizada'
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500';
      case 'draft': return 'bg-yellow-500';
      case 'archived': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published': return 'Publicada';
      case 'draft': return 'Rascunho';
      case 'archived': return 'Arquivada';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">Páginas do Funil</h3>
          <Button disabled>
            <Plus className="w-4 h-4 mr-2" />
            Carregando...
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-950/20 border-red-800">
        <CardHeader>
          <CardTitle className="text-red-400">Erro ao carregar páginas</CardTitle>
          <CardDescription className="text-red-300">
            Não foi possível carregar as páginas do funil
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">Páginas do Funil</h3>
          <p className="text-sm text-gray-400">
            Gerencie e edite as páginas do seu funil de vendas
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="button-create-page"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Página
        </Button>
      </div>

      {/* Pages Grid */}
      {pages.length === 0 ? (
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">Nenhuma página criada</h3>
            <p className="text-gray-500 mb-4 text-center">
              Comece criando sua primeira página para este funil
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Página
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pages
            .sort((a, b) => a.order - b.order)
            .map((page) => (
              <PageCard
                key={page.id}
                page={page}
                funnelId={funnelId}
                onDelete={() => handleDeletePage(page.id)}
                onDuplicate={() => handleDuplicatePage(page.id)}
                getPageTypeLabel={getPageTypeLabel}
                getStatusColor={getStatusColor}
                getStatusLabel={getStatusLabel}
                isDeleting={deletePageMutation.isPending}
                isDuplicating={duplicatePageMutation.isPending}
              />
            ))}
        </div>
      )}

      {/* Create Page Modal */}
      <CreatePageModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        funnelId={funnelId}
        onSuccess={() => {
          setShowCreateModal(false);
          queryClient.invalidateQueries({ queryKey: ['/api/funnels', funnelId, 'pages'] });
        }}
      />
    </div>
  );
}