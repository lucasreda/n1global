import { ElementProps } from './types';
import { useState } from 'react';
import { Star, Mail, Phone, MapPin, Clock } from 'lucide-react';

type ContactInfo = {
  email: string;
  phone: string;
  address: string;
  hours: string;
  title: string;
  description: string;
};

export function ElementContact({ 
  element, 
  theme, 
  editorMode = false, 
  onUpdate, 
  onSelect, 
  isSelected = false 
}: ElementProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [contactInfo, setContactInfo] = useState<ContactInfo>(
    element.content?.contactInfo || {
      email: 'contato@empresa.com',
      phone: '+55 11 9999-9999',
      address: 'Rua das Empresas, 123 - São Paulo, SP',
      hours: 'Segunda à Sexta: 9h às 18h',
      title: 'Entre em Contato',
      description: 'Estamos aqui para ajudar você. Entre em contato conosco através dos canais abaixo.'
    }
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

  const updateContactInfo = (field: keyof ContactInfo, value: string) => {
    setContactInfo(prev => ({ ...prev, [field]: value }));
  };

  const saveChanges = () => {
    setIsEditing(false);
    if (onUpdate) {
      onUpdate({
        content: {
          ...element.content,
          contactInfo,
        },
      });
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setContactInfo(element.content?.contactInfo || {
      email: 'contato@empresa.com',
      phone: '+55 11 9999-9999',
      address: 'Rua das Empresas, 123 - São Paulo, SP',
      hours: 'Segunda à Sexta: 9h às 18h',
      title: 'Entre em Contato',
      description: 'Estamos aqui para ajudar você. Entre em contato conosco através dos canais abaixo.'
    });
  };

  const baseStyles = {
    ...element.styles,
    fontFamily: theme.typography.bodyFont,
    padding: element.styles.padding || '3rem 2rem',
    backgroundColor: element.styles.backgroundColor || '#f8fafc',
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
        data-element-type="contact"
        data-selected={isSelected}
      >
        <h3 style={{ 
          textAlign: 'center', 
          marginBottom: '2rem',
          fontSize: '1.5rem',
          fontWeight: '600',
          color: theme.colors.text
        }}>
          Editando Informações de Contato
        </h3>
        
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '2rem',
          border: '2px solid #3b82f6',
          borderRadius: '0.5rem',
          backgroundColor: '#ffffff'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Título:</label>
            <input
              type="text"
              value={contactInfo.title}
              onChange={(e) => updateContactInfo('title', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.25rem',
                fontSize: '0.875rem'
              }}
              placeholder="Título da seção"
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Descrição:</label>
            <textarea
              value={contactInfo.description}
              onChange={(e) => updateContactInfo('description', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.25rem',
                fontSize: '0.875rem',
                minHeight: '80px',
                resize: 'vertical'
              }}
              placeholder="Descrição da seção"
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Email:</label>
            <input
              type="email"
              value={contactInfo.email}
              onChange={(e) => updateContactInfo('email', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.25rem',
                fontSize: '0.875rem'
              }}
              placeholder="contato@empresa.com"
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Telefone:</label>
            <input
              type="text"
              value={contactInfo.phone}
              onChange={(e) => updateContactInfo('phone', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.25rem',
                fontSize: '0.875rem'
              }}
              placeholder="+55 11 9999-9999"
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Endereço:</label>
            <input
              type="text"
              value={contactInfo.address}
              onChange={(e) => updateContactInfo('address', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.25rem',
                fontSize: '0.875rem'
              }}
              placeholder="Rua das Empresas, 123 - São Paulo, SP"
            />
          </div>
          
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Horário de funcionamento:</label>
            <input
              type="text"
              value={contactInfo.hours}
              onChange={(e) => updateContactInfo('hours', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.25rem',
                fontSize: '0.875rem'
              }}
              placeholder="Segunda à Sexta: 9h às 18h"
            />
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
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={baseStyles}
      data-testid={`element-${element.id}`}
      data-element-type="contact"
      data-selected={isSelected}
    >
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          margin: '0 0 1rem 0',
          color: theme.colors.text
        }}>
          {contactInfo.title}
        </h2>
        
        <p style={{
          fontSize: '1.1rem',
          lineHeight: '1.6',
          margin: '0 0 3rem 0',
          color: theme.colors.muted,
          opacity: 0.8,
          maxWidth: '600px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          {contactInfo.description}
        </p>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem',
          textAlign: 'left'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            padding: '1.5rem',
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'transform 0.2s'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              backgroundColor: '#3b82f6',
              borderRadius: '50%',
              flexShrink: 0
            }}>
              <Mail size={24} color="#ffffff" />
            </div>
            <div>
              <h4 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                margin: '0 0 0.5rem 0',
                color: theme.colors.text
              }}>
                Email
              </h4>
              <p style={{
                fontSize: '0.95rem',
                margin: '0',
                color: theme.colors.muted
              }}>
                {contactInfo.email}
              </p>
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            padding: '1.5rem',
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'transform 0.2s'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              backgroundColor: '#3b82f6',
              borderRadius: '50%',
              flexShrink: 0
            }}>
              <Phone size={24} color="#ffffff" />
            </div>
            <div>
              <h4 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                margin: '0 0 0.5rem 0',
                color: theme.colors.text
              }}>
                Telefone
              </h4>
              <p style={{
                fontSize: '0.95rem',
                margin: '0',
                color: theme.colors.muted
              }}>
                {contactInfo.phone}
              </p>
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            padding: '1.5rem',
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'transform 0.2s'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              backgroundColor: '#3b82f6',
              borderRadius: '50%',
              flexShrink: 0
            }}>
              <MapPin size={24} color="#ffffff" />
            </div>
            <div>
              <h4 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                margin: '0 0 0.5rem 0',
                color: theme.colors.text
              }}>
                Endereço
              </h4>
              <p style={{
                fontSize: '0.95rem',
                margin: '0',
                color: theme.colors.muted
              }}>
                {contactInfo.address}
              </p>
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            padding: '1.5rem',
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'transform 0.2s'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              backgroundColor: '#3b82f6',
              borderRadius: '50%',
              flexShrink: 0
            }}>
              <Clock size={24} color="#ffffff" />
            </div>
            <div>
              <h4 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                margin: '0 0 0.5rem 0',
                color: theme.colors.text
              }}>
                Horário
              </h4>
              <p style={{
                fontSize: '0.95rem',
                margin: '0',
                color: theme.colors.muted
              }}>
                {contactInfo.hours}
              </p>
            </div>
          </div>
        </div>
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