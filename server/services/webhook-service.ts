import crypto from 'crypto';
import fetch from 'node-fetch';
import { db } from '../db';
import { integrationConfigs, webhookLogs, orders, customerSupportOperations } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { WelcomeEmailService } from './welcome-email-service';

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
      // Get order details first to get operationId
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        console.error('❌ Order not found:', orderId);
        return;
      }

      if (!order.operationId) {
        console.log('ℹ️ Order has no operationId, skipping webhook:', orderId);
        return;
      }

      // Get active integration config for the specific operation
      const [config] = await db
        .select()
        .from(integrationConfigs)
        .where(
          and(
            eq(integrationConfigs.operationId, order.operationId),
            eq(integrationConfigs.integrationType, 'operational_app'),
            eq(integrationConfigs.isActive, true)
          )
        )
        .limit(1);

      if (!config) {
        console.log('ℹ️ No active integration config found for operation:', order.operationId);
        return;
      }

      // Build webhook payload (only required fields for operational app)
      const payload: any = {
        customer_email: order.customerEmail,
        customer_name: order.customerName,
        phone: order.customerPhone,
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

      // If webhook was successful, send welcome email with credentials
      console.log('🔍 Checking webhook response for email sending...', {
        status: result.status,
        hasBody: !!result.body,
        body: result.body
      });

      if (result.status >= 200 && result.status < 300 && result.body) {
        const response = result.body as any;
        
        console.log('🔍 Response validation:', {
          success: response.success,
          hasEmail: !!response.email,
          hasPassword: !!response.password,
          email: response.email
        });
        
        // Check if response contains email and password
        if (response.success && response.email && response.password) {
          // Check if welcome email is enabled
          if (!config.welcomeEmailEnabled) {
            console.log('⚠️ Welcome email disabled for this integration');
            return;
          }

          // Verify operation has active email support
          const [supportConfig] = await db
            .select()
            .from(customerSupportOperations)
            .where(
              and(
                eq(customerSupportOperations.operationId, order.operationId),
                eq(customerSupportOperations.isActive, true)
              )
            )
            .limit(1);

          if (!supportConfig) {
            console.log('⚠️ Operation does not have active email support, skipping welcome email');
            return;
          }

          console.log('📧 Webhook successful, sending welcome email...');
          console.log('📧 Email details:', {
            to: response.email,
            customerName: order.customerName,
            operationId: order.operationId
          });
          
          // Send welcome email with login credentials
          try {
            const welcomeEmailService = new WelcomeEmailService();
            await welcomeEmailService.sendWelcomeEmail({
              email: response.email,
              password: response.password,
              customerName: order.customerName || 'Cliente',
              operationId: order.operationId,
              appLoginUrl: config.appLoginUrl || 'https://app.example.com/login'
            });
            console.log('✅ Welcome email sent successfully!');
          } catch (emailError) {
            console.error('❌ Error sending welcome email:', emailError);
          }
        } else {
          console.log('⚠️ Skipping email - response validation failed');
        }
      } else {
        console.log('⚠️ Skipping email - webhook response not successful');
      }
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
      // Send test payload (only required fields for operational app)
      const testPayload: any = {
        customer_email: 'test@example.com',
        customer_name: 'Test Customer',
        phone: '+1234567890',
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
