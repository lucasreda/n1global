import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Package, Save, Upload, Calculator } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const createProductSchema = z.object({
  sku: z.string().min(1, "SKU é obrigatório"),
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  type: z.enum(["fisico", "nutraceutico"]),
  price: z.coerce.number().min(0.01, "Preço deve ser maior que 0"),
  costPrice: z.coerce.number().min(0, "Custo deve ser maior ou igual a 0"),
  initialStock: z.coerce.number().min(0, "Estoque deve ser maior ou igual a 0"),
  lowStock: z.coerce.number().min(0, "Alerta de estoque deve ser maior ou igual a 0"),
  imageUrl: z.string().url().optional().or(z.literal(""))
});

type CreateProductForm = z.infer<typeof createProductSchema>;

export default function SupplierCreateProduct() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [profitMargin, setProfitMargin] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const form = useForm<CreateProductForm>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      type: "fisico",
      price: 0,
      costPrice: 0,
      initialStock: 0,
      lowStock: 10,
      imageUrl: ""
    }
  });

  const costPrice = form.watch('costPrice');
  const price = form.watch('price');

  // Calculadora de margem de lucro
  useEffect(() => {
    if (costPrice > 0 && price > 0) {
      const margin = ((price - costPrice) / price) * 100;
      setProfitMargin(Math.max(0, margin));
    } else {
      setProfitMargin(0);
    }
  }, [costPrice, price]);

  // Função para calcular preço baseado na margem desejada
  const calculatePriceFromMargin = (desiredMargin: number) => {
    if (costPrice > 0 && desiredMargin > 0 && desiredMargin < 100) {
      const calculatedPrice = costPrice / (1 - desiredMargin / 100);
      form.setValue('price', parseFloat(calculatedPrice.toFixed(2)));
    }
  };

  const createProductMutation = useMutation({
    mutationFn: async (data: CreateProductForm) => {
      return await apiRequest('/api/supplier/products', 'POST', data);
    },
    onSuccess: (response: any) => {
      // Save product data for success page
      const productData = {
        id: response.id || 'temp-id',
        sku: form.getValues().sku,
        name: form.getValues().name,
        description: form.getValues().description,
        type: form.getValues().type,
        price: parseFloat(form.getValues().price.toString()),
        costPrice: parseFloat(form.getValues().costPrice.toString()),
        initialStock: form.getValues().initialStock,
        lowStock: form.getValues().lowStock,
        imageUrl: form.getValues().imageUrl || undefined,
        status: 'pending' as const,
      };
      
      sessionStorage.setItem('createdProduct', JSON.stringify(productData));
      
      // Redirect to success page
      setLocation('/supplier/product-success');
      
      queryClient.invalidateQueries({ queryKey: ['/api/supplier/products'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar produto",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: CreateProductForm) => {
    createProductMutation.mutate(data);
  };

  if (user?.role !== 'supplier') {
    setLocation('/supplier');
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-6">
      {/* Back button */}
      <div className="mb-4" style={{ marginTop: '-20px' }}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation('/supplier')}
          className="flex items-center gap-2"
          data-testid="button-back-dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Dashboard
        </Button>
      </div>

      {/* Header */}
      <div className="mb-6" style={{ marginTop: '10px' }}>
        <h1 className="text-2xl font-bold">Criar Novo Produto</h1>
        <p className="text-muted-foreground">
          Adicione um novo produto ao seu catálogo global
        </p>
      </div>

      {/* Main Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Informações do Produto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Upload de Imagem */}
            <div className="space-y-4 mb-6">
              <Label className="text-sm font-medium">Imagem do Produto</Label>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="flex items-center gap-2"
                  data-testid="button-upload-image"
                >
                  <Upload className="h-4 w-4" />
                  {imageFile ? 'Alterar Imagem' : 'Selecionar Imagem'}
                </Button>
                
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFile(file);
                      form.setValue('imageUrl', URL.createObjectURL(file));
                    }
                  }}
                  className="hidden"
                />
                
                {imageFile && (
                  <span className="text-sm text-green-600">
                    {imageFile.name} ({(imageFile.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                )}
              </div>
              
              {form.watch('imageUrl') && (
                <div className="mt-2">
                  <img
                    src={form.watch('imageUrl')}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded border"
                  />
                </div>
              )}
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  {...form.register("sku")}
                  placeholder="Ex: PROD-001"
                  data-testid="input-sku"
                />
                {form.formState.errors.sku && (
                  <p className="text-sm text-red-500">{form.formState.errors.sku.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome do Produto *</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Ex: Produto Premium"
                  data-testid="input-name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Descreva as características e benefícios do produto..."
                rows={3}
                data-testid="input-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo do Produto *</Label>
              <Select
                value={form.watch("type")}
                onValueChange={(value) => form.setValue("type", value as "fisico" | "nutraceutico")}
              >
                <SelectTrigger data-testid="select-type">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fisico">Físico</SelectItem>
                  <SelectItem value="nutraceutico">Nutracêutico</SelectItem>
                </SelectContent>
              </Select>
            </div>



            {/* Inventory */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="initialStock">Estoque Inicial</Label>
                <Input
                  id="initialStock"
                  type="number"
                  {...form.register("initialStock")}
                  placeholder="0"
                  data-testid="input-initial-stock"
                />
                {form.formState.errors.initialStock && (
                  <p className="text-sm text-red-500">{form.formState.errors.initialStock.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lowStock">Alerta de Estoque Baixo</Label>
                <Input
                  id="lowStock"
                  type="number"
                  {...form.register("lowStock")}
                  placeholder="10"
                  data-testid="input-low-stock"
                />
                {form.formState.errors.lowStock && (
                  <p className="text-sm text-red-500">{form.formState.errors.lowStock.message}</p>
                )}
              </div>
            </div>

            {/* Calculadora de Preço e Margem */}
            <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="h-4 w-4 text-blue-400" />
                <Label className="text-sm font-medium text-gray-200">Calculadora de Margem</Label>
              </div>
              
              {/* Campos de Preço */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="costPrice">Custo de Produção (€) *</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    {...form.register("costPrice")}
                    placeholder="0.00"
                    data-testid="input-cost-price"
                  />
                  {form.formState.errors.costPrice && (
                    <p className="text-sm text-red-500">{form.formState.errors.costPrice.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price" className="flex items-center gap-2">
                    Preço B2B (€) *
                    {profitMargin > 0 && (
                      <span className="text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded border border-green-700">
                        {profitMargin.toFixed(1)}% margem
                      </span>
                    )}
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    {...form.register("price")}
                    placeholder="0.00"
                    data-testid="input-price"
                    className={profitMargin > 0 ? "border-green-700 bg-green-900/20" : ""}
                  />
                  {form.formState.errors.price && (
                    <p className="text-sm text-red-500">{form.formState.errors.price.message}</p>
                  )}
                </div>
              </div>

              {/* Calculadora Automática */}
              {costPrice > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-600">
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-300">Margem Atual</Label>
                    <div className="px-3 py-2 bg-gray-900 rounded border border-gray-600 text-sm font-medium text-gray-100">
                      {profitMargin.toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-300">Calcular para 30%</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => calculatePriceFromMargin(30)}
                      className="w-full justify-start bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
                      data-testid="button-margin-30"
                    >
                      €{(costPrice / 0.7).toFixed(2)}
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-300">Calcular para 50%</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => calculatePriceFromMargin(50)}
                      className="w-full justify-start bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
                      data-testid="button-margin-50"
                    >
                      €{(costPrice / 0.5).toFixed(2)}
                    </Button>
                  </div>
                </div>
              )}
            </div>



            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/supplier')}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createProductMutation.isPending}
                data-testid="button-save-product"
                className="flex items-center gap-2 text-white [&>svg]:text-white"
              >
                {createProductMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 text-white" />
                    Salvar Produto
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}