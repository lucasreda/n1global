import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Package, Save } from "lucide-react";
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
  shippingCost: z.coerce.number().min(0, "Custo de envio deve ser maior ou igual a 0"),
  initialStock: z.coerce.number().min(0, "Estoque deve ser maior ou igual a 0"),
  lowStock: z.coerce.number().min(0, "Alerta de estoque deve ser maior ou igual a 0"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  videoUrl: z.string().url().optional().or(z.literal("")),
  productUrl: z.string().url().optional().or(z.literal(""))
});

type CreateProductForm = z.infer<typeof createProductSchema>;

export default function SupplierCreateProduct() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateProductForm>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      type: "fisico",
      price: 0,
      costPrice: 0,
      shippingCost: 0,
      initialStock: 0,
      lowStock: 10,
      imageUrl: "",
      videoUrl: "",
      productUrl: ""
    }
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: CreateProductForm) => {
      return await apiRequest('/api/supplier/products', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Produto criado com sucesso!",
        description: "O produto foi adicionado ao catálogo global.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/supplier/products'] });
      setLocation('/supplier');
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

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="price">Preço B2B (€) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  {...form.register("price")}
                  placeholder="0.00"
                  data-testid="input-price"
                />
                {form.formState.errors.price && (
                  <p className="text-sm text-red-500">{form.formState.errors.price.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="costPrice">Custo de Produção (€)</Label>
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
                <Label htmlFor="shippingCost">Custo de Envio (€)</Label>
                <Input
                  id="shippingCost"
                  type="number"
                  step="0.01"
                  {...form.register("shippingCost")}
                  placeholder="0.00"
                  data-testid="input-shipping-cost"
                />
                {form.formState.errors.shippingCost && (
                  <p className="text-sm text-red-500">{form.formState.errors.shippingCost.message}</p>
                )}
              </div>
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

            {/* Media URLs */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="imageUrl">URL da Imagem</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  {...form.register("imageUrl")}
                  placeholder="https://exemplo.com/imagem.jpg"
                  data-testid="input-image-url"
                />
                {form.formState.errors.imageUrl && (
                  <p className="text-sm text-red-500">{form.formState.errors.imageUrl.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="videoUrl">URL do Vídeo</Label>
                <Input
                  id="videoUrl"
                  type="url"
                  {...form.register("videoUrl")}
                  placeholder="https://exemplo.com/video.mp4"
                  data-testid="input-video-url"
                />
                {form.formState.errors.videoUrl && (
                  <p className="text-sm text-red-500">{form.formState.errors.videoUrl.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="productUrl">URL da Página do Produto</Label>
                <Input
                  id="productUrl"
                  type="url"
                  {...form.register("productUrl")}
                  placeholder="https://loja.com/produto"
                  data-testid="input-product-url"
                />
                {form.formState.errors.productUrl && (
                  <p className="text-sm text-red-500">{form.formState.errors.productUrl.message}</p>
                )}
              </div>
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
                className="flex items-center gap-2"
              >
                {createProductMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
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