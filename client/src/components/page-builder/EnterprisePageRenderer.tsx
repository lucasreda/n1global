/**
 * Enterprise Page Renderer
 * Refatoração do PageRenderer com componentes enterprise, lazy loading e mobile-first
 */

import { forwardRef, Suspense, lazy } from 'react';
import { PageModelV2, BlockSection, BlockElement } from "@shared/schema";
import { useThemeComposer } from '@/hooks/useThemeComposer';
import { ElementRenderer } from './PageRenderer';

// ============================
// 🚀 LAZY LOADED ENTERPRISE COMPONENTS
// ============================

const HeroSection = lazy(() => 
  import('@/components/enterprise/HeroSection').then(module => ({ 
    default: module.HeroSection 
  }))
);

const FeatureGrid = lazy(() => 
  import('@/components/enterprise/FeatureGrid').then(module => ({ 
    default: module.FeatureGrid 
  }))
);

const TestimonialCarousel = lazy(() => 
  import('@/components/enterprise/TestimonialCarousel').then(module => ({ 
    default: module.TestimonialCarousel 
  }))
);

const ProductShowcase = lazy(() => 
  import('@/components/enterprise/ProductShowcase').then(module => ({ 
    default: module.ProductShowcase 
  }))
);

// ============================
// 🎯 ENTERPRISE PAGE RENDERER INTERFACE
// ============================

interface EnterprisePageRendererProps {
  model: PageModelV2;
  className?: string;
  editorMode?: boolean;
  enableEnterpriseComponents?: boolean;
  lazyLoading?: boolean;
}

// ============================
// 🎨 SECTION TYPE DETECTION
// ============================

type EnterpriseComponentType = 'hero' | 'features' | 'testimonials' | 'products' | 'legacy';

const detectSectionType = (section: BlockSection): EnterpriseComponentType => {
  const hasHeading = section.rows.some(row => 
    row.columns.some(col => 
      col.elements.some(el => el.type === 'heading')
    )
  );

  const hasImage = section.rows.some(row => 
    row.columns.some(col => 
      col.elements.some(el => el.type === 'image')
    )
  );

  const hasButton = section.rows.some(row => 
    row.columns.some(col => 
      col.elements.some(el => el.type === 'button')
    )
  );

  const hasReviews = section.rows.some(row => 
    row.columns.some(col => 
      col.elements.some(el => el.type === 'reviews')
    )
  );

  const hasSlider = section.rows.some(row => 
    row.columns.some(col => 
      col.elements.some(el => el.type === 'slider')
    )
  );

  const hasFeatures = section.rows.some(row => 
    row.columns.some(col => 
      col.elements.some(el => el.type === 'features' || el.type === 'benefits')
    )
  );

  // Hero detection: heading + image + button
  if (hasHeading && hasImage && hasButton && !hasReviews && !hasFeatures) {
    return 'hero';
  }

  // Features detection: multiple elements with features/benefits
  if (hasFeatures || (hasHeading && !hasButton && !hasReviews)) {
    return 'features';
  }

  // Testimonials detection: reviews or slider elements
  if (hasReviews || hasSlider) {
    return 'testimonials';
  }

  // Products detection: multiple images with text (could be product grid)
  if (hasImage && hasHeading && section.rows.length > 1) {
    return 'products';
  }

  return 'legacy';
};

// ============================
// 🎨 TEMPLATE SECTION CONVERTER
// ============================

