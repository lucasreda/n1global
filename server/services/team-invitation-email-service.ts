import Mailgun from "mailgun.js";
import formData from "form-data";

interface InvitationEmailTranslations {
  subject: string;
  greeting: string;
  message: string;
  ctaButton: string;
  footer: string;
  expiresIn: string;
}

// Configure Mailgun
let mg: any = null;
if (process.env.MAILGUN_API_KEY) {
  const mailgun = new Mailgun(formData);
  mg = mailgun.client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY,
  });
}

const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || "";

export class TeamInvitationEmailService {
  private translations: Record<string, InvitationEmailTranslations> = {
    es: {
      subject: 'Invitación para unirse al equipo de operación',
      greeting: 'Hola,',
      message: 'Has sido invitado a unirte al equipo de la operación',
      ctaButton: 'Aceptar Invitación',
      footer: 'Equipo N1Global',
      expiresIn: 'Esta invitación expira en 7 días.'
    },
    pt: {
      subject: 'Convite para participar da equipe da operação',
      greeting: 'Olá,',
      message: 'Você foi convidado para participar da equipe da operação',
      ctaButton: 'Aceitar Convite',
      footer: 'Equipe N1Global',
      expiresIn: 'Este convite expira em 7 dias.'
    },
    en: {
      subject: 'Invitation to join operation team',
      greeting: 'Hello,',
      message: 'You have been invited to join the operation team',
      ctaButton: 'Accept Invitation',
      footer: 'N1Global Team',
      expiresIn: 'This invitation expires in 7 days.'
    }
  };

  private getTranslation(language: string): InvitationEmailTranslations {
    return this.translations[language] || this.translations.en;
  }

  /**
   * Obtém a URL base do frontend baseada em variáveis de ambiente
   * Prioridade: FRONTEND_URL > PUBLIC_URL > RAILWAY_PUBLIC_DOMAIN > detecção automática
   */
  private getFrontendBaseUrl(): string {
    // 1. FRONTEND_URL (específico para frontend)
    if (process.env.FRONTEND_URL) {
      const url = process.env.FRONTEND_URL.trim();
      if (url && !url.includes('localhost') && !url.includes('127.0.0.1')) {
        console.log('[Team Invite Email] Usando FRONTEND_URL:', url);
        return this.normalizeUrl(url);
      }
    }

    // 2. PUBLIC_URL (padrão usado em outros serviços)
    if (process.env.PUBLIC_URL) {
      const url = process.env.PUBLIC_URL.trim();
      if (url && !url.includes('localhost') && !url.includes('127.0.0.1')) {
        console.log('[Team Invite Email] Usando PUBLIC_URL:', url);
        return this.normalizeUrl(url);
      }
    }

    // 3. RAILWAY_PUBLIC_DOMAIN (se disponível no Railway)
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      const domain = process.env.RAILWAY_PUBLIC_DOMAIN.trim();
      if (domain && !domain.includes('localhost') && !domain.includes('127.0.0.1')) {
        const url = `https://${domain}`;
        console.log('[Team Invite Email] Usando RAILWAY_PUBLIC_DOMAIN:', url);
        return url;
      }
    }

    // 4. Detectar automaticamente do RAILWAY_ENVIRONMENT se disponível
    if (process.env.RAILWAY_ENVIRONMENT_NAME) {
      // Railway geralmente fornece o domínio através de outras variáveis
      // Mas podemos tentar construir baseado no nome do ambiente
      console.warn('[Team Invite Email] RAILWAY_ENVIRONMENT_NAME detectado mas sem URL pública configurada');
    }

