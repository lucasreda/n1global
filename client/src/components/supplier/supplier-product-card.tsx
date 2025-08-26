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
    <Card className="overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200" data-testid={`product-card-${product.sku}`}>
      {/* Header Section */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start gap-4">
          {/* Product Image */}
          <div className="flex-shrink-0">
            {product.imageUrl ? (
              <div className="relative">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-16 h-16 object-cover rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-sm"
                />
              </div>
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm">
                <Package className="h-6 w-6 text-gray-400" />
              </div>
            )}
          </div>
          
          {/* Product Information */}
          <div className="flex-1 min-w-0">
            <div className="mb-3">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 leading-tight mb-1">
                {product.name}
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-medium px-2 py-1">
                  SKU: {product.sku}
                </Badge>
                <Badge 
                  variant={product.type === 'fisico' ? 'default' : 'secondary'}
                  className="text-xs font-medium px-2 py-1"
                >
                  {product.type === 'fisico' ? 'Físico' : 'Nutracêutico'}
                </Badge>
              </div>
            </div>
            
            {/* Quick Price Info */}
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Preço B2B</span>
                <div className="font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(product.price)}
                </div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Estoque</span>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {product.initialStock || 0}
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditModal(true)}
              disabled={deleteProductMutation.isPending}
              data-testid={`button-edit-${product.sku}`}
              className="h-8 w-8 p-0"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteProductMutation.isPending}
              data-testid={`button-delete-${product.sku}`}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 border-red-200 dark:border-red-800"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6">
        {/* Description */}
        {product.description && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {product.description}
            </p>
          </div>
        )}

        {/* Detailed Information Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Pricing Information */}
          <div className="space-y-3">
            <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
              <div className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                PREÇO B2B
              </div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatCurrency(product.price)}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">
                Para operações
              </div>
            </div>
            
            {product.costPrice > 0 && (
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                  CUSTO PRODUÇÃO
                </div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(product.costPrice)}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  Seu custo real
                </div>
              </div>
            )}
          </div>

          {/* Stock Information */}
          <div className="space-y-3">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                ESTOQUE INICIAL
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {product.initialStock || 0}
              </div>
            </div>
            
            <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
              <div className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
                ALERTA ESTOQUE
              </div>
              <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {product.lowStock || 10}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Costs */}
        {product.shippingCost > 0 && (
          <div className="mb-4">
            <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
              <div className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
                CUSTO DE ENVIO
              </div>
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(product.shippingCost)}
              </div>
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              Criado em {new Date(product.createdAt).toLocaleDateString('pt-BR')}
            </span>
            {product.updatedAt !== product.createdAt && (
              <span>
                Atualizado em {new Date(product.updatedAt).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </div>
      </div>
      
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