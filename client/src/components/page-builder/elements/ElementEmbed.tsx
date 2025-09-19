import { ElementProps } from './types';
import { useState } from 'react';
import { Code } from 'lucide-react';

export function ElementEmbed({ 
  element, 
  theme, 
  editorMode = false, 
  onUpdate, 
  onSelect, 
  isSelected = false 
}: ElementProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [html, setHtml] = useState(element.content?.html || '');

  const handleDoubleClick = () => {
    if (editorMode) {
      setIsEditing(true);
    }
  };

  const handleSubmit = () => {
    setIsEditing(false);
    if (html !== element.content?.html && onUpdate) {
      onUpdate({
        content: {
          ...element.content,
          html,
        },
      });
    }
  };

  const baseStyles = {
    ...element.styles,
    outline: editorMode && isSelected ? '2px solid #3b82f6' : 'none',
    cursor: editorMode ? 'pointer' : 'default',
  };

  if (editorMode && isEditing) {
    return (
      <div style={{ ...baseStyles, padding: '1rem', background: '#f8fafc', border: '2px dashed #3b82f6' }}>
        <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>
          Cole seu código HTML/embed aqui:
        </div>
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsEditing(false);
              setHtml(element.content?.html || '');
            }
          }}
          onBlur={handleSubmit}
          placeholder="<iframe src='...'></iframe>"
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.25rem',
            fontSize: '0.875rem',
            fontFamily: 'monospace',
            resize: 'vertical',
          }}
          autoFocus
        />
        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
          Pressione Esc para cancelar ou clique fora para salvar
        </div>
      </div>
    );
  }

  if (!element.content?.html || element.content.html === '') {
    return (
      <div
        style={{
          ...baseStyles,
          background: '#f3f4f6',
          padding: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '0.5rem',
          color: '#6b7280',
          border: editorMode ? '2px dashed #d1d5db' : 'none',
          borderRadius: theme.borderRadius.md,
        }}
        onClick={() => {
          if (editorMode && onSelect) {
            onSelect();
          }
        }}
        onDoubleClick={handleDoubleClick}
        data-testid={`element-${element.id}`}
        data-element-type="embed"
        data-selected={isSelected}
      >
        <Code size={32} />
        <span style={{ fontSize: '0.875rem' }}>
          {editorMode ? 'Clique duas vezes para adicionar código embed' : 'Código embed'}
        </span>
      </div>
    );
  }

  return (
    <div
      style={baseStyles}
      onClick={() => {
        if (editorMode && onSelect) {
          onSelect();
        }
      }}
      onDoubleClick={handleDoubleClick}
      data-testid={`element-${element.id}`}
      data-element-type="embed"
      data-selected={isSelected}
      dangerouslySetInnerHTML={{ 
        __html: element.content.html 
      }}
    />
  );
}