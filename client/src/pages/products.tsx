import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Package, DollarSign, TrendingUp, Calculator, Edit, Save, X } from "lucide-react";
import { authenticatedApiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Product cost configuration schema
const productCostSchema = z.object({
  costPrice: z.string().transform((val) => val === "" ? null : parseFloat(val)),
  shippingCost: z.string().transform((val) => val === "" ? null : parseFloat(val)),
  handlingFee: z.string().transform((val) => val === "" ? null : parseFloat(val)),
  marketingCost: z.string().transform((val) => val === "" ? null : parseFloat(val)),
  operationalCost: z.string().transform((val) => val === "" ? null : parseFloat(val)),
});

const productSchema = z.object({
  sku: z.string().min(1, "SKU é obrigatório"),
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  price: z.string().min(1, "Preço é obrigatório").transform((val) => parseFloat(val)),
  stock: z.string().transform((val) => parseInt(val) || 0),
  lowStock: z.string().transform((val) => parseInt(val) || 10),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  productUrl: z.string().optional(),
  isActive: z.boolean().default(true),
});

type Product = {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: string;
  stock: number;
  lowStock: number;
  imageUrl?: string;
  videoUrl?: string;
  productUrl?: string;
  isActive: boolean;
  costPrice?: string;
  shippingCost?: string;
  handlingFee?: string;
  marketingCost?: string;
  operationalCost?: string;
  profitMargin?: string;
  lastCostUpdate?: string;
  createdAt: string;
  updatedAt: string;
};

export default function ProductsPage() {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCosts, setEditingCosts] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/products");
      return response.json();
    },
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      const response = await authenticatedApiRequest("POST", "/api/products", {
        body: JSON.stringify(productData),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Produto criado", description: "Produto criado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsCreating(false);
    },
    onError: () => {
      toast({ 
        title: "Erro", 
        description: "Erro ao criar produto", 
        variant: "destructive" 
      });
    },
  });

  // Update product costs mutation
  const updateCostsMutation = useMutation({
    mutationFn: async ({ id, costs }: { id: string; costs: any }) => {
      const response = await authenticatedApiRequest("PATCH", `/api/products/${id}`, {
        body: JSON.stringify({
          ...costs,
          lastCostUpdate: new Date().toISOString(),
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Custos atualizados", description: "Configuração de custos salva com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setEditingCosts(null);
    },
    onError: () => {
      toast({ 
        title: "Erro", 
        description: "Erro ao atualizar custos", 
        variant: "destructive" 
      });
    },
  });

  const createForm = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      price: "",
      stock: "0",
      lowStock: "10",
      imageUrl: "",
      videoUrl: "",
      productUrl: "",
      isActive: true,
    },
  });

  const costForm = useForm({
    resolver: zodResolver(productCostSchema),
    defaultValues: {
      costPrice: "",
      shippingCost: "",
      handlingFee: "",
      marketingCost: "",
      operationalCost: "",
    },
  });

  const handleCreateProduct = (data: any) => {
    createProductMutation.mutate(data);
  };

  const handleUpdateCosts = (data: any) => {
    if (editingCosts) {
      updateCostsMutation.mutate({ id: editingCosts, costs: data });
    }
  };

  const calculateProfitMargin = (product: Product) => {
    const price = parseFloat(product.price) || 0;
    const totalCosts = 
      (parseFloat(product.costPrice || "0")) +
      (parseFloat(product.shippingCost || "0")) +
      (parseFloat(product.handlingFee || "0")) +
      (parseFloat(product.marketingCost || "0")) +
      (parseFloat(product.operationalCost || "0"));
    
    if (price === 0) return 0;
    return ((price - totalCosts) / price) * 100;
  };

  const openCostEditor = (product: Product) => {
    setEditingCosts(product.id);
    costForm.reset({
      costPrice: product.costPrice || "",
      shippingCost: product.shippingCost || "",
      handlingFee: product.handlingFee || "",
      marketingCost: product.marketingCost || "",
      operationalCost: product.operationalCost || "",
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-2 mb-6">
          <Package className="h-6 w-6 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Carregando produtos...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Package className="h-6 w-6 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Produtos & Configuração de Custos</h1>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button className="glassmorphism-light text-white border-blue-600" data-testid="button-create-product">
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="glassmorphism max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Criar Novo Produto</DialogTitle>
              <DialogDescription className="text-gray-300">
                Adicione um novo produto ao sistema
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateProduct)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-200">SKU</FormLabel>
                        <FormControl>
                          <Input {...field} className="glassmorphism-light text-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-200">Nome</FormLabel>
                        <FormControl>
                          <Input {...field} className="glassmorphism-light text-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-200">Descrição</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="glassmorphism-light text-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={createForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-200">Preço (€)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" className="glassmorphism-light text-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-200">Estoque</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" className="glassmorphism-light text-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="lowStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-200">Estoque Baixo</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" className="glassmorphism-light text-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={createForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-600 p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base text-gray-200">Produto Ativo</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreating(false)}
                    className="glassmorphism-light text-gray-200"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createProductMutation.isPending}
                    className="glassmorphism-light text-white border-blue-600"
                  >
                    {createProductMutation.isPending ? "Criando..." : "Criar Produto"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products List */}
      <div className="grid gap-6">
        {products.map((product: Product) => (
          <Card key={product.id} className="glassmorphism">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <CardTitle className="text-white">{product.name}</CardTitle>
                    <Badge variant={product.isActive ? "default" : "secondary"}>
                      {product.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <CardDescription className="text-gray-300">
                    SKU: {product.sku} | Preço: €{product.price} | Estoque: {product.stock}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openCostEditor(product)}
                  className="glassmorphism-light text-gray-200 border-orange-600"
                  data-testid={`button-edit-costs-${product.id}`}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Configurar Custos
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Financial Overview */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center space-y-1">
                  <div className="text-lg font-bold text-green-400">
                    €{product.price}
                  </div>
                  <div className="text-xs text-gray-400">Preço de Venda</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-lg font-bold text-orange-400">
                    €{(
                      (parseFloat(product.costPrice || "0")) +
                      (parseFloat(product.shippingCost || "0")) +
                      (parseFloat(product.handlingFee || "0")) +
                      (parseFloat(product.marketingCost || "0")) +
                      (parseFloat(product.operationalCost || "0"))
                    ).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">Custo Total</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-lg font-bold text-blue-400">
                    €{(parseFloat(product.price) - (
                      (parseFloat(product.costPrice || "0")) +
                      (parseFloat(product.shippingCost || "0")) +
                      (parseFloat(product.handlingFee || "0")) +
                      (parseFloat(product.marketingCost || "0")) +
                      (parseFloat(product.operationalCost || "0"))
                    )).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">Lucro Bruto</div>
                </div>
                <div className="text-center space-y-1">
                  <div className={`text-lg font-bold ${calculateProfitMargin(product) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {calculateProfitMargin(product).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-400">Margem</div>
                </div>
              </div>

              {/* Cost Breakdown */}
              {(product.costPrice || product.shippingCost || product.handlingFee || product.marketingCost || product.operationalCost) && (
                <>
                  <Separator className="bg-gray-600" />
                  <div className="grid grid-cols-5 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-white">€{product.costPrice || "0.00"}</div>
                      <div className="text-xs text-gray-400">Custo Produto</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-white">€{product.shippingCost || "0.00"}</div>
                      <div className="text-xs text-gray-400">Envio</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-white">€{product.handlingFee || "0.00"}</div>
                      <div className="text-xs text-gray-400">Processamento</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-white">€{product.marketingCost || "0.00"}</div>
                      <div className="text-xs text-gray-400">Marketing</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-white">€{product.operationalCost || "0.00"}</div>
                      <div className="text-xs text-gray-400">Operacional</div>
                    </div>
                  </div>
                </>
              )}

              {product.lastCostUpdate && (
                <div className="text-xs text-gray-400">
                  Custos atualizados: {new Date(product.lastCostUpdate).toLocaleDateString("pt-BR")}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cost Configuration Dialog */}
      <Dialog open={!!editingCosts} onOpenChange={() => setEditingCosts(null)}>
        <DialogContent className="glassmorphism max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center space-x-2">
              <Calculator className="h-5 w-5" />
              <span>Configuração de Custos</span>
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Configure os custos detalhados para análise financeira no dashboard
            </DialogDescription>
          </DialogHeader>
          <Form {...costForm}>
            <form onSubmit={costForm.handleSubmit(handleUpdateCosts)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={costForm.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-200">Custo do Produto (€)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00"
                          className="glassmorphism-light text-white" 
                        />
                      </FormControl>
                      <div className="text-xs text-gray-400">Custo de aquisição/fabricação</div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={costForm.control}
                  name="shippingCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-200">Custo de Envio (€)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00"
                          className="glassmorphism-light text-white" 
                        />
                      </FormControl>
                      <div className="text-xs text-gray-400">Custo médio de frete</div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={costForm.control}
                  name="handlingFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-200">Taxa de Processamento (€)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00"
                          className="glassmorphism-light text-white" 
                        />
                      </FormControl>
                      <div className="text-xs text-gray-400">Manuseio e embalagem</div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={costForm.control}
                  name="marketingCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-200">Custo de Marketing (€)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00"
                          className="glassmorphism-light text-white" 
                        />
                      </FormControl>
                      <div className="text-xs text-gray-400">Atribuição de marketing por unidade</div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={costForm.control}
                  name="operationalCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-200">Custo Operacional (€)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00"
                          className="glassmorphism-light text-white" 
                        />
                      </FormControl>
                      <div className="text-xs text-gray-400">Overhead operacional</div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingCosts(null)}
                  className="glassmorphism-light text-gray-200"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateCostsMutation.isPending}
                  className="glassmorphism-light text-white border-blue-600"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateCostsMutation.isPending ? "Salvando..." : "Salvar Custos"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {products.length === 0 && (
        <Card className="glassmorphism">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Nenhum produto encontrado</h3>
            <p className="text-gray-400 mb-6">Crie seu primeiro produto para começar a configurar custos</p>
            <Button 
              onClick={() => setIsCreating(true)}
              className="glassmorphism-light text-white border-blue-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Produto
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}