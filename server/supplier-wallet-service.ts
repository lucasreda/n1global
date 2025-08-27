import { db } from "./db";
import { 
  users, 
  products, 
  orders, 
  supplierPayments,
  supplierPaymentItems,
  type SupplierPayment
} from "@shared/schema";
import { eq, and, desc, sql, sum, inArray } from "drizzle-orm";

export interface WalletOrder {
  orderId: string;
  orderDate: string;
  customerName: string;
  total: number;
  status: string;
  products: Array<{
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalValue: number;
  }>;
}

export interface RecentPayment {
  id: string;
  amount: number;
  currency: string;
  paidAt: string;
  description?: string;
  status: string;
  referenceId?: string;
  orderCount: number;
}

export interface SupplierWallet {
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  
  // Valores pendentes
  totalToReceive: number;
  totalOrdersCount: number;
  nextPaymentDate: string;
  
  // Pedidos disponíveis para receber
  availableOrders: WalletOrder[];
  
  // Histórico de pagamentos recebidos
  recentPayments: RecentPayment[];
  
  // Estatísticas
  totalPaid: number;
  averageOrderValue: number;
}

export class SupplierWalletService {
  
  /**
   * Calcula quantos dias úteis a partir de uma data
   * Remove sábados e domingos
   */
  private addBusinessDays(startDate: Date, businessDays: number): Date {
    const result = new Date(startDate);
    let daysAdded = 0;
    
    while (daysAdded < businessDays) {
      result.setDate(result.getDate() + 1);
      // 0 = domingo, 6 = sábado
      if (result.getDay() !== 0 && result.getDay() !== 6) {
        daysAdded++;
      }
    }
    
    return result;
  }

