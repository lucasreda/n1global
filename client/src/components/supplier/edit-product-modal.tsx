import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SimpleImageUploader } from "@/components/SimpleImageUploader";

interface EditProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
  onProductUpdated: () => void;
}

export function EditProductModal({ open, onOpenChange, product, onProductUpdated }: EditProductModalProps) {
  const { toast } = useToast();
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
    
    if (!formData.name || !formData.price) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Nome e Preço são obrigatórios.",
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
    updateImageMutation.mutate(imageUrl);
  };

  const handleImageRemove = () => {
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    updateProductMutation.mutate({ ...formData, imageUrl: '' });
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
          {/* Product Info Section */}
          <div className="space-y-4">
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
          </div>

          {/* Image Upload Section */}
          <div>
            <Label>Imagem do Produto</Label>
            <div className="mt-2">
              <SimpleImageUploader
                onImageUpload={handleImageUpload}
                currentImageUrl={formData.imageUrl}
                onImageRemove={handleImageRemove}
              />
            </div>
          </div>

          {/* Pricing Section */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Preço de Venda B2B (€) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                data-testid="input-price"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Preço que você cobra das operações
              </p>
            </div>
            <div>
              <Label htmlFor="costPrice">Custo de Produção (€)</Label>
              <Input
                id="costPrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.costPrice}
                onChange={(e) => handleInputChange('costPrice', parseFloat(e.target.value) || 0)}
                data-testid="input-cost-price"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Seu custo real para produzir/adquirir
              </p>
            </div>
          </div>

          {/* Stock and Shipping Section */}
          <div className="grid grid-cols-3 gap-4">
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
            <div>
              <Label htmlFor="shippingCost">Custo Envio (€)</Label>
              <Input
                id="shippingCost"
                type="number"
                min="0"
                step="0.01"
                value={formData.shippingCost}
                onChange={(e) => handleInputChange('shippingCost', parseFloat(e.target.value) || 0)}
                data-testid="input-shipping-cost"
              />
            </div>
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