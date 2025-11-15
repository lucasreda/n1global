import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SimpleImageUploader } from "@/components/SimpleImageUploader";
import { Calculator, TrendingUp, AlertCircle } from "lucide-react";

interface EditProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
  onProductUpdated: () => void;
}

export function EditProductModal({ open, onOpenChange, product, onProductUpdated }: EditProductModalProps) {
  const { toast } = useToast();
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || 0,
    costPrice: product?.costPrice || 0,
    shippingCost: product?.shippingCost || 0,
    initialStock: product?.initialStock || 0,
    lowStock: product?.lowStock || 10,
    imageUrl: product?.imageUrl || ''
  });

  // Calculate suggested price (cost + 20%)
  const suggestedPrice = formData.costPrice > 0 ? formData.costPrice * 1.2 : 0;
  
  // Calculate maximum allowed price (cost + 27%)
  const maxPrice = formData.costPrice > 0 ? formData.costPrice * 1.27 : 0;
  
  // Calculate profit margins
  const profitPerUnit = formData.price - formData.costPrice;
  const profitMargin = formData.costPrice > 0 ? ((profitPerUnit / formData.costPrice) * 100) : 0;
  const totalEstimatedProfit = profitPerUnit * formData.initialStock;
  
  // EUR to BRL conversion (approximate rate: 1 EUR = 6.2 BRL)
  const eurToBrlRate = 6.2;
  const profitPerUnitBRL = profitPerUnit * eurToBrlRate;
  const totalEstimatedProfitBRL = totalEstimatedProfit * eurToBrlRate;

  // Format currency to Brazilian format (R$ 1.234,56)
  const formatBRL = (value: number) => {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatEUR = (value: number) => {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Update price if it exceeds maximum when cost changes
  useEffect(() => {
    if (formData.price > maxPrice && maxPrice > 0) {
      setFormData(prev => ({ ...prev, price: maxPrice }));
    }
  }, [formData.costPrice, maxPrice]);

  // Update state when product changes
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || 0,
        costPrice: product.costPrice || 0,
        shippingCost: product.shippingCost || 0,
        initialStock: product.initialStock || 0,
        lowStock: product.lowStock || 10,
        imageUrl: product.imageUrl || ''
      });
      setUploadedImageUrl(product.imageUrl || '');
    }
  }, [product]);

  const updateProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PUT', `/api/supplier/products/${product.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Produto atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
      onProductUpdated();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar produto",
        description: error.message || "Ocorreu um erro inesperado.",
      });
    },
  });

  // Image upload mutation for updating product image
  const updateImageMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const response = await apiRequest('PUT', `/api/supplier/products/${product.id}/image`, {
        imageURL: imageUrl
      });
      return response.json();
    },
    onSuccess: (data) => {
      setFormData(prev => ({ ...prev, imageUrl: data.objectPath }));
      toast({
        title: "Imagem atualizada!",
        description: "A imagem do produto foi atualizada com sucesso.",
      });
      onProductUpdated();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar imagem",
        description: error.message || "Ocorreu um erro inesperado.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.costPrice || !formData.price) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Nome, Custo de Produção e Preço de Venda são obrigatórios.",
      });
      return;
    }

    if (formData.price > maxPrice) {
      toast({
        variant: "destructive",
        title: "Preço muito alto",
        description: `O preço não pode ser superior a ${maxPrice.toFixed(2)}€ (máximo 27% sobre o custo).`,
      });
      return;
    }

    updateProductMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (imageUrl: string) => {
    console.log('Image uploaded, URL received:', imageUrl);
    setUploadedImageUrl(imageUrl);
    setFormData(prev => ({ ...prev, imageUrl }));
    console.log('Form data updated with imageUrl:', imageUrl);
  };

  const handleImageRemove = () => {
    setUploadedImageUrl("");
    setFormData(prev => ({ ...prev, imageUrl: '' }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Produto</DialogTitle>
          <DialogDescription>
            Edite as informações do produto {product?.name} (SKU: {product?.sku})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Produto *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Nome do produto"
              data-testid="input-name"
            />
          </div>

          {/* Image Upload Section */}
          <div>
            <Label>Imagem do Produto</Label>
            <div className="mt-2">
              <SimpleImageUploader
                onImageUpload={handleImageUpload}
                currentImageUrl={uploadedImageUrl || formData.imageUrl}
                onImageRemove={handleImageRemove}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descrição detalhada do produto"
              rows={3}
              data-testid="textarea-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="initialStock">Estoque Inicial</Label>
              <Input
                id="initialStock"
                type="number"
                min="0"
                value={formData.initialStock}
                onChange={(e) => handleInputChange('initialStock', parseInt(e.target.value) || 0)}
                data-testid="input-initial-stock"
              />
            </div>
            <div>
              <Label htmlFor="lowStock">Estoque Baixo</Label>
              <Input
                id="lowStock"
                type="number"
                min="0"
                value={formData.lowStock}
                onChange={(e) => handleInputChange('lowStock', parseInt(e.target.value) || 0)}
                data-testid="input-low-stock"
              />
            </div>
          </div>

          {/* Pricing Section */}
          <div className="space-y-4 p-4 bg-gradient-to-br from-slate-900/50 to-slate-800/50 border border-slate-700/50 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-400" />
              <h3 className="font-medium text-sm text-slate-200">Calculadora de Preços B2B</h3>
            </div>
            
            <div>
              <Label htmlFor="costPrice">Custo de Produção (€) *</Label>
              <Input
                id="costPrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.costPrice}
                onChange={(e) => handleInputChange('costPrice', parseFloat(e.target.value) || 0)}
                data-testid="input-cost-price"
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Seu custo real para produzir/adquirir este produto
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="price">Preço de Venda B2B (€) *</Label>
                {suggestedPrice > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Sugerido: €{suggestedPrice.toFixed(2)}
                  </Badge>
                )}
              </div>
              <Input
                id="price"
                type="number"
                min="0"
                max={maxPrice}
                step="0.01"
                value={formData.price}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  handleInputChange('price', Math.min(value, maxPrice));
                }}
                data-testid="input-price"
                placeholder="0.00"
                disabled={!formData.costPrice}
              />
              <div className="mt-1 space-y-1">
                <p className="text-xs text-muted-foreground">
                  Preço que você cobra das operações (máximo: €{maxPrice.toFixed(2)})
                </p>
                {formData.costPrice > 0 && formData.price > maxPrice && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Limite de 27% sobre o custo excedido
                  </p>
                )}
              </div>
            </div>

            {/* Profit Calculator */}
            {formData.costPrice > 0 && formData.price > 0 && (
              <div className="bg-gradient-to-br from-emerald-900/30 to-green-900/30 border border-emerald-500/30 p-4 rounded-lg backdrop-blur-sm">
                <h4 className="font-semibold text-base mb-3 flex items-center gap-2 text-emerald-300">
                  <TrendingUp className="h-5 w-5" />
                  💰 Análise de Rentabilidade
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-slate-800/50 rounded border border-slate-600/50">
                      <span className="text-xs text-slate-400 block mb-1">Lucro por Unidade</span>
                      <div className="space-y-1">
                        <p className="font-bold text-xl text-white">R$ {formatBRL(profitPerUnitBRL)}</p>
                        <p className="text-sm text-slate-400">€{formatEUR(profitPerUnit)}</p>
                      </div>
                    </div>
                    <div className="text-center p-3 bg-slate-800/50 rounded border border-slate-600/50">
                      <span className="text-xs text-slate-400 block mb-1">Margem de Lucro</span>
                      <p className="font-bold text-xl text-blue-400">{profitMargin.toFixed(1)}%</p>
                    </div>
                  </div>
                  
                  {/* Always show stock analysis section, but with different content */}
                  <div className="text-center p-4 bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-emerald-400/50 rounded-lg">
                    {formData.initialStock > 0 ? (
                      <>
                        <span className="text-sm text-emerald-300 block mb-2">🚀 Potencial de Lucro Total (Estoque Completo)</span>
                        <div className="space-y-1">
                          <p className="font-bold text-3xl text-white">R$ {formatBRL(totalEstimatedProfitBRL)}</p>
                          <p className="text-lg text-emerald-300">€{formatEUR(totalEstimatedProfit)}</p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-emerald-500/30">
                          <p className="text-xs text-emerald-400">{formData.initialStock} unidades × R$ {formatBRL(profitPerUnitBRL)} lucro</p>
                          <p className="text-xs text-slate-400">Taxa EUR/BRL: {eurToBrlRate}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-slate-300 block mb-2">📦 Análise de Estoque</span>
                        <p className="text-slate-400 text-sm">Defina o estoque inicial para ver o potencial de lucro total</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Product Metrics */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-3 text-gray-100">Informações do Produto</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">SKU:</span>
                <div className="font-medium text-gray-200">{product?.sku}</div>
              </div>
              <div>
                <span className="text-gray-400">Tipo:</span>
                <div className="font-medium text-gray-200">
                  {product?.type === 'fisico' ? 'Físico' : 'Nutracêutico'}
                </div>
              </div>
              <div>
                <span className="text-gray-400">Criado em:</span>
                <div className="font-medium text-gray-200">
                  {product?.createdAt ? new Date(product.createdAt).toLocaleDateString('pt-BR') : '-'}
                </div>
              </div>
              <div>
                <span className="text-gray-400">Atualizado em:</span>
                <div className="font-medium text-gray-200">
                  {product?.updatedAt ? new Date(product.updatedAt).toLocaleDateString('pt-BR') : '-'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={updateProductMutation.isPending || updateImageMutation.isPending}
              data-testid="button-submit"
            >
              {updateProductMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}