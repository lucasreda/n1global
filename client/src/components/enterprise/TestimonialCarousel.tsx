/**
 * Enterprise Testimonial Carousel Component
 * Avatars gerados por IA + carousel responsivo + social proof
 */

import { forwardRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThemeComposer, useMobileFirst, useStyles } from '@/hooks/useThemeComposer';
import { AIImage } from './HeroSection';
import type { TemplateSection, AIImageSlot, ContentElement } from '@shared/templates';

// ============================
// 🎯 TESTIMONIAL INTERFACES
// ============================

interface TestimonialCarouselProps {
  section: TemplateSection;
  testimonials?: TestimonialItem[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showDots?: boolean;
  className?: string;
  testId?: string;
}

interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  avatar: AIImageSlot;
  location?: string;
  verified?: boolean;
  productUsed?: string;
}

interface TestimonialCardProps {
  testimonial: TestimonialItem;
  isActive: boolean;
  index: number;
}

// ============================
// 💬 TESTIMONIAL CARD COMPONENT
// ============================

const TestimonialCard = forwardRef<HTMLDivElement, TestimonialCardProps>(({ 
  testimonial, 
  isActive,
  index 
}, ref) => {
  const { tokens } = useThemeComposer();
  const { visualIdentity } = useStyles();
  const { getMobileFirstClasses } = useMobileFirst();

  const cardClasses = getMobileFirstClasses({
    mobile: 'bg-white rounded-2xl p-6 shadow-lg border border-gray-100',
    tablet: 'p-8',
    desktop: 'hover:shadow-xl transition-all duration-500',
  });

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${
          i < rating 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div
      ref={ref}
      className={`${cardClasses} ${
        isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-70'
      } transition-all duration-500`}
      style={{
        transform: isActive ? 'scale(1)' : 'scale(0.95)',
        opacity: isActive ? 1 : 0.7,
      }}
      data-testid={`testimonial-card-${testimonial.id}`}
    >
      {/* Quote Icon */}
      <div className="flex justify-between items-start mb-4">
        <Quote 
          className="w-8 h-8 opacity-20"
          style={{ color: visualIdentity.primaryColor }}
        />
        {testimonial.verified && (
          <div 
            className="text-xs font-medium px-2 py-1 rounded-full"
            style={{
              backgroundColor: visualIdentity.accentColor + '20',
              color: visualIdentity.accentColor,
            }}
          >
            ✓ Verificado
          </div>
        )}
      </div>

      {/* Rating */}
      <div className="flex items-center gap-1 mb-4">
        {renderStars(testimonial.rating)}
        <span 
          className="ml-2 text-sm font-medium"
          style={{ color: '#64748b' }}
        >
          {testimonial.rating}/5
        </span>
      </div>

      {/* Testimonial Content */}
      <blockquote 
        className="leading-relaxed mb-6"
        style={{
          fontSize: tokens.typography.fontSizes.base.mobile,
          color: '#1e293b',
          fontStyle: 'italic',
        }}
        data-testid={`testimonial-content-${testimonial.id}`}
      >
        "{testimonial.content}"
      </blockquote>

      {/* Customer Info */}
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
          <AIImage
            slot={{
              ...testimonial.avatar,
              prompt: testimonial.avatar.prompt
                .replace('{{customerName}}', testimonial.name)
                .replace('{{role}}', testimonial.role)
                .replace('{{industry}}', visualIdentity.industry),
            }}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Details */}
        <div className="flex-1">
          <div 
            className="font-semibold"
            style={{
              fontSize: tokens.typography.fontSizes.sm.mobile,
              color: '#1e293b',
            }}
            data-testid={`testimonial-name-${testimonial.id}`}
          >
            {testimonial.name}
          </div>
          <div 
            className="text-sm"
            style={{ color: '#64748b' }}
          >
            {testimonial.role} • {testimonial.company}
          </div>
          {testimonial.location && (
            <div 
              className="text-xs mt-1"
              style={{ color: '#94a3b8' }}
            >
              📍 {testimonial.location}
            </div>
          )}
        </div>
      </div>

      {/* Product Used */}
      {testimonial.productUsed && (
        <div 
          className="mt-4 text-xs font-medium"
          style={{ color: visualIdentity.primaryColor }}
        >
          Produto usado: {testimonial.productUsed}
        </div>
      )}
    </div>
  );
});

TestimonialCard.displayName = 'TestimonialCard';

// ============================
// 🎠 TESTIMONIAL CAROUSEL COMPONENT
// ============================

