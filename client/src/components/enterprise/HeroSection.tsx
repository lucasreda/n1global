/**
 * Enterprise Hero Section Component
 * Background IA + overlays + responsive design + performance otimizada
 */

import { forwardRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useThemeComposer, useMobileFirst, useStyles } from '@/hooks/useThemeComposer';
import type { TemplateSection, AIImageSlot, ContentElement } from '@shared/templates';

// ============================
// 🎯 HERO SECTION INTERFACE
// ============================

interface HeroSectionProps {
  section: TemplateSection;
  onCTAClick?: (ctaId: string) => void;
  className?: string;
  testId?: string;
}

interface AIImageProps {
  slot: AIImageSlot;
  className?: string;
  priority?: boolean;
}

// ============================
// 🖼️ AI IMAGE COMPONENT
// ============================

const AIImage = forwardRef<HTMLDivElement, AIImageProps>(({ 
  slot, 
  className = '',
  priority = false 
}, ref) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { visualIdentity } = useStyles();
  
  // Gerar prompt personalizado com identidade visual
  const enhancedPrompt = slot.prompt
    .replace('{{primaryColor}}', visualIdentity.primaryColor)
    .replace('{{secondaryColor}}', visualIdentity.secondaryColor)
    .replace('{{industry}}', visualIdentity.industry)
    .replace('{{mood}}', visualIdentity.mood);

  // Placeholder baseado no tipo de imagem
  const getPlaceholder = () => {
    const baseClasses = "w-full h-full bg-gradient-to-br flex items-center justify-center";
    
    switch (slot.type) {
      case 'hero':
        return `${baseClasses} from-blue-500/20 to-purple-500/20`;
      case 'lifestyle':
        return `${baseClasses} from-green-500/20 to-blue-500/20`;
      case 'product':
        return `${baseClasses} from-gray-200 to-gray-300`;
      default:
        return `${baseClasses} from-gray-100 to-gray-200`;
    }
  };

  const getPlaceholderIcon = () => {
    switch (slot.type) {
      case 'hero':
        return '🌟';
      case 'lifestyle':
        return '📸';
      case 'product':
        return '📦';
      case 'icon':
        return '⭐';
      case 'avatar':
        return '👤';
      default:
        return '🖼️';
    }
  };

  return (
    <div 
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio: slot.aspectRatio }}
      data-testid={`ai-image-${slot.type}-${slot.id}`}
    >
      {/* Placeholder enquanto carrega */}
      <div className={getPlaceholder()}>
        <div className="text-center space-y-2">
          <div className="text-4xl">{getPlaceholderIcon()}</div>
          <div className="text-sm text-gray-500 font-medium">
            {slot.type === 'hero' && 'Carregando imagem hero...'}
            {slot.type === 'lifestyle' && 'Carregando lifestyle...'}
            {slot.type === 'product' && 'Carregando produto...'}
            {slot.type === 'icon' && 'Carregando ícone...'}
            {slot.type === 'avatar' && 'Carregando avatar...'}
            {!['hero', 'lifestyle', 'product', 'icon', 'avatar'].includes(slot.type) && 'Carregando imagem...'}
          </div>
          {slot.quality === '4K' && (
            <div className="text-xs text-blue-500 font-semibold">Qualidade 4K</div>
          )}
        </div>
      </div>
      
      {/* Overlay para hero backgrounds */}
      {slot.type === 'hero' && (
        <div className="absolute inset-0 bg-black/30" />
      )}
      
      {/* Dados estruturados para IA */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ImageObject",
            "contentUrl": "#", // Será preenchido quando a imagem for gerada
            "description": enhancedPrompt,
            "keywords": [visualIdentity.industry, visualIdentity.mood, slot.style],
            "width": slot.aspectRatio.split('/')[0],
            "height": slot.aspectRatio.split('/')[1],
            "inLanguage": "pt-BR"
          })
        }}
      />
    </div>
  );
});

AIImage.displayName = 'AIImage';

// ============================
// 🦾 HERO SECTION COMPONENT
// ============================

