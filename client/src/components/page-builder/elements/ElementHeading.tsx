import { ElementProps } from './types';
import { useState, useRef, useEffect } from 'react';

export function ElementHeading({ 
  element, 
  theme, 
  editorMode = false, 
  onUpdate, 
  onSelect, 
  isSelected = false 
}: ElementProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(element.content?.text || 'Título');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const headingLevel = element.props.level || 'h2';
  const HeadingComponent = headingLevel as keyof JSX.IntrinsicElements;

  // Update text when element content changes
  useEffect(() => {
    setText(element.content?.text || 'Título');
  }, [element.content?.text]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
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
        },
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
      setText(element.content?.text || 'Título');
    }
  };

  const baseStyles = {
    ...element.styles,
    fontFamily: theme.typography?.headingFont || 'Inter, sans-serif',
    fontSize: getHeadingSize(headingLevel, theme),
    fontWeight: element.styles.fontWeight || '600',
    color: element.styles.color || theme.colors?.text || '#1e293b',
    textAlign: element.styles.textAlign || 'left',
    padding: element.styles.padding || '0',
    margin: element.styles.margin || '0',
    backgroundColor: element.styles.backgroundColor || 'transparent',
    borderRadius: element.styles.borderRadius || theme.borderRadius?.sm || '0.25rem',
    border: element.styles.border || 'none',
    width: element.styles.width || 'auto',
    outline: editorMode && isSelected ? '2px solid #3b82f6' : 'none',
    cursor: editorMode ? 'pointer' : 'default',
  };

  if (editorMode && isEditing) {
    return (
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
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
          minHeight: '1.5em',
        }}
        data-testid={`element-${element.id}-editor`}
      />
    );
  }

  return (
    <HeadingComponent
      style={baseStyles}
      onClick={() => {
        if (editorMode && onSelect) {
          onSelect();
        }
      }}
      onDoubleClick={handleDoubleClick}
      data-testid={`element-${element.id}`}
      data-element-type="heading"
      data-selected={isSelected}
    >
      {text}
    </HeadingComponent>
  );
}

// Helper function to get heading sizes based on level
function getHeadingSize(level: string, theme: any): string {
  const sizes = {
    h1: theme.typography.fontSize['4xl'] || '2.25rem',
    h2: theme.typography.fontSize['3xl'] || '1.875rem',
    h3: theme.typography.fontSize['2xl'] || '1.5rem',
    h4: theme.typography.fontSize.xl || '1.25rem',
    h5: theme.typography.fontSize.lg || '1.125rem',
    h6: theme.typography.fontSize.base || '1rem',
  };
  
  return sizes[level as keyof typeof sizes] || theme.typography.fontSize['2xl'] || '1.5rem';
}