    // Se nenhuma URL pública estiver configurada, lançar erro
    // Não usar localhost como fallback pois não funciona para emails
    const error = new Error(
      'Nenhuma URL pública do frontend configurada. Configure FRONTEND_URL, PUBLIC_URL ou RAILWAY_PUBLIC_DOMAIN.'
    );
    console.error('❌ [Team Invite Email]', error.message);
    console.error('[Team Invite Email] Variáveis de ambiente disponíveis:', {
      hasFrontendUrl: !!process.env.FRONTEND_URL,
      hasPublicUrl: !!process.env.PUBLIC_URL,
      hasRailwayPublicDomain: !!process.env.RAILWAY_PUBLIC_DOMAIN,
      nodeEnv: process.env.NODE_ENV || 'unknown'
    });
    throw error;
  }

  /**
   * Normaliza URL garantindo HTTPS e formato correto
   */
  private normalizeUrl(url: string): string {
    // Remover espaços e barras finais
    let normalized = url.trim().replace(/\/+$/, '');

    // Garantir HTTPS se não tiver protocolo
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `https://${normalized}`;
    }

    // Em produção, sempre usar HTTPS
    if (process.env.NODE_ENV === 'production' && normalized.startsWith('http://')) {
      normalized = normalized.replace('http://', 'https://');
      console.warn('[Team Invite Email] Convertendo HTTP para HTTPS em produção');
    }

    return normalized;
  }

  private buildEmailTemplate(
    params: {
      operationName: string;
      inviterName: string;
      role: string;
      invitationUrl: string;
    },
    translation: InvitationEmailTranslations,
    language: string
  ): { html: string; text: string } {
    const roleTranslations: Record<string, Record<string, string>> = {
      es: {
        owner: 'Propietario',
        admin: 'Administrador',
        viewer: 'Visualizador'
      },
      pt: {
        owner: 'Proprietário',
        admin: 'Administrador',
        viewer: 'Visualizador'
      },
      en: {
        owner: 'Owner',
        admin: 'Admin',
        viewer: 'Viewer'
      }
    };

    const roleLabels = roleTranslations[language] || roleTranslations.en;
    const roleLabel = roleLabels[params.role] || params.role;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${translation.subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">${translation.subject}</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">${translation.greeting}</p>
    
    <p style="font-size: 16px;">
      ${translation.message} <strong>${params.operationName}</strong> como <strong>${roleLabel}</strong>.
    </p>
    
    <p style="font-size: 16px;">
      ${params.inviterName} convidou você para fazer parte desta equipe.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.invitationUrl}" 
         style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
        ${translation.ctaButton}
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      ${translation.expiresIn}
    </p>
    
    <p style="font-size: 14px; color: #999; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
      ${translation.footer}
    </p>
  </div>
</body>
</html>
    `;

    const text = `
${translation.subject}

${translation.greeting}

${translation.message} ${params.operationName} como ${roleLabel}.

${params.inviterName} convidou você para fazer parte desta equipe.

Aceite o convite: ${params.invitationUrl}

${translation.expiresIn}

${translation.footer}
    `;

    return { html, text };
  }

  async sendInvitationEmail(params: {
    email: string;
    operationName: string;
    inviterName: string;
    role: string;
    invitationToken: string;
    language?: string;
  }): Promise<void> {
    try {
      // Verificar configuração do Mailgun
      const hasApiKey = !!process.env.MAILGUN_API_KEY;
      const hasDomain = !!MAILGUN_DOMAIN && MAILGUN_DOMAIN !== '';
      const hasClient = !!mg;

      console.log('[Team Invite Email] Verificando configuração Mailgun:', {
        hasApiKey,
        hasDomain,
        hasClient,
        domain: MAILGUN_DOMAIN || 'NOT_SET'
      });

      if (!hasApiKey) {
        const error = new Error('MAILGUN_API_KEY não configurado no ambiente');
        console.error('❌ [Team Invite Email]', error.message);
        throw error;
      }

      if (!hasDomain) {
        const error = new Error('MAILGUN_DOMAIN não configurado no ambiente');
        console.error('❌ [Team Invite Email]', error.message);
        throw error;
      }

      if (!hasClient) {
        const error = new Error('Cliente Mailgun não inicializado');
        console.error('❌ [Team Invite Email]', error.message);
        throw error;
      }

      const language = params.language || 'pt';
      const translation = this.getTranslation(language);
      
      // Obter URL base do frontend usando método helper
      const baseUrl = this.getFrontendBaseUrl();
      const invitationUrl = `${baseUrl}/accept-invitation/${params.invitationToken}`;

      // Validação adicional: garantir que não seja localhost em produção
      if (process.env.NODE_ENV === 'production' && (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'))) {
        const error = new Error('URL do frontend não pode ser localhost em produção');
        console.error('❌ [Team Invite Email]', error.message, { baseUrl });
        throw error;
      }

      console.log('[Team Invite Email] Preparando email:', {
        to: params.email,
        from: `noreply@${MAILGUN_DOMAIN}`,
        domain: MAILGUN_DOMAIN,
        baseUrl,
        invitationUrl,
        language,
        environment: process.env.NODE_ENV || 'unknown'
      });

      const templates = this.buildEmailTemplate(
        {
          operationName: params.operationName,
          inviterName: params.inviterName,
          role: params.role,
          invitationUrl
        },
        translation,
        language
      );

      const senderEmail = `noreply@${MAILGUN_DOMAIN}`;

      console.log('[Team Invite Email] Enviando email via Mailgun...');
      const result = await mg.messages.create(MAILGUN_DOMAIN, {
        from: `N1Global <${senderEmail}>`,
        to: params.email,
        subject: translation.subject,
        text: templates.text,
        html: templates.html,
      });

      console.log(`✅ [Team Invite Email] Email enviado com sucesso para ${params.email}`, {
        messageId: result.id,
        message: result.message
      });
    } catch (error: any) {
      console.error('❌ [Team Invite Email] Erro ao enviar email de convite:', {
        error: error.message,
        stack: error.stack,
        email: params.email,
        hasMailgunApiKey: !!process.env.MAILGUN_API_KEY,
        hasMailgunDomain: !!MAILGUN_DOMAIN,
        mailgunDomain: MAILGUN_DOMAIN || 'NOT_SET'
      });
      throw error;
    }
  }
}

export const teamInvitationEmailService = new TeamInvitationEmailService();
