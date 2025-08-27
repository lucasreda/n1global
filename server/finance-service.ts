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
  totalUnitsCount: number;
  unitB2BPrice: number;
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
        price: products.price, // Usar preço B2B para consistência com a carteira
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
        totalUnitsCount: 0,
        unitB2BPrice: 0,
      };
    }

    const productSkus = supplierProducts.map(p => p.sku);

    // Buscar todos os pedidos que contém produtos deste fornecedor
    // Filtrar por status 'delivered' para considerar pedidos elegíveis para pagamento ao fornecedor
    const allOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.status, 'delivered'));

    // Buscar IDs dos pedidos que já foram pagos para o fornecedor
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

    // Calcular valores e unidades vendidas dos pedidos que pertencem ao fornecedor
    let totalOrdersValue = 0;
    let totalUnitsCount = 0;

    for (const order of allOrders) {
      // Pular se o pedido já foi pago
      if (paidOrderIds.has(order.id)) {
        continue;
      }
      if (!order.products) continue;

      const orderProducts = Array.isArray(order.products) ? order.products : [];
      const supplierOrderProducts = orderProducts.filter((product: any) => 
        productSkus.includes(product.sku)
      );

      if (supplierOrderProducts.length === 0) continue;

      // Calcular valor e unidades do fornecedor neste pedido
      let supplierValueInOrder = 0;
      let unitsInOrder = 0;

      for (const orderProduct of supplierOrderProducts) {
        const supplierProduct = supplierProducts.find(p => p.sku === orderProduct.sku);
        if (supplierProduct && supplierProduct.price) {
          const quantity = orderProduct.quantity || 1;
          const unitPrice = parseFloat(supplierProduct.price); // Usar preço B2B
          supplierValueInOrder += unitPrice * quantity;
          unitsInOrder += quantity;
        }
      }

      if (supplierValueInOrder > 0) {
        totalOrdersValue += supplierValueInOrder;
        totalUnitsCount += unitsInOrder;
      }
    }

    console.log('📊 FINANCE SERVICE DEBUG:');
    console.log(`- Total orders processed: ${allOrders.length}`);
    console.log(`- Total units sold: ${totalUnitsCount}`);
    console.log(`- Total orders value: €${totalOrdersValue}`);
    console.log(`- Paid order IDs excluded: ${paidOrderIds.size}`);

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
    
    // Pegar o preço B2B unitário fixo do primeiro produto (todos têm o mesmo preço)
    const unitB2BPrice = supplierProducts.length > 0 && supplierProducts[0].price 
      ? parseFloat(supplierProducts[0].price) 
      : 0;

    return {
      supplierId,
      supplierName: supplier.name,
      supplierEmail: supplier.email,
      totalOrdersValue,
      paidAmount,
      pendingAmount,
      totalUnitsCount,
      unitB2BPrice,
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