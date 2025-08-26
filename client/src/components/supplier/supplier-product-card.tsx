import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Edit3, Package, TrendingUp, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { EditProductModal } from "./edit-product-modal";

interface SupplierProductCardProps {
  product: any;
  onUpdate: () => void;
}

export function SupplierProductCard({ product, onUpdate }: SupplierProductCardProps) {
  const { toast } = useToast();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);



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
          <div className="flex items-start gap-3 flex-1">
            {/* Product Image Thumbnail */}
            {product.imageUrl ? (
              <div className="flex-shrink-0">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-12 h-12 object-cover rounded-lg border"
                />
              </div>
            ) : (
              <div className="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg border flex items-center justify-center">
                <Package className="h-5 w-5 text-gray-400" />
              </div>
            )}
            
            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">
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
          </div>
          
          <div className="flex gap-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEditModal(true)}
              disabled={deleteProductMutation.isPending}
              data-testid={`button-edit-${product.sku}`}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteProductMutation.isPending}
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
      </CardContent>
      
      {/* Edit Product Modal */}
      <EditProductModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        product={product}
        onProductUpdated={onUpdate}
      />
      
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