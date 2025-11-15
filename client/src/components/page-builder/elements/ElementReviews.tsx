import { ElementProps } from './types';
import { useState } from 'react';
import { Plus, X, Star, MessageCircle, User } from 'lucide-react';

type Review = {
  id: string;
  name: string;
  avatar?: string;
  comment: string;
  rating: number;
  role?: string;
};

export function ElementReviews({ 
  element, 
  theme, 
  editorMode = false, 
  onUpdate, 
  onSelect, 
  isSelected = false 
}: ElementProps) {
  // Debug: Log dos dados recebidos
  console.log('🔍 ElementReviews DEBUG - element.content:', element.content);
  console.log('🔍 ElementReviews DEBUG - element.content?.reviews:', element.content?.reviews);
  
  const [isEditing, setIsEditing] = useState(false);
  const [reviews, setReviews] = useState<Review[]>(
    element.content?.reviews || [
      {
        id: '1',
        name: 'Maria Silva',
        comment: 'Produto excelente! Superou minhas expectativas. Recomendo para todos.',
        rating: 5,
        role: 'Cliente Verificado'
      },
      {
        id: '2', 
        name: 'João Santos',
        comment: 'Muito bom, entrega rápida e produto de qualidade. Já comprei novamente.',
        rating: 5,
        role: 'Cliente Verificado'
      },
      {
        id: '3',
        name: 'Ana Costa', 
        comment: 'Adorei! Exatamente como descrito. Atendimento nota 10.',
        rating: 5,
        role: 'Cliente Verificado'
      }
    ]
  );

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

  const addReview = () => {
    const newReview: Review = {
      id: Date.now().toString(),
      name: 'Novo Cliente',
      comment: 'Comentário do cliente',
      rating: 5,
      role: 'Cliente Verificado'
    };
    setReviews([...reviews, newReview]);
  };

  const removeReview = (id: string) => {
    setReviews(reviews.filter(review => review.id !== id));
  };

  const updateReview = (id: string, updates: Partial<Review>) => {
    setReviews(reviews.map(review => 
      review.id === id ? { ...review, ...updates } : review
    ));
  };

  const saveChanges = () => {
    setIsEditing(false);
    if (onUpdate) {
      onUpdate({
        content: {
          ...element.content,
          reviews,
        },
      });
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setReviews(element.content?.reviews || []);
  };

  const renderStars = (rating: number, interactive: boolean = false, onRatingChange?: (rating: number) => void) => {
    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            fill={star <= rating ? '#fbbf24' : 'transparent'}
            color={star <= rating ? '#fbbf24' : '#d1d5db'}
            style={{ cursor: interactive ? 'pointer' : 'default' }}
            onClick={() => interactive && onRatingChange && onRatingChange(star)}
          />
        ))}
      </div>
    );
  };

  const baseStyles = {
    ...element.styles,
    fontFamily: theme.typography?.bodyFont || 'Inter, sans-serif',
    padding: element.styles.padding || theme.spacing?.lg || '2rem',
    margin: element.styles.margin || '0',
    backgroundColor: element.styles.backgroundColor || 'transparent',
    borderRadius: element.styles.borderRadius || theme.borderRadius?.sm || '0.25rem',
    outline: editorMode && isSelected ? '2px solid #3b82f6' : 'none',
    cursor: editorMode ? 'pointer' : 'default',
  };

  if (editorMode && isEditing) {
    return (
      <div style={{ ...baseStyles, border: '2px dashed #3b82f6', background: '#f8fafc' }}>
        <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#374151' }}>
          Editar Depoimentos
        </div>
        
        {reviews.map((review) => (
          <div key={review.id} style={{ 
            marginBottom: '1rem', 
            padding: '1rem', 
            background: 'white', 
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="text"
                value={review.name}
                onChange={(e) => updateReview(review.id, { name: e.target.value })}
                placeholder="Nome do cliente"
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
                value={review.role || ''}
                onChange={(e) => updateReview(review.id, { role: e.target.value })}
                placeholder="Cargo/Função"
                style={{
                  width: '150px',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem'
                }}
              />
              
              <button
                onClick={() => removeReview(review.id)}
                style={{
                  padding: '0.25rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer'
                }}
              >
                <X size={14} />
              </button>
            </div>
            
            <textarea
              value={review.comment}
              onChange={(e) => updateReview(review.id, { comment: e.target.value })}
              placeholder="Comentário do cliente"
              rows={3}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.25rem',
                fontSize: '0.875rem',
                resize: 'vertical' as const,
                marginBottom: '0.5rem'
              }}
            />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>Avaliação:</span>
              {renderStars(review.rating, true, (rating) => updateReview(review.id, { rating }))}
            </div>
          </div>
        ))}
        
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            onClick={addReview}
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

  return (
    <div
      style={baseStyles}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      data-testid={`element-${element.id}`}
      data-element-type="reviews"
      data-selected={isSelected}
    >
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: theme.spacing?.md || '1.5rem' 
      }}>
        {reviews.map((review) => (
          <div
            key={review.id}
            style={{
              padding: theme.spacing?.md || '1.5rem',
              backgroundColor: element.styles.cardBackgroundColor || 'rgba(255, 255, 255, 0.1)',
              borderRadius: theme.borderRadius?.md || '0.375rem',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              position: 'relative' as const
            }}
          >
            {/* Quote Icon */}
            <div style={{
              position: 'absolute' as const,
              top: '1rem',
              right: '1rem',
              opacity: 0.2
            }}>
              <MessageCircle size={24} color={element.styles.quoteColor || theme.colors?.text || '#9ca3af'} />
            </div>
            
            {/* Rating */}
            <div style={{ marginBottom: theme.spacing?.sm || '1rem' }}>
              {renderStars(review.rating)}
            </div>
            
            {/* Comment */}
            <p style={{
              fontSize: element.styles.commentFontSize || theme.typography?.fontSize?.base || '1rem',
              color: element.styles.commentColor || theme.colors?.text || '#4b5563',
              lineHeight: '1.6',
              margin: `0 0 ${theme.spacing?.md || '1.5rem'} 0`,
              fontStyle: 'italic'
            }}>
              "{review.comment}"
            </p>
            
            {/* Author */}
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing?.sm || '1rem' }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: element.styles.avatarBackgroundColor || theme.colors?.primary || '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {review.avatar ? (
                  <img 
                    src={review.avatar} 
                    alt={review.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover' as const
                    }}
                  />
                ) : (
                  <User 
                    size={24} 
                    color={element.styles.avatarIconColor || '#ffffff'} 
                  />
                )}
              </div>
              
              <div>
                <h4 style={{
                  fontSize: element.styles.nameFontSize || theme.typography?.fontSize?.base || '1rem',
                  fontWeight: element.styles.nameFontWeight || '600',
                  color: element.styles.nameColor || theme.colors?.text || '#1f2937',
                  margin: '0'
                }}>
                  {review.name}
                </h4>
                
                {review.role && (
                  <p style={{
                    fontSize: element.styles.roleFontSize || theme.typography?.fontSize?.sm || '0.875rem',
                    color: element.styles.roleColor || theme.colors?.muted || '#6b7280',
                    margin: '0'
                  }}>
                    {review.role}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {editorMode && (
        <div style={{
          position: 'absolute' as const,
          top: '5px',
          right: '5px',
          background: 'rgba(59, 130, 246, 0.9)',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '3px',
          fontSize: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}>
          <MessageCircle size={12} />
          Duplo-clique para editar
        </div>
      )}
    </div>
  );
}