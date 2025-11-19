import formData from 'form-data';
import Mailgun from 'mailgun.js';

type MailgunClient = ReturnType<ReturnType<typeof Mailgun>['client']>;

/**
 * Serviço de envio de credenciais administrativas via Mailgun.
 *
 * Teste manual rápido:
 * 1. Defina `MAILGUN_API_KEY` e `MAILGUN_DOMAIN` (.env) ou use variáveis de ambiente existentes.
 * 2. Opcional: `ADMIN_LOGIN_URL` (ou `VITE_APP_URL`) para ajustar o link de acesso no email.
 * 3. Faça uma requisição POST autenticada para `/api/admin/users` com nome, email e senha.
 * 4. Verifique os logs do servidor (✅/❌) e confirme o recebimento no email informado.
 */
// Configure default Mailgun client when environment variables are available
let defaultMailgunClient: MailgunClient | null = null;
if (process.env.MAILGUN_API_KEY) {
  const mailgun = new Mailgun(formData);
  defaultMailgunClient = mailgun.client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY,
  });
}

const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || '';

interface AdminUserCredentialsParams {
  toEmail: string;
  toName?: string;
  password: string;
  createdBy?: string;
  loginUrl?: string;
}

export class AdminUserEmailService {
  async sendCredentialsEmail(params: AdminUserCredentialsParams): Promise<void> {
    try {
      if (!params.toEmail || !params.password) {
        console.error('❌ AdminUserEmailService: email ou senha ausentes');
        return;
      }

      const mailgunDomain = MAILGUN_DOMAIN;
      const mailgunApiKey = process.env.MAILGUN_API_KEY;

      if (!mailgunApiKey || !mailgunDomain) {
        console.error('❌ AdminUserEmailService: MAILGUN_API_KEY ou MAILGUN_DOMAIN não configurados');
        return;
      }

      let mailgunClient = defaultMailgunClient;
      if (!mailgunClient) {
        const mailgun = new Mailgun(formData);
        mailgunClient = mailgun.client({
          username: 'api',
          key: mailgunApiKey,
        });
      }

      const senderName = 'N1 Global';
      const senderEmail = `noreply@${mailgunDomain}`;

      const loginUrl = this.resolveLoginUrl(params.loginUrl);
      const template = this.buildTemplate({
        toName: params.toName,
        toEmail: params.toEmail,
        password: params.password,
        loginUrl,
      });

      console.log('📧 Enviando credenciais administrativas para:', params.toEmail);

      await mailgunClient.messages.create(mailgunDomain, {
        from: `${senderName} <${senderEmail}>`,
        to: [params.toEmail],
        subject: 'Acesso ao painel administrativo N1 Global',
        text: template.text,
        html: template.html,
      });

      console.log('✅ Credenciais administrativas enviadas para:', params.toEmail);
    } catch (error) {
      console.error('❌ Erro ao enviar email de credenciais administrativas:', error);
    }
  }

  private resolveLoginUrl(customUrl?: string): string {
    if (customUrl && customUrl.trim()) {
      return customUrl.trim();
    }

    const envUrl =
      process.env.ADMIN_LOGIN_URL ||
      process.env.ADMIN_APP_URL ||
      process.env.VITE_APP_URL ||
      process.env.APP_BASE_URL ||
      process.env.CLIENT_APP_URL;

    if (envUrl) {
      const baseUrl = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
      return `${baseUrl}/login`;
    }

    return 'https://n1global.app/login';
  }

  private buildTemplate({
    toName,
    toEmail,
    password,
    loginUrl,
  }: {
    toName?: string;
    toEmail: string;
    password: string;
    loginUrl: string;
  }): { html: string; text: string } {
    const greetingName = toName ? `Olá, ${toName}!` : 'Olá!';
    
    // Detectar URL base para a logo
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://n1global.app' 
      : (process.env.VITE_APP_URL || process.env.APP_BASE_URL || 'https://n1global.app');
    const logoUrl = `${baseUrl}/images/n1-lblue.png`;
    
    const plainText = `
${greetingName}

Seu acesso a N1 Global foi criado.

Credenciais de acesso:
Email: ${toEmail}
Senha provisória: ${password}

Acesse o painel em: ${loginUrl}

Por segurança, recomendamos alterar a senha após o primeiro login.

—
Equipe N1 Global
`.trim();

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Acesso ao painel administrativo</title>
  </head>
  <body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f7;color:#1f2933;">
    <div style="max-width:520px;margin:0 auto;background-color:#ffffff;border-radius:8px;padding:24px;border:1px solid #e0e6ed;">
      <!-- Logo N1 Global -->
      <div style="text-align:center;margin-bottom:24px;">
        <img
          src="${logoUrl}"
          alt="N1 Global"
          style="height:30px;width:auto;max-width:200px;"
          width="200"
          height="30"
        />
      </div>
      
      <p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;">${greetingName}</p>
      <p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;">
        Seu acesso a N1 Global foi criado.
      </p>
      <div style="margin:24px 0;padding:16px;border:1px solid #d2d6dc;border-radius:6px;background-color:#f9fafb;">
        <p style="margin:0 0 12px 0;font-size:14px;line-height:1.5;color:#52606d;">
          <strong>Email:</strong><br />
          <span style="font-size:16px;color:#1f2933;">${toEmail}</span>
        </p>
        <p style="margin:0;font-size:14px;line-height:1.5;color:#52606d;">
          <strong>Senha provisória:</strong><br />
          <span style="display:inline-block;margin-top:6px;padding:6px 12px;border-radius:4px;background-color:#ffffff;border:1px solid #d2d6dc;font-family:'Courier New',Courier,monospace;">
            ${password}
          </span>
        </p>
      </div>
      <p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;">
        Acesse o painel em:
        <a href="${loginUrl}" style="color:#2563eb;text-decoration:none;">${loginUrl}</a>
      </p>
      <p style="margin:0 0 24px 0;font-size:14px;line-height:1.5;color:#52606d;">
        Por segurança, recomendamos alterar a senha após o primeiro login.
      </p>
      <p style="margin:0;font-size:14px;line-height:1.5;color:#52606d;">— Equipe N1 Global</p>
    </div>
  </body>
</html>
    `.trim();

    return { html, text: plainText };
  }
}

export const adminUserEmailService = new AdminUserEmailService();

