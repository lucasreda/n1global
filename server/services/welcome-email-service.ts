import { db } from '../db';
import { operations, customerSupportOperations } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import formData from 'form-data';
import Mailgun from 'mailgun.js';

interface WelcomeEmailTranslations {
  greeting: string;
  welcome: string;
  orderPreparing: string;
  journeyStarts: string;
  accessData: string;
  email: string;
  password: string;
  ctaButton: string;
  footer: string;
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

const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || '';

export class WelcomeEmailService {
  private translations: Record<string, WelcomeEmailTranslations> = {
    es: {
      greeting: 'Hola, bienvenido a MonjaBoost.',
      welcome: 'Hola, bienvenido a MonjaBoost.',
      orderPreparing: 'Tu pedido ya está siendo preparado, pero tu viaje comienza aquí.',
      journeyStarts: 'Aquí están los datos de acceso de tu aplicación Monja, que es tu asistente personal en este viaje.',
      accessData: 'Aquí están los datos de acceso de tu aplicación Monja, que es tu asistente personal en este viaje.',
      email: 'Email',
      password: 'Contraseña',
      ctaButton: 'Acceder a mi APP',
      footer: 'Equipo MonjaBoost'
    },
    pt: {
      greeting: 'Olá, bem vindo ao MonjaBoost.',
      welcome: 'Olá, bem vindo ao MonjaBoost.',
      orderPreparing: 'Seu pedido já está sendo preparado, mas sua jornada já começa aqui.',
      journeyStarts: 'Aqui estão os dados de acesso do seu aplicativo Monja, que é seu assistente pessoal nessa jornada.',
      accessData: 'Aqui estão os dados de acesso do seu aplicativo Monja, que é seu assistente pessoal nessa jornada.',
      email: 'Email',
      password: 'Senha',
      ctaButton: 'Acessar meu APP',
      footer: 'Equipe MonjaBoost'
    },
    en: {
      greeting: 'Hello, welcome to MonjaBoost.',
      welcome: 'Hello, welcome to MonjaBoost.',
      orderPreparing: 'Your order is being prepared, but your journey starts here.',
      journeyStarts: 'Here are your Monja app access details, your personal assistant on this journey.',
      accessData: 'Here are your Monja app access details, your personal assistant on this journey.',
      email: 'Email',
      password: 'Password',
      ctaButton: 'Access my APP',
      footer: 'MonjaBoost Team'
    },
    it: {
      greeting: 'Ciao, benvenuto in MonjaBoost.',
      welcome: 'Ciao, benvenuto in MonjaBoost.',
      orderPreparing: 'Il tuo ordine è in preparazione, ma il tuo viaggio inizia qui.',
      journeyStarts: 'Ecco i dettagli di accesso per la tua app Monja, la tua assistente personale in questo viaggio.',
      accessData: 'Ecco i dettagli di accesso per la tua app Monja, la tua assistente personale in questo viaggio.',
      email: 'Email',
      password: 'Password',
      ctaButton: 'Accedi alla mia APP',
      footer: 'Team MonjaBoost'
    },
    fr: {
      greeting: 'Bonjour, bienvenue sur MonjaBoost.',
      welcome: 'Bonjour, bienvenue sur MonjaBoost.',
      orderPreparing: 'Votre commande est en préparation, mais votre voyage commence ici.',
      journeyStarts: 'Voici les détails d\'accès à votre application Monja, votre assistant personnel pour ce voyage.',
      accessData: 'Voici les détails d\'accès à votre application Monja, votre assistant personnel pour ce voyage.',
      email: 'Email',
      password: 'Mot de passe',
      ctaButton: 'Accéder à mon APP',
      footer: 'Équipe MonjaBoost'
    },
    de: {
      greeting: 'Hallo, willkommen bei MonjaBoost.',
      welcome: 'Hallo, willkommen bei MonjaBoost.',
      orderPreparing: 'Ihre Bestellung wird vorbereitet, aber Ihre Reise beginnt hier.',
      journeyStarts: 'Hier sind Ihre Zugangsdaten für die Monja-App, Ihr persönlicher Assistent auf dieser Reise.',
      accessData: 'Hier sind Ihre Zugangsdaten für die Monja-App, Ihr persönlicher Assistent auf dieser Reise.',
      email: 'E-Mail',
      password: 'Passwort',
      ctaButton: 'Zugang zu meiner APP',
      footer: 'MonjaBoost Team'
    },
    pl: {
      greeting: 'Witaj, witamy w MonjaBoost.',
      welcome: 'Witaj, witamy w MonjaBoost.',
      orderPreparing: 'Twoje zamówienie jest przygotowywane, ale Twoja podróż zaczyna się tutaj.',
      journeyStarts: 'Oto dane dostępowe do aplikacji Monja, Twojego osobistego asystenta podczas tej podróży.',
      accessData: 'Oto dane dostępowe do aplikacji Monja, Twojego osobistego asystenta podczas tej podróży.',
      email: 'Email',
      password: 'Hasło',
      ctaButton: 'Dostęp do mojej APLIKACJI',
      footer: 'Zespół MonjaBoost'
    },
    ro: {
      greeting: 'Bună, bun venit la MonjaBoost.',
      welcome: 'Bună, bun venit la MonjaBoost.',
      orderPreparing: 'Comanda ta este în pregătire, dar călătoria ta începe aici.',
      journeyStarts: 'Iată detaliile de acces pentru aplicația ta Monja, asistentul tău personal în această călătorie.',
      accessData: 'Iată detaliile de acces pentru aplicația ta Monja, asistentul tău personal în această călătorie.',
      email: 'Email',
      password: 'Parolă',
      ctaButton: 'Accesează aplicația mea',
      footer: 'Echipa MonjaBoost'
    },
    cs: {
      greeting: 'Dobrý den, vítejte v MonjaBoost.',
      welcome: 'Dobrý den, vítejte v MonjaBoost.',
      orderPreparing: 'Vaše objednávka se připravuje, ale vaše cesta začíná tady.',
      journeyStarts: 'Zde jsou přihlašovací údaje k aplikaci Monja, vašeho osobního asistenta na této cestě.',
      accessData: 'Zde jsou přihlašovací údaje k aplikaci Monja, vašeho osobního asistenta na této cestě.',
      email: 'Email',
      password: 'Heslo',
      ctaButton: 'Přístup k mé APLIKACI',
      footer: 'Tým MonjaBoost'
    },
    hu: {
      greeting: 'Üdvözlöm, üdvözöljük a MonjaBoost-ban.',
      welcome: 'Üdvözlöm, üdvözöljük a MonjaBoost-ban.',
      orderPreparing: 'Megrendelését előkészítjük, de utazása itt kezdődik.',
      journeyStarts: 'Itt vannak a Monja alkalmazás elérése, személyes asszisztense ezen az úton.',
      accessData: 'Itt vannak a Monja alkalmazás elérése, személyes asszisztense ezen az úton.',
      email: 'Email',
      password: 'Jelszó',
      ctaButton: 'Hozzáférés az alkalmazásomhoz',
      footer: 'MonjaBoost Csapat'
    },
    bg: {
      greeting: 'Здравейте, добре дошли в MonjaBoost.',
      welcome: 'Здравейте, добре дошли в MonjaBoost.',
      orderPreparing: 'Поръчката ви се подготвя, но пътуването ви започва тук.',
      journeyStarts: 'Ето данните за достъп до приложението Monja, вашият личен асистент по време на това пътуване.',
      accessData: 'Ето данните за достъп до приложението Monja, вашият личен асистент по време на това пътуване.',
      email: 'Имейл',
      password: 'Парола',
      ctaButton: 'Достъп до моето приложение',
      footer: 'Екип MonjaBoost'
    },
    hr: {
      greeting: 'Pozdrav, dobrodošli u MonjaBoost.',
      welcome: 'Pozdrav, dobrodošli u MonjaBoost.',
      orderPreparing: 'Vaša narudžba se priprema, ali vaše putovanje počinje ovdje.',
      journeyStarts: 'Evo podataka za pristup vašoj Monja aplikaciji, vaš osobni asistent na ovom putovanju.',
      accessData: 'Evo podataka za pristup vašoj Monja aplikaciji, vaš osobni asistent na ovom putovanju.',
      email: 'Email',
      password: 'Lozinka',
      ctaButton: 'Pristup mojoj aplikaciji',
      footer: 'MonjaBoost tim'
    },
    sk: {
      greeting: 'Dobrý deň, vitajte v MonjaBoost.',
      welcome: 'Dobrý deň, vitajte v MonjaBoost.',
      orderPreparing: 'Vaša objednávka sa pripravuje, ale vaša cesta začína tu.',
      journeyStarts: 'Tu sú vaše prihlasovacie údaje pre aplikáciu Monja, váš osobný asistent na tejto ceste.',
      accessData: 'Tu sú vaše prihlasovacie údaje pre aplikáciu Monja, váš osobný asistent na tejto ceste.',
      email: 'Email',
      password: 'Heslo',
      ctaButton: 'Prístup k mojej aplikácii',
      footer: 'Tím MonjaBoost'
    },
    sl: {
      greeting: 'Pozdravljeni, dobrodošli v MonjaBoost.',
      welcome: 'Pozdravljeni, dobrodošli v MonjaBoost.',
      orderPreparing: 'Vaše naročilo se pripravlja, vendar vaše potovanje se začne tukaj.',
      journeyStarts: 'Tukaj so podatki za dostop do vaše aplikacije Monja, vaš osebni asistent na tem potovanju.',
      accessData: 'Tukaj so podatki za dostop do vaše aplikacije Monja, vaš osebni asistent na tem potovanju.',
      email: 'E-pošta',
      password: 'Geslo',
      ctaButton: 'Dostop do moje aplikacije',
      footer: 'Ekipa MonjaBoost'
    }
  };

