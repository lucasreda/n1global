import { ElementProps } from './types';
import { useState, useRef, useEffect } from 'react';

export function ElementText({ 
  element, 
  theme, 
  editorMode = false, 
  onUpdate, 
  onSelect, 
  isSelected = false 
}: ElementProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(element.content?.text || 'Texto aqui...');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Auto-resize textarea
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

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
          html: `<p>${text}</p>`, // Simple HTML conversion
        },
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      setText(element.content?.text || 'Texto aqui...');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const baseStyles = {
    ...element.styles,
    fontFamily: theme.typography?.bodyFont || 'Inter, sans-serif',
    fontSize: element.styles.fontSize || theme.typography?.fontSize?.base || '1rem',
    fontWeight: element.styles.fontWeight || 'normal',
    color: element.styles.color || theme.colors?.text || '#1e293b',
    textAlign: element.styles.textAlign || 'left',
    padding: element.styles.padding || '0',
    margin: element.styles.margin || '0',
    backgroundColor: element.styles.backgroundColor || 'transparent',
    borderRadius: element.styles.borderRadius || theme.borderRadius?.sm || '0.25rem',
    border: element.styles.border || 'none',
    width: element.styles.width || 'auto',
    lineHeight: '1.6',
    outline: editorMode && isSelected ? '2px solid #3b82f6' : 'none',
    cursor: editorMode ? 'pointer' : 'default',
  };

  if (editorMode && isEditing) {
    return (
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          ...baseStyles,
          border: '2px solid #3b82f6',
          outline: 'none',
          resize: 'none',
          overflow: 'hidden',
          background: 'white',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          fontWeight: 'inherit',
          width: '100%',
          minHeight: '3em',
        }}
        data-testid={`element-${element.id}-editor`}
        placeholder="Digite seu texto aqui..."
      />
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
      data-element-type="text"
      data-selected={isSelected}
      dangerouslySetInnerHTML={{ 
        __html: element.content?.html || element.content?.text || 'Texto aqui...' 
      }}
    />
  );
}