const convertToTemplateSection = (section: BlockSection, theme: PageModelV2['theme'], sectionType: EnterpriseComponentType) => {
  // Map enterprise component types to template section types
  const getTemplateType = (type: EnterpriseComponentType): "features" | "testimonials" | "hero" | "content" | "cta" | "gallery" => {
    switch (type) {
      case 'hero': return 'hero';
      case 'features': return 'features';
      case 'testimonials': return 'testimonials';
      case 'products': return 'gallery';
      default: return 'content';
    }
  };
  // Extract text elements for title and subtitle
  const textElements = section.rows.flatMap(row => 
    row.columns.flatMap(col => 
      col.elements.filter(el => el.type === 'heading' || el.type === 'text')
    )
  );

  const headingElement = textElements.find(el => el.type === 'heading');
  const textElement = textElements.find(el => el.type === 'text');

  // Extract button for CTA
  const buttonElement = section.rows.flatMap(row => 
    row.columns.flatMap(col => 
      col.elements.filter(el => el.type === 'button')
    )
  )[0];

  // Extract images for AI slots
  const imageElements = section.rows.flatMap(row => 
    row.columns.flatMap(col => 
      col.elements.filter(el => el.type === 'image')
    )
  );

  const templateSection = {
    id: section.id,
    name: `Seção ${section.type || 'Enterprise'}`,
    type: getTemplateType(sectionType),
    variant: 'hero-centered',
    container: {
      maxWidth: '2xl',
      padding: { x: 6, y: 16 },
      margin: { x: 'auto', y: 0 },
      centered: true,
    },
    background: {
      type: 'gradient' as const,
      value: `linear-gradient(135deg, ${theme.colors.background} 0%, ${theme.colors.muted} 100%)`,
    },
    grid: {
      columns: { mobile: 1, tablet: 2, desktop: 3 },
      gap: { mobile: 6, tablet: 8, desktop: 10 },
    },
    padding: {
      top: 16,
      bottom: 16,
      left: 4,
      right: 4,
    },
    elements: [
      ...(headingElement ? [{
        type: 'heading' as const,
        content: headingElement.content?.text || headingElement.props?.text || 'Título',
        typography: {
          fontSize: '3xl',
          fontWeight: 'bold',
          color: theme.colors.text,
        },
      }] : []),
      ...(textElement ? [{
        type: 'subheading' as const,
        content: textElement.content?.text || textElement.content?.html || textElement.props?.content || 'Subtítulo',
        typography: {
          fontSize: 'lg',
          fontWeight: 'normal',
          color: theme.colors.secondary,
        },
      }] : []),
      ...(buttonElement ? [{
        type: 'cta' as const,
        content: buttonElement.content?.text || buttonElement.props?.text || 'Ação',
        action: {
          type: 'link' as const,
          url: buttonElement.content?.href || '#',
          target: '_blank',
        },
        style: {
          variant: 'primary',
          size: 'lg',
          fullWidth: false,
        },
      }] : []),
    ],
    aiImages: imageElements.map((img, index) => ({
      id: `ai-image-${section.id}-${index}`,
      type: 'hero' as const,
      aspectRatio: '16/9' as const,
      sizes: '(max-width: 768px) 100vw, 50vw',
      quality: 'high' as const,
      style: 'photorealistic hero image',
      prompt: `Professional hero background image, modern design, ${theme.colors.primary} color palette, premium quality, commercial photography`,
      loading: 'lazy' as const,
    })),
  };

  return templateSection;
};

// ============================
// 🏗️ ENTERPRISE SECTION RENDERER
// ============================

interface EnterpriseSectionProps {
  section: BlockSection;
  theme: PageModelV2['theme'];
  editorMode: boolean;
  enableEnterpriseComponents: boolean;
}

const EnterpriseSection = forwardRef<HTMLElement, EnterpriseSectionProps>(({
  section,
  theme,
  editorMode,
  enableEnterpriseComponents
}, ref) => {
  const sectionType = detectSectionType(section);

  // Fallback para modo editor ou quando enterprise components estão desabilitados
  if (editorMode || !enableEnterpriseComponents || sectionType === 'legacy') {
    return (
      <LegacySectionRenderer 
        section={section} 
        theme={theme} 
        editorMode={editorMode} 
      />
    );
  }

  const templateSection = convertToTemplateSection(section, theme, sectionType);

  // Loading fallback component
  const LoadingFallback = () => (
    <div 
      className="w-full h-32 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center"
      style={{ minHeight: '200px' }}
    >
      <div className="text-gray-400">Carregando componente premium...</div>
    </div>
  );

  // Render enterprise component based on type
  switch (sectionType) {
    case 'hero':
      return (
        <Suspense fallback={<LoadingFallback />}>
          <HeroSection 
            ref={ref}
            section={templateSection}
            testId={`hero-section-${section.id}`}
          />
        </Suspense>
      );

    case 'features':
      return (
        <Suspense fallback={<LoadingFallback />}>
          <FeatureGrid 
            ref={ref}
            section={templateSection}
            testId={`features-section-${section.id}`}
          />
        </Suspense>
      );

    case 'testimonials':
      return (
        <Suspense fallback={<LoadingFallback />}>
          <TestimonialCarousel 
            ref={ref}
            section={templateSection}
            autoPlay={!editorMode}
            testId={`testimonials-section-${section.id}`}
          />
        </Suspense>
      );

    case 'products':
      return (
        <Suspense fallback={<LoadingFallback />}>
          <ProductShowcase 
            ref={ref}
            section={templateSection}
            layout="grid"
            showPricing={true}
            showRatings={true}
            testId={`products-section-${section.id}`}
          />
        </Suspense>
      );

    default:
      return (
        <LegacySectionRenderer 
          section={section} 
          theme={theme} 
          editorMode={editorMode} 
        />
      );
  }
});

