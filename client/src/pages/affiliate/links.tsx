import { AffiliateLayout } from "@/components/affiliate/affiliate-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import {
  Link2,
  Copy,
  QrCode,
  TrendingUp,
  Users,
  DollarSign,
  ExternalLink,
  Plus,
  Trash2,
  Eye
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Product {
  id: string;
  name: string;
  price: number;
}

interface Operation {
  id: string;
  name: string;
}

interface TrackingLink {
  id: string;
  token: string;
  productId?: string;
  operationId?: string;
  productName?: string;
  operationName?: string;
  url: string;
  clicks: number;
  conversions: number;
  commission: number;
  createdAt: string;
}

export default function AffiliateLinks() {
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedOperation, setSelectedOperation] = useState<string>("");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedLinkForQr, setSelectedLinkForQr] = useState<string>("");

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/affiliate/products'],
  });

  const { data: operations = [] } = useQuery<Operation[]>({
    queryKey: ['/api/operations'],
  });

  const { data: links = [], isLoading } = useQuery<TrackingLink[]>({
    queryKey: ['/api/affiliate/tracking/links'],
  });

  const createLinkMutation = useMutation({
    mutationFn: async (data: { productId?: string; operationId?: string }) => {
      return await apiRequest('/api/affiliate/tracking/generate-link', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/tracking/links'] });
      toast({
        title: "Link Criado!",
        description: "Seu link de rastreamento foi gerado com sucesso.",
      });
      setSelectedProduct("");
      setSelectedOperation("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar link",
        description: error.message || "Não foi possível gerar o link.",
        variant: "destructive",
      });
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      return await apiRequest(`/api/affiliate/tracking/links/${linkId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/tracking/links'] });
      toast({
        title: "Link Removido",
        description: "O link foi removido com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover link",
        description: error.message || "Não foi possível remover o link.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Link copiado para a área de transferência.",
    });
  };

  const handleCreateLink = () => {
    if (!selectedProduct && !selectedOperation) {
      toast({
        title: "Seleção necessária",
        description: "Selecione um produto ou operação para criar o link.",
        variant: "destructive",
      });
      return;
    }
    
    createLinkMutation.mutate({
      productId: selectedProduct || undefined,
      operationId: selectedOperation || undefined,
    });
  };

  const openQrDialog = (url: string) => {
    setSelectedLinkForQr(url);
    setQrDialogOpen(true);
  };

  const totalClicks = links.reduce((sum, link) => sum + (link.clicks || 0), 0);
  const totalConversions = links.reduce((sum, link) => sum + (link.conversions || 0), 0);
  const totalCommission = links.reduce((sum, link) => sum + (link.commission || 0), 0);

  return (
    <AffiliateLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="font-bold tracking-tight text-gray-900 dark:text-gray-100" style={{ fontSize: '22px' }}>
            Links de Rastreamento
          </h1>
          <p className="text-muted-foreground mt-2">
            Gere e gerencie seus links personalizados para rastrear vendas
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total de Clicks</CardTitle>
              <Link2 className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-total-link-clicks">
                {totalClicks.toLocaleString()}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {links.length} links ativos
              </p>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Conversões</CardTitle>
              <Users className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-total-link-conversions">
                {totalConversions}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : '0'}% taxa de conversão
              </p>
            </CardContent>
          </Card>

          <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Comissão Total</CardTitle>
              <DollarSign className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white" data-testid="text-total-link-commission">
                €{totalCommission.toFixed(2)}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                De todos os links
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Create Link Form */}
        <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-400" />
              Criar Novo Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product" className="text-gray-300">Produto (Opcional)</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger 
                    id="product"
                    className="bg-gray-900 border-gray-700 text-white"
                    data-testid="select-product"
                  >
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - €{product.price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="operation" className="text-gray-300">Operação (Opcional)</Label>
                <Select value={selectedOperation} onValueChange={setSelectedOperation}>
                  <SelectTrigger 
                    id="operation"
                    className="bg-gray-900 border-gray-700 text-white"
                    data-testid="select-operation"
                  >
                    <SelectValue placeholder="Selecione uma operação" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    {operations.map((operation) => (
                      <SelectItem key={operation.id} value={operation.id}>
                        {operation.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button 
                onClick={handleCreateLink}
                disabled={createLinkMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-generate-link"
              >
                {createLinkMutation.isPending ? (
                  <>Gerando...</>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Gerar Link
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Links List */}
        <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Meus Links ({links.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            ) : links.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum link criado ainda</p>
                <p className="text-sm mt-2">Crie seu primeiro link de rastreamento acima</p>
              </div>
            ) : (
              <div className="space-y-4">
                {links.map((link) => (
                  <div 
                    key={link.id}
                    className="p-4 rounded-lg border border-gray-700 bg-gray-900/50 hover:border-gray-600 transition-colors"
                    data-testid={`link-card-${link.id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {link.productName && (
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              {link.productName}
                            </Badge>
                          )}
                          {link.operationName && (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                              {link.operationName}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <code className="bg-gray-800 px-2 py-1 rounded text-xs">
                            {link.url}
                          </code>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(link.url)}
                          className="text-gray-400 hover:text-white"
                          data-testid={`button-copy-${link.id}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openQrDialog(link.url)}
                          className="text-gray-400 hover:text-white"
                          data-testid={`button-qr-${link.id}`}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(link.url, '_blank')}
                          className="text-gray-400 hover:text-white"
                          data-testid={`button-open-${link.id}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteLinkMutation.mutate(link.id)}
                          className="text-red-400 hover:text-red-300"
                          data-testid={`button-delete-${link.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-700">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                          <Eye className="h-3 w-3" />
                          Clicks
                        </div>
                        <div className="text-lg font-bold text-white">
                          {link.clicks || 0}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                          <TrendingUp className="h-3 w-3" />
                          Conversões
                        </div>
                        <div className="text-lg font-bold text-white">
                          {link.conversions || 0}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                          <DollarSign className="h-3 w-3" />
                          Comissão
                        </div>
                        <div className="text-lg font-bold text-white">
                          €{(link.commission || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      Criado em: {new Date(link.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">QR Code do Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <QrCode className="h-48 w-48 text-gray-800 mx-auto" />
                <p className="text-sm text-gray-600 mt-4">
                  QR Code será gerado aqui
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-400 break-all">
              <strong>URL:</strong> {selectedLinkForQr}
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => copyToClipboard(selectedLinkForQr)}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AffiliateLayout>
  );
}
