import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SimpleImageUploader } from "@/components/SimpleImageUploader";

interface CreateProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductCreated: () => void;
}

interface ProductFormData {
  sku: string;
  name: string;
  description: string;
  type: string;
  price: number;
  costPrice: number;
  initialStock: number;
  lowStock: number;
  imageUrl?: string;
}

export function CreateProductModal({ open, onOpenChange, onProductCreated }: CreateProductModalProps) {
  const { toast } = useToast();
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [formData, setFormData] = useState<ProductFormData>({
    sku: '',
    name: '',
    description: '',
    type: 'fisico',
    price: 0,
    costPrice: 0,
    initialStock: 0,
    lowStock: 10,
    imageUrl: ''
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const response = await apiRequest('POST', '/api/supplier/products', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Produto criado com sucesso!",
        description: "Seu produto global foi adicionado ao catálogo.",
      });
      onProductCreated();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar produto",
        description: error.message || "Ocorreu um erro inesperado.",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      sku: '',
      name: '',
      description: '',
      type: 'fisico',
      price: 0,
      costPrice: 0,
      initialStock: 0,
      lowStock: 10,
      imageUrl: ''
    });
    setUploadedImageUrl("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sku || !formData.name || !formData.price) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "SKU, Nome e Preço são obrigatórios.",
      });
      return;
    }

    // Include the uploaded image URL if available
    const productData = {
      ...formData,
      imageUrl: uploadedImageUrl || formData.imageUrl
    };

    createProductMutation.mutate(productData);
  };

  const handleImageUpload = (imageUrl: string) => {
    setUploadedImageUrl(imageUrl);
    setFormData(prev => ({ ...prev, imageUrl }));
  };

  const handleImageRemove = () => {
    setUploadedImageUrl("");
    setFormData(prev => ({ ...prev, imageUrl: '' }));
  };

  const handleInputChange = (field: keyof ProductFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Produto Global</DialogTitle>
          <DialogDescription>
            Crie um produto que ficará disponível para todas as operações que quiserem vendê-lo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleInputChange('sku', e.target.value)}
                placeholder="Ex: PROD001"
                data-testid="input-sku"
              />
            </div>
            <div>
              <Label htmlFor="type">Tipo</Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                <SelectTrigger data-testid="select-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fisico">Físico</SelectItem>
                  <SelectItem value="nutraceutico">Nutracêutico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

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

          {/* Image Upload Section */}
          <div>
            <Label>Imagem do Produto</Label>
            <div className="mt-2">
              <SimpleImageUploader
                onImageUpload={handleImageUpload}
                currentImageUrl={uploadedImageUrl}
                onImageRemove={handleImageRemove}
              />
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
              disabled={createProductMutation.isPending}
              data-testid="button-submit"
            >
              {createProductMutation.isPending ? "Criando..." : "Criar Produto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}