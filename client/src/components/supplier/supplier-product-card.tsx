import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Edit3, Package, TrendingUp, Save, X, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SupplierProductCardProps {
  product: any;
  onUpdate: () => void;
}

export function SupplierProductCard({ product, onUpdate }: SupplierProductCardProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editData, setEditData] = useState({
    price: product.price,
    costPrice: product.costPrice || 0,
    shippingCost: product.shippingCost || 0,
    initialStock: product.initialStock || 0,
    lowStock: product.lowStock || 10,
  });

  const updateProductMutation = useMutation({
    mutationFn: (data: any) => {
      return fetch(`/api/supplier/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data)
      }).then(res => {
        if (!res.ok) throw new Error('Failed to update product');
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Produto atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
      setIsEditing(false);
      onUpdate();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar produto",
        description: error.message || "Ocorreu um erro inesperado.",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/supplier/products/${product.id}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Produto excluído!",
        description: "O produto foi removido com sucesso.",
      });
      setShowDeleteDialog(false);
      onUpdate();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir produto",
        description: error.message || "Ocorreu um erro inesperado.",
      });
    },
  });

  const handleSave = () => {
    updateProductMutation.mutate(editData);
  };

  const handleCancel = () => {
    setEditData({
      price: product.price,
      costPrice: product.costPrice || 0,
      shippingCost: product.shippingCost || 0,
      initialStock: product.initialStock || 0,
      lowStock: product.lowStock || 10,
    });
    setIsEditing(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  return (
    <Card className="h-fit" data-testid={`product-card-${product.sku}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-4 w-4" />
              {product.name}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {product.sku}
              </Badge>
              <Badge 
                variant={product.type === 'fisico' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {product.type === 'fisico' ? 'Físico' : 'Nutracêutico'}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              disabled={updateProductMutation.isPending || deleteProductMutation.isPending}
              data-testid={`button-edit-${product.sku}`}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={updateProductMutation.isPending || deleteProductMutation.isPending}
              data-testid={`button-delete-${product.sku}`}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {product.description && (
          <p className="text-sm text-muted-foreground">
            {product.description}
          </p>
        )}

        {isEditing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Preço B2B</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editData.price}
                  onChange={(e) => setEditData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  className="text-sm"
                  data-testid={`input-price-${product.sku}`}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Para operações
                </p>
              </div>
              <div>
                <Label className="text-xs">Custo Produção</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editData.costPrice}
                  onChange={(e) => setEditData(prev => ({ ...prev, costPrice: parseFloat(e.target.value) || 0 }))}
                  className="text-sm"
                  data-testid={`input-cost-price-${product.sku}`}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Seu custo real
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Custo Envio</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editData.shippingCost}
                  onChange={(e) => setEditData(prev => ({ ...prev, shippingCost: parseFloat(e.target.value) || 0 }))}
                  className="text-sm"
                  data-testid={`input-shipping-cost-${product.sku}`}
                />
              </div>
              <div>
                <Label className="text-xs">Estoque Baixo</Label>
                <Input
                  type="number"
                  value={editData.lowStock}
                  onChange={(e) => setEditData(prev => ({ ...prev, lowStock: parseInt(e.target.value) || 0 }))}
                  className="text-sm"
                  data-testid={`input-low-stock-${product.sku}`}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Estoque Inicial</Label>
              <Input
                type="number"
                value={editData.initialStock}
                onChange={(e) => setEditData(prev => ({ ...prev, initialStock: parseInt(e.target.value) || 0 }))}
                className="text-sm"
                data-testid={`input-initial-stock-${product.sku}`}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Quantidade enviada para o armazém
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateProductMutation.isPending}
                className="flex-1"
                data-testid={`button-save-${product.sku}`}
              >
                <Save className="h-3 w-3 mr-1" />
                {updateProductMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={updateProductMutation.isPending}
                data-testid={`button-cancel-${product.sku}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Preço B2B:</span>
                <div className="font-medium">{formatCurrency(product.price)}</div>
                <span className="text-xs text-muted-foreground">Para operações</span>
              </div>
              {product.costPrice > 0 && (
                <div>
                  <span className="text-muted-foreground">Custo Produção:</span>
                  <div className="font-medium">{formatCurrency(product.costPrice)}</div>
                  <span className="text-xs text-muted-foreground">Seu custo real</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Estoque Inicial:</span>
                <div className="font-medium flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {product.initialStock || 0}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Estoque Baixo:</span>
                <div className="font-medium text-orange-600">
                  {product.lowStock || 10}
                </div>
              </div>
            </div>

            {(product.shippingCost > 0) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Custo Envio:</span>
                <span className="font-medium ml-1">{formatCurrency(product.shippingCost)}</span>
              </div>
            )}

            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                Criado em {new Date(product.createdAt).toLocaleDateString('pt-BR')}
              </div>
              {product.updatedAt !== product.createdAt && (
                <div className="text-xs text-muted-foreground">
                  Atualizado em {new Date(product.updatedAt).toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent data-testid={`delete-dialog-${product.sku}`}>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o produto <strong>{product.name}</strong> (SKU: {product.sku})?
              <br /><br />
              <span className="text-red-600 font-medium">
                Esta ação não pode ser desfeita.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteProductMutation.isPending}
              data-testid={`button-cancel-delete-${product.sku}`}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteProductMutation.mutate()}
              disabled={deleteProductMutation.isPending}
              data-testid={`button-confirm-delete-${product.sku}`}
            >
              {deleteProductMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}