  async sendWelcomeEmail(params: {
    email: string;
    password: string;
    customerName: string;
    operationId: string;
    appLoginUrl: string;
  }): Promise<void> {
    try {
      const config = await this.getOperationConfig(params.operationId);
      if (!config) {
        console.error('❌ Failed to get operation config for:', params.operationId);
        return;
      }

      const translation = this.getTranslation(config.language);
      const templates = this.buildEmailTemplate(params, translation, config);

      // Determine Mailgun domain and API key
      const mailgunDomain = config.supportConfig.mailgunDomainName || MAILGUN_DOMAIN;
      const mailgunApiKey = config.supportConfig.mailgunApiKey || process.env.MAILGUN_API_KEY;

      if (!mailgunApiKey) {
        console.error('❌ Mailgun API key not configured');
        return;
      }

      // Use operation-specific Mailgun client if custom API key
      let mailgunClient = mg;
      if (config.supportConfig.mailgunApiKey) {
        const mailgun = new Mailgun(formData);
        mailgunClient = mailgun.client({
          username: 'api',
          key: config.supportConfig.mailgunApiKey,
        });
      }

      const senderEmail = config.supportConfig.isCustomDomain && config.supportConfig.emailDomain
        ? `${config.supportConfig.emailPrefix || 'noreply'}@${config.supportConfig.emailDomain}`
        : `noreply@${mailgunDomain}`;

      const senderName = config.operation.name;

      console.log('📧 Sending welcome email to:', params.email, 'from:', senderEmail);

      await mailgunClient.messages.create(mailgunDomain, {
        from: `${senderName} <${senderEmail}>`,
        to: [params.email],
        subject: translation.greeting,
        text: templates.text,
        html: templates.html,
      });

      console.log('✅ Welcome email sent successfully to:', params.email);
    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
      throw error;
    }
  }

