import { db } from "./db";
import { 
  users, 
  products, 
  orders, 
  supplierPayments, 
  supplierPaymentItems,
  type SupplierPayment,
  type InsertSupplierPayment,
  type InsertSupplierPaymentItem
} from "@shared/schema";
import { eq, and, sum, sql } from "drizzle-orm";

export interface SupplierBalance {
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  totalOrdersValue: number;
  paidAmount: number;
  pendingAmount: number;
  pendingOrdersCount: number;
  pendingOrders: Array<{
    orderId: string;
    orderDate: string;
    customerName: string;
    total: number;
    products: string[];
  }>;
}

export interface SupplierSummary {
  id: string;
  name: string;
  email: string;
  totalProducts: number;
  totalOrdersValue: number;
  pendingAmount: number;
}

export class FinanceService {
  
  /**
   * Lista todos os fornecedores (usuários com role 'supplier')
   */
  async getSuppliers(): Promise<Array<{id: string; name: string; email: string}>> {
    const suppliers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.role, 'supplier'));
    
    return suppliers;
  }

  /**
   * Calcula o balanço de um fornecedor específico
   * Considera os pedidos onde os produtos pertencem ao fornecedor
   */
  async getSupplierBalance(supplierId: string): Promise<SupplierBalance | null> {
    // Buscar informações do fornecedor
    const [supplier] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(and(eq(users.id, supplierId), eq(users.role, 'supplier')));

    if (!supplier) {
      return null;
    }

    // Buscar todos os produtos do fornecedor
    const supplierProducts = await db
      .select({
        sku: products.sku,
        name: products.name,
        costPrice: products.costPrice,
      })
      .from(products)
      .where(eq(products.supplierId, supplierId));

    if (supplierProducts.length === 0) {
      return {
        supplierId,
        supplierName: supplier.name,
        supplierEmail: supplier.email,
        totalOrdersValue: 0,
        paidAmount: 0,
        pendingAmount: 0,
        pendingOrdersCount: 0,
        pendingOrders: [],
      };
    }

    const productSkus = supplierProducts.map(p => p.sku);

    // Buscar todos os pedidos que contém produtos deste fornecedor
    // Filtrar por status de pagamento para considerar apenas pedidos pagos
    const allOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.paymentStatus, 'paid'));

    // Calcular valores dos pedidos e quais produtos de cada pedido pertencem ao fornecedor
    let totalOrdersValue = 0;
    const pendingOrders: SupplierBalance['pendingOrders'] = [];

    for (const order of allOrders) {
      if (!order.products) continue;

      const orderProducts = Array.isArray(order.products) ? order.products : [];
      const supplierOrderProducts = orderProducts.filter((product: any) => 
        productSkus.includes(product.sku)
      );

      if (supplierOrderProducts.length === 0) continue;

      // Calcular valor do fornecedor neste pedido baseado no custo dos produtos
      let supplierValueInOrder = 0;
      const productNames: string[] = [];

      for (const orderProduct of supplierOrderProducts) {
        const supplierProduct = supplierProducts.find(p => p.sku === orderProduct.sku);
        if (supplierProduct && supplierProduct.costPrice) {
          const quantity = orderProduct.quantity || 1;
          const costPrice = parseFloat(supplierProduct.costPrice);
          supplierValueInOrder += costPrice * quantity;
          productNames.push(supplierProduct.name);
        }
      }

      if (supplierValueInOrder > 0) {
        totalOrdersValue += supplierValueInOrder;

        pendingOrders.push({
          orderId: order.id,
          orderDate: order.orderDate?.toISOString() || order.createdAt?.toISOString() || new Date().toISOString(),
          customerName: order.customerName || 'Cliente não informado',
          total: supplierValueInOrder,
          products: productNames,
        });
      }
    }

    // Calcular valor já pago para este fornecedor
    const paidPayments = await db
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

    const paidAmount = parseFloat(paidPayments[0]?.total || '0');
    const pendingAmount = Math.max(0, totalOrdersValue - paidAmount);

    return {
      supplierId,
      supplierName: supplier.name,
      supplierEmail: supplier.email,
      totalOrdersValue,
      paidAmount,
      pendingAmount,
      pendingOrdersCount: pendingOrders.length,
      pendingOrders: pendingOrders.sort((a, b) => 
        new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
      ),
    };
  }

  /**
   * Cria um novo pagamento para fornecedor
   */
  async createSupplierPayment(
    paymentData: InsertSupplierPayment & { orderIds: string[] },
    storeId: string
  ): Promise<SupplierPayment> {
    const { orderIds, ...payment } = paymentData;

    // Buscar balanço do fornecedor para validar
    const balance = await this.getSupplierBalance(payment.supplierId);
    if (!balance || balance.pendingAmount <= 0) {
      throw new Error('Fornecedor não tem valores pendentes para pagamento');
    }

    // Criar o pagamento
    const [newPayment] = await db
      .insert(supplierPayments)
      .values({
        ...payment,
        storeId,
        amount: balance.pendingAmount.toString(),
      })
      .returning();

    // Criar itens do pagamento para cada pedido
    if (orderIds.length > 0) {
      const paymentItems: InsertSupplierPaymentItem[] = [];
      
      for (const orderId of orderIds) {
        const pendingOrder = balance.pendingOrders.find(o => o.orderId === orderId);
        if (pendingOrder) {
          paymentItems.push({
            paymentId: newPayment.id,
            orderId,
            productSku: pendingOrder.products.join(', '), // Simplified for now
            quantity: 1,
            unitPrice: pendingOrder.total.toString(),
            totalAmount: pendingOrder.total.toString(),
          });
        }
      }

      if (paymentItems.length > 0) {
        await db.insert(supplierPaymentItems).values(paymentItems);
      }
    }

    return newPayment;
  }

  /**
   * Lista pagamentos de fornecedores com paginação
   */
  async getSupplierPayments(limit = 50, offset = 0) {
    const payments = await db
      .select({
        id: supplierPayments.id,
        supplierId: supplierPayments.supplierId,
        supplierName: users.name,
        amount: supplierPayments.amount,
        currency: supplierPayments.currency,
        status: supplierPayments.status,
        paymentMethod: supplierPayments.paymentMethod,
        description: supplierPayments.description,
        dueDate: supplierPayments.dueDate,
        createdAt: supplierPayments.createdAt,
      })
      .from(supplierPayments)
      .leftJoin(users, eq(supplierPayments.supplierId, users.id))
      .limit(limit)
      .offset(offset)
      .orderBy(sql`${supplierPayments.createdAt} DESC`);

    return payments;
  }

  /**
   * Atualiza status de um pagamento
   */
  async updatePaymentStatus(
    paymentId: string,
    status: 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled',
    approvedBy?: string
  ) {
    const updateData: any = { 
      status,
      updatedAt: new Date(),
    };

    if (status === 'approved' && approvedBy) {
      updateData.approvedAt = new Date();
      updateData.approvedBy = approvedBy;
    }

    if (status === 'paid') {
      updateData.paidAt = new Date();
    }

    const [updatedPayment] = await db
      .update(supplierPayments)
      .set(updateData)
      .where(eq(supplierPayments.id, paymentId))
      .returning();

    return updatedPayment;
  }

  /**
   * Busca estatísticas gerais de pagamentos
   */
  async getPaymentStats() {
    const stats = await db
      .select({
        status: supplierPayments.status,
        count: sql<number>`count(*)`,
        total: sum(supplierPayments.amount),
      })
      .from(supplierPayments)
      .groupBy(supplierPayments.status);

    const result = {
      pending: { count: 0, total: 0 },
      approved: { count: 0, total: 0 },
      paid: { count: 0, total: 0 },
      rejected: { count: 0, total: 0 },
    };

    for (const stat of stats) {
      if (stat.status in result) {
        result[stat.status as keyof typeof result] = {
          count: Number(stat.count),
          total: parseFloat(stat.total || '0'),
        };
      }
    }

    return result;
  }
}

export const financeService = new FinanceService();