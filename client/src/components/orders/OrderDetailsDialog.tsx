import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, User, MapPin, CreditCard, Truck, Calendar, FileText, Tag } from "lucide-react";
import { formatOperationCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface OrderDetailsDialogProps {
  order: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operationCurrency?: string;
}

export function OrderDetailsDialog({ order, open, onOpenChange, operationCurrency = "EUR" }: OrderDetailsDialogProps) {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'shipped':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'confirmed':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'dd/MM/yyyy HH:mm');
    } catch {
      return '-';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-800/95 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white flex items-center gap-3">
            <Package className="h-6 w-6 text-blue-400" />
            Detalhes do Pedido {order?.shopifyOrderNumber || order?.id || ''}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Informações completas do pedido incluindo cliente, produtos e histórico de status
          </DialogDescription>
        </DialogHeader>

        {!order ? (
          <div className="p-8 text-center text-gray-400">
            Nenhum pedido selecionado
          </div>
        ) : (

        <ScrollArea className="max-h-[calc(90vh-100px)] pr-4">
          <div className="space-y-6">
            {/* Status e IDs */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Status e Identificação
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Status</p>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status || 'pending'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-400">ID Shopify</p>
                  <p className="text-sm text-gray-200">{order.shopifyOrderNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">ID Transportadora</p>
                  <p className="text-sm text-gray-200">{order.carrierOrderId || '-'}</p>
                </div>
                {order.carrierConfirmation && (
                  <div>
                    <p className="text-xs text-gray-400">Status Transportadora</p>
                    <Badge variant="outline" className="text-xs">
                      {order.carrierConfirmation}
                    </Badge>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400">Fonte de Dados</p>
                  <Badge variant="outline" className="text-xs">
                    {order.dataSource || 'shopify'}
                  </Badge>
                </div>
                {order.trackingNumber && (
                  <div>
                    <p className="text-xs text-gray-400">Rastreamento</p>
                    <p className="text-sm text-gray-200">{order.trackingNumber}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator className="bg-gray-700" />

            {/* Informações do Cliente */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <User className="h-4 w-4" />
                Informações do Cliente
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Nome</p>
                  <p className="text-sm text-gray-200">{order.customerName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">E-mail</p>
                  <p className="text-sm text-gray-200">{order.customerEmail || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Telefone</p>
                  <p className="text-sm text-gray-200">{order.customerPhone || '-'}</p>
                </div>
              </div>
            </div>

            <Separator className="bg-gray-700" />

            {/* Endereço */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Endereço de Entrega
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-400">Endereço</p>
                  <p className="text-sm text-gray-200">{order.customerAddress || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Cidade</p>
                  <p className="text-sm text-gray-200">{order.customerCity || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Estado/Província</p>
                  <p className="text-sm text-gray-200">{order.customerState || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">País</p>
                  <p className="text-sm text-gray-200">{order.customerCountry || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">CEP</p>
                  <p className="text-sm text-gray-200">{order.customerZip || '-'}</p>
                </div>
              </div>
            </div>

            <Separator className="bg-gray-700" />

            {/* Informações Financeiras */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Informações Financeiras
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="text-lg font-semibold text-green-400">
                    {formatOperationCurrency(parseFloat(order.total || '0'), operationCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Custo Produto</p>
                  <p className="text-sm text-gray-200">
                    {formatOperationCurrency(parseFloat(order.productCost || '0'), operationCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Frete</p>
                  <p className="text-sm text-gray-200">
                    {formatOperationCurrency(parseFloat(order.shippingCost || '0'), operationCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Método Pagamento</p>
                  <Badge variant="outline" className="text-xs">
                    {order.paymentMethod || order.method_payment || 'COD'}
                  </Badge>
                </div>
                {order.paymentStatus && (
                  <div>
                    <p className="text-xs text-gray-400">Status Pagamento</p>
                    <Badge variant="outline" className="text-xs">
                      {order.paymentStatus}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            <Separator className="bg-gray-700" />

            {/* Produtos */}
            {order.products && Array.isArray(order.products) && order.products.length > 0 && (
              <>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Produtos
                  </h3>
                  <div className="space-y-2">
                    {order.products.map((product: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm text-gray-200">{product.name || product.title || 'Produto'}</p>
                          {product.sku && (
                            <p className="text-xs text-gray-400">SKU: {product.sku}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-200">Qtd: {product.quantity || 1}</p>
                          {product.price && (
                            <p className="text-xs text-gray-400">
                              {formatOperationCurrency(parseFloat(product.price), operationCurrency)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator className="bg-gray-700" />
              </>
            )}

            {/* Informações de Envio */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Informações de Envio
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Transportadora</p>
                  <p className="text-sm text-gray-200">{order.provider || 'european_fulfillment'}</p>
                </div>
                {order.carrierImported && (
                  <div>
                    <p className="text-xs text-gray-400">Importado da Transportadora</p>
                    <Badge className="bg-green-500/20 text-green-400">Sim</Badge>
                  </div>
                )}
                {order.carrierMatchedAt && (
                  <div>
                    <p className="text-xs text-gray-400">Correspondência em</p>
                    <p className="text-sm text-gray-200">{formatDate(order.carrierMatchedAt)}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator className="bg-gray-700" />

            {/* Datas */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Datas
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Data do Pedido</p>
                  <p className="text-sm text-gray-200">{formatDate(order.orderDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Última Atualização</p>
                  <p className="text-sm text-gray-200">{formatDate(order.lastStatusUpdate)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Criado em</p>
                  <p className="text-sm text-gray-200">{formatDate(order.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Tags e Notas */}
            {(order.tags?.length > 0 || order.notes) && (
              <>
                <Separator className="bg-gray-700" />
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Informações Adicionais
                  </h3>
                  {order.tags?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {order.tags.map((tag: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {order.notes && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Notas</p>
                      <p className="text-sm text-gray-200 bg-gray-700/30 p-3 rounded-lg">
                        {order.notes}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Informações de Afiliado */}
            {(order.affiliateId || order.affiliateTrackingId || order.landingSource) && (
              <>
                <Separator className="bg-gray-700" />
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-300">Informações de Afiliado</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {order.affiliateId && (
                      <div>
                        <p className="text-xs text-gray-400">ID do Afiliado</p>
                        <p className="text-sm text-gray-200">{order.affiliateId}</p>
                      </div>
                    )}
                    {order.affiliateTrackingId && (
                      <div>
                        <p className="text-xs text-gray-400">ID de Rastreamento</p>
                        <p className="text-sm text-gray-200 font-mono text-xs">{order.affiliateTrackingId}</p>
                      </div>
                    )}
                    {order.landingSource && (
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-400">Origem</p>
                        <p className="text-sm text-gray-200 break-all">{order.landingSource}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
