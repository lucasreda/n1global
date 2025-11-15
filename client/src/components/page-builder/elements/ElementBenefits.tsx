import { ElementProps } from './types';
import { useState } from 'react';
import { Plus, X, Star, Check, Zap, Heart, Trophy, Shield } from 'lucide-react';

type Benefit = {
  id: string;
  title: string;
  description: string;
  icon: 'check' | 'star' | 'zap' | 'heart' | 'trophy' | 'shield';
};

const iconMap = {
  check: Check,
  star: Star,
  zap: Zap,
  heart: Heart,
  trophy: Trophy,
  shield: Shield,
};

export function ElementBenefits({ 
  element, 
  theme, 
  editorMode = false, 
  onUpdate, 
  onSelect, 
  isSelected = false 
}: ElementProps) {
  // Debug: Log dos dados recebidos
  console.log('🔍 ElementBenefits DEBUG - element.content:', element.content);
  console.log('🔍 ElementBenefits DEBUG - element.content?.benefits:', element.content?.benefits);
  
  const [isEditing, setIsEditing] = useState(false);
  const [benefits, setBenefits] = useState<Benefit[]>(
    element.content?.benefits || [
      {
        id: '1',
        title: 'Benefício 1',
        description: 'Descrição do primeiro benefício',
        icon: 'check' as const
      },
      {
        id: '2', 
        title: 'Benefício 2',
        description: 'Descrição do segundo benefício',
        icon: 'star' as const
      },
      {
        id: '3',
        title: 'Benefício 3', 
        description: 'Descrição do terceiro benefício',
        icon: 'zap' as const
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

  const addBenefit = () => {
    const newBenefit: Benefit = {
      id: Date.now().toString(),
      title: 'Novo Benefício',
      description: 'Descrição do benefício',
      icon: 'check'
    };
    setBenefits([...benefits, newBenefit]);
  };

  const removeBenefit = (id: string) => {
    setBenefits(benefits.filter(benefit => benefit.id !== id));
  };

  const updateBenefit = (id: string, updates: Partial<Benefit>) => {
    setBenefits(benefits.map(benefit => 
      benefit.id === id ? { ...benefit, ...updates } : benefit
    ));
  };

  const saveChanges = () => {
    setIsEditing(false);
    if (onUpdate) {
      onUpdate({
        content: {
          ...element.content,
          benefits,
        },
      });
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setBenefits(element.content?.benefits || []);
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
          Editar Benefícios
        </div>
        
        {benefits.map((benefit) => (
          <div key={benefit.id} style={{ 
            marginBottom: '1rem', 
            padding: '1rem', 
            background: 'white', 
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <select
                value={benefit.icon}
                onChange={(e) => updateBenefit(benefit.id, { icon: e.target.value as Benefit['icon'] })}
                style={{
                  padding: '0.25rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem'
                }}
              >
                <option value="check">Check</option>
                <option value="star">Star</option>
                <option value="zap">Zap</option>
                <option value="heart">Heart</option>
                <option value="trophy">Trophy</option>
                <option value="shield">Shield</option>
              </select>
              
              <input
                type="text"
                value={benefit.title}
                onChange={(e) => updateBenefit(benefit.id, { title: e.target.value })}
                placeholder="Título do benefício"
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem'
                }}
              />
              
              <button
                onClick={() => removeBenefit(benefit.id)}
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
              value={benefit.description}
              onChange={(e) => updateBenefit(benefit.id, { description: e.target.value })}
              placeholder="Descrição do benefício"
              rows={2}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.25rem',
                fontSize: '0.875rem',
                resize: 'vertical' as const
              }}
            />
          </div>
        ))}
        
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            onClick={addBenefit}
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
      data-element-type="benefits"
      data-selected={isSelected}
    >
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: theme.spacing?.md || '1.5rem' 
      }}>
        {benefits.map((benefit) => {
          const IconComponent = iconMap[benefit.icon];
          
          return (
            <div
              key={benefit.id}
              style={{
                padding: theme.spacing?.md || '1.5rem',
                backgroundColor: element.styles.cardBackgroundColor || 'rgba(255, 255, 255, 0.1)',
                borderRadius: theme.borderRadius?.md || '0.375rem',
                textAlign: 'center' as const,
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              <div style={{
                width: '60px',
                height: '60px',
                margin: '0 auto 1rem',
                backgroundColor: element.styles.iconBackgroundColor || theme.colors?.primary || '#3b82f6',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <IconComponent 
                  size={24} 
                  color={element.styles.iconColor || '#ffffff'} 
                />
              </div>
              
              <h3 style={{
                fontSize: element.styles.titleFontSize || theme.typography?.fontSize?.lg || '1.125rem',
                fontWeight: element.styles.titleFontWeight || '600',
                color: element.styles.titleColor || theme.colors?.text || '#1f2937',
                marginBottom: theme.spacing?.sm || '1rem',
                margin: `0 0 ${theme.spacing?.sm || '1rem'} 0`
              }}>
                {benefit.title}
              </h3>
              
              <p style={{
                fontSize: element.styles.descriptionFontSize || theme.typography?.fontSize?.base || '1rem',
                color: element.styles.descriptionColor || theme.colors?.text || '#4b5563',
                lineHeight: '1.6',
                margin: '0'
              }}>
                {benefit.description}
              </p>
            </div>
          );
        })}
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
          <Star size={12} />
          Duplo-clique para editar
        </div>
      )}
    </div>
  );
}