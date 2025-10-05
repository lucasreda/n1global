import { AffiliateLayout } from "@/components/affiliate/affiliate-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  FileText,
  ExternalLink,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Copy,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AffiliateLandingPage {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'archived';
  deployUrl?: string;
  htmlContent?: string;
  cssContent?: string;
  jsContent?: string;
  createdAt: string;
  updatedAt: string;
}

interface AffiliateProfile {
  id: string;
  trackingPixel?: string;
  landingPageUrl?: string;
  landingPageId?: string;
}

export default function AffiliateLandingPages() {
  const { toast } = useToast();
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<AffiliateLandingPage | null>(null);

  const { data: profile, isLoading: isLoadingProfile } = useQuery<AffiliateProfile>({
    queryKey: ['/api/affiliate/profile'],
  });

  const { data: assignedPage, isLoading: isLoadingPage } = useQuery<AffiliateLandingPage>({
    queryKey: ['/api/affiliate/landing-page/assigned'],
    enabled: !!profile?.landingPageId,
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "URL copiada para a área de transferência.",
    });
  };

  const openPreview = (page: AffiliateLandingPage) => {
    setSelectedPage(page);
    setPreviewDialogOpen(true);
  };

  const getStatusBadge = (status: 'draft' | 'active' | 'archived') => {
    const variants = {
      draft: { label: 'Rascunho', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Clock },
      active: { label: 'Ativa', className: 'bg-green-500/20 text-green-500 border-green-500/30', icon: CheckCircle },
      archived: { label: 'Arquivada', className: 'bg-red-500/20 text-red-500 border-red-500/30', icon: AlertCircle },
    };
    
    const variant = variants[status];
    const Icon = variant.icon;
    
    return (
      <Badge className={variant.className}>
        <Icon className="h-3 w-3 mr-1" />
        {variant.label}
      </Badge>
    );
  };

  const isLoading = isLoadingProfile || isLoadingPage;

  return (
    <AffiliateLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="font-bold tracking-tight text-gray-900 dark:text-gray-100" style={{ fontSize: '22px' }}>
            Landing Pages
          </h1>
          <p className="text-muted-foreground mt-2">
            Visualize sua página de destino assignada. Configure pixels por produto no Marketplace.
          </p>
        </div>

        {/* Assigned Landing Page */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : assignedPage ? (
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Minha Landing Page
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{assignedPage.title}</h3>
                      {getStatusBadge(assignedPage.status)}
                    </div>
                    {assignedPage.description && (
                      <p className="text-sm text-gray-400 mb-3">{assignedPage.description}</p>
                    )}
                    {assignedPage.deployUrl && (
                      <div className="flex items-center gap-2 mb-4">
                        <code className="bg-gray-800 px-3 py-1.5 rounded text-sm text-gray-300 flex-1">
                          {assignedPage.deployUrl}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(assignedPage.deployUrl!)}
                          className="text-gray-400 hover:text-white"
                          data-testid="button-copy-url"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {assignedPage.deployUrl && (
                    <Button
                      onClick={() => window.open(assignedPage.deployUrl, '_blank')}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      data-testid="button-open-landing"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir Landing Page
                    </Button>
                  )}
                  <Button
                    onClick={() => openPreview(assignedPage)}
                    variant="outline"
                    className="border-gray-700 hover:bg-gray-800"
                    data-testid="button-preview-landing"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </Button>
                </div>

                <div className="pt-4 border-t border-gray-700 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className="text-gray-300 ml-2">
                      {assignedPage.status === 'active' ? 'Publicada' : assignedPage.status === 'draft' ? 'Rascunho' : 'Arquivada'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Atualizada:</span>
                    <span className="text-gray-300 ml-2">
                      {new Date(assignedPage.updatedAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Nenhuma Landing Page Atribuída</h3>
                <p className="text-gray-400 mb-4">
                  Entre em contato com a administração para receber uma landing page
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Box */}
        <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}} className="border-blue-500/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
              <div>
                <p className="text-blue-400 font-medium mb-2">Como funciona?</p>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• A administração cria e atribui landing pages otimizadas para você</li>
                  <li>• Configure pixels de rastreamento por produto no Marketplace</li>
                  <li>• Os pixels são automaticamente injetados nas landing pages durante o deploy</li>
                  <li>• Todas as conversões são rastreadas automaticamente para cálculo de comissões</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Detalhes da Landing Page</DialogTitle>
          </DialogHeader>
          {selectedPage && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">{selectedPage.title}</h3>
                {selectedPage.description && (
                  <p className="text-sm text-gray-400">{selectedPage.description}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-gray-700">
                  <span className="text-sm text-gray-400">Status</span>
                  {getStatusBadge(selectedPage.status)}
                </div>
                {selectedPage.deployUrl && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-700">
                    <span className="text-sm text-gray-400">URL</span>
                    <code className="text-sm text-gray-300">{selectedPage.deployUrl}</code>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-b border-gray-700">
                  <span className="text-sm text-gray-400">Criada em</span>
                  <span className="text-sm text-gray-300">
                    {new Date(selectedPage.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-700">
                  <span className="text-sm text-gray-400">Última atualização</span>
                  <span className="text-sm text-gray-300">
                    {new Date(selectedPage.updatedAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              {selectedPage.deployUrl && (
                <Button
                  onClick={() => window.open(selectedPage.deployUrl, '_blank')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir no Navegador
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AffiliateLayout>
  );
}
