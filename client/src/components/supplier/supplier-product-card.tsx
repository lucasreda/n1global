import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Edit3, Package, TrendingUp, Trash2, Clock, CheckCircle, XCircle } from "lucide-react";
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-900/50 text-yellow-400 border-yellow-700">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="secondary" className="bg-green-900/50 text-green-400 border-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprovado
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="bg-red-900/50 text-red-400 border-red-700">
            <XCircle className="h-3 w-3 mr-1" />
            Rejeitado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        );
    }
  };

  return (
    <Card className="border border-gray-200/60 dark:border-gray-700/60 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm h-full flex flex-col" data-testid={`product-card-${product.sku}`}>
      <div className="p-4 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          {/* Product Image */}
          <div className="flex-shrink-0">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                <Package className="h-5 w-5 text-gray-400" />
              </div>
            )}
          </div>
          
          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 leading-tight mb-1">
              {product.name}
            </h3>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded">
                {product.sku}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {product.type === 'fisico' ? 'Físico' : 'Nutracêutico'}
              </span>
            </div>
            
            {/* Status Badge */}
            <div className="mb-2">
              {getStatusBadge(product.status || 'pending')}
            </div>

            {/* Key Metrics Row */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${
                  product.status === 'approved' ? 'bg-green-500' : 
                  product.status === 'rejected' ? 'bg-red-500' : 
                  'bg-yellow-500'
                }`}></span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(product.price)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-300">
                  {product.initialStock || 0}
                </span>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEditModal(true)}
              disabled={deleteProductMutation.isPending}
              data-testid={`button-edit-${product.sku}`}
              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteProductMutation.isPending}
              data-testid={`button-delete-${product.sku}`}
              className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Description - Flexible height */}
        {product.description && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {product.description}
            </p>
          </div>
        )}

        {/* Bottom section - Always at the end */}
        <div className="mt-auto">

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Preço B2B</span>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {formatCurrency(product.price)}
            </div>
          </div>
          
          {product.costPrice > 0 && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Custo para o Fornecedor</span>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {formatCurrency(product.costPrice)}
              </div>
            </div>
          )}
          
          <div>
            <span className="text-gray-500 dark:text-gray-400">Estoque</span>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {product.initialStock || 0}
            </div>
          </div>
          
          <div>
            <span className="text-gray-500 dark:text-gray-400">Alerta</span>
            <div className="font-medium text-orange-600 dark:text-orange-400">
              {product.lowStock || 10}
            </div>
          </div>
          
          {product.shippingCost > 0 && (
            <>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Envio</span>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(product.shippingCost)}
                </div>
              </div>
              <div></div>
            </>
          )}
        </div>

        {/* Profitability Section */}
        {(product as any).profitability && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Rentabilidade
            </h4>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Pedidos Totais</span>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {(product as any).profitability.totalOrders}
                </div>
              </div>
              
              <div>
                <span className="text-gray-500 dark:text-gray-400">Entregues</span>
                <div className="font-medium text-green-600 dark:text-green-400">
                  {(product as any).profitability.deliveredOrders}
                </div>
              </div>
              
              <div>
                <span className="text-gray-500 dark:text-gray-400">Lucro Total</span>
                <div className="font-medium text-emerald-600 dark:text-emerald-400">
                  {formatCurrency((product as any).profitability.totalProfit)}
                </div>
              </div>
              
              <div>
                <span className="text-gray-500 dark:text-gray-400">Margem</span>
                <div className="font-medium text-blue-600 dark:text-blue-400">
                  {(product as any).profitability.profitMargin.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}

          {/* Footer */}
          <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center text-xs text-gray-400">
              <span>
                {new Date(product.createdAt).toLocaleDateString('pt-BR')}
              </span>
              {product.updatedAt !== product.createdAt && (
                <span>
                  Atualizado {new Date(product.updatedAt).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>
        </div> {/* Closes bottom section */}
      </div> {/* Closes main card content */}
      
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