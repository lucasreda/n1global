import { ElementProps } from './types';
import { useState, useEffect } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Image as ImageIcon, Play, Pause, Monitor, Smartphone } from 'lucide-react';
import { DualImageUploader } from '../DualImageUploader';

type SliderImage = {
  id: string;
  src: string; // Mantemos para compatibilidade
  srcDesktop?: string;
  srcMobile?: string;
  alt: string;
  caption?: string;
};

export function ElementSlider({ 
  element, 
  theme, 
  editorMode = false, 
  onUpdate, 
  onSelect, 
  isSelected = false 
}: ElementProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(element.content?.autoPlay !== false);
  const [images, setImages] = useState<SliderImage[]>(
    () => {
      // Filtrar imagens quebradas de placeholder ao carregar
      const originalImages = element.content?.images || [];
      const cleanImages = originalImages.filter((img: SliderImage) => 
        !img.src?.includes('via.placeholder.com') &&
        !img.srcDesktop?.includes('via.placeholder.com') &&
        !img.srcMobile?.includes('via.placeholder.com')
      );
      return cleanImages;
    }
  );

  const autoPlayInterval = element.content?.autoPlayInterval || 5000;

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || editorMode) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [isAutoPlaying, images.length, autoPlayInterval, editorMode]);

  const handleDoubleClick = () => {
    if (editorMode) {
      setIsEditing(true);
    }
  };

  const handleClick = () => {
    if (editorMode && onSelect) {
      onSelect();
    }
  };

  const addImage = () => {
    const newImage: SliderImage = {
      id: Date.now().toString(),
      src: 'https://via.placeholder.com/800x400?text=Nova+Imagem',
      alt: 'Nova imagem',
      caption: 'Legenda da nova imagem'
    };
    setImages([...images, newImage]);
  };

  const removeImage = (id: string) => {
    setImages(images.filter(image => image.id !== id));
    if (currentSlide >= images.length - 1) {
      setCurrentSlide(Math.max(0, images.length - 2));
    }
  };

  const updateImage = (id: string, updates: Partial<SliderImage>) => {
    setImages(images.map(image => 
      image.id === id ? { ...image, ...updates } : image
    ));
  };

  const updateImageUrls = (id: string, imageUrls: { desktop?: string; mobile?: string }) => {
    setImages(images.map(image => {
      if (image.id === id) {
        const updatedImage = { ...image };
        if (imageUrls.desktop) updatedImage.srcDesktop = imageUrls.desktop;
        if (imageUrls.mobile) updatedImage.srcMobile = imageUrls.mobile;
        // Para compatibilidade, usamos desktop como src principal
        if (imageUrls.desktop && !updatedImage.src) {
          updatedImage.src = imageUrls.desktop;
        }
        return updatedImage;
      }
      return image;
    }));
  };

  const removeImageUrl = (id: string, type: 'desktop' | 'mobile') => {
    setImages(images.map(image => {
      if (image.id === id) {
        const updatedImage = { ...image };
        if (type === 'desktop') {
          updatedImage.srcDesktop = undefined;
        } else {
          updatedImage.srcMobile = undefined;
        }
        return updatedImage;
      }
      return image;
    }));
  };

  const saveChanges = () => {
    setIsEditing(false);
    if (onUpdate) {
      onUpdate({
        content: {
          ...element.content,
          images,
          autoPlay: isAutoPlaying,
          autoPlayInterval
        },
      });
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setImages(element.content?.images || []);
    setIsAutoPlaying(element.content?.autoPlay !== false);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % images.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const baseStyles = {
    ...element.styles,
    fontFamily: theme.typography.bodyFont,
    padding: element.styles.padding || theme.spacing.md,
    margin: element.styles.margin || '0',
    backgroundColor: element.styles.backgroundColor || 'transparent',
    borderRadius: element.styles.borderRadius || theme.borderRadius.sm,
    outline: editorMode && isSelected ? '2px solid #3b82f6' : 'none',
    cursor: editorMode ? 'pointer' : 'default',
    position: 'relative' as const,
  };

  if (editorMode && isEditing) {
    return (
      <div style={{ ...baseStyles, border: '2px dashed #3b82f6', background: '#f8fafc' }}>
        <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Editar Slider</span>
          {images.length === 0 && (
            <span style={{ color: '#ef4444', fontSize: '0.75rem', fontStyle: 'italic' }}>
              (Vazio - adicione pelo menos uma imagem)
            </span>
          )}
        </div>
        
        {/* Auto-play controls */}
        <div style={{ 
          marginBottom: '1rem', 
          padding: '0.5rem', 
          background: 'white', 
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <label style={{ fontSize: '0.875rem', color: '#374151' }}>
            <input
              type="checkbox"
              checked={isAutoPlaying}
              onChange={(e) => setIsAutoPlaying(e.target.checked)}
              style={{ marginRight: '0.5rem' }}
            />
            Auto-play
          </label>
        </div>
        
        {images.map((image, index) => (
          <div key={image.id} style={{ 
            marginBottom: '1rem', 
            padding: '1rem', 
            background: 'white', 
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', minWidth: '60px' }}>
                Slide {index + 1}
              </span>
              
              <button
                onClick={() => removeImage(image.id)}
                style={{
                  padding: '0.25rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  marginLeft: 'auto'
                }}
              >
                <X size={14} />
              </button>
            </div>
            
            {/* Upload de imagens responsivas */}
            <div style={{ marginBottom: '1rem' }}>
              <DualImageUploader
                onImageUpload={(imageUrls) => updateImageUrls(image.id, imageUrls)}
                currentDesktopUrl={image.srcDesktop || image.src}
                currentMobileUrl={image.srcMobile}
                onImageRemove={(type) => removeImageUrl(image.id, type)}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={image.alt}
                onChange={(e) => updateImage(image.id, { alt: e.target.value })}
                placeholder="Texto alternativo"
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem'
                }}
              />
              
              <input
                type="text"
                value={image.caption || ''}
                onChange={(e) => updateImage(image.id, { caption: e.target.value })}
                placeholder="Legenda (opcional)"
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>
        ))}
        
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            onClick={addImage}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.5rem 1rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            <Plus size={16} />
            Adicionar
          </button>
          
          <button
            onClick={saveChanges}
            style={{
              padding: '0.5rem 1rem',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Salvar
          </button>
          
          <button
            onClick={cancelEditing}
            style={{
              padding: '0.5rem 1rem',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div
        style={{
          ...baseStyles,
          aspectRatio: '16 / 9',
          background: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '0.5rem',
          color: '#6b7280',
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        data-testid={`element-${element.id}`}
        data-element-type="slider"
        data-selected={isSelected}
      >
        <ImageIcon size={48} />
        <p>Nenhuma imagem no slider</p>
        {editorMode && <p style={{ fontSize: '0.875rem' }}>Duplo-clique para adicionar imagens</p>}
      </div>
    );
  }

  return (
    <div
      style={baseStyles}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      data-testid={`element-${element.id}`}
      data-element-type="slider"
      data-selected={isSelected}
    >
      <div style={{
        position: 'relative' as const,
        width: '100%',
        aspectRatio: element.styles.aspectRatio || '16 / 9',
        overflow: 'hidden',
        borderRadius: element.styles.imagesBorderRadius || theme.borderRadius.md,
      }}>
        {/* Images */}
        <div style={{
          display: 'flex',
          transform: `translateX(-${currentSlide * 100}%)`,
          transition: 'transform 0.5s ease-in-out',
          width: `${images.length * 100}%`,
          height: '100%'
        }}>
          {images.map((image) => {
            // Determinar qual imagem mostrar baseada no tamanho da tela
            const getResponsiveImageSrc = () => {
              // Se tiver imagens responsivas, usar media queries CSS
              if (image.srcDesktop || image.srcMobile) {
                return image.srcDesktop || image.srcMobile || image.src;
              }
              // Fallback para imagem padrão
              return image.src;
            };

            const imageSrc = getResponsiveImageSrc();

            return (
              <div key={image.id} style={{ width: `${100 / images.length}%`, height: '100%' }}>
                {/* Para imagens responsivas, renderizar ambas e usar CSS para mostrar/ocultar */}
                {(image.srcDesktop || image.srcMobile) ? (
                  <>
                    {/* Imagem Desktop */}
                    {image.srcDesktop && (
                      <img
                        src={image.srcDesktop}
                        alt={image.alt}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover' as const,
                          display: 'block', // Usar CSS responsivo via classes se necessário
                        }}
                        className="block md:block sm:hidden" // Tailwind responsive classes
                        onError={(e) => {
                          console.error('Desktop image failed to load:', image.srcDesktop);
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    {/* Imagem Mobile */}
                    {image.srcMobile && (
                      <img
                        src={image.srcMobile}
                        alt={image.alt}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover' as const,
                          position: image.srcDesktop ? 'absolute' as const : 'static' as const,
                          top: 0,
                          left: 0,
                        }}
                        className="block md:hidden" // Tailwind responsive classes  
                        onError={(e) => {
                          console.error('Mobile image failed to load:', image.srcMobile);
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                  </>
                ) : (
                  // Imagem única (compatibilidade)
                  <img
                    src={imageSrc}
                    alt={image.alt}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover' as const,
                    }}
                    onError={(e) => {
                      console.error('Image failed to load:', imageSrc);
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                
                {image.caption && (
                  <div style={{
                    position: 'absolute' as const,
                    bottom: '0',
                    left: '0',
                    right: '0',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                    color: 'white',
                    padding: theme.spacing.md,
                    fontSize: element.styles.captionFontSize || theme.typography.fontSize.sm,
                  }}>
                    {image.caption}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              style={{
                position: 'absolute' as const,
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.8,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; }}
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={nextSlide}
              style={{
                position: 'absolute' as const,
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.8,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; }}
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Auto-play control */}
        {images.length > 1 && (
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            style={{
              position: 'absolute' as const,
              top: '1rem',
              right: '1rem',
              background: 'rgba(0, 0, 0, 0.5)',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              padding: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.75rem',
              opacity: 0.8,
            }}
          >
            {isAutoPlaying ? <Pause size={12} /> : <Play size={12} />}
          </button>
        )}
      </div>

      {/* Dots indicator */}
      {images.length > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.5rem',
          marginTop: theme.spacing.sm,
        }}>
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                border: 'none',
                background: index === currentSlide 
                  ? element.styles.activeDotColor || theme.colors.primary
                  : element.styles.inactiveDotColor || '#d1d5db',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
            />
          ))}
        </div>
      )}
      
      {editorMode && (
        <div style={{
          position: 'absolute' as const,
          top: '5px',
          left: '5px',
          background: 'rgba(59, 130, 246, 0.9)',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '3px',
          fontSize: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}>
          <ImageIcon size={12} />
          Duplo-clique para editar
        </div>
      )}
    </div>
  );
}