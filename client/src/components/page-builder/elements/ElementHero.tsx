import { ElementProps } from './types';
import { useState } from 'react';
import { Star } from 'lucide-react';

export function ElementHero({ 
  element, 
  theme, 
  editorMode = false, 
  onUpdate, 
  onSelect, 
  isSelected = false 
}: ElementProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(element.content?.title || 'Título Hero');
  const [subtitle, setSubtitle] = useState(element.content?.subtitle || 'Subtítulo descritivo para engajar o visitante');
  const [ctaText, setCtaText] = useState(element.content?.ctaText || 'Call to Action');

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

  const saveChanges = () => {
    setIsEditing(false);
    if (onUpdate) {
      onUpdate({
        content: {
          ...element.content,
          title,
          subtitle,
          ctaText,
        },
      });
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setTitle(element.content?.title || 'Título Hero');
    setSubtitle(element.content?.subtitle || 'Subtítulo descritivo para engajar o visitante');
    setCtaText(element.content?.ctaText || 'Call to Action');
  };

  const baseStyles = {
    ...element.styles,
    fontFamily: theme.typography.bodyFont,
    padding: element.styles.padding || '4rem 2rem',
    textAlign: element.styles.textAlign || 'center',
    backgroundColor: element.styles.backgroundColor || '#1e293b',
    color: element.styles.color || '#ffffff',
    borderRadius: element.styles.borderRadius || theme.borderRadius.sm,
    outline: editorMode && isSelected ? '2px solid #3b82f6' : 'none',
    cursor: editorMode ? 'pointer' : 'default',
  };

  if (editorMode && isEditing) {
    return (
      <div
        style={baseStyles}
        data-testid={`element-${element.id}`}
        data-element-type="hero"
        data-selected={isSelected}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              margin: '0.5rem 0',
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: '#1e293b',
              border: '2px solid #3b82f6',
              borderRadius: '0.5rem',
              textAlign: 'center',
            }}
            placeholder="Título principal"
          />
          <textarea
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              margin: '0.5rem 0',
              fontSize: '1.2rem',
              color: '#1e293b',
              border: '2px solid #3b82f6',
              borderRadius: '0.5rem',
              textAlign: 'center',
              minHeight: '80px',
              resize: 'vertical',
            }}
            placeholder="Subtítulo descritivo"
          />
          <input
            type="text"
            value={ctaText}
            onChange={(e) => setCtaText(e.target.value)}
            style={{
              width: '200px',
              padding: '0.75rem 1.5rem',
              margin: '1rem 0',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#ffffff',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '0.5rem',
              textAlign: 'center',
            }}
            placeholder="Texto do botão"
          />
          <div style={{ marginTop: '1rem' }}>
            <button
              onClick={saveChanges}
              style={{
                padding: '0.5rem 1rem',
                margin: '0 0.5rem',
                fontSize: '0.875rem',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
              }}
            >
              Salvar
            </button>
            <button
              onClick={cancelEditing}
              style={{
                padding: '0.5rem 1rem',
                margin: '0 0.5rem',
                fontSize: '0.875rem',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={baseStyles}
      data-testid={`element-${element.id}`}
      data-element-type="hero"
      data-selected={isSelected}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          margin: '0 0 1rem 0',
          lineHeight: '1.2',
        }}>
          {title}
        </h1>
        <p style={{
          fontSize: '1.25rem',
          opacity: 0.9,
          margin: '0 0 2rem 0',
          lineHeight: '1.6',
        }}>
          {subtitle}
        </p>
        <button style={{
          padding: '1rem 2rem',
          fontSize: '1.1rem',
          fontWeight: '600',
          color: '#ffffff',
          backgroundColor: '#3b82f6',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}>
          {ctaText}
        </button>
      </div>

      {editorMode && (
        <div
          style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            background: 'rgba(59, 130, 246, 0.9)',
            color: 'white',
            padding: '0.25rem 0.5rem',
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            pointerEvents: 'none',
          }}
        >
          <Star size={12} />
          Duplo-clique para editar
        </div>
      )}
    </div>
  );
}