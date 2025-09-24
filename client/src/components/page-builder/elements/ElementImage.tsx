import { ElementProps } from './types';
import { useState } from 'react';
import { Upload } from 'lucide-react';

export function ElementImage({ 
  element, 
  theme, 
  editorMode = false, 
  onUpdate, 
  onSelect, 
  isSelected = false 
}: ElementProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleClick = () => {
    if (editorMode && onSelect) {
      onSelect();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdate) return;

    setIsUploading(true);
    
    // Create a URL for the uploaded file (in real implementation, upload to storage)
    const imageUrl = URL.createObjectURL(file);
    
    onUpdate({
      content: {
        ...element.content,
        src: imageUrl,
        alt: file.name,
      },
    });
    
    setIsUploading(false);
  };

  const baseStyles = {
    ...element.styles,
    maxWidth: element.styles.width || '100%',
    height: element.styles.height || 'auto',
    borderRadius: element.styles.borderRadius || theme.borderRadius?.sm || '0.25rem',
    border: element.styles.border || 'none',
    outline: editorMode && isSelected ? '2px solid #3b82f6' : 'none',
    cursor: editorMode ? 'pointer' : 'default',
    display: 'block',
  };

  const imageSrc = element.content?.src || 'https://via.placeholder.com/400x200?text=Clique+para+adicionar+imagem';
  const imageAlt = element.content?.alt || 'Imagem';

  return (
    <div
      onClick={handleClick}
      data-testid={`element-${element.id}`}
      data-element-type="image"
      data-selected={isSelected}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <img
        src={imageSrc}
        alt={imageAlt}
        style={baseStyles}
        onError={(e) => {
          // Fallback to placeholder if image fails to load
          e.currentTarget.src = 'https://via.placeholder.com/400x200?text=Imagem+n%C3%A3o+encontrada';
        }}
      />
      
      {editorMode && isSelected && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '0.5rem',
            borderRadius: '0.25rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.stopPropagation();
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
              const target = e.target as HTMLInputElement;
              handleImageUpload({ target } as React.ChangeEvent<HTMLInputElement>);
            };
            input.click();
          }}
        >
          <Upload size={16} />
          {isUploading ? 'Carregando...' : 'Alterar Imagem'}
        </div>
      )}
    </div>
  );
}