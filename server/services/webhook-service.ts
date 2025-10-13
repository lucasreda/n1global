import crypto from 'crypto';
import fetch from 'node-fetch';
import { db } from '../db';
import { integrationConfigs, webhookLogs, orders } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

interface WebhookPayload {
  event: string;
  order: {
    id: string;
    customer_email: string | null;
    customer_name: string | null;
    phone: string | null;
  };
}

export class WebhookService {
  /**
   * Generate HMAC signature for webhook payload
   */
  private static generateHMAC(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Send webhook with retry logic
   */
  private static async sendWebhookWithRetry(
    url: string,
    payload: WebhookPayload,
    secret: string,
    maxRetries: number = 3,
    retryDelay: number = 5000
  ): Promise<{ status: number; body: any; error?: string }> {
    const payloadString = JSON.stringify(payload);
    const signature = this.generateHMAC(payloadString, secret);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔗 Sending webhook (attempt ${attempt}/${maxRetries}) to ${url}`);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
          },
          body: payloadString,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const responseBody = await response.json().catch(() => null);

        if (response.ok) {
          console.log(`✅ Webhook sent successfully:`, responseBody);
          return {
            status: response.status,
            body: responseBody,
          };
        } else {
          console.log(`❌ Webhook failed with status ${response.status}:`, responseBody);
          
          // Don't retry on 4xx errors (client errors)
          if (response.status >= 400 && response.status < 500) {
            return {
              status: response.status,
              body: responseBody,
              error: `Client error: ${response.status}`,
            };
          }

          // Retry on 5xx errors
          if (attempt < maxRetries) {
            console.log(`⏳ Retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }

          return {
            status: response.status,
            body: responseBody,
            error: `Server error after ${maxRetries} attempts`,
          };
        }
      } catch (error: any) {
        console.error(`❌ Webhook error (attempt ${attempt}):`, error.message);

        if (attempt < maxRetries) {
          console.log(`⏳ Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }

        return {
          status: 0,
          body: null,
          error: error.message || 'Network error',
        };
      }
    }

    return {
      status: 0,
      body: null,
      error: 'Max retries exceeded',
    };
  }

  /**
   * Dispatch webhook for new order
   */
  static async dispatchOrderCreatedWebhook(orderId: string, userId: string): Promise<void> {
    try {
      // Get active integration config for user
      const [config] = await db
        .select()
        .from(integrationConfigs)
        .where(
          and(
            eq(integrationConfigs.userId, userId),
            eq(integrationConfigs.integrationType, 'operational_app'),
            eq(integrationConfigs.isActive, true)
          )
        )
        .limit(1);

      if (!config) {
        console.log('ℹ️ No active integration config found for user:', userId);
        return;
      }

      // Get order details
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        console.error('❌ Order not found:', orderId);
        return;
      }

      // Build webhook payload
      const payload: WebhookPayload = {
        event: 'order.created',
        order: {
          id: order.id,
          customer_email: order.customerEmail,
          customer_name: order.customerName,
          phone: order.customerPhone,
        },
      };

      console.log('📤 Dispatching webhook for order:', orderId);

      // Send webhook with retry
      const result = await this.sendWebhookWithRetry(
        config.webhookUrl,
        payload,
        config.webhookSecret
      );

      // Log webhook dispatch
      await db.insert(webhookLogs).values({
        integrationConfigId: config.id,
        orderId: order.id,
        payload: payload as any,
        responseStatus: result.status,
        responseBody: result.body as any,
        errorMessage: result.error,
      });

      console.log('✅ Webhook logged successfully');
    } catch (error) {
      console.error('❌ Error dispatching webhook:', error);
    }
  }

  /**
   * Test webhook connection
   */
  static async testWebhook(webhookUrl: string, webhookSecret: string): Promise<{
    success: boolean;
    status?: number;
    message: string;
  }> {
    try {
      // Send test payload with fields at root level for compatibility
      const testPayload: any = {
        event: 'test',
        customer_email: 'test@example.com',
        customer_name: 'Test Customer',
        phone: '+1234567890',
        order_id: 'test-order-123',
      };

      const result = await this.sendWebhookWithRetry(
        webhookUrl,
        testPayload,
        webhookSecret,
        1, // Only 1 attempt for testing
        0
      );

      if (result.status >= 200 && result.status < 300) {
        return {
          success: true,
          status: result.status,
          message: 'Webhook connection successful',
        };
      } else {
        return {
          success: false,
          status: result.status,
          message: result.error || `HTTP ${result.status}`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Connection failed',
      };
    }
  }

  /**
   * Get webhook logs
   */
  static async getWebhookLogs(integrationConfigId: string, limit: number = 50) {
    return await db
      .select()
      .from(webhookLogs)
      .where(eq(webhookLogs.integrationConfigId, integrationConfigId))
      .orderBy(desc(webhookLogs.createdAt))
      .limit(limit);
  }
}