  /**
   * Busca informações completas da wallet de um fornecedor
   */
  async getSupplierWallet(supplierId: string): Promise<SupplierWallet | null> {
    // Verificar se o usuário é um fornecedor
    const [supplier] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(and(eq(users.id, supplierId), eq(users.role, 'supplier')));

    if (!supplier) {
      return null;
    }

    // Buscar produtos do fornecedor
    const { userProducts } = await import("@shared/schema");
    const supplierProducts = await db
      .select({
        sku: products.sku,
        name: products.name,
        costPrice: products.costPrice,
        storeId: products.storeId,
        id: products.id,
      })
      .from(products)
      .where(eq(products.supplierId, supplierId));

    if (supplierProducts.length === 0) {
      return {
        supplierId,
        supplierName: supplier.name,
        supplierEmail: supplier.email,
        totalToReceive: 0,
        totalOrdersCount: 0,
        nextPaymentDate: this.addBusinessDays(new Date(), 10).toISOString(),
        availableOrders: [],
        recentPayments: [],
        totalPaid: 0,
        averageOrderValue: 0,
      };
    }

    const productSkus = supplierProducts.map(p => p.sku);
    const supplierProductIds = supplierProducts.map(p => p.id);
    
    // Buscar operações onde o fornecedor tem produtos vinculados através de userProducts
    const linkedProducts = await db
      .select({
        productId: userProducts.productId,
        storeId: userProducts.storeId,
        userId: userProducts.userId,
      })
      .from(userProducts)
      .where(inArray(userProducts.productId, supplierProductIds));

    if (linkedProducts.length === 0) {
      return {
        supplierId,
        supplierName: supplier.name,
        supplierEmail: supplier.email,
        totalToReceive: 0,
        totalOrdersCount: 0,
        nextPaymentDate: this.addBusinessDays(new Date(), 10).toISOString(),
        availableOrders: [],
        recentPayments: [],
        totalPaid: 0,
        averageOrderValue: 0,
      };
    }

    // Obter operações dos usuários que têm produtos vinculados
    const { userOperationAccess } = await import("@shared/schema");
    const userIds = Array.from(new Set(linkedProducts.map(lp => lp.userId)));
    
    const operationAccesses = await db
      .select({
        operationId: userOperationAccess.operationId,
        userId: userOperationAccess.userId,
      })
      .from(userOperationAccess)
      .where(inArray(userOperationAccess.userId, userIds));

    const operationIds = Array.from(new Set(operationAccesses.map(oa => oa.operationId)));

    if (operationIds.length === 0) {
      return {
        supplierId,
        supplierName: supplier.name,
        supplierEmail: supplier.email,
        totalToReceive: 0,
        totalOrdersCount: 0,
        nextPaymentDate: this.addBusinessDays(new Date(), 10).toISOString(),
        availableOrders: [],
        recentPayments: [],
        totalPaid: 0,
        averageOrderValue: 0,
      };
    }

    // Buscar apenas pedidos pagos das operações onde o fornecedor tem produtos vinculados
    const allOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.paymentStatus, 'paid'),
          inArray(orders.operationId, operationIds)
        )
      );

    // Buscar pedidos já pagos para este fornecedor
    const paidPaymentItems = await db
      .select({
        orderId: supplierPaymentItems.orderId,
      })
      .from(supplierPaymentItems)
      .leftJoin(supplierPayments, eq(supplierPaymentItems.paymentId, supplierPayments.id))
      .where(
        and(
          eq(supplierPayments.supplierId, supplierId),
          eq(supplierPayments.status, 'paid')
        )
      );

    const paidOrderIds = new Set(paidPaymentItems.map(item => item.orderId).filter(Boolean));

    // Processar pedidos para identificar valores a receber
    const availableOrders: WalletOrder[] = [];
    let totalToReceive = 0;

    for (const order of allOrders) {
      if (!order.products || paidOrderIds.has(order.id)) {
        continue; // Pular se não tem produtos ou já foi pago
      }

      const orderProducts = Array.isArray(order.products) ? order.products : [];
      const supplierOrderProducts = orderProducts.filter((product: any) => 
        productSkus.includes(product.sku)
      );

      if (supplierOrderProducts.length === 0) {
        continue;
      }

      // Calcular valor do fornecedor neste pedido
      let supplierValueInOrder = 0;
      const orderProductDetails: WalletOrder['products'] = [];

      for (const orderProduct of supplierOrderProducts) {
        const supplierProduct = supplierProducts.find(p => p.sku === orderProduct.sku);
        if (supplierProduct && supplierProduct.costPrice) {
          const quantity = orderProduct.quantity || 1;
          const unitPrice = parseFloat(supplierProduct.costPrice);
          const totalProductValue = unitPrice * quantity;
          
          supplierValueInOrder += totalProductValue;
          
          orderProductDetails.push({
            sku: orderProduct.sku,
            name: supplierProduct.name,
            quantity,
            unitPrice,
            totalValue: totalProductValue,
          });
        }
      }

      if (supplierValueInOrder > 0) {
        totalToReceive += supplierValueInOrder;

        availableOrders.push({
          orderId: order.id,
          orderDate: order.orderDate?.toISOString() || order.createdAt?.toISOString() || new Date().toISOString(),
          customerName: order.customerName || 'Cliente não informado',
          total: supplierValueInOrder,
          status: order.status || 'confirmed',
          products: orderProductDetails,
        });
      }
    }

    // Ordenar pedidos por data (mais recentes primeiro)
    availableOrders.sort((a, b) => 
      new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
    );

    // Buscar pagamentos recebidos (histórico)
    const recentPaymentsData = await db
      .select({
        id: supplierPayments.id,
        amount: supplierPayments.amount,
        currency: supplierPayments.currency,
        paidAt: supplierPayments.paidAt,
        description: supplierPayments.description,
        status: supplierPayments.status,
        referenceId: supplierPayments.referenceId,
      })
      .from(supplierPayments)
      .where(
        and(
          eq(supplierPayments.supplierId, supplierId),
          eq(supplierPayments.status, 'paid')
        )
      )
      .orderBy(desc(supplierPayments.paidAt))
      .limit(10);

    // Contar pedidos por pagamento
    const recentPayments: RecentPayment[] = [];
    for (const payment of recentPaymentsData) {
      const [orderCountResult] = await db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(supplierPaymentItems)
        .where(eq(supplierPaymentItems.paymentId, payment.id));

      recentPayments.push({
        id: payment.id,
        amount: parseFloat(payment.amount),
        currency: payment.currency,
        paidAt: payment.paidAt?.toISOString() || '',
        description: payment.description || '',
        status: payment.status,
        referenceId: payment.referenceId || '',
        orderCount: orderCountResult?.count || 0,
      });
    }

    // Calcular total já pago
    const [totalPaidResult] = await db
      .select({
        total: sum(supplierPayments.amount),
      })
      .from(supplierPayments)
      .where(
        and(
          eq(supplierPayments.supplierId, supplierId),
          eq(supplierPayments.status, 'paid')
        )
      );

    const totalPaid = parseFloat(totalPaidResult?.total || '0');

    // Calcular próxima data de pagamento (10 dias úteis após o último pagamento)
    let nextPaymentDate: Date;
    if (recentPayments.length > 0 && recentPayments[0].paidAt) {
      nextPaymentDate = this.addBusinessDays(new Date(recentPayments[0].paidAt), 10);
    } else {
      nextPaymentDate = this.addBusinessDays(new Date(), 10);
    }

    // Calcular valor médio por pedido
    const averageOrderValue = availableOrders.length > 0 
      ? totalToReceive / availableOrders.length 
      : 0;

    return {
      supplierId,
      supplierName: supplier.name,
      supplierEmail: supplier.email,
      totalToReceive,
      totalOrdersCount: availableOrders.length,
      nextPaymentDate: nextPaymentDate.toISOString(),
      availableOrders,
      recentPayments,
      totalPaid,
      averageOrderValue,
    };
  }

  /**
   * Busca estatísticas resumidas da wallet
   */
  async getWalletSummary(supplierId: string) {
    const wallet = await this.getSupplierWallet(supplierId);
    if (!wallet) {
      return null;
    }

    return {
      totalToReceive: wallet.totalToReceive,
      totalOrdersCount: wallet.totalOrdersCount,
      nextPaymentDate: wallet.nextPaymentDate,
      recentPaymentsCount: wallet.recentPayments.length,
      totalPaid: wallet.totalPaid,
    };
  }
}

export const supplierWalletService = new SupplierWalletService();