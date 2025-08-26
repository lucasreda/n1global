import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SimpleImageUploader } from "@/components/SimpleImageUploader";
import { Calculator, TrendingUp, AlertCircle } from "lucide-react";

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

  // Calculate suggested price (cost + 20%)
  const suggestedPrice = formData.costPrice > 0 ? formData.costPrice * 1.2 : 0;
  
  // Calculate maximum allowed price (cost + 27%)
  const maxPrice = formData.costPrice > 0 ? formData.costPrice * 1.27 : 0;
  
  // Calculate profit margins
  const profitPerUnit = formData.price - formData.costPrice;
  const profitMargin = formData.costPrice > 0 ? ((profitPerUnit / formData.costPrice) * 100) : 0;
  const totalEstimatedProfit = profitPerUnit * formData.initialStock;

  // Update price if it exceeds maximum when cost changes
  useEffect(() => {
    if (formData.price > maxPrice && maxPrice > 0) {
      setFormData(prev => ({ ...prev, price: maxPrice }));
    }
  }, [formData.costPrice, maxPrice]);

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
    
    if (!formData.sku || !formData.name || !formData.costPrice || !formData.price) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "SKU, Nome, Custo de Produção e Preço de Venda são obrigatórios.",
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

    // Include the uploaded image URL if available
    const productData = {
      ...formData,
      imageUrl: uploadedImageUrl || formData.imageUrl
    };

    console.log('Creating product with data:', productData);
    createProductMutation.mutate(productData);
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
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-500" />
              <h3 className="font-medium text-sm">Calculadora de Preços</h3>
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
              <div className="bg-white dark:bg-gray-700 p-3 rounded border">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Análise de Lucro
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Lucro por unidade:</span>
                    <p className="font-medium text-green-600">€{profitPerUnit.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Margem:</span>
                    <p className="font-medium">{profitMargin.toFixed(1)}%</p>
                  </div>
                  {formData.initialStock > 0 && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Lucro estimado (estoque total):</span>
                      <p className="font-medium text-green-600 text-base">€{totalEstimatedProfit.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
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