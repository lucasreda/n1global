import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface SupplierOrder {
  id: string;
  customerName?: string;
  customerCity?: string;
  customerCountry?: string;
  status: string;
  total?: string;
  currency?: string;
  orderDate?: string;
  shopifyOrderNumber?: string;
  products?: Array<{
    sku: string;
    quantity: number;
  }>;
  operation?: {
    name: string;
    country: string;
  };
}

interface SupplierOrdersTableProps {
  orders: SupplierOrder[];
  isLoading: boolean;
}

export function SupplierOrdersTable({ orders, isLoading }: SupplierOrdersTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
        <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
        <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Nenhum pedido encontrado para seus produtos</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'shipped': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return 'Entregue';
      case 'shipped': return 'Enviado';
      case 'pending': return 'Pendente';
      case 'cancelled': return 'Cancelado';
      case 'confirmed': return 'Confirmado';
      default: return status;
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pedido</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Local</TableHead>
            <TableHead>Operação</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">
                {order.shopifyOrderNumber ? (
                  <div>
                    <div className="text-blue-600 dark:text-blue-400 font-semibold">
                      {order.shopifyOrderNumber}
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-24" title={order.id}>
                      {order.id}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 truncate max-w-24" title={order.id}>
                    {order.id}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="max-w-32">
                  <div className="truncate" title={order.customerName}>
                    {order.customerName || '-'}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="max-w-32">
                  <div className="truncate text-sm" title={`${order.customerCity}, ${order.customerCountry}`}>
                    {order.customerCity ? `${order.customerCity}, ${order.customerCountry}` : order.customerCountry || '-'}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="max-w-24">
                  <div className="truncate text-sm" title={order.operation?.name}>
                    {order.operation?.name || '-'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {order.operation?.country || '-'}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(order.status)}>
                  {getStatusLabel(order.status)}
                </Badge>
              </TableCell>
              <TableCell>
                {order.total && order.currency ? (
                  <div className="font-medium">
                    {order.currency === 'EUR' ? '€' : order.currency} {parseFloat(order.total).toFixed(2)}
                  </div>
                ) : '-'}
              </TableCell>
              <TableCell>
                {order.orderDate ? (
                  <div className="text-sm">
                    {new Date(order.orderDate).toLocaleDateString('pt-PT')}
                  </div>
                ) : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}