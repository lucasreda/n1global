// Template generator for AI-powered multi-page funnels

// Multi-page funnel files interface for Vercel deployment
interface MultiPageFunnelFiles {
  [path: string]: string;
}

interface FunnelPage {
  id: string;
  name: string;
  pageType: 'landing' | 'checkout' | 'upsell' | 'downsell' | 'thankyou';
  path: string;
  model: {
    layout: string;
    sections: Array<{
      id: string;
      type: string;
      config: Record<string, any>;
      content: Record<string, any>;
    }>;
    style: {
      theme: string;
      primaryColor: string;
      secondaryColor: string;
      fontFamily: string;
    };
    seo: {
      title: string;
      description: string;
      keywords?: string[];
    };
  };
}

interface FunnelGenerationOptions {
  colorScheme: 'modern' | 'vibrant' | 'minimal' | 'dark';
  layout: 'single_page' | 'multi_section' | 'video_first';
  trackingConfig?: {
    facebookPixelId?: string;
    googleAnalyticsId?: string;
    googleTagManagerId?: string;
    tiktokPixelId?: string;
    customTracking?: Array<{ name: string; code: string; }>;
  };
  // Funnel-specific settings
  enableRouting?: boolean;
  enableSharedComponents?: boolean;
  enableProgressTracking?: boolean;
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
   * Generate complete multi-page funnel files for deployment
   */
  generateMultiPageFunnel(
    funnelPages: FunnelPage[],
    productInfo: ProductInfo,
    options: FunnelGenerationOptions
  ): MultiPageFunnelFiles {
    console.log(`🏗️ Generating multi-page funnel with ${funnelPages.length} pages for: ${productInfo.name}`);

    const files: MultiPageFunnelFiles = {};

    // Generate package.json for Next.js
    files['package.json'] = this.generatePackageJson();

    // Generate Next.js configuration
    files['next.config.js'] = this.generateNextConfigMultiPage(options);

    // Generate each page based on its type and model
    funnelPages.forEach(page => {
      const pageFileName = this.getPageFileName(page.path);
      files[pageFileName] = this.generatePageComponent(page, productInfo, options);
    });

    // Generate Next.js app wrapper for global styles and layout
    files['pages/_app.js'] = this.generateAppComponent(options);
    
    // Generate styles
    files['styles/globals.css'] = this.generateGlobalStyles(options);
    
    // Generate Tailwind configuration
    files['tailwind.config.js'] = this.generateTailwindConfig();
    files['postcss.config.js'] = this.generatePostCSSConfig();
    
    // Generate shared components
    if (options.enableSharedComponents !== false) {
      files['components/Layout.js'] = this.generateLayoutComponent(funnelPages, options);
      files['components/FunnelProgress.js'] = this.generateProgressComponent(funnelPages, options);
    }

    // Generate type-specific components
    files['components/Hero.js'] = this.generateHeroComponent();
    files['components/Benefits.js'] = this.generateBenefitsComponent();
    files['components/Testimonials.js'] = this.generateTestimonialsComponent();
    files['components/FAQ.js'] = this.generateFAQComponent();
    files['components/CTA.js'] = this.generateCTAComponent();
    files['components/CheckoutForm.js'] = this.generateCheckoutComponent();
    files['components/ThankYou.js'] = this.generateThankYouComponent();

    // Generate analytics and tracking
    if (options.trackingConfig) {
      files['components/Analytics.js'] = this.generateAnalyticsComponent(options.trackingConfig);
    }

    // Generate routing utilities if enabled
    if (options.enableRouting !== false) {
      files['utils/funnel-navigation.js'] = this.generateFunnelNavigation(funnelPages);
    }

    console.log('✅ Multi-page funnel template generated successfully');
    return files;
  }

