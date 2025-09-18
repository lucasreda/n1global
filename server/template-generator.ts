// Template generator for AI-powered landing pages

// Landing page template interface for Vercel deployment
interface LandingPageFiles {
  [path: string]: string;
}

interface TemplateOptions {
  colorScheme: 'modern' | 'vibrant' | 'minimal' | 'dark';
  layout: 'single_page' | 'multi_section' | 'video_first';
  trackingConfig?: {
    facebookPixelId?: string;
    googleAnalyticsId?: string;
    googleTagManagerId?: string;
    tiktokPixelId?: string;
    customTracking?: Array<{ name: string; code: string; }>;
  };
}

interface ProductInfo {
  name: string;
  description: string;
  price: number;
  currency: string;
  targetAudience: string;
}

export class TemplateGenerator {
  
  constructor() {
    console.log('🎨 Template Generator initialized');
  }

  /**
   * Generate complete landing page files for deployment
   */
  generateLandingPage(
    content: any, // Using any to match the jsonb type from database
    productInfo: ProductInfo,
    options: TemplateOptions
  ): LandingPageFiles {
    console.log(`🏗️ Generating landing page template for: ${productInfo.name}`);

    const files: LandingPageFiles = {};

    // Generate package.json for Next.js
    files['package.json'] = this.generatePackageJson();

    // Generate Next.js configuration
    files['next.config.js'] = this.generateNextConfig();

    // Generate main page component
    files['pages/index.js'] = this.generateIndexPage(content, productInfo, options);

    // Generate styles
    files['styles/globals.css'] = this.generateGlobalStyles(options);
    
    // Generate components
    files['components/Hero.js'] = this.generateHeroComponent();
    files['components/Benefits.js'] = this.generateBenefitsComponent();
    files['components/Testimonials.js'] = this.generateTestimonialsComponent();
    files['components/FAQ.js'] = this.generateFAQComponent();
    files['components/CTA.js'] = this.generateCTAComponent();

    // Generate analytics and tracking
    if (options.trackingConfig) {
      files['components/Analytics.js'] = this.generateAnalyticsComponent(options.trackingConfig);
    }

    console.log('✅ Landing page template generated successfully');
    return files;
  }

  /**
   * Generate package.json for Next.js
   */
  private generatePackageJson(): string {
    return JSON.stringify({
      "name": "ai-landing-page",
      "version": "0.1.0",
      "private": true,
      "scripts": {
        "dev": "next dev",
        "build": "next build",
        "start": "next start",
        "lint": "next lint"
      },
      "dependencies": {
        "next": "14.0.4",
        "react": "18.2.0",
        "react-dom": "18.2.0",
        "lucide-react": "^0.294.0"
      },
      "devDependencies": {
        "@types/node": "^20",
        "@types/react": "^18",
        "@types/react-dom": "^18",
        "eslint": "^8",
        "eslint-config-next": "14.0.4",
        "typescript": "^5"
      }
    }, null, 2);
  }

  /**
   * Generate Next.js configuration
   */
  private generateNextConfig(): string {
    return `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [],
  },
  trailingSlash: false,
}

module.exports = nextConfig`;
  }

  /**
   * Generate main index page
   */
  private generateIndexPage(
    content: any,
    productInfo: ProductInfo,
    options: TemplateOptions
  ): string {
    const trackingImport = options.trackingConfig ? 
      "import Analytics from '../components/Analytics';" : "";

    const trackingComponent = options.trackingConfig ? 
      "<Analytics />" : "";

    return `import Head from 'next/head';
import Hero from '../components/Hero';
import Benefits from '../components/Benefits';
import Testimonials from '../components/Testimonials';
import FAQ from '../components/FAQ';
import CTA from '../components/CTA';
${trackingImport}

const content = ${JSON.stringify(content, null, 2)};
const productInfo = ${JSON.stringify(productInfo, null, 2)};

export default function Home() {
  return (
    <>
      <Head>
        <title>{content.hero?.title || '${productInfo.name} - Transforme sua vida hoje'}</title>
        <meta name="description" content={content.hero?.subtitle || '${productInfo.description}'} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Open Graph */}
        <meta property="og:title" content={content.hero?.title || '${productInfo.name}'} />
        <meta property="og:description" content={content.hero?.subtitle || '${productInfo.description}'} />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={content.hero?.title || '${productInfo.name}'} />
        <meta name="twitter:description" content={content.hero?.subtitle || '${productInfo.description}'} />
      </Head>

      <div className="min-h-screen bg-gradient-to-b ${this.getColorClasses(options.colorScheme).background}">
        <Hero content={content.hero} productInfo={productInfo} />
        <Benefits content={content.benefits} />
        <Testimonials content={content.testimonials} />
        <FAQ content={content.faq} />
        <CTA content={content.cta} productInfo={productInfo} />
        ${trackingComponent}
      </div>
    </>
  );
}`;
  }

