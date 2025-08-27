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

    // Buscar quantidades já pagas por SKU para este fornecedor
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

    // Calcular total de quantidades vendidas por SKU primeiro
    const totalQuantitiesBySku = new Map<string, number>();
    for (const order of allOrders) {
      if (!order.products) continue;
      
      const orderProducts = Array.isArray(order.products) ? order.products : [];
      for (const product of orderProducts) {
        if (productSkus.includes(product.sku)) {
          const current = totalQuantitiesBySku.get(product.sku) || 0;
          totalQuantitiesBySku.set(product.sku, current + (product.quantity || 1));
        }
      }
    }

    // Calcular valores pendentes baseado na diferença entre vendido e pago
    let totalOrdersValue = 0;
    let totalUnitsCount = 0;
    
    for (const [sku, totalSold] of Array.from(totalQuantitiesBySku.entries())) {
      const paidQuantity = paidQuantitiesBySku.get(sku) || 0;
      const pendingQuantity = Math.max(0, totalSold - paidQuantity);
      
      if (pendingQuantity > 0) {
        totalUnitsCount += pendingQuantity;
        const supplierProduct = supplierProducts.find(p => p.sku === sku);
        if (supplierProduct && supplierProduct.price) {
          const unitPrice = parseFloat(supplierProduct.price);
          totalOrdersValue += unitPrice * pendingQuantity;
        }
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
    paymentData: InsertSupplierPayment & { 
      orderIds?: string[];
      amountBRL?: number;
      exchangeRate?: number;
      items?: Array<{
        productSku: string;
        quantity: number;
        unitPrice: number;
        totalAmount: number;
      }>;
    },
    storeId: string
  ): Promise<SupplierPayment> {
    const { orderIds, items, ...payment } = paymentData;

    // Buscar balanço do fornecedor para validar
    const balance = await this.getSupplierBalance(payment.supplierId);
    if (!balance || balance.pendingAmount <= 0) {
      throw new Error('Fornecedor não tem valores pendentes para pagamento');
    }

    // Converter dueDate string para Date se necessário
    const processedPayment = {
      ...payment,
      dueDate: payment.dueDate ? new Date(payment.dueDate) : new Date(),
      amountBRL: payment.amountBRL ? payment.amountBRL.toString() : undefined,
      exchangeRate: payment.exchangeRate ? payment.exchangeRate.toString() : undefined,
    };

    // Criar o pagamento
    const [newPayment] = await db
      .insert(supplierPayments)
      .values({
        ...processedPayment,
        storeId,
      })
      .returning();

    // Criar itens de pagamento baseados nos itens fornecidos ou criar um consolidado
    const paymentItems: InsertSupplierPaymentItem[] = items && items.length > 0 
      ? items.map(item => ({
          paymentId: newPayment.id,
          orderId: null,
          productSku: item.productSku,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          totalAmount: item.totalAmount.toString(),
        }))
      : [{
          paymentId: newPayment.id,
          orderId: null, // Pagamento consolidado sem pedidos específicos
          productSku: 'Consolidado',
          quantity: balance.totalUnitsCount,
          unitPrice: balance.unitB2BPrice.toString(),
          totalAmount: balance.pendingAmount.toString(),
        }];

    await db.insert(supplierPaymentItems).values(paymentItems);

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
        amountBRL: supplierPayments.amountBRL,
        currency: supplierPayments.currency,
        exchangeRate: supplierPayments.exchangeRate,
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

    // Calcular total pendente real baseado na soma das carteiras de todos os fornecedores
    const suppliers = await this.getSuppliers();
    let totalPendingFromWallets = 0;
    
    console.log(`🔍 Finance Stats: Encontrados ${suppliers.length} fornecedores`);
    
    try {
      for (const supplier of suppliers) {
        console.log(`🔍 Processando fornecedor: ${supplier.name}`);
        const balance = await this.getSupplierBalance(supplier.id);
        console.log(`💰 Supplier ${supplier.name}: Balance = €${balance?.pendingAmount || 0}`);
        if (balance) {
          totalPendingFromWallets += balance.pendingAmount;
        }
      }
    } catch (error) {
      console.error('❌ Erro ao calcular carteiras dos fornecedores:', error);
      // Em caso de erro, usar o total dos pagamentos pendentes tradicionais
      totalPendingFromWallets = result.pending.total;
    }

    console.log(`💵 Total pendente das carteiras: €${totalPendingFromWallets}`);

    // Substituir o total pendente pelos valores reais das carteiras
    result.pending.total = totalPendingFromWallets;

    return result;
  }
}

export const financeService = new FinanceService();