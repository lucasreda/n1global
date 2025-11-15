/**
 * Enterprise Product Showcase Component
 * Imagens de produtos IA + gallery responsiva + conversion optimization
 */

import { forwardRef, useState } from 'react';
import { ShoppingCart, Heart, Eye, Star, Zap, Shield, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useThemeComposer, useMobileFirst, useStyles } from '@/hooks/useThemeComposer';
import { AIImage } from './HeroSection';
import type { TemplateSection, AIImageSlot, ContentElement } from '@shared/templates';

// ============================
// 🎯 PRODUCT SHOWCASE INTERFACES
// ============================

interface ProductShowcaseProps {
  section: TemplateSection;
  products?: ProductItem[];
  layout?: 'grid' | 'carousel' | 'featured';
  showPricing?: boolean;
  showRatings?: boolean;
  onProductClick?: (productId: string) => void;
  onAddToCart?: (productId: string) => void;
  className?: string;
  testId?: string;
}

interface ProductItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  rating: number;
  reviewCount: number;
  images: AIImageSlot[];
  badges?: ProductBadge[];
  features?: string[];
  category: string;
  inStock: boolean;
  fastShipping?: boolean;
  bestseller?: boolean;
}

interface ProductBadge {
  id: string;
  text: string;
  type: 'success' | 'warning' | 'info' | 'accent';
  icon?: React.ComponentType<any>;
}

interface ProductCardProps {
  product: ProductItem;
  layout: 'grid' | 'carousel' | 'featured';
  showPricing: boolean;
  showRatings: boolean;
  onProductClick?: (productId: string) => void;
  onAddToCart?: (productId: string) => void;
  index: number;
}

// ============================
// 🛍️ PRODUCT CARD COMPONENT
// ============================

