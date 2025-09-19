import { ElementProps } from './types';

export function ElementDivider({ 
  element, 
  theme, 
  editorMode = false, 
  onUpdate, 
  onSelect, 
  isSelected = false 
}: ElementProps) {
  const baseStyles = {
    ...element.styles,
    height: element.styles.height || '1px',
    width: element.styles.width || '100%',
    backgroundColor: element.styles.backgroundColor || theme.colors.muted,
    border: 'none',
    margin: element.styles.margin || `${theme.spacing.md} 0`,
    outline: editorMode && isSelected ? '2px solid #3b82f6' : 'none',
    cursor: editorMode ? 'pointer' : 'default',
  };

  return (
    <hr
      style={baseStyles}
      onClick={() => {
        if (editorMode && onSelect) {
          onSelect();
        }
      }}
      data-testid={`element-${element.id}`}
      data-element-type="divider"
      data-selected={isSelected}
    />
  );
}