EnterpriseSection.displayName = 'EnterpriseSection';

// ============================
// 🔄 LEGACY SECTION RENDERER
// ============================

interface LegacySectionRendererProps {
  section: BlockSection;
  theme: PageModelV2['theme'];
  editorMode: boolean;
}

const LegacySectionRenderer = ({ section, theme, editorMode }: LegacySectionRendererProps) => {
  const containerClasses = {
    full: 'w-full',
    container: 'max-w-6xl mx-auto px-4',
    narrow: 'max-w-4xl mx-auto px-4',
  };

  const verticalAlignClasses = {
    top: 'items-start',
    center: 'items-center',
    bottom: 'items-end',
  };

  return (
    <section
      className={`section-renderer ${containerClasses[section.settings.containerWidth || 'container']} ${verticalAlignClasses[section.settings.verticalAlign || 'top']}`}
      style={{
        padding: theme.spacing?.lg || '2rem',
        backgroundColor: section.styles?.backgroundColor || 'transparent',
        backgroundImage: section.styles?.backgroundImage ? `url(${section.styles.backgroundImage})` : undefined,
        minHeight: section.styles?.minHeight || 'auto',
      }}
      data-testid={`section-${section.id}`}
      data-section-type={section.type}
    >
      {section.rows.map((row) => (
        <div
          key={row.id}
          className="row-renderer flex flex-wrap w-full"
          style={{
            gap: theme.spacing?.md || '1.5rem',
            padding: '0',
            backgroundColor: 'transparent',
            minHeight: 'auto',
          }}
          data-testid={`row-${row.id}`}
        >
          {row.columns.map((column) => {
            const widthClasses = {
              'full': 'w-full',
              '1/2': 'w-1/2',
              '1/3': 'w-1/3',
              '2/3': 'w-2/3',
              '1/4': 'w-1/4',
              '3/4': 'w-3/4',
              '1/5': 'w-1/5',
              '2/5': 'w-2/5',
              '3/5': 'w-3/5',
              '4/5': 'w-4/5',
            };

            return (
              <div
                key={column.id}
                className={`column-renderer ${widthClasses[column.width as keyof typeof widthClasses] || 'w-full'} flex flex-col`}
                style={{
                  padding: theme.spacing?.sm || '1rem',
                  backgroundColor: 'transparent',
                }}
                data-testid={`column-${column.id}`}
              >
                {column.elements.map((element) => (
                  <ElementRenderer 
                    key={element.id} 
                    element={element} 
                    theme={theme}
                    editorMode={editorMode}
                  />
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
};

// ============================
// 🏢 ENTERPRISE PAGE RENDERER COMPONENT
// ============================

const EnterprisePageRenderer = forwardRef<HTMLDivElement, EnterprisePageRendererProps>(({
  model,
  className = "",
  editorMode = false,
  enableEnterpriseComponents = true,
  lazyLoading = true
}, ref) => {
  return (
    <div 
      ref={ref}
      className={`enterprise-page-renderer ${className}`}
      style={{
        backgroundColor: model.theme.colors.background,
        color: model.theme.colors.text,
        fontFamily: model.theme.typography.bodyFont,
        fontSize: model.theme.typography.fontSize.base,
      }}
      data-testid="enterprise-page-renderer"
    >
      {model.sections.map((section) => (
        <EnterpriseSection
          key={section.id}
          section={section}
          theme={model.theme}
          editorMode={editorMode}
          enableEnterpriseComponents={enableEnterpriseComponents}
        />
      ))}

      {/* Performance Metrics & SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Enterprise Funnel Page",
            "description": "High-conversion landing page with AI-generated content",
            "mainEntity": {
              "@type": "Organization",
              "name": "N1 Hub",
              "description": "Enterprise marketplace visual page editor"
            }
          })
        }}
      />
    </div>
  );
});

EnterprisePageRenderer.displayName = 'EnterprisePageRenderer';

// ============================
// 🚀 EXPORTS
// ============================

export { EnterprisePageRenderer, EnterpriseSection, LegacySectionRenderer };
export type { EnterprisePageRendererProps, EnterpriseSectionProps, LegacySectionRendererProps };