import crypto from 'crypto';
import fetch from 'node-fetch';
import { db } from '../db';
import { integrationConfigs, webhookLogs, orders, operations } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import formData from 'form-data';
import Mailgun from 'mailgun.js';

interface WebhookPayload {
  event: string;
  order: {
    id: string;
    customer_email: string | null;
    customer_name: string | null;
    phone: string | null;
  };
}

// Configure Mailgun
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || '',
});

const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || '';

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
   * Send welcome email with login credentials
   */
  private static async sendWelcomeEmail(
    email: string,
    password: string,
    customerName: string,
    operationId: string
  ): Promise<void> {
    try {
      // Get operation details
      const [operation] = await db
        .select()
        .from(operations)
        .where(eq(operations.id, operationId))
        .limit(1);

      if (!operation) {
        console.error('❌ Operation not found:', operationId);
        return;
      }

      // Build email content
      const subject = `Bem-vindo! Seus dados de acesso - ${operation.name}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin-top: 0;">Bem-vindo, ${customerName}! 👋</h1>
            <p style="font-size: 16px; margin-bottom: 20px;">
              Sua conta foi criada com sucesso. Aqui estão seus dados de acesso:
            </p>
            
            <div style="background-color: white; border-left: 4px solid #3498db; padding: 20px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0 0 10px 0;"><strong>🔐 Email:</strong> ${email}</p>
              <p style="margin: 0;"><strong>🔑 Senha:</strong> <code style="background-color: #ecf0f1; padding: 5px 10px; border-radius: 3px; font-size: 14px;">${password}</code></p>
            </div>

            <p style="font-size: 14px; color: #7f8c8d; margin-top: 20px;">
              ⚠️ <strong>Importante:</strong> Por segurança, recomendamos que você altere sua senha no primeiro acesso.
            </p>
          </div>

          <div style="text-align: center; color: #95a5a6; font-size: 12px; margin-top: 30px;">
            <p>Esta é uma mensagem automática. Por favor, não responda a este email.</p>
            <p>${operation.name}</p>
          </div>
        </body>
        </html>
      `;

      const textContent = `
Bem-vindo, ${customerName}!

Sua conta foi criada com sucesso. Aqui estão seus dados de acesso:

Email: ${email}
Senha: ${password}

⚠️ Importante: Por segurança, recomendamos que você altere sua senha no primeiro acesso.

---
Esta é uma mensagem automática. Por favor, não responda a este email.
${operation.name}
      `.trim();

      console.log('📧 Sending welcome email to:', email);

      // Send email via Mailgun
      await mg.messages.create(MAILGUN_DOMAIN, {
        from: `${operation.name} <noreply@${MAILGUN_DOMAIN}>`,
        to: [email],
        subject: subject,
        text: textContent,
        html: htmlContent,
      });

      console.log('✅ Welcome email sent successfully to:', email);
    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
    }
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
      if (result.status >= 200 && result.status < 300 && result.body) {
        const response = result.body as any;
        
        // Check if response contains email and password
        if (response.success && response.email && response.password) {
          console.log('📧 Webhook successful, sending welcome email...');
          
          // Send welcome email with login credentials
          await this.sendWelcomeEmail(
            response.email,
            response.password,
            order.customerName || 'Cliente',
            order.operationId || ''
          );
        }
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
