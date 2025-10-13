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
    operationId: string,
    orderData: {
      customerPhone: string | null;
      customerAddress: string | null;
      customerCity: string | null;
      customerZipCode: string | null;
      customerCountry: string | null;
      products: string;
      total: string;
    }
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

      // Build email content in Spanish (Spain)
      const subject = `¡Tu viaje comienza aquí! - Mi Monja Boost`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          
          <!-- Header con mensaje de bienvenida -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px 15px 0 0; padding: 40px 30px; text-align: center; color: white;">
            <h1 style="margin: 0 0 15px 0; font-size: 28px; font-weight: bold;">¡Tu viaje comienza aquí! 🚀</h1>
            <p style="margin: 0; font-size: 18px; opacity: 0.95;">Tu pedido ya está siendo preparado</p>
          </div>

          <!-- Contenido principal -->
          <div style="background-color: white; padding: 35px 30px; border-radius: 0 0 15px 15px;">
            
            <!-- Datos del Pedido -->
            <div style="margin-bottom: 30px;">
              <h2 style="color: #667eea; margin: 0 0 20px 0; font-size: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">📦 Detalles del Pedido</h2>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 15px;">
                <p style="margin: 0 0 8px 0;"><strong>Productos:</strong> ${orderData.products}</p>
                <p style="margin: 0;"><strong>Total:</strong> <span style="color: #667eea; font-size: 18px; font-weight: bold;">${orderData.total}</span></p>
              </div>

              ${orderData.customerAddress ? `
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                <h3 style="margin: 0 0 12px 0; color: #555; font-size: 16px;">📍 Dirección de Envío</h3>
                <p style="margin: 0 0 5px 0;">${orderData.customerAddress}</p>
                <p style="margin: 0;">${orderData.customerCity || ''}${orderData.customerZipCode ? ', ' + orderData.customerZipCode : ''}${orderData.customerCountry ? ', ' + orderData.customerCountry : ''}</p>
                ${orderData.customerPhone ? `<p style="margin: 8px 0 0 0;"><strong>Tel:</strong> ${orderData.customerPhone}</p>` : ''}
              </div>
              ` : ''}
            </div>

            <!-- Datos de Acceso -->
            <div style="margin-bottom: 30px;">
              <h2 style="color: #667eea; margin: 0 0 20px 0; font-size: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">🔐 Datos de Acceso al Aplicativo</h2>
              
              <div style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); padding: 25px; border-radius: 10px; border-left: 5px solid #667eea;">
                <p style="margin: 0 0 12px 0;">
                  <strong style="color: #555;">Email:</strong><br>
                  <span style="font-size: 16px; color: #667eea; font-weight: 600;">${email}</span>
                </p>
                <p style="margin: 0;">
                  <strong style="color: #555;">Contraseña:</strong><br>
                  <code style="background-color: white; padding: 8px 15px; border-radius: 5px; font-size: 16px; color: #333; display: inline-block; margin-top: 5px; border: 2px solid #667eea;">${password}</code>
                </p>
              </div>

              <p style="font-size: 13px; color: #7f8c8d; margin-top: 15px; padding: 12px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 5px;">
                ⚠️ <strong>Importante:</strong> Por seguridad, te recomendamos cambiar tu contraseña en el primer acceso.
              </p>
            </div>

            <!-- Botón de Acceso -->
            <div style="text-align: center; margin: 35px 0 20px 0;">
              <a href="https://nutra.replit.app/" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 45px; border-radius: 50px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: transform 0.2s;">
                🚀 Acceder al Aplicativo Mi Monja Boost
              </a>
            </div>

          </div>

          <!-- Footer -->
          <div style="text-align: center; color: #95a5a6; font-size: 12px; margin-top: 25px; padding: 20px;">
            <p style="margin: 0 0 5px 0;">Este es un mensaje automático. Por favor, no respondas a este email.</p>
            <p style="margin: 0; font-weight: 600;">${operation.name}</p>
          </div>
        </body>
        </html>
      `;

      const textContent = `
¡Tu viaje comienza aquí!
Tu pedido ya está siendo preparado

📦 DETALLES DEL PEDIDO
Productos: ${orderData.products}
Total: ${orderData.total}

${orderData.customerAddress ? `📍 DIRECCIÓN DE ENVÍO
${orderData.customerAddress}
${orderData.customerCity || ''}${orderData.customerZipCode ? ', ' + orderData.customerZipCode : ''}${orderData.customerCountry ? ', ' + orderData.customerCountry : ''}
${orderData.customerPhone ? 'Tel: ' + orderData.customerPhone : ''}
` : ''}

🔐 DATOS DE ACCESO AL APLICATIVO
Email: ${email}
Contraseña: ${password}

⚠️ Importante: Por seguridad, te recomendamos cambiar tu contraseña en el primer acceso.

🚀 ACCEDER AL APLICATIVO
https://nutra.replit.app/

---
Este es un mensaje automático. Por favor, no respondas a este email.
${operation.name}
      `.trim();

      console.log('📧 Sending welcome email to:', email);

      // Send email via Mailgun
      await mg.messages.create(MAILGUN_DOMAIN, {
        from: `Mi Monja Boost <noreply@${MAILGUN_DOMAIN}>`,
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
          
          // Prepare order data for email
          const orderData = {
            customerPhone: order.customerPhone,
            customerAddress: order.customerAddress,
            customerCity: order.customerCity,
            customerZipCode: order.customerZip,
            customerCountry: order.customerCountry,
            products: (order.products as any)?.name || order.products || 'Pedido',
            total: order.total ? `€${Number(order.total).toFixed(2)}` : '€0.00',
          };
          
          // Send welcome email with login credentials
          await this.sendWelcomeEmail(
            response.email,
            response.password,
            order.customerName || 'Cliente',
            order.operationId || '',
            orderData
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