  /**
   * LEGACY: Generate single landing page (for backward compatibility)
   */
  generateLandingPage(
    content: any,
    productInfo: ProductInfo,
    options: Partial<FunnelGenerationOptions>
  ): MultiPageFunnelFiles {
    console.log(`🔄 Converting legacy landing page to multi-page format for: ${productInfo.name}`);
    
    // Convert legacy content to funnel page format
    const landingPage: FunnelPage = {
      id: 'landing',
      name: 'Landing Page',
      pageType: 'landing',
      path: '/',
      model: {
        layout: options.layout || 'single_page',
        sections: this.convertLegacyContentToSections(content),
        style: {
          theme: options.colorScheme || 'modern',
          primaryColor: '#3b82f6',
          secondaryColor: '#1e40af',
          fontFamily: 'Inter'
        },
        seo: {
          title: `${productInfo.name} - Transforme sua vida hoje`,
          description: productInfo.description,
        }
      }
    };

    return this.generateMultiPageFunnel([landingPage], productInfo, {
      colorScheme: 'modern',
      layout: 'single_page',
      ...options
    });
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
        "typescript": "^5",
        "tailwindcss": "^3.3.0",
        "autoprefixer": "^10.4.16",
        "postcss": "^8.4.31"
      }
    }, null, 2);
  }

  /**
   * Convert path to Next.js page filename
   */
  private getPageFileName(path: string): string {
    if (path === '/') return 'pages/index.js';
    // Remove leading slash and add .js extension
    const cleanPath = path.replace(/^\//, '').replace(/\/$/, '');
    return `pages/${cleanPath}.js`;
  }

  /**
   * Calculate import prefix based on path depth
   */
  private getImportPrefix(path: string): string {
    if (path === '/') return '../';
    
    // Count path segments to determine depth
    const segments = path.split('/').filter(segment => segment.length > 0);
    const depth = segments.length;
    
    // Each segment adds one level: ../
    return '../'.repeat(depth);
  }

  /**
   * Generate page component based on type and model
   */
  private generatePageComponent(
    page: FunnelPage,
    productInfo: ProductInfo,
    options: FunnelGenerationOptions
  ): string {
    const { model } = page;
    const importPrefix = this.getImportPrefix(page.path);
    const trackingImport = options.trackingConfig ? `import Analytics from '${importPrefix}components/Analytics';` : "";
    const trackingComponent = options.trackingConfig ? "<Analytics />" : "";
    const layoutImport = options.enableSharedComponents !== false ? `import Layout from '${importPrefix}components/Layout';` : "";
    const progressImport = options.enableProgressTracking !== false ? `import FunnelProgress from '${importPrefix}components/FunnelProgress';` : "";

    const sectionsImports = this.generateSectionsImports(model.sections, importPrefix);
    const sectionsComponents = this.generateSectionsJSX(model.sections, page.pageType);

    return `import Head from 'next/head';
${layoutImport}
${progressImport}
${sectionsImports}
${trackingImport}

const pageData = ${JSON.stringify(page, null, 2)};
const productInfo = ${JSON.stringify(productInfo, null, 2)};

export default function ${this.getPageComponentName(page.pageType)}() {
  return (
    <>
      <Head>
        <title>{pageData.model.seo.title}</title>
        <meta name="description" content={pageData.model.seo.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Open Graph */}
        <meta property="og:title" content={pageData.model.seo.title} />
        <meta property="og:description" content={pageData.model.seo.description} />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageData.model.seo.title} />
        <meta name="twitter:description" content={pageData.model.seo.description} />
      </Head>

      ${options.enableSharedComponents !== false ? `
      <Layout currentPage="${page.pageType}">
        ${options.enableProgressTracking !== false ? '<FunnelProgress currentPath="' + page.path + '" />' : ''}
        <div className="min-h-screen ${this.getPageBackgroundClasses(page.pageType, options.colorScheme)}">
          ${sectionsComponents}
        </div>
        ${trackingComponent}
      </Layout>
      ` : `
      <div className="min-h-screen ${this.getPageBackgroundClasses(page.pageType, options.colorScheme)}">
        ${sectionsComponents}
        ${trackingComponent}
      </div>
      `}
    </>
  );
}`;
  }

  /**
   * Generate sections imports based on section types
   */
  private generateSectionsImports(sections: Array<{type: string}>, importPrefix: string): string {
    const imports: string[] = [];
    const sectionTypes = Array.from(new Set(sections.map(s => s.type)));
    
    sectionTypes.forEach(type => {
      switch(type) {
        case 'hero':
          imports.push(`import Hero from '${importPrefix}components/Hero';`);
          break;
        case 'benefits':
          imports.push(`import Benefits from '${importPrefix}components/Benefits';`);
          break;
        case 'testimonials':
          imports.push(`import Testimonials from '${importPrefix}components/Testimonials';`);
          break;
        case 'faq':
          imports.push(`import FAQ from '${importPrefix}components/FAQ';`);
          break;
        case 'cta':
          imports.push(`import CTA from '${importPrefix}components/CTA';`);
          break;
        case 'checkout':
          imports.push(`import CheckoutForm from '${importPrefix}components/CheckoutForm';`);
          break;
        case 'thankyou':
          imports.push(`import ThankYou from '${importPrefix}components/ThankYou';`);
          break;
      }
    });

    return imports.join('\n');
  }

  /**
   * Generate JSX for sections
   */
  private generateSectionsJSX(
    sections: Array<{id: string; type: string; content: any}>,
    pageType: string
  ): string {
    return sections.map(section => {
      switch(section.type) {
        case 'hero':
          return `<Hero content={pageData.model.sections.find(s => s.id === '${section.id}')?.content} productInfo={productInfo} />`;
        case 'benefits':
          return `<Benefits content={pageData.model.sections.find(s => s.id === '${section.id}')?.content} />`;
        case 'testimonials':
          return `<Testimonials content={pageData.model.sections.find(s => s.id === '${section.id}')?.content} />`;
        case 'faq':
          return `<FAQ content={pageData.model.sections.find(s => s.id === '${section.id}')?.content} />`;
        case 'cta':
          return `<CTA content={pageData.model.sections.find(s => s.id === '${section.id}')?.content} productInfo={productInfo} />`;
        case 'checkout':
          return `<CheckoutForm content={pageData.model.sections.find(s => s.id === '${section.id}')?.content} productInfo={productInfo} />`;
        case 'thankyou':
          return `<ThankYou content={pageData.model.sections.find(s => s.id === '${section.id}')?.content} productInfo={productInfo} />`;
        default:
          return `{/* Section ${section.type} not implemented */}`;
      }
    }).join('\n        ');
  }

  /**
   * Get page component name
   */
  private getPageComponentName(pageType: string): string {
    const names: Record<string, string> = {
      landing: 'LandingPage',
      checkout: 'CheckoutPage', 
      upsell: 'UpsellPage',
      downsell: 'DownsellPage',
      thankyou: 'ThankYouPage'
    };
    return names[pageType] || 'CustomPage';
  }

  /**
   * Get background classes for page type
   */
  private getPageBackgroundClasses(pageType: string, colorScheme: string): string {
    const baseClasses = this.getColorClasses(colorScheme as 'modern' | 'vibrant' | 'minimal' | 'dark').background;
    
    switch(pageType) {
      case 'checkout':
        return `bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800`;
      case 'thankyou':
        return `bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900 dark:to-emerald-800`;
      default:
        return baseClasses;
    }
  }

  /**
   * Convert legacy content to sections format
   */
  private convertLegacyContentToSections(content: any): Array<{id: string; type: string; config: any; content: any}> {
    const sections = [];
    
    if (content?.hero) {
      sections.push({
        id: 'hero-1',
        type: 'hero',
        config: { backgroundColor: '#ffffff', textAlign: 'center' },
        content: content.hero
      });
    }
    
    if (content?.benefits) {
      sections.push({
        id: 'benefits-1',
        type: 'benefits',
        config: {},
        content: content.benefits
      });
    }
    
    if (content?.testimonials) {
      sections.push({
        id: 'testimonials-1',
        type: 'testimonials',
        config: {},
        content: content.testimonials
      });
    }
    
    if (content?.faq) {
      sections.push({
        id: 'faq-1',
        type: 'faq',
        config: {},
        content: content.faq
      });
    }
    
    if (content?.cta) {
      sections.push({
        id: 'cta-1',
        type: 'cta',
        config: {},
        content: content.cta
      });
    }

    return sections;
  }

  /**
   * Generate Next.js configuration for multi-page funnels
   */
  private generateNextConfigMultiPage(options: FunnelGenerationOptions): string {
    return `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [],
  },
  trailingSlash: false,
  ${options.enableRouting !== false ? `
  // Enable custom routing for funnel pages
  async redirects() {
    return [];
  },
  async rewrites() {
    return [];
  },
  ` : ''}
}

module.exports = nextConfig`;
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
    options: FunnelGenerationOptions
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
    // Build the tracking scripts properly
    const googleAnalyticsScript = trackingConfig.googleAnalyticsId ? `
    // Google Analytics
    window.gtag = window.gtag || function(){dataLayer.push(arguments);};
    window.gtag('js', new Date());
    window.gtag('config', '${trackingConfig.googleAnalyticsId}');
    ` : '';

    const facebookPixelScript = trackingConfig.facebookPixelId ? `
    // Facebook Pixel
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${trackingConfig.facebookPixelId}');
    fbq('track', 'PageView');
    ` : '';

    const tiktokPixelScript = trackingConfig.tiktokPixelId ? `
    // TikTok Pixel
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
      ttq.load('${trackingConfig.tiktokPixelId}');
      ttq.page();
    }(window, document, 'ttq');
    ` : '';

    const googleTagManagerScript = trackingConfig.googleTagManagerId ? `
    // Google Tag Manager
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${trackingConfig.googleTagManagerId}');
    ` : '';

    // Custom tracking scripts
    const customTrackingScript = trackingConfig.customTracking ? 
      trackingConfig.customTracking.map(script => script.code).join('\n    ') : '';

    return `import { useEffect } from 'react';

export default function Analytics() {
  useEffect(() => {
    ${googleAnalyticsScript}
    ${facebookPixelScript}
    ${tiktokPixelScript}
    ${googleTagManagerScript}
    ${customTrackingScript}
  }, []);

  return null; // This component only handles script injection
}`;
  }

  /**
   * Generate global CSS styles
   */
  private generateGlobalStyles(options: FunnelGenerationOptions): string {
    const colorStyles = this.getColorStyles(options.colorScheme);
    
    return `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

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
   * Generate shared layout component
   */
  private generateLayoutComponent(pages: FunnelPage[], options: FunnelGenerationOptions): string {
    return `import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Layout({ children, currentPage }) {
  const router = useRouter();
  
  return (
    <div className="min-h-screen">
      {/* Navigation header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-white font-bold text-xl">
                Logo
              </Link>
            </div>
            <div className="hidden md:flex space-x-8">
              ${pages.map(page => `
              <Link href="${page.path}" className={\`text-white/80 hover:text-white transition-colors \${router.pathname === '${page.path}' ? 'font-semibold' : ''}\`}>
                ${page.name}
              </Link>
              `).join('')}
            </div>
          </div>
        </div>
      </nav>
      
      {/* Main content */}
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}`;
  }

  /**
   * Generate funnel progress component
   */
  private generateProgressComponent(pages: FunnelPage[], options: FunnelGenerationOptions): string {
    return `import { useRouter } from 'next/router';

const funnelPages = ${JSON.stringify(pages.map(p => ({ path: p.path, name: p.name, pageType: p.pageType })), null, 2)};

export default function FunnelProgress({ currentPath }) {
  const currentIndex = funnelPages.findIndex(page => page.path === currentPath);
  const progress = currentIndex >= 0 ? ((currentIndex + 1) / funnelPages.length) * 100 : 0;
  
  return (
    <div className="sticky top-16 z-40 bg-white/10 backdrop-blur-lg border-b border-white/20 py-4">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/80 text-sm">Progresso do Funil</span>
          <span className="text-white text-sm font-semibold">
            {currentIndex + 1} de {funnelPages.length}
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-white/20 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full transition-all duration-500"
            style={{ width: \`\${progress}%\` }}
          />
        </div>
        
        {/* Steps */}
        <div className="flex justify-between mt-3">
          {funnelPages.map((page, index) => (
            <div key={page.path} className="flex flex-col items-center">
              <div className={\`w-3 h-3 rounded-full \${index <= currentIndex ? 'bg-green-400' : 'bg-white/30'}\`} />
              <span className="text-white/60 text-xs mt-1 hidden sm:block">
                {page.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}`;
  }

  /**
   * Generate checkout form component
   */
  private generateCheckoutComponent(): string {
    return `import { useState } from 'react';
import { Shield, CreditCard, Lock } from 'lucide-react';

export default function CheckoutForm({ content, productInfo }) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    paymentMethod: 'card'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Track checkout attempt
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'begin_checkout', {
        'currency': productInfo.currency,
        'value': productInfo.price
      });
    }
    
    // Process checkout logic here
    console.log('Processing checkout:', formData);
  };

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <section className="min-h-screen py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {content?.title || 'Finalizar Pedido'}
          </h1>
          <p className="text-xl text-gray-600">
            {content?.subtitle || 'Você está a um passo de transformar sua vida'}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Order Summary */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Resumo do Pedido</h2>
            
            <div className="border-b border-gray-200 pb-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{productInfo.name}</h3>
                  <p className="text-gray-600">{content?.description || productInfo.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {productInfo.price.toLocaleString('pt-BR', { 
                      style: 'currency', 
                      currency: productInfo.currency 
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">
                  {productInfo.price.toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: productInfo.currency 
                  })}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-4 border-t border-gray-200">
                <span>Total</span>
                <span>
                  {productInfo.price.toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: productInfo.currency 
                  })}
                </span>
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-8 flex items-center justify-center space-x-6 text-green-600">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span className="text-sm">Compra Segura</span>
              </div>
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5" />
                <span className="text-sm">SSL 256-bit</span>
              </div>
            </div>
          </div>

          {/* Checkout Form */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Seu nome completo"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Sua cidade"
                  />
                </div>
                <div>
                  <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-2">
                    CEP *
                  </label>
                  <input
                    type="text"
                    id="zipCode"
                    name="zipCode"
                    required
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="00000-000"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 shadow-2xl flex items-center justify-center space-x-2"
              >
                <CreditCard className="w-5 h-5" />
                <span>Finalizar Pedido</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}`;
  }

  /**
   * Generate thank you page component
   */
  private generateThankYouComponent(): string {
    return `import { CheckCircle, Download, Heart } from 'lucide-react';

export default function ThankYou({ content, productInfo }) {
  return (
    <section className="min-h-screen py-20 px-4 bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="max-w-4xl mx-auto text-center">
        {/* Success Icon */}
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto bg-green-500 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Main Message */}
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          {content?.title || 'Parabéns! 🎉'}
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-700 mb-8 max-w-2xl mx-auto">
          {content?.subtitle || \`Seu pedido de \${productInfo.name} foi confirmado com sucesso!\`}
        </p>

        {/* Order Confirmation */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Detalhes do Pedido</h2>
          
          <div className="border-b border-gray-200 pb-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Produto:</span>
              <span className="font-semibold">{productInfo.name}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total Pago:</span>
            <span className="text-2xl font-bold text-green-600">
              {productInfo.price.toLocaleString('pt-BR', { 
                style: 'currency', 
                currency: productInfo.currency 
              })}
            </span>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Próximos Passos</h3>
          <div className="space-y-4 text-left">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm font-bold">1</span>
              </div>
              <p className="text-gray-700">
                Você receberá um email de confirmação em alguns minutos
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm font-bold">2</span>
              </div>
              <p className="text-gray-700">
                Entraremos em contato para combinar a entrega
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm font-bold">3</span>
              </div>
              <p className="text-gray-700">
                Prepare-se para transformar sua vida!
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <p className="text-gray-600 mb-6">
            Enquanto isso, siga-nos nas redes sociais para dicas exclusivas:
          </p>
          
          <div className="flex justify-center space-x-4">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors">
              Facebook
            </button>
            <button className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-lg transition-colors">
              Instagram
            </button>
            <button className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-lg transition-colors">
              WhatsApp
            </button>
          </div>
        </div>

        {/* Thank You Message */}
        <div className="mt-12 text-center">
          <Heart className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-lg text-gray-700">
            Muito obrigado por confiar em nós!
          </p>
        </div>
      </div>
    </section>
  );
}`;
  }

  /**
   * Generate funnel navigation utilities
   */
  private generateFunnelNavigation(pages: FunnelPage[]): string {
    return `// Funnel navigation utilities
import { useRouter } from 'next/router';

const funnelFlow = ${JSON.stringify(pages.map(p => ({ path: p.path, pageType: p.pageType })), null, 2)};

export const useFunnelNavigation = () => {
  const router = useRouter();
  
  const getCurrentStepIndex = () => {
    return funnelFlow.findIndex(page => page.path === router.pathname);
  };
  
  const goToNextStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < funnelFlow.length - 1) {
      const nextPath = funnelFlow[currentIndex + 1].path;
      router.push(nextPath);
      
      // Track funnel progression
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'funnel_step', {
          'step_name': funnelFlow[currentIndex + 1].pageType,
          'step_number': currentIndex + 2
        });
      }
    }
  };
  
  const goToPreviousStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      const prevPath = funnelFlow[currentIndex - 1].path;
      router.push(prevPath);
    }
  };
  
  const goToStep = (stepIndex) => {
    if (stepIndex >= 0 && stepIndex < funnelFlow.length) {
      const targetPath = funnelFlow[stepIndex].path;
      router.push(targetPath);
    }
  };
  
  const isFirstStep = () => getCurrentStepIndex() === 0;
  const isLastStep = () => getCurrentStepIndex() === funnelFlow.length - 1;
  
  const getProgress = () => {
    const currentIndex = getCurrentStepIndex();
    return currentIndex >= 0 ? ((currentIndex + 1) / funnelFlow.length) * 100 : 0;
  };
  
  return {
    getCurrentStepIndex,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    isFirstStep,
    isLastStep,
    getProgress,
    totalSteps: funnelFlow.length,
    currentStep: getCurrentStepIndex() + 1
  };
};

export { funnelFlow };`;
  }

  /**
   * Generate Next.js _app.js component for global styling and layout
   */
  private generateAppComponent(options: FunnelGenerationOptions): string {
    return `import '../styles/globals.css';
${options.enableSharedComponents !== false ? "import Layout from '../components/Layout';" : ""}

export default function App({ Component, pageProps }) {
  ${options.enableSharedComponents !== false ? `
  // Check if the page should use Layout wrapper
  const useLayout = Component.getLayout ?? true;
  
  if (useLayout) {
    return (
      <Layout>
        <Component {...pageProps} />
      </Layout>
    );
  }
  ` : ''}
  
  return <Component {...pageProps} />;
}`;
  }

  /**
   * Generate Tailwind CSS configuration
   */
  private generateTailwindConfig(): string {
    return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './utils/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}`;
  }

  /**
   * Generate PostCSS configuration
   */
  private generatePostCSSConfig(): string {
    return `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;
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
  /**
   * SMOKE TEST: Verify all components generate successfully
   */
  smokeTest(): boolean {
    try {
      console.log('🧪 Running TemplateGenerator smoke test...');
      
      // Test data
      const testPages: FunnelPage[] = [
        {
          id: 'landing',
          name: 'Landing Page',
          pageType: 'landing',
          path: '/',
          model: {
            layout: 'single_page',
            sections: [
              { id: 'hero-1', type: 'hero', config: {}, content: { title: 'Test' } },
              { id: 'cta-1', type: 'cta', config: {}, content: { title: 'CTA Test' } }
            ],
            style: { theme: 'modern', primaryColor: '#3b82f6', secondaryColor: '#1e40af', fontFamily: 'Inter' },
            seo: { title: 'Test Landing', description: 'Test description' }
          }
        },
        {
          id: 'checkout',
          name: 'Checkout',
          pageType: 'checkout',
          path: '/checkout',
          model: {
            layout: 'single_page',
            sections: [{ id: 'checkout-1', type: 'checkout', config: {}, content: {} }],
            style: { theme: 'modern', primaryColor: '#3b82f6', secondaryColor: '#1e40af', fontFamily: 'Inter' },
            seo: { title: 'Checkout', description: 'Complete your order' }
          }
        }
      ];

      const testProduct = {
        name: 'Test Product',
        description: 'Test description',
        price: 99.90,
        currency: 'BRL',
        targetAudience: 'Test audience'
      };

      const testOptions: FunnelGenerationOptions = {
        colorScheme: 'modern',
        layout: 'single_page',
        trackingConfig: {
          googleAnalyticsId: 'GA-TEST-123',
          facebookPixelId: 'FB-TEST-456'
        }
      };

      // Run generation
      const files = this.generateMultiPageFunnel(testPages, testProduct, testOptions);
      
      // Check required files exist
      const requiredFiles = [
        'package.json',
        'pages/_app.js',
        'pages/index.js',
        'pages/checkout.js',
        'styles/globals.css',
        'tailwind.config.js',
        'postcss.config.js',
        'components/Layout.js',
        'components/FunnelProgress.js',
        'components/Hero.js',
        'components/CTA.js',
        'components/CheckoutForm.js',
        'components/Analytics.js',
        'utils/funnel-navigation.js'
      ];

      const missingFiles = requiredFiles.filter(file => !files[file]);
      
      if (missingFiles.length > 0) {
        console.error('❌ Missing files:', missingFiles);
        return false;
      }

      console.log(`✅ Smoke test passed! Generated ${Object.keys(files).length} files`);
      return true;
      
    } catch (error) {
      console.error('❌ Smoke test failed:', error);
      return false;
    }
  }
}

export const templateGenerator = new TemplateGenerator();