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
  shopifyOrderNumber?: string;
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
  totalOrdersPaid: number; // Total de pedidos já pagos
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
        price: products.price, // Preço B2B
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
        totalOrdersPaid: 0,
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
        totalOrdersPaid: 0,
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
        totalOrdersPaid: 0,
        averageOrderValue: 0,
      };
    }

    // Buscar pedidos entregues das operações onde o fornecedor tem produtos vinculados
    // (pedidos entregues há pelo menos 10 dias úteis são elegíveis para pagamento)
    const allOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, 'delivered'),
          inArray(orders.operationId, operationIds)
        )
      );

    // Filtrar pedidos que foram entregues há pelo menos 10 dias úteis
    const eligibleOrders = allOrders.filter(order => {
      if (!order.lastStatusUpdate) return false;
      
      const deliveryDate = new Date(order.lastStatusUpdate);
      const minEligibleDate = this.addBusinessDays(deliveryDate, 10);
      const today = new Date();
      
      return today >= minEligibleDate;
    });

    // Buscar itens já pagos para este fornecedor (por quantidade)
    const paidPaymentItems = await db
      .select({
        productSku: supplierPaymentItems.productSku,
        paidQuantity: sql<number>`sum(${supplierPaymentItems.quantity})`,
      })
      .from(supplierPaymentItems)
      .leftJoin(supplierPayments, eq(supplierPaymentItems.paymentId, supplierPayments.id))
      .where(
        and(
          eq(supplierPayments.supplierId, supplierId),
          eq(supplierPayments.status, 'paid')
        )
      )
      .groupBy(supplierPaymentItems.productSku);

    // Criar mapa de quantidades já pagas por SKU
    const paidQuantitiesBySku = new Map<string, number>();
    for (const item of paidPaymentItems) {
      if (item.productSku && item.paidQuantity) {
        const quantity = typeof item.paidQuantity === 'string' ? parseInt(item.paidQuantity) : item.paidQuantity;
        paidQuantitiesBySku.set(item.productSku, quantity);
      }
    }

    // Processar pedidos para identificar valores a receber
    const availableOrders: WalletOrder[] = [];
    
    // Calcular total de quantidades vendidas por SKU (apenas pedidos elegíveis)
    const totalQuantitiesBySku = new Map<string, number>();
    for (const order of eligibleOrders) {
      if (!order.products) continue;
      
      const orderProducts = Array.isArray(order.products) ? order.products : [];
      for (const product of orderProducts) {
        if (productSkus.includes(product.sku)) {
          const current = totalQuantitiesBySku.get(product.sku) || 0;
          totalQuantitiesBySku.set(product.sku, current + (product.quantity || 1));
        }
      }
    }
    
    // Calcular valor total pendente baseado na diferença entre vendido e pago
    let totalToReceive = 0;
    let totalPendingUnits = 0; // DEBUG: contador de unidades pendentes
    
    for (const [sku, totalSold] of Array.from(totalQuantitiesBySku.entries())) {
      const paidQuantity = paidQuantitiesBySku.get(sku) || 0;
      const pendingQuantity = Math.max(0, totalSold - paidQuantity);
      
      if (pendingQuantity > 0) {
        totalPendingUnits += pendingQuantity;
        const supplierProduct = supplierProducts.find(p => p.sku === sku);
        if (supplierProduct && supplierProduct.price) {
          const unitPrice = parseFloat(supplierProduct.price);
          totalToReceive += unitPrice * pendingQuantity;
        }
      }
    }

    // Processar pedidos individuais para listagem (apenas pedidos elegíveis)
    for (const order of eligibleOrders) {
      if (!order.products) {
        continue; // Pular se não tem produtos
      }

      const orderProducts = Array.isArray(order.products) ? order.products : [];
      const supplierOrderProducts = orderProducts.filter((product: any) => 
        productSkus.includes(product.sku)
      );

      if (supplierOrderProducts.length === 0) {
        continue;
      }

      // Calcular valor do fornecedor neste pedido usando preço B2B
      let supplierValueInOrder = 0;
      const orderProductDetails: WalletOrder['products'] = [];

      for (const orderProduct of supplierOrderProducts) {
        const supplierProduct = supplierProducts.find(p => p.sku === orderProduct.sku);
        if (supplierProduct && supplierProduct.price) {
          const orderQuantity = orderProduct.quantity || 1;
          const totalPaidForThisSku = paidQuantitiesBySku.get(orderProduct.sku) || 0;
          
          // Para este pedido específico, calcular quantas unidades ainda estão pendentes
          // Como não sabemos qual pedido específico foi pago, mostramos pendências proporcionalmente
          const pendingRatio = Math.max(0, (totalQuantitiesBySku.get(orderProduct.sku) || 0) - totalPaidForThisSku) / (totalQuantitiesBySku.get(orderProduct.sku) || 1);
          const pendingQuantityInThisOrder = Math.ceil(orderQuantity * pendingRatio);
          
          if (pendingQuantityInThisOrder > 0) {
            const unitPrice = parseFloat(supplierProduct.price); // Usar preço B2B
            const totalProductValue = unitPrice * pendingQuantityInThisOrder;
            
            supplierValueInOrder += totalProductValue;
            
            orderProductDetails.push({
              sku: orderProduct.sku,
              name: supplierProduct.name,
              quantity: pendingQuantityInThisOrder,
              unitPrice,
              totalValue: totalProductValue,
            });
          }
        }
      }

      if (supplierValueInOrder > 0) {
        // Calcular dias desde a entrega para exibição
        const deliveryDate = new Date(order.lastStatusUpdate!);
        const today = new Date();
        const daysSinceDelivery = Math.floor((today.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
        
        availableOrders.push({
          orderId: order.id,
          shopifyOrderNumber: order.shopifyOrderNumber || undefined,
          orderDate: order.orderDate?.toISOString() || order.createdAt?.toISOString() || new Date().toISOString(),
          customerName: order.customerName || 'Cliente não informado',
          total: supplierValueInOrder,
          status: order.status || 'confirmed',
          daysSinceDelivery,
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
        amountBrl: supplierPayments.amountBRL, // Usar valor em BRL
        exchangeRate: supplierPayments.exchangeRate,
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

    // Somar quantidade de unidades por pagamento
    const recentPayments: RecentPayment[] = [];
    for (const payment of recentPaymentsData) {
      const [quantityResult] = await db
        .select({
          totalQuantity: sql<number>`sum(${supplierPaymentItems.quantity})`,
        })
        .from(supplierPaymentItems)
        .where(eq(supplierPaymentItems.paymentId, payment.id));

      const amountBrl = payment.amountBrl ? parseFloat(payment.amountBrl) : 0;
      console.log(`💰 DEBUG Payment: ID ${payment.id}, Amount BRL: ${amountBrl}, Raw: ${payment.amountBrl}`);
      
      recentPayments.push({
        id: payment.id,
        amount: amountBrl, // Usar valor em BRL
        currency: 'BRL', // Forçar moeda para BRL já que estamos usando amountBrl
        paidAt: payment.paidAt?.toISOString() || '',
        description: payment.description || '',
        status: payment.status,
        referenceId: payment.referenceId || undefined,
        orderCount: quantityResult?.totalQuantity || 0,
      });
    }

    // Calcular total já pago (em BRL)
    const [totalPaidResult] = await db
      .select({
        total: sum(supplierPayments.amountBRL), // Somar valores em BRL
      })
      .from(supplierPayments)
      .where(
        and(
          eq(supplierPayments.supplierId, supplierId),
          eq(supplierPayments.status, 'paid')
        )
      );

    const totalPaid = parseFloat(totalPaidResult?.total || '0');

    // Calcular total de unidades já pagas (não pedidos)
    const [totalUnitsPaidResult] = await db
      .select({
        totalUnits: sql<number>`sum(${supplierPaymentItems.quantity})`,
      })
      .from(supplierPaymentItems)
      .leftJoin(supplierPayments, eq(supplierPaymentItems.paymentId, supplierPayments.id))
      .where(
        and(
          eq(supplierPayments.supplierId, supplierId),
          eq(supplierPayments.status, 'paid')
        )
      );

    const totalOrdersPaid = totalUnitsPaidResult?.totalUnits || 0;

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
      totalOrdersPaid,
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