import { ElementProps } from './types';
import { useState } from 'react';

export function ElementButton({ 
  element, 
  theme, 
  editorMode = false, 
  onUpdate, 
  onSelect, 
  isSelected = false 
}: ElementProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(element.content?.text || 'Botão');

  const handleDoubleClick = () => {
    if (editorMode) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (text !== element.content?.text && onUpdate) {
      onUpdate({
        content: {
          ...element.content,
          text,
        },
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditing(false);
      if (text !== element.content?.text && onUpdate) {
        onUpdate({
          content: {
            ...element.content,
            text,
          },
        });
      }
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setText(element.content?.text || 'Botão');
    }
  };

  const handleClick = () => {
    if (editorMode) {
      if (onSelect) {
        onSelect();
      }
    } else if (element.content?.href) {
      window.open(element.content.href, '_blank');
    }
  };

  const baseStyles = {
    ...element.styles,
    display: 'inline-block',
    fontFamily: theme.typography.bodyFont,
    fontSize: element.styles.fontSize || theme.typography.fontSize.base,
    fontWeight: element.styles.fontWeight || '500',
    color: element.styles.color || '#ffffff',
    textAlign: element.styles.textAlign || 'center',
    padding: element.styles.padding || `${theme.spacing.sm} ${theme.spacing.md}`,
    margin: element.styles.margin || '0',
    backgroundColor: element.styles.backgroundColor || theme.colors.primary,
    borderRadius: element.styles.borderRadius || theme.borderRadius.md,
    border: element.styles.border || 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    outline: editorMode && isSelected ? '2px solid #3b82f6' : 'none',
    transition: 'all 0.2s ease',
  };

  if (editorMode && isEditing) {
    return (
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          ...baseStyles,
          border: '2px solid #3b82f6',
          outline: 'none',
          background: 'white',
          color: '#000',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          fontWeight: 'inherit',
          width: 'auto',
          minWidth: '100px',
        }}
        data-testid={`element-${element.id}-editor`}
        autoFocus
      />
    );
  }

  return (
    <button
      style={baseStyles}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={(e) => {
        if (!editorMode) {
          e.currentTarget.style.opacity = '0.9';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        if (!editorMode) {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
      data-testid={`element-${element.id}`}
      data-element-type="button"
      data-selected={isSelected}
    >
      {text}
    </button>
  );
}