const ProductCard = forwardRef<HTMLDivElement, ProductCardProps>(({ 
  product,
  layout,
  showPricing,
  showRatings,
  onProductClick,
  onAddToCart,
  index
}, ref) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const { tokens } = useThemeComposer();
  const { visualIdentity } = useStyles();
  const { getMobileFirstClasses } = useMobileFirst();

  const cardClasses = getMobileFirstClasses({
    mobile: 'bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100',
    tablet: 'hover:shadow-xl transition-all duration-300',
    desktop: layout === 'featured' ? 'lg:flex lg:gap-8' : '',
  });

  const getBadgeColor = (type: ProductBadge['type']) => {
    const colors = {
      success: '#22c55e',
      warning: '#f59e0b',
      info: '#3b82f6',
      accent: visualIdentity.accentColor,
    };
    return colors[type];
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency === 'BRL' ? 'BRL' : 'USD',
    }).format(price);
  };

  const discountPercentage = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div
      ref={ref}
      className={`group cursor-pointer ${cardClasses}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onProductClick?.(product.id)}
      style={{
        animationDelay: `${index * 100}ms`,
        animationFillMode: 'both',
      }}
      data-testid={`product-card-${product.id}`}
    >
      {/* Product Image */}
      <div className={`relative ${layout === 'featured' ? 'lg:w-1/2' : ''}`}>
        <div className="aspect-square overflow-hidden">
          <AIImage
            slot={{
              ...product.images[imageIndex],
              prompt: product.images[imageIndex].prompt
                .replace('{{productName}}', product.name)
                .replace('{{category}}', product.category)
                .replace('{{primaryColor}}', visualIdentity.primaryColor),
            }}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            priority={index < 3}
          />
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 space-y-2">
          {product.bestseller && (
            <Badge 
              variant="secondary"
              className="bg-red-500 text-white hover:bg-red-600"
            >
              <Zap className="w-3 h-3 mr-1" />
              Bestseller
            </Badge>
          )}
          {discountPercentage > 0 && (
            <Badge 
              variant="secondary"
              className="bg-green-500 text-white hover:bg-green-600"
            >
              -{discountPercentage}%
            </Badge>
          )}
          {product.badges?.map((badge) => (
            <Badge
              key={badge.id}
              variant="secondary"
              style={{
                backgroundColor: getBadgeColor(badge.type),
                color: 'white',
              }}
            >
              {badge.icon && <badge.icon className="w-3 h-3 mr-1" />}
              {badge.text}
            </Badge>
          ))}
        </div>

        {/* Quick Actions */}
        <div className={`absolute top-3 right-3 space-y-2 transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-lg"
          >
            <Heart className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-lg"
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>

        {/* Image Indicators */}
        {product.images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1">
            {product.images.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setImageIndex(idx);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === imageIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className={`p-6 ${layout === 'featured' ? 'lg:w-1/2 lg:flex lg:flex-col lg:justify-center' : ''}`}>
        {/* Category */}
        <div 
          className="text-xs font-medium uppercase tracking-wider mb-2"
          style={{ color: visualIdentity.primaryColor }}
        >
          {product.category}
        </div>

        {/* Product Name */}
        <h3 
          className="font-semibold leading-tight mb-2"
          style={{
            fontSize: layout === 'featured' 
              ? tokens.typography.fontSizes.xl.mobile 
              : tokens.typography.fontSizes.lg.mobile,
            color: '#1e293b',
          }}
          data-testid={`product-name-${product.id}`}
        >
          {product.name}
        </h3>

        {/* Description */}
        <p 
          className="leading-relaxed mb-4"
          style={{
            fontSize: tokens.typography.fontSizes.sm.mobile,
            color: '#64748b',
          }}
          data-testid={`product-description-${product.id}`}
        >
          {product.description}
        </p>

        {/* Rating */}
        {showRatings && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1">
              {renderStars(product.rating)}
            </div>
            <span className="text-sm text-gray-600">
              {product.rating} ({product.reviewCount} avaliações)
            </span>
          </div>
        )}

        {/* Features */}
        {product.features && product.features.length > 0 && (
          <ul className="space-y-1 mb-4">
            {product.features.slice(0, 3).map((feature, idx) => (
              <li 
                key={idx}
                className="flex items-center text-sm text-gray-600"
              >
                <span 
                  className="w-1.5 h-1.5 rounded-full mr-2"
                  style={{ backgroundColor: visualIdentity.accentColor }}
                />
                {feature}
              </li>
            ))}
          </ul>
        )}

        {/* Shipping & Guarantees */}
        <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
          {product.fastShipping && (
            <div className="flex items-center gap-1">
              <Truck className="w-3 h-3" />
              Entrega rápida
            </div>
          )}
          {product.inStock && (
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Em estoque
            </div>
          )}
        </div>

        {/* Pricing & Actions */}
        {showPricing && (
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span 
                  className="font-bold"
                  style={{
                    fontSize: tokens.typography.fontSizes.lg.mobile,
                    color: visualIdentity.primaryColor,
                  }}
                  data-testid={`product-price-${product.id}`}
                >
                  {formatPrice(product.price, product.currency)}
                </span>
                {product.originalPrice && (
                  <span className="text-sm text-gray-500 line-through">
                    {formatPrice(product.originalPrice, product.currency)}
                  </span>
                )}
              </div>
              {discountPercentage > 0 && (
                <div className="text-xs text-green-600 font-medium">
                  Economize {discountPercentage}%
                </div>
              )}
            </div>

            <Button
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart?.(product.id);
              }}
              className="px-4 py-2"
              style={{ backgroundColor: visualIdentity.primaryColor }}
              disabled={!product.inStock}
              data-testid={`add-to-cart-${product.id}`}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {product.inStock ? 'Adicionar' : 'Esgotado'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

// ============================
// 🏪 PRODUCT SHOWCASE COMPONENT
// ============================

const ProductShowcase = forwardRef<HTMLElement, ProductShowcaseProps>(({ 
  section,
  products = [],
  layout = 'grid',
  showPricing = true,
  showRatings = true,
  onProductClick,
  onAddToCart,
  className = '',
  testId = 'product-showcase'
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

  // Produtos padrão
  const defaultProducts: ProductItem[] = [
    {
      id: 'product-1',
      name: 'Produto Premium Pro',
      description: 'Solução completa com tecnologia avançada e design moderno. Ideal para profissionais exigentes.',
      price: 299.99,
      originalPrice: 399.99,
      currency: 'BRL',
      rating: 5,
      reviewCount: 127,
      category: 'Premium',
      inStock: true,
      fastShipping: true,
      bestseller: true,
      features: [
        'Tecnologia avançada',
        'Design premium',
        'Garantia estendida',
        'Suporte 24/7'
      ],
      badges: [
        { id: 'new', text: 'Novo', type: 'info', icon: Zap }
      ],
      images: [
        {
          id: 'product-1-main',
          type: 'product',
          aspectRatio: '1/1',
          sizes: '(max-width: 768px) 100vw, 50vw',
          quality: 'high',
          style: 'clean product photography',
          prompt: 'Professional {{productName}} product photography, {{category}} category, clean white background, premium lighting, commercial quality, {{primaryColor}} accents',
          loading: 'lazy',
        }
      ]
    },
    {
      id: 'product-2',
      name: 'Essencial Plus',
      description: 'Versão essencial com todas as funcionalidades básicas necessárias para começar.',
      price: 149.99,
      currency: 'BRL',
      rating: 4,
      reviewCount: 89,
      category: 'Essencial',
      inStock: true,
      fastShipping: true,
      features: [
        'Funcionalidades básicas',
        'Interface intuitiva',
        'Suporte padrão'
      ],
      images: [
        {
          id: 'product-2-main',
          type: 'product',
          aspectRatio: '1/1',
          sizes: '(max-width: 768px) 100vw, 50vw',
          quality: 'high',
          style: 'clean product photography',
          prompt: 'Professional {{productName}} product photography, {{category}} category, clean white background, premium lighting, commercial quality',
          loading: 'lazy',
        }
      ]
    }
  ];

  const displayProducts = products.length > 0 ? products : defaultProducts;

  // Classes responsivas baseadas no layout
  const getGridClasses = () => {
    if (layout === 'featured') {
      return 'space-y-8';
    }
    
    return getMobileFirstClasses({
      mobile: 'grid grid-cols-1 gap-6',
      tablet: 'grid-cols-2 gap-8',
      desktop: layout === 'carousel' ? 'grid-cols-3 gap-10' : 'grid-cols-3 gap-10',
    });
  };

  // Classes do container
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
              data-testid="products-title"
            >
              {titleElement.content}
            </h2>
          )}

          {subtitleElement && (
            <p 
              className="leading-relaxed max-w-2xl mx-auto"
              style={{
                fontSize: tokens.typography.fontSizes[subtitleElement.typography.fontSize].mobile,
                color: subtitleElement.typography.color,
              }}
              data-testid="products-subtitle"
            >
              {subtitleElement.content}
            </p>
          )}
        </div>

        {/* Products Grid/List */}
        <div className={getGridClasses()}>
          {displayProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              layout={layout}
              showPricing={showPricing}
              showRatings={showRatings}
              onProductClick={onProductClick}
              onAddToCart={onAddToCart}
              index={index}
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
            "name": titleElement?.content || "Products",
            "description": subtitleElement?.content || "Lista de produtos",
            "numberOfItems": displayProducts.length,
            "itemListElement": displayProducts.map((product, index) => ({
              "@type": "Product",
              "position": index + 1,
              "name": product.name,
              "description": product.description,
              "offers": {
                "@type": "Offer",
                "price": product.price,
                "priceCurrency": product.currency,
                "availability": product.inStock 
                  ? "https://schema.org/InStock" 
                  : "https://schema.org/OutOfStock"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": product.rating,
                "reviewCount": product.reviewCount
              }
            }))
          })
        }}
      />
    </section>
  );
});

ProductShowcase.displayName = 'ProductShowcase';

// ============================
// 🚀 EXPORTS
// ============================

export { ProductShowcase, ProductCard };
export type { ProductShowcaseProps, ProductItem, ProductCardProps, ProductBadge };