  private async getOperationConfig(operationId: string) {
    try {
      const [operation] = await db
        .select()
        .from(operations)
        .where(eq(operations.id, operationId))
        .limit(1);

      if (!operation) {
        console.error('❌ Operation not found:', operationId);
        return null;
      }

      const [supportConfig] = await db
        .select()
        .from(customerSupportOperations)
        .where(
          and(
            eq(customerSupportOperations.operationId, operationId),
            eq(customerSupportOperations.isActive, true)
          )
        )
        .limit(1);

      if (!supportConfig) {
        console.error('❌ Customer support not active for operation:', operationId);
        return null;
      }

      return {
        operation,
        supportConfig
      };
    } catch (error) {
      console.error('❌ Error getting operation config:', error);
      return null;
    }
  }

  private getTranslation(language: string): WelcomeEmailTranslations {
    return this.translations[language] || this.translations['es'];
  }

  private buildEmailTemplate(
    params: { email: string; password: string; customerName: string; appLoginUrl: string },
    translation: WelcomeEmailTranslations,
    config: any
  ): { html: string; text: string } {
    const brandingConfig = (config.supportConfig.brandingConfig as any) || {};
    
    const logoUrl = brandingConfig.logo || '/images/n1-lblue.png';
    const primaryColor = brandingConfig.primaryColor || '#667eea';
    const backgroundColor = brandingConfig.backgroundColor || '#f8fafc';
    const cardBgColor = brandingConfig.card?.backgroundColor || '#ffffff';
    const borderColor = brandingConfig.card?.borderColor || '#e5e7eb';
    const borderRadius = brandingConfig.card?.borderRadius || 8;
    const textColor = brandingConfig.textColor || '#333333';
    const secondaryTextColor = brandingConfig.secondaryTextColor || '#666666';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${translation.greeting}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: ${backgroundColor};">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="${logoUrl}" alt="Logo" style="height: 40px; width: auto; max-width: 200px;" width="200" height="40" />
    </div>

    <!-- Content Card -->
    <div style="background-color: ${cardBgColor}; padding: 30px; border-radius: ${borderRadius}px; border: 1px solid ${borderColor};">
      <h1 style="color: ${primaryColor}; margin: 0 0 20px 0; font-size: 24px;">${translation.welcome}</h1>
      
      <p style="color: ${textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
        ${translation.orderPreparing}
      </p>
      
      <p style="color: ${textColor}; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
        ${translation.journeyStarts}
      </p>

      <!-- Credentials Box -->
      <div style="background-color: #f5f5f5; padding: 20px; margin: 25px 0; border-radius: 5px;">
        <p style="margin: 0 0 10px 0; color: ${textColor}; font-size: 14px;">
          <strong>${translation.email}:</strong><br>
          <span style="font-size: 16px; color: ${primaryColor}; word-break: break-all;">${params.email}</span>
        </p>
        <p style="margin: 0; color: ${textColor}; font-size: 14px;">
          <strong>${translation.password}:</strong><br>
          <code style="background-color: white; padding: 8px 12px; border-radius: 4px; font-size: 16px; display: inline-block; margin-top: 5px; border: 1px solid ${borderColor};">${params.password}</code>
        </p>
      </div>

      <!-- CTA Button -->
      <a href="${params.appLoginUrl}" 
         style="display: block; background-color: ${primaryColor}; color: white; text-decoration: none; padding: 15px 30px; text-align: center; border-radius: 5px; font-size: 16px; font-weight: bold; margin: 25px 0;">
        ${translation.ctaButton}
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; color: ${secondaryTextColor}; font-size: 12px; margin-top: 30px;">
      <p style="margin: 0;">${translation.footer}</p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
${translation.welcome}

${translation.orderPreparing}

${translation.journeyStarts}

${translation.email}: ${params.email}
${translation.password}: ${params.password}

${translation.ctaButton}: ${params.appLoginUrl}

---

${translation.footer}
    `.trim();

    return { html, text };
  }
}