const HeroSection = forwardRef<HTMLElement, HeroSectionProps>(({ 
  section, 
  onCTAClick,
  className = '',
  testId = 'hero-section'
}, ref) => {
  const { tokens } = useThemeComposer();
  const { getMobileFirstClasses } = useMobileFirst();
  const { visualIdentity, generateGradient } = useStyles();
  
  // Type guards
  const isContentElement = (el: any): el is ContentElement => {
    return el && 'typography' in el && 'content' in el;
  };
  
  const isAIImageSlot = (el: any): el is AIImageSlot => {
    return el && 'aspectRatio' in el && 'prompt' in el;
  };

  // Extrair elementos por tipo
  const headingElement = section.elements?.find(el => isContentElement(el) && el.type === 'heading') as ContentElement | undefined;
  const subheadingElement = section.elements?.find(el => isContentElement(el) && el.type === 'subheading') as ContentElement | undefined;
  const ctaElement = section.elements?.find(el => isContentElement(el) && el.type === 'cta') as ContentElement | undefined;
  const backgroundImage = section.elements?.find(el => isAIImageSlot(el) && el.type === 'background') as AIImageSlot | undefined;
  const heroImage = section.elements?.find(el => isAIImageSlot(el) && el.type === 'hero') as AIImageSlot | undefined;

  // Aplicar identidade visual aos textos
  const processContent = (content: string) => {
    return content
      .replace('{{primaryColor}}', visualIdentity.primaryColor)
      .replace('{{secondaryColor}}', visualIdentity.secondaryColor)
      .replace('{{industry}}', visualIdentity.industry)
      .replace('{{mood}}', visualIdentity.mood);
  };

  // Estilos de background
  const getBackgroundStyle = () => {
    if (!section.background) return {};
    
    switch (section.background.type) {
      case 'gradient':
        return {
          background: section.background.value,
        };
      case 'solid':
        return {
          backgroundColor: section.background.value,
        };
      case 'glassmorphism':
        return {
          background: section.background.value,
          backdropFilter: section.background.overlay,
        };
      default:
        return {};
    }
  };

  // Classes responsivas do container
  const containerClasses = getMobileFirstClasses({
    mobile: `max-w-${section.container?.maxWidth || '2xl'} mx-auto px-4`,
    tablet: 'px-6',
    desktop: 'px-8',
  });

  // Classes do grid responsivo
  const gridClasses = getMobileFirstClasses({
    mobile: 'grid grid-cols-1 gap-6',
    tablet: 'gap-8',
    desktop: `grid-cols-${section.grid?.columns.desktop || 2} gap-12`,
  });

  return (
    <section
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      style={{
        ...getBackgroundStyle(),
        paddingTop: `${tokens.spacing[section.padding?.top || 20]}`,
        paddingBottom: `${tokens.spacing[section.padding?.bottom || 20]}`,
      }}
      data-testid={testId}
    >
      {/* Background Image */}
      {backgroundImage && (
        <div className="absolute inset-0 z-0">
          <AIImage 
            slot={backgroundImage} 
            className="w-full h-full object-cover"
            priority
          />
        </div>
      )}
      
      {/* Content Container */}
      <div className={`relative z-10 ${containerClasses}`}>
        <div className={gridClasses}>
          {/* Text Content */}
          <div className="space-y-6 flex flex-col justify-center">
            {/* Heading */}
            {headingElement && (
              <h1 
                className="font-bold leading-tight"
                style={{
                  fontSize: tokens.typography.fontSizes[headingElement.typography.fontSize].mobile,
                  color: headingElement.typography.color,
                  marginBottom: tokens.spacing[headingElement.spacing?.marginBottom || 6],
                }}
                data-testid="hero-heading"
              >
                {processContent(headingElement.content)}
              </h1>
            )}
            
            {/* Subheading */}
            {subheadingElement && (
              <p 
                className="leading-relaxed"
                style={{
                  fontSize: tokens.typography.fontSizes[subheadingElement.typography.fontSize].mobile,
                  color: subheadingElement.typography.color,
                  marginBottom: tokens.spacing[subheadingElement.spacing?.marginBottom || 8],
                }}
                data-testid="hero-subheading"
              >
                {processContent(subheadingElement.content)}
              </p>
            )}
            
            {/* CTA Button */}
            {ctaElement && (
              <div 
                style={{
                  marginTop: tokens.spacing[ctaElement.spacing?.marginTop || 6],
                }}
              >
                <Button
                  size="lg"
                  onClick={() => onCTAClick?.(ctaElement.id)}
                  className="px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  style={{
                    backgroundColor: visualIdentity.primaryColor,
                    color: ctaElement.typography.color,
                  }}
                  data-testid="hero-cta-button"
                >
                  {processContent(ctaElement.content)}
                </Button>
              </div>
            )}
          </div>
          
          {/* Hero Image */}
          {heroImage && (
            <div className="flex items-center justify-center">
              <AIImage 
                slot={heroImage} 
                className="w-full max-w-lg rounded-lg shadow-2xl"
                priority
              />
            </div>
          )}
        </div>
      </div>
      
      {/* SEO Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPageElement",
            "name": section.name,
            "description": subheadingElement?.content || "Hero section",
            "url": "#hero",
            "mainEntity": {
              "@type": "Organization",
              "name": headingElement?.content || "Empresa",
              "description": subheadingElement?.content,
            }
          })
        }}
      />
    </section>
  );
});

HeroSection.displayName = 'HeroSection';

// ============================
// 🚀 EXPORTS
// ============================

export { HeroSection, AIImage };
export type { HeroSectionProps, AIImageProps };