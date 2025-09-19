import { ElementProps } from './types';
import { useState } from 'react';

export function ElementForm({ 
  element, 
  theme, 
  editorMode = false, 
  onUpdate, 
  onSelect, 
  isSelected = false 
}: ElementProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [placeholder, setPlaceholder] = useState(element.content?.placeholder || 'Digite seu email...');
  const [buttonText, setButtonText] = useState(element.content?.text || 'Enviar');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editorMode) {
      return; // Don't submit in editor mode
    }
    // Handle form submission in real implementation
    console.log('Form submitted');
  };

  const baseStyles = {
    ...element.styles,
    backgroundColor: element.styles.backgroundColor || '#f8fafc',
    padding: element.styles.padding || '1.5rem',
    borderRadius: element.styles.borderRadius || theme.borderRadius.md,
    border: element.styles.border || '1px solid #e2e8f0',
    outline: editorMode && isSelected ? '2px solid #3b82f6' : 'none',
    cursor: editorMode ? 'pointer' : 'default',
  };

  return (
    <form
      style={baseStyles}
      onSubmit={handleSubmit}
      onClick={() => {
        if (editorMode && onSelect) {
          onSelect();
        }
      }}
      onDoubleClick={() => {
        if (editorMode) {
          setIsEditing(true);
        }
      }}
      data-testid={`element-${element.id}`}
      data-element-type="form"
      data-selected={isSelected}
    >
      {editorMode && isEditing ? (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>
            Placeholder do input:
          </label>
          <input
            type="text"
            value={placeholder}
            onChange={(e) => setPlaceholder(e.target.value)}
            onBlur={() => {
              setIsEditing(false);
              if (onUpdate) {
                onUpdate({
                  content: {
                    ...element.content,
                    placeholder,
                    text: buttonText,
                  },
                });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setIsEditing(false);
                if (onUpdate) {
                  onUpdate({
                    content: {
                      ...element.content,
                      placeholder,
                      text: buttonText,
                    },
                  });
                }
              }
            }}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              fontSize: '0.875rem',
            }}
            autoFocus
          />
          <label style={{ display: 'block', marginTop: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>
            Texto do botão:
          </label>
          <input
            type="text"
            value={buttonText}
            onChange={(e) => setButtonText(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              fontSize: '0.875rem',
            }}
          />
        </div>
      ) : (
        <>
          <input
            type="email"
            placeholder={placeholder}
            style={{
              width: '100%',
              padding: theme.spacing.sm,
              marginBottom: theme.spacing.sm,
              border: `1px solid ${theme.colors.muted}`,
              borderRadius: theme.borderRadius.sm,
              fontSize: theme.typography.fontSize.base,
              outline: 'none',
            }}
            onClick={(e) => {
              if (editorMode) {
                e.preventDefault();
              }
            }}
          />
          <button
            type="submit"
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: theme.colors.primary,
              color: '#ffffff',
              border: 'none',
              borderRadius: theme.borderRadius.sm,
              cursor: editorMode ? 'pointer' : 'pointer',
              fontWeight: '500',
              fontSize: theme.typography.fontSize.base,
            }}
            onClick={(e) => {
              if (editorMode) {
                e.preventDefault();
              }
            }}
          >
            {buttonText}
          </button>
        </>
      )}
    </form>
  );
}