const TestimonialCarousel = forwardRef<HTMLElement, TestimonialCarouselProps>(({ 
  section,
  testimonials = [],
  autoPlay = true,
  autoPlayInterval = 5000,
  showDots = true,
  className = '',
  testId = 'testimonial-carousel'
}, ref) => {
  const { tokens } = useThemeComposer();
  const { getMobileFirstClasses } = useMobileFirst();
  const { visualIdentity } = useStyles();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

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
      .replace('{{industry}}', visualIdentity.industry)
      .replace('{{mood}}', visualIdentity.mood);
  };

  // Testimonials padrão
  const defaultTestimonials: TestimonialItem[] = [
    {
      id: 'testimonial-1',
      name: 'Ana Silva',
      role: 'Diretora de Marketing',
      company: 'TechCorp Brasil',
      content: 'Transformou completamente nossa estratégia. Resultados excepcionais em apenas 3 meses. Recomendo para qualquer empresa séria.',
      rating: 5,
      location: 'São Paulo, SP',
      verified: true,
      productUsed: 'Plano Enterprise',
      avatar: {
        id: 'avatar-ana',
        type: 'avatar',
        aspectRatio: '1/1',
        sizes: '48px',
        quality: 'high',
        style: 'professional portrait photography',
        prompt: 'Professional businesswoman {{customerName}}, {{role}} headshot, confident smile, business attire, studio lighting, corporate photography',
        loading: 'lazy',
      },
    },
    {
      id: 'testimonial-2',
      name: 'Carlos Mendes',
      role: 'CEO',
      company: 'InovaStart',
      content: 'Excedeeram todas as expectativas. Suporte excepcional e resultados mensuráveis. Nossa receita cresceu 150% no primeiro trimestre.',
      rating: 5,
      location: 'Rio de Janeiro, RJ',
      verified: true,
      productUsed: 'Plano Premium',
      avatar: {
        id: 'avatar-carlos',
        type: 'avatar',
        aspectRatio: '1/1',
        sizes: '48px',
        quality: 'high',
        style: 'professional portrait photography',
        prompt: 'Professional businessman {{customerName}}, {{role}} headshot, confident expression, business suit, modern office background',
        loading: 'lazy',
      },
    },
    {
      id: 'testimonial-3',
      name: 'Lucia Costa',
      role: 'Gerente de Vendas',
      company: 'VendaMais Ltda',
      content: 'Interface intuitiva e recursos poderosos. Nossa equipe se adaptou rapidamente e os resultados apareceram imediatamente.',
      rating: 4,
      location: 'Belo Horizonte, MG',
      verified: true,
      productUsed: 'Plano Profissional',
      avatar: {
        id: 'avatar-lucia',
        type: 'avatar',
        aspectRatio: '1/1',
        sizes: '48px',
        quality: 'high',
        style: 'professional portrait photography',
        prompt: 'Professional businesswoman {{customerName}}, {{role}} headshot, friendly smile, professional attire, office environment',
        loading: 'lazy',
      },
    },
  ];

  const displayTestimonials = testimonials.length > 0 ? testimonials : defaultTestimonials;

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || isPaused || displayTestimonials.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayTestimonials.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, isPaused, autoPlayInterval, displayTestimonials.length]);

  // Navigation functions
  const goToPrevious = () => {
    setCurrentIndex((prev) => 
      prev === 0 ? displayTestimonials.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % displayTestimonials.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Classes responsivas
  const containerClasses = getMobileFirstClasses({
    mobile: `max-w-${section.container?.maxWidth || '2xl'} mx-auto px-4`,
    tablet: 'px-6',
    desktop: 'px-8',
  });

  // Estilos de background
  const getBackgroundStyle = () => {
    if (!section.background) return {};
    
    switch (section.background.type) {
      case 'solid':
        return { backgroundColor: section.background.value };
      case 'gradient':
        return { background: section.background.value };
      case 'glassmorphism':
        return { 
          background: section.background.value,
          backdropFilter: section.background.overlay,
        };
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
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
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
              data-testid="testimonials-title"
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
              data-testid="testimonials-subtitle"
            >
              {processContent(subtitleElement.content)}
            </p>
          )}
        </div>

        {/* Carousel Container */}
        <div className="relative">
          {/* Navigation Buttons */}
          <div className="absolute inset-y-0 left-0 z-10 flex items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevious}
              className="h-12 w-12 rounded-full bg-white/90 shadow-lg border-0 hover:bg-white"
              data-testid="testimonial-prev"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>

          <div className="absolute inset-y-0 right-0 z-10 flex items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              className="h-12 w-12 rounded-full bg-white/90 shadow-lg border-0 hover:bg-white"
              data-testid="testimonial-next"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Testimonials */}
          <div className="px-16">
            <div className="relative max-w-2xl mx-auto">
              {displayTestimonials.map((testimonial, index) => (
                <div
                  key={testimonial.id}
                  className={`${
                    index === currentIndex ? 'block' : 'hidden'
                  }`}
                >
                  <TestimonialCard
                    testimonial={testimonial}
                    isActive={index === currentIndex}
                    index={index}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dots Navigation */}
        {showDots && displayTestimonials.length > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {displayTestimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'scale-125' 
                    : 'hover:scale-110'
                }`}
                style={{
                  backgroundColor: index === currentIndex 
                    ? visualIdentity.primaryColor 
                    : '#cbd5e1',
                }}
                data-testid={`testimonial-dot-${index}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* SEO Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": titleElement?.content || "Customer Testimonials",
            "description": subtitleElement?.content || "Depoimentos de clientes",
            "numberOfItems": displayTestimonials.length,
            "itemListElement": displayTestimonials.map((testimonial, index) => ({
              "@type": "Review",
              "position": index + 1,
              "author": {
                "@type": "Person",
                "name": testimonial.name,
                "jobTitle": testimonial.role,
                "worksFor": testimonial.company
              },
              "reviewBody": testimonial.content,
              "reviewRating": {
                "@type": "Rating",
                "ratingValue": testimonial.rating,
                "bestRating": 5
              }
            }))
          })
        }}
      />
    </section>
  );
});

TestimonialCarousel.displayName = 'TestimonialCarousel';

// ============================
// 🚀 EXPORTS
// ============================

export { TestimonialCarousel, TestimonialCard };
export type { TestimonialCarouselProps, TestimonialItem, TestimonialCardProps };