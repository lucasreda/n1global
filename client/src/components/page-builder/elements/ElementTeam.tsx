import { ElementProps } from './types';
import { useState } from 'react';
import { Plus, X, Star, User } from 'lucide-react';

type TeamMember = {
  id: string;
  name: string;
  position: string;
  bio: string;
  image: string;
};

export function ElementTeam({ 
  element, 
  theme, 
  editorMode = false, 
  onUpdate, 
  onSelect, 
  isSelected = false 
}: ElementProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>(
    element.content?.members || [
      {
        id: '1',
        name: 'João Silva',
        position: 'CEO & Fundador',
        bio: 'Especialista em estratégia digital com mais de 10 anos de experiência',
        image: 'https://via.placeholder.com/200x200?text=João'
      },
      {
        id: '2',
        name: 'Maria Santos',
        position: 'CTO',
        bio: 'Desenvolvedora sênior apaixonada por tecnologias inovadoras',
        image: 'https://via.placeholder.com/200x200?text=Maria'
      },
      {
        id: '3',
        name: 'Pedro Costa',
        position: 'Designer',
        bio: 'Designer criativo focado em experiência do usuário e interfaces intuitivas',
        image: 'https://via.placeholder.com/200x200?text=Pedro'
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

  const addMember = () => {
    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: 'Novo Membro',
      position: 'Cargo',
      bio: 'Breve descrição do membro da equipe',
      image: 'https://via.placeholder.com/200x200?text=Novo+Membro'
    };
    setMembers([...members, newMember]);
  };

  const removeMember = (id: string) => {
    setMembers(members.filter(member => member.id !== id));
  };

  const updateMember = (id: string, updates: Partial<TeamMember>) => {
    setMembers(members.map(member => 
      member.id === id ? { ...member, ...updates } : member
    ));
  };

  const saveChanges = () => {
    setIsEditing(false);
    if (onUpdate) {
      onUpdate({
        content: {
          ...element.content,
          members,
        },
      });
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setMembers(element.content?.members || []);
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
        data-element-type="team"
        data-selected={isSelected}
      >
        <h3 style={{ 
          textAlign: 'center', 
          marginBottom: '2rem',
          fontSize: '1.5rem',
          fontWeight: '600',
          color: theme.colors.text
        }}>
          Editando Equipe
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {members.map((member, index) => (
            <div key={member.id} style={{
              padding: '1rem',
              border: '2px solid #3b82f6',
              borderRadius: '0.5rem',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={20} color="#3b82f6" />
                  <span>Membro {index + 1}</span>
                </div>
                <button
                  onClick={() => removeMember(member.id)}
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
                value={member.name}
                onChange={(e) => updateMember(member.id, { name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  margin: '0.25rem 0',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem'
                }}
                placeholder="Nome do membro"
              />
              
              <input
                type="text"
                value={member.position}
                onChange={(e) => updateMember(member.id, { position: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  margin: '0.25rem 0',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem'
                }}
                placeholder="Cargo/Posição"
              />
              
              <textarea
                value={member.bio}
                onChange={(e) => updateMember(member.id, { bio: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  margin: '0.25rem 0',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
                placeholder="Biografia/descrição"
              />
              
              <input
                type="url"
                value={member.image}
                onChange={(e) => updateMember(member.id, { image: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  margin: '0.25rem 0',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem'
                }}
                placeholder="URL da imagem"
              />
            </div>
          ))}
        </div>
        
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <button
            onClick={addMember}
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
            Adicionar Membro
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
      data-element-type="team"
      data-selected={isSelected}
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '2rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {members.map((member) => (
          <div key={member.id} style={{
            textAlign: 'center',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            backgroundColor: element.styles.backgroundColor === 'transparent' ? '#f8fafc' : 'rgba(255, 255, 255, 0.1)',
            transition: 'transform 0.2s',
          }}>
            <img
              src={member.image}
              alt={member.name}
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                objectFit: 'cover',
                margin: '0 auto 1rem auto',
                border: '4px solid #3b82f6'
              }}
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/120x120?text=' + encodeURIComponent(member.name);
              }}
            />
            <h4 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              margin: '0 0 0.5rem 0',
              color: theme.colors.text
            }}>
              {member.name}
            </h4>
            <p style={{
              fontSize: '1rem',
              fontWeight: '500',
              margin: '0 0 1rem 0',
              color: '#3b82f6'
            }}>
              {member.position}
            </p>
            <p style={{
              fontSize: '0.9rem',
              lineHeight: '1.6',
              margin: '0',
              color: theme.colors.muted,
              opacity: 0.8
            }}>
              {member.bio}
            </p>
          </div>
        ))}
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