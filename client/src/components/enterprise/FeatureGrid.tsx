/**
 * Enterprise Feature Grid Component
 * Ícones/ilustrações geradas por IA + grid responsivo + micro-interações
 */

import { forwardRef, useState } from 'react';
import { useThemeComposer, useMobileFirst, useStyles } from '@/hooks/useThemeComposer';
import { AIImage } from './HeroSection';
import type { TemplateSection, AIImageSlot, ContentElement } from '@shared/templates';

// ============================
// 🎯 FEATURE GRID INTERFACE
// ============================

interface FeatureGridProps {
  section: TemplateSection;
  features?: FeatureItem[];
  onFeatureClick?: (featureId: string) => void;
  className?: string;
  testId?: string;
}

interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon: AIImageSlot;
  benefits?: string[];
  isHighlighted?: boolean;
}

interface FeatureCardProps {
  feature: FeatureItem;
  index: number;
  onClick?: (id: string) => void;
}

// ============================
// 🎴 FEATURE CARD COMPONENT
// ============================

const FeatureCard = forwardRef<HTMLDivElement, FeatureCardProps>(({ 
  feature, 
  index,
  onClick 
}, ref) => {
  const [isHovered, setIsHovered] = useState(false);
  const { tokens } = useThemeComposer();
  const { visualIdentity } = useStyles();
  const { getMobileFirstClasses } = useMobileFirst();

  const cardClasses = getMobileFirstClasses({
    mobile: 'bg-white rounded-xl p-6 shadow-sm border border-gray-100',
    tablet: 'p-8',
    desktop: 'hover:shadow-xl transition-all duration-300',
  });

  const iconWrapperClasses = getMobileFirstClasses({
    mobile: 'w-16 h-16 rounded-lg flex items-center justify-center mb-4',
    tablet: 'w-20 h-20 mb-6',
    desktop: 'group-hover:scale-110 transition-transform duration-300',
  });

  return (
    <div
      ref={ref}
      className={`group cursor-pointer ${cardClasses} ${
        feature.isHighlighted ? 'ring-2 ring-blue-500/20 bg-blue-50/50' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(feature.id)}
      style={{
        animationDelay: `${index * 100}ms`,
        animationFillMode: 'both',
      }}
      data-testid={`feature-card-${feature.id}`}
    >
      {/* Feature Icon */}
      <div 
        className={iconWrapperClasses}
        style={{
          backgroundColor: feature.isHighlighted 
            ? visualIdentity.primaryColor + '20'
            : visualIdentity.secondaryColor + '10',
        }}
      >
        <AIImage
          slot={{
            ...feature.icon,
            prompt: feature.icon.prompt
              .replace('{{featureTitle}}', feature.title)
              .replace('{{primaryColor}}', visualIdentity.primaryColor)
              .replace('{{industry}}', visualIdentity.industry),
          }}
          className="w-full h-full"
        />
      </div>

      {/* Feature Content */}
      <div className="space-y-3">
        {/* Title */}
        <h3 
          className="font-semibold leading-tight"
          style={{
            fontSize: tokens.typography.fontSizes.lg.mobile,
            color: feature.isHighlighted 
              ? visualIdentity.primaryColor 
              : '#1e293b',
          }}
          data-testid={`feature-title-${feature.id}`}
        >
          {feature.title}
        </h3>

        {/* Description */}
        <p 
          className="leading-relaxed"
          style={{
            fontSize: tokens.typography.fontSizes.base.mobile,
            color: '#64748b',
          }}
          data-testid={`feature-description-${feature.id}`}
        >
          {feature.description}
        </p>

        {/* Benefits List */}
        {feature.benefits && feature.benefits.length > 0 && (
          <ul className="space-y-1 mt-4">
            {feature.benefits.map((benefit, idx) => (
              <li 
                key={idx}
                className="flex items-center text-sm"
                style={{ color: '#64748b' }}
              >
                <span 
                  className="w-1.5 h-1.5 rounded-full mr-2"
                  style={{ backgroundColor: visualIdentity.accentColor }}
                />
                {benefit}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Hover Effect Indicator */}
      {feature.isHighlighted && (
        <div 
          className="absolute top-4 right-4 w-3 h-3 rounded-full"
          style={{ backgroundColor: visualIdentity.primaryColor }}
        />
      )}
    </div>
  );
});

FeatureCard.displayName = 'FeatureCard';

// ============================
// 🌟 FEATURE GRID COMPONENT
// ============================

const FeatureGrid = forwardRef<HTMLElement, FeatureGridProps>(({ 
  section, 
  features = [],
  onFeatureClick,
  className = '',
  testId = 'feature-grid'
}, ref) => {
  const { tokens } = useThemeComposer();
  const { getMobileFirstClasses } = useMobileFirst();
  const { visualIdentity } = useStyles();

  // Extrair título da seção
  const titleElement = section.elements?.find(el => 
    'type' in el && el.type === 'heading'
  ) as ContentElement | undefined;

  const subtitleElement = section.elements?.find(el => 
    'type' in el && el.type === 'subheading'
  ) as ContentElement | undefined;

  // Aplicar identidade visual aos textos
  const processContent = (content: string) => {
    return content
      .replace('{{primaryColor}}', visualIdentity.primaryColor)
      .replace('{{secondaryColor}}', visualIdentity.secondaryColor)
      .replace('{{industry}}', visualIdentity.industry)
      .replace('{{mood}}', visualIdentity.mood);
  };

  // Gerar features padrão se não fornecidas
  const defaultFeatures: FeatureItem[] = [
    {
      id: 'feature-1',
      title: 'Qualidade Premium',
      description: 'Produtos com padrão de excelência internacional e garantia estendida.',
      icon: {
        id: 'icon-quality',
        type: 'icon',
        aspectRatio: '1/1',
        sizes: '64px',
        quality: 'high',
        style: 'minimalist icon design',
        prompt: 'Premium quality icon, {{primaryColor}} color scheme, minimalist design, professional icon for {{industry}}, high quality symbol',
        loading: 'lazy',
      },
      benefits: ['Materiais premium', 'Controle de qualidade rigoroso', 'Garantia estendida'],
      isHighlighted: true,
    },
    {
      id: 'feature-2',
      title: 'Entrega Rápida',
      description: 'Logística otimizada com entrega expressa para todo o país.',
      icon: {
        id: 'icon-delivery',
        type: 'icon',
        aspectRatio: '1/1',
        sizes: '64px',
        quality: 'high',
        style: 'minimalist icon design',
        prompt: 'Fast delivery icon, {{primaryColor}} color scheme, speed and logistics symbol, professional delivery icon',
        loading: 'lazy',
      },
      benefits: ['Envio em 24h', 'Rastreamento completo', 'Suporte dedicado'],
    },
    {
      id: 'feature-3',
      title: 'Suporte Especializado',
      description: 'Atendimento personalizado com especialistas disponíveis 24/7.',
      icon: {
        id: 'icon-support',
        type: 'icon',
        aspectRatio: '1/1',
        sizes: '64px',
        quality: 'high',
        style: 'minimalist icon design',
        prompt: 'Customer support icon, {{primaryColor}} color scheme, help and assistance symbol, professional support icon',
        loading: 'lazy',
      },
      benefits: ['Atendimento 24/7', 'Especialistas certificados', 'Múltiplos canais'],
    },
  ];

  const displayFeatures = features.length > 0 ? features : defaultFeatures;

  // Classes responsivas
  const containerClasses = getMobileFirstClasses({
    mobile: `max-w-${section.container?.maxWidth || '2xl'} mx-auto px-4`,
    tablet: 'px-6',
    desktop: 'px-8',
  });

  const gridClasses = getMobileFirstClasses({
    mobile: 'grid grid-cols-1 gap-6',
    tablet: 'grid-cols-2 gap-8',
    desktop: `grid-cols-${section.grid?.columns.desktop || 3} gap-10`,
  });

  // Estilos de background
  const getBackgroundStyle = () => {
    if (!section.background) return {};
    
    switch (section.background.type) {
      case 'solid':
        return { backgroundColor: section.background.value };
      case 'gradient':
        return { background: section.background.value };
      default:
        return {};
    }
  };

  return (
    <section
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      style={{
        ...getBackgroundStyle(),
        paddingTop: `${tokens.spacing[section.padding?.top || 16]}`,
        paddingBottom: `${tokens.spacing[section.padding?.bottom || 16]}`,
      }}
      data-testid={testId}
    >
      <div className={containerClasses}>
        {/* Section Header */}
        <div className="text-center mb-12 space-y-4">
          {titleElement && (
            <h2 
              className="font-bold leading-tight"
              style={{
                fontSize: tokens.typography.fontSizes[titleElement.typography.fontSize].mobile,
                color: titleElement.typography.color,
              }}
              data-testid="features-title"
            >
              {processContent(titleElement.content)}
            </h2>
          )}

          {subtitleElement && (
            <p 
              className="leading-relaxed max-w-2xl mx-auto"
              style={{
                fontSize: tokens.typography.fontSizes[subtitleElement.typography.fontSize].mobile,
                color: subtitleElement.typography.color,
              }}
              data-testid="features-subtitle"
            >
              {processContent(subtitleElement.content)}
            </p>
          )}
        </div>

        {/* Features Grid */}
        <div className={gridClasses}>
          {displayFeatures.map((feature, index) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              index={index}
              onClick={onFeatureClick}
            />
          ))}
        </div>
      </div>

      {/* SEO Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": titleElement?.content || "Features",
            "description": subtitleElement?.content || "Lista de características",
            "numberOfItems": displayFeatures.length,
            "itemListElement": displayFeatures.map((feature, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "name": feature.title,
              "description": feature.description,
            }))
          })
        }}
      />
    </section>
  );
});

FeatureGrid.displayName = 'FeatureGrid';

// ============================
// 🚀 EXPORTS
// ============================

export { FeatureGrid, FeatureCard };
export type { FeatureGridProps, FeatureItem, FeatureCardProps };