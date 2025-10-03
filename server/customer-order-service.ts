import { db } from "./db";
import { orders, operations } from "@shared/schema";
import { eq, and, or, desc, isNotNull, sql } from "drizzle-orm";
import { like } from "drizzle-orm";
import type { Order } from "@shared/schema";
import { extractEmailAddress } from './utils/email-utils';

export interface CustomerOrderMatch {
  order: Order;
  matchType: 'email' | 'phone' | 'name_phone';
  confidence: 'high' | 'medium' | 'low';
}

export interface OrderActionResult {
  success: boolean;
  message: string;
  orderId?: string;
  actionType: string;
  executedAt: Date;
}

export interface OperationOrderRules {
  cancellationTimeLimit: number; // horas
  addressChangeAllowed: boolean;
  autoRefundEnabled: boolean;
  requireHumanApproval: string[]; // ['refund', 'address_change']
  maxOrderValue: number; // limite para ações automáticas em EUR
  allowedStatuses: {
    cancellation: string[];
    addressChange: string[];
  };
}

export interface AddressUpdateData {
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerCountry?: string;
  customerZip?: string;
}

export class CustomerOrderService {
  
  // Regras padrão por operação (podem ser sobrescritas por configurações do banco futuramente)
  private defaultRules: OperationOrderRules = {
    cancellationTimeLimit: 24, // 24 horas
    addressChangeAllowed: true,
    autoRefundEnabled: false,
    requireHumanApproval: ['refund'],
    maxOrderValue: 500, // EUR 500
    allowedStatuses: {
      cancellation: ['pending', 'confirmed', 'new order'],
      addressChange: ['pending', 'confirmed', 'new order', 'packed']
    }
  };

  /**
   * Encontra pedidos do cliente por múltiplos critérios
   */
  async findCustomerOrders(
    operationId: string,
    email?: string,
    phone?: string,
    name?: string
  ): Promise<CustomerOrderMatch[]> {
    // Limpar email se fornecido (remover nome de "Name <email@example.com>")
    const cleanEmail = email ? extractEmailAddress(email) : undefined;
    
    console.log('🔍 CustomerOrderService: Searching orders for', { operationId, email: cleanEmail, phone, name });

    const matches: CustomerOrderMatch[] = [];

    try {
      // 1. Busca exata por email (alta confiança)
      if (cleanEmail) {
        const emailOrders = await db
          .select()
          .from(orders)
          .where(
            and(
              eq(orders.operationId, operationId),
              eq(orders.customerEmail, cleanEmail)
            )
          )
          .orderBy(desc(orders.orderDate));

        emailOrders.forEach(order => {
          matches.push({
            order,
            matchType: 'email',
            confidence: 'high'
          });
        });

        console.log(`📧 Found ${emailOrders.length} orders by email`);
      }

      // 2. Busca por telefone (média confiança)
      if (phone && phone.length >= 8) {
        const cleanPhone = phone.replace(/\D/g, '');
        const phonePattern = `%${cleanPhone.slice(-8)}%`; // Últimos 8 dígitos
        
        const phoneOrders = await db
          .select()
          .from(orders)
          .where(
            and(
              eq(orders.operationId, operationId),
              like(orders.customerPhone, phonePattern)
            )
          )
          .orderBy(desc(orders.orderDate));

        phoneOrders.forEach(order => {
          // Evitar duplicatas se já encontrado por email
          const exists = matches.find(m => m.order.id === order.id);
          if (!exists) {
            matches.push({
              order,
              matchType: 'phone',
              confidence: 'medium'
            });
          }
        });

        console.log(`📱 Found ${phoneOrders.length} orders by phone`);
      }

      // 3. Busca por nome + telefone parcial (baixa confiança)
      if (name && phone && name.length >= 3) {
        const namePattern = `%${name.toLowerCase()}%`;
        const cleanPhone = phone.replace(/\D/g, '');
        const phonePattern = `%${cleanPhone.slice(-6)}%`; // Últimos 6 dígitos
        
        const namePhoneOrders = await db
          .select()
          .from(orders)
          .where(
            and(
              eq(orders.operationId, operationId),
              sql`LOWER(${orders.customerName}) LIKE ${namePattern}`,
              like(orders.customerPhone, phonePattern)
            )
          )
          .orderBy(desc(orders.orderDate));

        namePhoneOrders.forEach(order => {
          // Evitar duplicatas
          const exists = matches.find(m => m.order.id === order.id);
          if (!exists) {
            matches.push({
              order,
              matchType: 'name_phone',
              confidence: 'low'
            });
          }
        });

        console.log(`👤 Found ${namePhoneOrders.length} orders by name+phone`);
      }

      console.log(`🎯 Total customer orders found: ${matches.length}`);
      return matches;

    } catch (error) {
      console.error('❌ Error finding customer orders:', error);
      return [];
    }
  }