  /**
   * Generate Hero component
   */
  private generateHeroComponent(): string {
    return `import { Star } from 'lucide-react';

export default function Hero({ content, productInfo }) {
  const handleCTAClick = () => {
    // Track conversion event
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'click', {
        'event_category': 'CTA',
        'event_label': 'Hero CTA',
      });
    }
    
    // Scroll to CTA section or trigger action
    document.getElementById('final-cta')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
      <div className="max-w-4xl mx-auto text-center">
        {/* Social Proof Stars */}
        <div className="flex justify-center items-center gap-1 mb-6">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          ))}
          <span className="ml-2 text-white/80 text-sm">+1.000 clientes satisfeitos</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
          {content?.title || \`Transforme sua vida com \${productInfo.name}\`}
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
          {content?.subtitle || productInfo.description}
        </p>

        {/* Price and CTA */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md mx-auto">
          <div className="text-center">
            <div className="text-white/70 text-sm line-through mb-2">
              De: {(productInfo.price * 1.5).toLocaleString('pt-BR', { 
                style: 'currency', 
                currency: productInfo.currency 
              })}
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              Apenas: {productInfo.price.toLocaleString('pt-BR', { 
                style: 'currency', 
                currency: productInfo.currency 
              })}
            </div>
            <div className="text-green-300 text-sm mb-6">
              ✨ Oferta por tempo limitado
            </div>
            
            <button 
              onClick={handleCTAClick}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 shadow-2xl"
            >
              {content?.cta || 'Quero Garantir Agora'}
            </button>
            
            <div className="text-white/60 text-xs mt-3">
              🔒 Pagamento 100% seguro
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}`;
  }

  /**
   * Generate Benefits component
   */
  private generateBenefitsComponent(): string {
    return `import { Check, Star, Zap, Heart, Trophy, Shield } from 'lucide-react';

const iconMap = {
  check: Check,
  star: Star,
  zap: Zap,
  heart: Heart,
  trophy: Trophy,
  shield: Shield,
};

export default function Benefits({ content }) {
  if (!content || content.length === 0) return null;

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Por que escolher nossa solução?
          </h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Descubra os benefícios que vão transformar sua experiência
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {content.map((benefit, index) => {
            const IconComponent = iconMap[benefit.icon] || Check;
            
            return (
              <div 
                key={index}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center hover:bg-white/15 transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-4">
                  {benefit.title}
                </h3>
                
                <p className="text-white/80 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}`;
  }

