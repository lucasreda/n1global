import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Package,
  Search,
  Filter,
  Eye,
  Plus,
  ImageIcon,
  CheckCircle,
  FileText,
  Settings,
  Upload,
  X
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  costPrice: number;
  status: 'pending' | 'contract_sent' | 'contract_signed' | 'approved' | 'rejected';
  supplierId: string;
  supplierName: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProductApprovalModalProps {
  product: Product;
  open: boolean;
  onClose: () => void;
}

// Modal component for product approval
function ProductApprovalModal({ product, open, onClose }: ProductApprovalModalProps) {
  const [deliveryDays, setDeliveryDays] = useState(30);
  const [minimumOrder, setMinimumOrder] = useState(1);
  const [commissionRate, setCommissionRate] = useState(15);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sendContractMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/products/${product.id}/send-contract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          deliveryDays,
          minimumOrder,
          commissionRate
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao enviar contrato');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contrato enviado",
        description: "O contrato foi enviado ao fornecedor com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Aprovar Produto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Produto</Label>
              <div className="p-2 bg-muted rounded">{product.name}</div>
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <div className="p-2 bg-muted rounded">{product.sku}</div>
            </div>
            <div className="space-y-2">
              <Label>Preço</Label>
              <div className="p-2 bg-muted rounded">€{product.price}</div>
            </div>
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <div className="p-2 bg-muted rounded">{product.supplierName}</div>
            </div>
          </div>

          {product.description && (
            <div className="space-y-2">
              <Label>Descrição</Label>
              <div className="p-2 bg-muted rounded text-sm">{product.description}</div>
            </div>
          )}

          {product.imageUrl && (
            <div className="space-y-2">
              <Label>Imagem do Produto</Label>
              <div className="w-32 h-32 border rounded overflow-hidden">
                <img 
                  src={product.imageUrl} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling!.classList.remove('hidden');
                  }}
                />
                <div className="hidden w-full h-full flex items-center justify-center bg-gray-100">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
              </div>
            </div>
          )}

          {/* Contract Terms */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">Termos do Contrato</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deliveryDays">Prazo de Entrega (dias)</Label>
                <Input
                  id="deliveryDays"
                  type="number"
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(Number(e.target.value))}
                  min="1"
                  max="365"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimumOrder">Pedido Mínimo</Label>
                <Input
                  id="minimumOrder"
                  type="number"
                  value={minimumOrder}
                  onChange={(e) => setMinimumOrder(Number(e.target.value))}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commissionRate">Taxa de Comissão (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Number(e.target.value))}
                  min="0"
                  max="50"
                  step="0.5"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={sendContractMutation.isPending}>
              Cancelar
            </Button>
            <Button 
              onClick={() => sendContractMutation.mutate()}
              disabled={sendContractMutation.isPending}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {sendContractMutation.isPending ? 'Enviando...' : 'Enviar Contrato'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Cost Configuration Modal Component
function CostConfigurationModal({ product, open, onClose }: { product: Product; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [shippingCost, setShippingCost] = useState("0");
  
  const approveMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/products/${product.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        body: JSON.stringify({
          shippingCost: Number(shippingCost)
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao aprovar produto');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Produto aprovado",
        description: "O produto foi aprovado e está ativo no sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurar Custos
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="border rounded-md p-4" style={{ backgroundColor: '#0f0f0f', borderColor: '#252525' }}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Settings className="h-5 w-5 text-blue-400 mt-0.5" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-white mb-1">
                  Configuração Final do Produto
                </h4>
                <p className="text-sm text-gray-300">
                  O contrato para <strong className="text-white">{product.name}</strong> foi assinado pelo fornecedor. 
                  Configure o custo de envio e aprove o produto para ativá-lo no sistema.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="productInfo">Produto</Label>
              <div className="text-sm text-muted-foreground">
                {product.name} (SKU: {product.sku})
              </div>
            </div>
            
            <div>
              <Label htmlFor="currentPrice">Preço de Venda</Label>
              <div className="text-sm font-medium">
                €{product.price.toFixed(2)}
              </div>
            </div>

            <div>
              <Label htmlFor="costPrice">Custo do Produto</Label>
              <div className="text-sm font-medium">
                €{product.costPrice.toFixed(2)}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shippingCost">Custo de Envio *</Label>
              <Input
                id="shippingCost"
                type="number"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              <p className="text-xs text-muted-foreground">
                Configure o custo médio de envio para este produto
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={approveMutation.isPending}>
            Cancelar
          </Button>
          <Button 
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
            className="flex items-center gap-2 text-white"
          >
            <CheckCircle className="h-4 w-4 text-white" />
            {approveMutation.isPending ? 'Aprovando...' : 'Aprovar Produto'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// New Product Modal Component
function NewProductModal({ open, onClose }: { 
  open: boolean; 
  onClose: () => void; 
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    type: "nutraceutico" as "fisico" | "nutraceutico",
    price: "",
    costPrice: "",
    shippingCost: "",
    description: "",
    weight: "",
    height: "",
    width: "",
    depth: "",
    availableCountries: [] as string[]
  });

  const handleImageSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageSelect(file);
  };

  const createProductMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("auth_token");
      let imageUrl = "";

      // Upload image if selected
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);

        const uploadResponse = await fetch('/api/page-builder/upload-image', {
          method: 'POST',
          headers: {
            ...(token && { "Authorization": `Bearer ${token}` }),
          },
          credentials: 'include',
          body: formData
        });

        if (!uploadResponse.ok) {
          throw new Error('Erro ao fazer upload da imagem');
        }

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.url;
      }

      // Create product
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          imageUrl,
          price: parseFloat(formData.price),
          costPrice: parseFloat(formData.costPrice),
          shippingCost: parseFloat(formData.shippingCost),
          weight: formData.weight ? parseFloat(formData.weight) : undefined,
          height: formData.height ? parseFloat(formData.height) : undefined,
          width: formData.width ? parseFloat(formData.width) : undefined,
          depth: formData.depth ? parseFloat(formData.depth) : undefined,
          availableCountries: formData.availableCountries,
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar produto');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Produto criado",
        description: "O produto foi criado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      onClose();
      setFormData({
        name: "",
        sku: "",
        type: "nutraceutico",
        price: "",
        costPrice: "",
        shippingCost: "",
        description: "",
        weight: "",
        height: "",
        width: "",
        depth: "",
        availableCountries: []
      });
      setImageFile(null);
      setImagePreview("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProductMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-full h-screen w-screen m-0 rounded-none p-0">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="border-b px-8 py-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <Package className="h-6 w-6" />
                Novo Produto
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 pb-24">
              {/* Left Column - Image Upload */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Imagem do Produto</h3>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
                      isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 dark:border-gray-700'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {imagePreview ? (
                      <div className="space-y-4">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-64 object-contain rounded-lg bg-gray-50 dark:bg-gray-900"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Trocar Imagem
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setImageFile(null);
                              setImagePreview("");
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Arraste uma imagem ou clique para selecionar
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Selecionar Imagem
                        </Button>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageSelect(file);
                      }}
                    />
                  </div>
                </div>

                {/* Country Availability */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Países Disponíveis</h3>
                  <div className="border rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { code: 'ES', name: 'Espanha', flag: '🇪🇸' },
                        { code: 'IT', name: 'Itália', flag: '🇮🇹' },
                        { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
                        { code: 'RO', name: 'Romênia', flag: '🇷🇴' },
                        { code: 'GR', name: 'Grécia', flag: '🇬🇷' },
                        { code: 'SK', name: 'Eslováquia', flag: '🇸🇰' },
                        { code: 'HR', name: 'Croácia', flag: '🇭🇷' },
                        { code: 'CZ', name: 'República Tcheca', flag: '🇨🇿' },
                        { code: 'PL', name: 'Polônia', flag: '🇵🇱' },
                        { code: 'HU', name: 'Hungria', flag: '🇭🇺' },
                        { code: 'AT', name: 'Áustria', flag: '🇦🇹' },
                        { code: 'UA', name: 'Ucrânia', flag: '🇺🇦' },
                        { code: 'NL', name: 'Holanda', flag: '🇳🇱' },
                        { code: 'AE', name: 'Emirados Árabes Unidos', flag: '🇦🇪' },
                        { code: 'SA', name: 'Arábia Saudita', flag: '🇸🇦' },
                      ].map((country) => (
                        <button
                          key={country.code}
                          type="button"
                          onClick={() => {
                            const isSelected = formData.availableCountries.includes(country.code);
                            setFormData({
                              ...formData,
                              availableCountries: isSelected
                                ? formData.availableCountries.filter(c => c !== country.code)
                                : [...formData.availableCountries, country.code]
                            });
                          }}
                          className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                            formData.availableCountries.includes(country.code)
                              ? 'border-primary bg-primary/10'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                          data-testid={`button-country-${country.code.toLowerCase()}`}
                        >
                          <span className="text-2xl">{country.flag}</span>
                          <span className="text-sm font-medium">{country.name}</span>
                        </button>
                      ))}
                    </div>
                    {formData.availableCountries.length > 0 && (
                      <div className="mt-3 text-sm text-muted-foreground">
                        {formData.availableCountries.length} {formData.availableCountries.length === 1 ? 'país selecionado' : 'países selecionados'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Product Details */}
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Informações Básicas</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Produto *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="Ex: Vitamina C 1000mg"
                        data-testid="input-product-name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sku">SKU *</Label>
                        <Input
                          id="sku"
                          value={formData.sku}
                          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                          required
                          placeholder="Ex: VIT-C-1000"
                          data-testid="input-product-sku"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="type">Tipo *</Label>
                        <Select 
                          value={formData.type} 
                          onValueChange={(value: "fisico" | "nutraceutico") => setFormData({ ...formData, type: value })}
                        >
                          <SelectTrigger id="type" data-testid="select-product-type">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nutraceutico">Nutraceutico</SelectItem>
                            <SelectItem value="fisico">Físico</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Descrição breve do produto"
                        data-testid="input-product-description"
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Preços</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Venda (€) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                        placeholder="0.00"
                        data-testid="input-product-price"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="costPrice">Custo (€) *</Label>
                      <Input
                        id="costPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.costPrice}
                        onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                        required
                        placeholder="0.00"
                        data-testid="input-product-cost"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shippingCost">Envio (€) *</Label>
                      <Input
                        id="shippingCost"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.shippingCost}
                        onChange={(e) => setFormData({ ...formData, shippingCost: e.target.value })}
                        required
                        placeholder="0.00"
                        data-testid="input-product-shipping"
                      />
                    </div>
                  </div>
                </div>

                {/* Dimensions & Weight */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Dimensões e Peso</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="weight">Peso (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                        placeholder="0.00"
                        data-testid="input-product-weight"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="height">Altura (cm)</Label>
                      <Input
                        id="height"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.height}
                        onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                        placeholder="0.00"
                        data-testid="input-product-height"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="width">Largura (cm)</Label>
                      <Input
                        id="width"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.width}
                        onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                        placeholder="0.00"
                        data-testid="input-product-width"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="depth">Profundidade (cm)</Label>
                      <Input
                        id="depth"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.depth}
                        onChange={(e) => setFormData({ ...formData, depth: e.target.value })}
                        placeholder="0.00"
                        data-testid="input-product-depth"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="border-t px-8 py-4 flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={createProductMutation.isPending}
              data-testid="button-cancel-product"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createProductMutation.isPending}
              className="flex items-center gap-2"
              data-testid="button-create-product"
            >
              <Plus className="h-4 w-4" />
              {createProductMutation.isPending ? 'Criando...' : 'Criar Produto'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminProducts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showNewProductModal, setShowNewProductModal] = useState(false);

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/admin/products', searchTerm, statusFilter, supplierFilter],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (supplierFilter !== 'all') params.append('supplierId', supplierFilter);
      
      const response = await fetch(`/api/admin/products?${params.toString()}`, {
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      return response.json();
    }
  });

  const { data: suppliers } = useQuery<Array<{ id: string; name: string; email: string }>>({
    queryKey: ['/api/admin/suppliers'],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch('/api/admin/suppliers', {
        headers: {
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch suppliers');
      }
      
      return response.json();
    }
  });

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'contract_sent': 'bg-blue-100 text-blue-800 border-blue-300',
      'contract_signed': 'bg-purple-100 text-purple-800 border-purple-300',
      'approved': 'bg-green-100 text-green-800 border-green-300',
      'rejected': 'bg-red-100 text-red-800 border-red-300',
    };
    
    const statusLabels = {
      'pending': 'Pendente',
      'contract_sent': 'Contrato Enviado',
      'contract_signed': 'Contrato Assinado',
      'approved': 'Aprovado',
      'rejected': 'Rejeitado',
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 border-gray-300'}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </Badge>
    );
  };

  const getStatusCount = (status: string) => {
    if (!products) return 0;
    return products.filter(product => product.status === status).length;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold tracking-tight text-gray-900 dark:text-gray-100" style={{ fontSize: '22px' }}>
            Produtos
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie todos os produtos do sistema
          </p>
        </div>
        <Button 
          className="text-white" 
          onClick={() => setShowNewProductModal(true)}
          data-testid="button-new-product"
        >
          <Plus className="h-4 w-4 mr-2 text-white" />
          Novo Produto
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products?.length || 0}</div>
            <p className="text-xs text-muted-foreground">produtos no sistema</p>
          </CardContent>
        </Card>

        <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <div className="h-4 w-4 rounded-full bg-yellow-400"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{getStatusCount('pending')}</div>
            <p className="text-xs text-muted-foreground">aguardando aprovação</p>
          </CardContent>
        </Card>

        <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contrato Enviado</CardTitle>
            <div className="h-4 w-4 rounded-full bg-blue-400"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{getStatusCount('contract_sent')}</div>
            <p className="text-xs text-muted-foreground">aguardando resposta</p>
          </CardContent>
        </Card>

        <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
            <div className="h-4 w-4 rounded-full bg-green-400"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{getStatusCount('approved')}</div>
            <p className="text-xs text-muted-foreground">produtos ativos</p>
          </CardContent>
        </Card>

        <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejeitados</CardTitle>
            <div className="h-4 w-4 rounded-full bg-red-400"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{getStatusCount('rejected')}</div>
            <p className="text-xs text-muted-foreground">produtos rejeitados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="contract_sent">Contrato Enviado</SelectItem>
                <SelectItem value="contract_signed">Contrato Assinado</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
              </SelectContent>
            </Select>

            {/* Supplier Filter */}
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos fornecedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos fornecedores</SelectItem>
                {suppliers?.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card style={{backgroundColor: '#0f0f0f', borderColor: '#252525'}}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produtos ({products?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {productsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando produtos...</p>
              </div>
            </div>
          ) : products && products.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold">Produto</th>
                    <th className="text-left py-3 px-4 font-semibold">SKU</th>
                    <th className="text-left py-3 px-4 font-semibold">Fornecedor</th>
                    <th className="text-left py-3 px-4 font-semibold">Preços</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Criado em</th>
                    <th className="text-left py-3 px-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.category && (
                              <p className="text-sm text-muted-foreground">{product.category}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {product.sku}
                        </code>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">{product.supplierName}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm">
                            <span className="font-medium">Venda:</span> €{product.price.toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <span>Custo:</span> €{product.costPrice.toFixed(2)}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(product.status)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">
                          {new Date(product.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {product.status === 'approved' && (
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {product.status === 'pending' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedProduct(product)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                          )}
                          {product.status === 'contract_signed' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedProduct(product)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Configurar Custos
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
              <p className="text-muted-foreground">
                Tente ajustar os filtros para encontrar produtos
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Approval Modal */}
      {selectedProduct && selectedProduct.status === 'pending' && (
        <ProductApprovalModal
          product={selectedProduct}
          open={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Cost Configuration Modal */}
      {selectedProduct && selectedProduct.status === 'contract_signed' && (
        <CostConfigurationModal
          product={selectedProduct}
          open={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* New Product Modal */}
      <NewProductModal
        open={showNewProductModal}
        onClose={() => setShowNewProductModal(false)}
      />
    </div>
  );
}