  /**
   * Obtém regras de operação para ações de pedidos
   */
  async getOperationRules(operationId: string): Promise<OperationOrderRules> {
    // Por enquanto retorna regras padrão
    // Futuramente pode buscar de uma tabela operation_order_rules
    console.log('⚙️ Getting operation rules for:', operationId);
    return this.defaultRules;
  }

  /**
   * Verifica se um pedido pode ser cancelado
   */
  async canCancelOrder(orderId: string, operationId: string): Promise<{
    allowed: boolean;
    reason: string;
    requiresApproval: boolean;
  }> {
    try {
      const [order] = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.operationId, operationId)
          )
        );

      if (!order) {
        return {
          allowed: false,
          reason: 'Pedido não encontrado',
          requiresApproval: false
        };
      }

      const rules = await this.getOperationRules(operationId);

      // Verificar status
      if (!rules.allowedStatuses.cancellation.includes(order.status)) {
        return {
          allowed: false,
          reason: `Não é possível cancelar pedido com status: ${order.status}`,
          requiresApproval: false
        };
      }

      // Verificar limite de tempo
      if (order.orderDate) {
        const orderTime = new Date(order.orderDate);
        const now = new Date();
        const hoursDiff = (now.getTime() - orderTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff > rules.cancellationTimeLimit) {
          return {
            allowed: false,
            reason: `Prazo de cancelamento expirado (${rules.cancellationTimeLimit}h)`,
            requiresApproval: false
          };
        }
      }

      // Verificar valor máximo
      const orderValue = parseFloat(order.total?.toString() || '0');
      const requiresApproval = orderValue > rules.maxOrderValue;

      return {
        allowed: true,
        reason: requiresApproval 
          ? `Pedido de alto valor (€${orderValue}) - requer aprovação humana`
          : 'Cancelamento permitido',
        requiresApproval
      };

    } catch (error) {
      console.error('❌ Error checking cancellation permission:', error);
      return {
        allowed: false,
        reason: 'Erro interno ao verificar permissões',
        requiresApproval: false
      };
    }
  }

  /**
   * Verifica se um pedido pode ter o endereço alterado
   */
  async canChangeAddress(orderId: string, operationId: string): Promise<{
    allowed: boolean;
    reason: string;
    requiresApproval: boolean;
  }> {
    try {
      const [order] = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.operationId, operationId)
          )
        );

      if (!order) {
        return {
          allowed: false,
          reason: 'Pedido não encontrado',
          requiresApproval: false
        };
      }

      const rules = await this.getOperationRules(operationId);

      if (!rules.addressChangeAllowed) {
        return {
          allowed: false,
          reason: 'Alteração de endereço não permitida para esta operação',
          requiresApproval: false
        };
      }

      // Verificar status
      if (!rules.allowedStatuses.addressChange.includes(order.status)) {
        return {
          allowed: false,
          reason: `Não é possível alterar endereço com status: ${order.status}`,
          requiresApproval: false
        };
      }

      const requiresApproval = rules.requireHumanApproval.includes('address_change');

      return {
        allowed: true,
        reason: requiresApproval 
          ? 'Alteração de endereço requer aprovação humana'
          : 'Alteração de endereço permitida',
        requiresApproval
      };

    } catch (error) {
      console.error('❌ Error checking address change permission:', error);
      return {
        allowed: false,
        reason: 'Erro interno ao verificar permissões',
        requiresApproval: false
      };
    }
  }

  /**
   * Cancela um pedido automaticamente
   */
  async cancelOrder(
    orderId: string,
    operationId: string,
    reason: string,
    automatedBy: string = 'sofia'
  ): Promise<OrderActionResult> {
    try {
      console.log('🚫 Attempting to cancel order:', { orderId, operationId, reason, automatedBy });

      // Verificar se é permitido
      const canCancel = await this.canCancelOrder(orderId, operationId);
      
      if (!canCancel.allowed) {
        return {
          success: false,
          message: canCancel.reason,
          orderId,
          actionType: 'cancel_order',
          executedAt: new Date()
        };
      }

      if (canCancel.requiresApproval) {
        return {
          success: false,
          message: 'Este pedido requer aprovação humana para cancelamento',
          orderId,
          actionType: 'cancel_order_approval_required',
          executedAt: new Date()
        };
      }

      // Executar cancelamento
      const [updatedOrder] = await db
        .update(orders)
        .set({
          status: 'cancelled',
          notes: `Cancelado automaticamente por ${automatedBy}. Motivo: ${reason}`,
          lastStatusUpdate: new Date(),
          updatedAt: new Date()
        })
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.operationId, operationId)
          )
        )
        .returning();

      if (!updatedOrder) {
        return {
          success: false,
          message: 'Falha ao atualizar status do pedido',
          orderId,
          actionType: 'cancel_order',
          executedAt: new Date()
        };
      }

      console.log('✅ Order cancelled successfully:', orderId);

      return {
        success: true,
        message: `Pedido ${orderId} cancelado com sucesso`,
        orderId,
        actionType: 'cancel_order',
        executedAt: new Date()
      };

    } catch (error) {
      console.error('❌ Error cancelling order:', error);
      return {
        success: false,
        message: 'Erro interno ao cancelar pedido',
        orderId,
        actionType: 'cancel_order',
        executedAt: new Date()
      };
    }
  }

  /**
   * Atualiza o endereço de entrega de um pedido
   */
  async updateShippingAddress(
    orderId: string,
    operationId: string,
    newAddress: AddressUpdateData,
    updatedBy: string = 'sofia'
  ): Promise<OrderActionResult> {
    try {
      console.log('📍 Attempting to update address:', { orderId, operationId, newAddress, updatedBy });

      // Verificar se é permitido
      const canChange = await this.canChangeAddress(orderId, operationId);
      
      if (!canChange.allowed) {
        return {
          success: false,
          message: canChange.reason,
          orderId,
          actionType: 'update_address',
          executedAt: new Date()
        };
      }

      if (canChange.requiresApproval) {
        return {
          success: false,
          message: 'Esta alteração de endereço requer aprovação humana',
          orderId,
          actionType: 'update_address_approval_required',
          executedAt: new Date()
        };
      }

      // Preparar dados para atualização
      const updateData: any = {
        lastStatusUpdate: new Date(),
        updatedAt: new Date()
      };

      // Incluir apenas campos que foram fornecidos
      if (newAddress.customerAddress) updateData.customerAddress = newAddress.customerAddress;
      if (newAddress.customerCity) updateData.customerCity = newAddress.customerCity;
      if (newAddress.customerState) updateData.customerState = newAddress.customerState;
      if (newAddress.customerCountry) updateData.customerCountry = newAddress.customerCountry;
      if (newAddress.customerZip) updateData.customerZip = newAddress.customerZip;

      // Atualizar notes com histórico
      const addressParts = [];
      if (newAddress.customerAddress) addressParts.push(`Endereço: ${newAddress.customerAddress}`);
      if (newAddress.customerCity) addressParts.push(`Cidade: ${newAddress.customerCity}`);
      if (newAddress.customerState) addressParts.push(`Estado: ${newAddress.customerState}`);
      if (newAddress.customerCountry) addressParts.push(`País: ${newAddress.customerCountry}`);
      if (newAddress.customerZip) addressParts.push(`CEP: ${newAddress.customerZip}`);

      const addressUpdateNote = `Endereço atualizado por ${updatedBy}. ${addressParts.join(', ')}`;
      
      // Buscar notas existentes para preservar
      const [currentOrder] = await db
        .select({ notes: orders.notes })
        .from(orders)
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.operationId, operationId)
          )
        );

      if (currentOrder) {
        const existingNotes = currentOrder.notes || '';
        updateData.notes = existingNotes ? `${existingNotes}\n${addressUpdateNote}` : addressUpdateNote;
      } else {
        updateData.notes = addressUpdateNote;
      }

      // Executar atualização
      const [updatedOrder] = await db
        .update(orders)
        .set(updateData)
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.operationId, operationId)
          )
        )
        .returning();

      if (!updatedOrder) {
        return {
          success: false,
          message: 'Falha ao atualizar endereço do pedido',
          orderId,
          actionType: 'update_address',
          executedAt: new Date()
        };
      }

      console.log('✅ Address updated successfully:', orderId);

      return {
        success: true,
        message: `Endereço do pedido ${orderId} atualizado com sucesso`,
        orderId,
        actionType: 'update_address',
        executedAt: new Date()
      };

    } catch (error) {
      console.error('❌ Error updating address:', error);
      return {
        success: false,
        message: 'Erro interno ao atualizar endereço',
        orderId,
        actionType: 'update_address',
        executedAt: new Date()
      };
    }
  }

  /**
   * Obtém informações básicas de um pedido para suporte
   */
  async getOrderSummary(orderId: string, operationId: string): Promise<{
    found: boolean;
    order?: Order;
    summary?: string;
    trackingInfo?: string;
    statusInfo?: string;
  }> {
    try {
      const [order] = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.id, orderId),
            eq(orders.operationId, operationId)
          )
        );

      if (!order) {
        return { found: false };
      }

      // Mapear status para mensagens amigáveis
      const statusMessages: { [key: string]: string } = {
        'pending': 'Aguardando confirmação',
        'confirmed': 'Confirmado e em preparação',
        'packed': 'Embalado, aguardando coleta',
        'shipped': 'Enviado',
        'in transit': 'Em trânsito',
        'delivered': 'Entregue',
        'cancelled': 'Cancelado',
        'new order': 'Novo pedido'
      };

      const statusInfo = statusMessages[order.status] || order.status;
      
      const trackingInfo = order.trackingNumber 
        ? `Código de rastreamento: ${order.trackingNumber}`
        : 'Código de rastreamento ainda não disponível';

      const orderDate = order.orderDate ? new Date(order.orderDate).toLocaleDateString('pt-BR') : 'N/A';
      const totalValue = order.total ? `€${parseFloat(order.total.toString()).toFixed(2)}` : 'N/A';

      const summary = `Pedido #${orderId} - Data: ${orderDate} - Valor: ${totalValue} - Status: ${statusInfo}`;

      return {
        found: true,
        order,
        summary,
        trackingInfo,
        statusInfo
      };

    } catch (error) {
      console.error('❌ Error getting order summary:', error);
      return { found: false };
    }
  }

  /**
   * Obtém estatísticas do cliente baseado em seus pedidos
   */
  async getCustomerStats(operationId: string, email?: string, phone?: string): Promise<{
    totalOrders: number;
    totalValue: number;
    deliveredOrders: number;
    cancelledOrders: number;
    lastOrderDate?: Date;
    customerType: 'new' | 'returning' | 'vip';
  }> {
    try {
      const matches = await this.findCustomerOrders(operationId, email, phone);
      const customerOrders = matches.map(m => m.order);

      if (customerOrders.length === 0) {
        return {
          totalOrders: 0,
          totalValue: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
          customerType: 'new'
        };
      }

      const totalOrders = customerOrders.length;
      const totalValue = customerOrders.reduce((sum, order) => {
        return sum + parseFloat(order.total?.toString() || '0');
      }, 0);

      const deliveredOrders = customerOrders.filter(o => o.status === 'delivered').length;
      const cancelledOrders = customerOrders.filter(o => o.status === 'cancelled').length;
      
      const lastOrderDate = customerOrders
        .filter(o => o.orderDate)
        .sort((a, b) => new Date(b.orderDate!).getTime() - new Date(a.orderDate!).getTime())[0]?.orderDate;

      // Determinar tipo de cliente
      let customerType: 'new' | 'returning' | 'vip' = 'new';
      if (totalOrders >= 5 && totalValue >= 500) {
        customerType = 'vip';
      } else if (totalOrders >= 2) {
        customerType = 'returning';
      }

      return {
        totalOrders,
        totalValue,
        deliveredOrders,
        cancelledOrders,
        lastOrderDate: lastOrderDate ? new Date(lastOrderDate) : undefined,
        customerType
      };

    } catch (error) {
      console.error('❌ Error getting customer stats:', error);
      return {
        totalOrders: 0,
        totalValue: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        customerType: 'new'
      };
    }
  }
}

export const customerOrderService = new CustomerOrderService();