  /**
   * Generate Testimonials component
   */
  private generateTestimonialsComponent(): string {
    return `import { Star } from 'lucide-react';

export default function Testimonials({ content }) {
  if (!content || content.length === 0) return null;

  return (
    <section className="py-20 px-4 bg-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            O que nossos clientes dizem
          </h2>
          <p className="text-xl text-white/80">
            Histórias reais de transformação
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {content.map((testimonial, index) => (
            <div 
              key={index}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center"
            >
              {/* Rating Stars */}
              <div className="flex justify-center gap-1 mb-4">
                {[...Array(testimonial.rating || 5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              {/* Testimonial Text */}
              <p className="text-white/90 mb-6 italic leading-relaxed">
                "{testimonial.text}"
              </p>
              
              {/* Customer Name */}
              <div className="text-white font-semibold">
                {testimonial.name}
              </div>
              
              {/* Verified Badge */}
              <div className="text-green-300 text-sm mt-2">
                ✅ Cliente verificado
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;
  }

  /**
   * Generate FAQ component
   */
  private generateFAQComponent(): string {
    return `import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function FAQ({ content }) {
  const [openIndex, setOpenIndex] = useState(null);

  if (!content || content.length === 0) return null;

  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Perguntas Frequentes
          </h2>
          <p className="text-xl text-white/80">
            Tire suas dúvidas antes de garantir o seu
          </p>
        </div>

        <div className="space-y-4">
          {content.map((faq, index) => (
            <div 
              key={index}
              className="bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <h3 className="text-lg font-semibold text-white pr-4">
                  {faq.question}
                </h3>
                {openIndex === index ? (
                  <ChevronUp className="w-5 h-5 text-white flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white flex-shrink-0" />
                )}
              </button>
              
              {openIndex === index && (
                <div className="px-8 pb-6">
                  <p className="text-white/80 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;
  }

  /**
   * Generate CTA component
   */
  private generateCTAComponent(): string {
    return `export default function CTA({ content, productInfo }) {
  const handleFinalCTA = () => {
    // Track final conversion
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'conversion', {
        'send_to': 'AW-CONVERSION_ID/CONVERSION_LABEL',
        'value': productInfo.price,
        'currency': productInfo.currency
      });
    }
    
    // Redirect to checkout or open WhatsApp
    // window.location.href = 'https://checkout.example.com';
    // Or for WhatsApp:
    const message = encodeURIComponent(\`Olá! Tenho interesse no \${productInfo.name}. Pode me ajudar?\`);
    window.open(\`https://wa.me/5511999999999?text=\${message}\`, '_blank');
  };

  return (
    <section id="final-cta" className="py-20 px-4 bg-gradient-to-r from-green-600 to-emerald-600">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
          {content?.title || \`Não perca esta oportunidade!\`}
        </h2>
        
        <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
          {content?.subtitle || \`Garante seu \${productInfo.name} com desconto especial\`}
        </p>

        {/* Urgency Timer */}
        <div className="bg-white/20 backdrop-blur-lg rounded-xl p-6 mb-8 max-w-md mx-auto">
          <div className="text-white/80 text-sm mb-2">⏰ Oferta expira em:</div>
          <div className="text-2xl font-bold text-white">23:59:00</div>
        </div>

        {/* Final Price */}
        <div className="mb-8">
          <div className="text-white/70 text-lg line-through mb-2">
            De: {(productInfo.price * 1.5).toLocaleString('pt-BR', { 
              style: 'currency', 
              currency: productInfo.currency 
            })}
          </div>
          <div className="text-4xl md:text-5xl font-bold text-white mb-2">
            Por apenas: {productInfo.price.toLocaleString('pt-BR', { 
              style: 'currency', 
              currency: productInfo.currency 
            })}
          </div>
          <div className="text-yellow-300 font-semibold">
            ⚡ Desconto de {Math.round(((productInfo.price * 1.5 - productInfo.price) / (productInfo.price * 1.5)) * 100)}%
          </div>
        </div>

        <button
          onClick={handleFinalCTA}
          className="bg-white text-green-600 font-bold py-6 px-12 rounded-2xl text-2xl hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-2xl mb-6"
        >
          {content?.buttonText || 'GARANTIR AGORA'}
        </button>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-6 text-white/80 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-green-300">🔒</span>
            Pagamento Seguro
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-300">✅</span>
            Garantia de 7 dias
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-300">📞</span>
            Suporte 24h
          </div>
        </div>
      </div>
    </section>
  );
}`;
  }

  /**
   * Generate Analytics component for tracking
   */
  private generateAnalyticsComponent(trackingConfig: any): string {
    return `import { useEffect } from 'react';

export default function Analytics() {
  useEffect(() => {
    // Google Analytics
    ${trackingConfig.googleAnalyticsId ? `
    window.gtag = window.gtag || function(){dataLayer.push(arguments);};
    window.gtag('js', new Date());
    window.gtag('config', '${trackingConfig.googleAnalyticsId}');
    ` : ''}

    // Facebook Pixel
    ${trackingConfig.facebookPixelId ? `
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${trackingConfig.facebookPixelId}');
    fbq('track', 'PageView');
    ` : ''}

    // TikTok Pixel
    ${trackingConfig.tiktokPixelId ? `
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
      ttq.load('${trackingConfig.tiktokPixelId}');
      ttq.page();
    }(window, document, 'ttq');
    ` : ''}

    // Google Tag Manager
    ${trackingConfig.googleTagManagerId ? `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${trackingConfig.googleTagManagerId}');
    ` : ''}
  }, []);

  return (
    <>
      {/* Google Analytics Script */}
      ${trackingConfig.googleAnalyticsId ? `
      <script async src={\`https://www.googletagmanager.com/gtag/js?id=${trackingConfig.googleAnalyticsId}\`}></script>
      ` : ''}
      
      {/* Facebook Pixel NoScript */}
      ${trackingConfig.facebookPixelId ? `
      <noscript>
        <img height="1" width="1" style={{display:'none'}}
             src={\`https://www.facebook.com/tr?id=${trackingConfig.facebookPixelId}&ev=PageView&noscript=1\`} />
      </noscript>
      ` : ''}

      {/* Google Tag Manager NoScript */}
      ${trackingConfig.googleTagManagerId ? `
      <noscript>
        <iframe src={\`https://www.googletagmanager.com/ns.html?id=${trackingConfig.googleTagManagerId}\`}
                height="0" width="0" style={{display:'none',visibility:'hidden'}}></iframe>
      </noscript>
      ` : ''}
    </>
  );
}`;
  }

  /**
   * Generate global CSS styles
   */
  private generateGlobalStyles(options: TemplateOptions): string {
    const colorStyles = this.getColorStyles(options.colorScheme);
    
    return `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
  font-family: 'Inter', sans-serif;
  scroll-behavior: smooth;
}

body {
  color: rgb(var(--foreground-rgb));
  background: ${colorStyles.bodyBackground};
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  font-family: inherit;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

.fade-in {
  animation: fadeIn 0.8s ease-out;
}

.slide-in {
  animation: slideIn 0.6s ease-out;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

/* Responsive utilities */
@media (max-width: 768px) {
  .text-5xl { font-size: 2.5rem; }
  .text-4xl { font-size: 2rem; }
  .text-3xl { font-size: 1.875rem; }
}`;
  }

  /**
   * Get color classes based on scheme
   */
  private getColorClasses(colorScheme: 'modern' | 'vibrant' | 'minimal' | 'dark') {
    const schemes = {
      modern: {
        background: 'from-slate-900 via-purple-900 to-slate-900',
        primary: 'from-blue-500 to-purple-600',
        secondary: 'from-green-500 to-emerald-500'
      },
      vibrant: {
        background: 'from-pink-900 via-purple-900 to-indigo-900',
        primary: 'from-pink-500 to-violet-500',
        secondary: 'from-yellow-400 to-orange-500'
      },
      minimal: {
        background: 'from-gray-900 via-gray-800 to-gray-900',
        primary: 'from-gray-600 to-gray-800',
        secondary: 'from-green-500 to-emerald-500'
      },
      dark: {
        background: 'from-black via-gray-900 to-black',
        primary: 'from-white to-gray-300',
        secondary: 'from-red-500 to-pink-500'
      }
    };

    return schemes[colorScheme] || schemes.modern;
  }

  /**
   * Get CSS color styles based on scheme
   */
  private getColorStyles(colorScheme: 'modern' | 'vibrant' | 'minimal' | 'dark') {
    const schemes = {
      modern: {
        bodyBackground: 'linear-gradient(135deg, #0f172a 0%, #581c87 50%, #0f172a 100%)'
      },
      vibrant: {
        bodyBackground: 'linear-gradient(135deg, #831843 0%, #581c87 50%, #312e81 100%)'
      },
      minimal: {
        bodyBackground: 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #111827 100%)'
      },
      dark: {
        bodyBackground: 'linear-gradient(135deg, #000000 0%, #111827 50%, #000000 100%)'
      }
    };

    return schemes[colorScheme] || schemes.modern;
  }
}

export const templateGenerator = new TemplateGenerator();