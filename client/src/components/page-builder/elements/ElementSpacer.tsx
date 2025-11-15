import { ElementProps } from './types';

export function ElementSpacer({ 
  element, 
  theme, 
  editorMode = false, 
  onUpdate, 
  onSelect, 
  isSelected = false 
}: ElementProps) {
  const height = element.styles.height || '40px';
  
  const baseStyles = {
    height,
    width: element.styles.width || '100%',
    backgroundColor: editorMode ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
    border: editorMode ? '1px dashed #3b82f6' : 'none',
    outline: editorMode && isSelected ? '2px solid #3b82f6' : 'none',
    cursor: editorMode ? 'pointer' : 'default',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    color: '#6b7280',
  };

  return (
    <div
      style={baseStyles}
      onClick={() => {
        if (editorMode && onSelect) {
          onSelect();
        }
      }}
      data-testid={`element-${element.id}`}
      data-element-type="spacer"
      data-selected={isSelected}
    >
      {editorMode && `Espaçador (${height})`}
    </div>
  );
}