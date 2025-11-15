import { ElementProps } from './types';
import { useState } from 'react';
import { Plus, X, Star, Check, Zap, Heart, Trophy, Shield, Sparkles } from 'lucide-react';

type Feature = {
  id: string;
  title: string;
  description: string;
  icon: 'check' | 'star' | 'zap' | 'heart' | 'trophy' | 'shield' | 'sparkles';
};

const iconMap = {
  check: Check,
  star: Star,
  zap: Zap,
  heart: Heart,
  trophy: Trophy,
  shield: Shield,
  sparkles: Sparkles,
};

export function ElementFeatures({ 
  element, 
  theme, 
  editorMode = false, 
  onUpdate, 
  onSelect, 
  isSelected = false 
}: ElementProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [features, setFeatures] = useState<Feature[]>(
    element.content?.features || [
      {
        id: '1',
        title: 'Funcionalidade 1',
        description: 'Descrição da primeira funcionalidade',
        icon: 'star' as const
      },
      {
        id: '2',
        title: 'Funcionalidade 2',
        description: 'Descrição da segunda funcionalidade',
        icon: 'zap' as const
      },
      {
        id: '3',
        title: 'Funcionalidade 3',
        description: 'Descrição da terceira funcionalidade',
        icon: 'trophy' as const
      },
      {
        id: '4',
        title: 'Funcionalidade 4',
        description: 'Descrição da quarta funcionalidade',
        icon: 'shield' as const
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

  const addFeature = () => {
    const newFeature: Feature = {
      id: Date.now().toString(),
      title: 'Nova Funcionalidade',
      description: 'Descrição da funcionalidade',
      icon: 'star'
    };
    setFeatures([...features, newFeature]);
  };

  const removeFeature = (id: string) => {
    setFeatures(features.filter(feature => feature.id !== id));
  };

  const updateFeature = (id: string, updates: Partial<Feature>) => {
    setFeatures(features.map(feature => 
      feature.id === id ? { ...feature, ...updates } : feature
    ));
  };

  const saveChanges = () => {
    setIsEditing(false);
    if (onUpdate) {
      onUpdate({
        content: {
          ...element.content,
          features,
        },
      });
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setFeatures(element.content?.features || []);
  };

  const baseStyles = {
    ...element.styles,
    fontFamily: theme.typography.bodyFont,
    padding: element.styles.padding || '3rem 2rem',
    backgroundColor: element.styles.backgroundColor || 'transparent',
    borderRadius: element.styles.borderRadius || theme.borderRadius.sm,
    outline: editorMode && isSelected ? '2px solid #3b82f6' : 'none',
    cursor: editorMode ? 'pointer' : 'default',
    position: 'relative' as const,
  };

  if (editorMode && isEditing) {
    return (
      <div
        style={baseStyles}
        data-testid={`element-${element.id}`}
        data-element-type="features"
        data-selected={isSelected}
      >
        <h3 style={{ 
          textAlign: 'center', 
          marginBottom: '2rem',
          fontSize: '1.5rem',
          fontWeight: '600',
          color: theme.colors.text
        }}>
          Editando Funcionalidades
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {features.map((feature, index) => {
            const IconComponent = iconMap[feature.icon];
            return (
              <div key={feature.id} style={{
                padding: '1rem',
                border: '2px solid #3b82f6',
                borderRadius: '0.5rem',
                backgroundColor: '#f8fafc'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <IconComponent size={20} color="#3b82f6" />
                    <span>Funcionalidade {index + 1}</span>
                  </div>
                  <button
                    onClick={() => removeFeature(feature.id)}
                    style={{
                      padding: '0.25rem',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
                
                <input
                  type="text"
                  value={feature.title}
                  onChange={(e) => updateFeature(feature.id, { title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    margin: '0.25rem 0',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem'
                  }}
                  placeholder="Título da funcionalidade"
                />
                
                <textarea
                  value={feature.description}
                  onChange={(e) => updateFeature(feature.id, { description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    margin: '0.25rem 0',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    minHeight: '60px',
                    resize: 'vertical'
                  }}
                  placeholder="Descrição da funcionalidade"
                />
                
                <select
                  value={feature.icon}
                  onChange={(e) => updateFeature(feature.id, { icon: e.target.value as Feature['icon'] })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    margin: '0.25rem 0',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="star">Estrela</option>
                  <option value="zap">Raio</option>
                  <option value="check">Check</option>
                  <option value="heart">Coração</option>
                  <option value="trophy">Troféu</option>
                  <option value="shield">Escudo</option>
                  <option value="sparkles">Brilho</option>
                </select>
              </div>
            );
          })}
        </div>
        
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <button
            onClick={addFeature}
            style={{
              padding: '0.5rem 1rem',
              margin: '0.5rem',
              fontSize: '0.875rem',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <Plus size={16} />
            Adicionar Funcionalidade
          </button>
        </div>
        
        <div style={{ textAlign: 'center' }}>
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
    );
  }

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={baseStyles}
      data-testid={`element-${element.id}`}
      data-element-type="features"
      data-selected={isSelected}
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '2rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {features.map((feature) => {
          const IconComponent = iconMap[feature.icon];
          return (
            <div key={feature.id} style={{
              textAlign: 'center',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              backgroundColor: element.styles.backgroundColor === 'transparent' ? '#f8fafc' : 'rgba(255, 255, 255, 0.1)',
              transition: 'transform 0.2s',
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '60px',
                height: '60px',
                backgroundColor: '#3b82f6',
                borderRadius: '50%',
                marginBottom: '1rem'
              }}>
                <IconComponent size={28} color="#ffffff" />
              </div>
              <h4 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                margin: '0 0 0.75rem 0',
                color: theme.colors.text
              }}>
                {feature.title}
              </h4>
              <p style={{
                fontSize: '0.95rem',
                lineHeight: '1.6',
                margin: '0',
                color: theme.colors.muted,
                opacity: 0.8
              }}>
                {feature.description}
              </p>
            </div>
          );
        })}
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