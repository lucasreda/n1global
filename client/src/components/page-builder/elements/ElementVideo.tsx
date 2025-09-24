import { ElementProps } from './types';
import { useState } from 'react';
import { Video, ExternalLink } from 'lucide-react';

export function ElementVideo({ 
  element, 
  theme, 
  editorMode = false, 
  onUpdate, 
  onSelect, 
  isSelected = false 
}: ElementProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [url, setUrl] = useState(element.content?.src || '');

  const handleDoubleClick = () => {
    if (editorMode) {
      setIsEditing(true);
    }
  };

  const handleUrlSubmit = () => {
    setIsEditing(false);
    if (url !== element.content?.src && onUpdate) {
      onUpdate({
        content: {
          ...element.content,
          src: url,
        },
      });
    }
  };

  const baseStyles = {
    ...element.styles,
    width: element.styles.width || '100%',
    borderRadius: element.styles.borderRadius || theme.borderRadius?.sm || '0.25rem',
    outline: editorMode && isSelected ? '2px solid #3b82f6' : 'none',
    cursor: editorMode ? 'pointer' : 'default',
  };

  if (editorMode && isEditing) {
    return (
      <div style={{ ...baseStyles, padding: '1rem', background: '#f8fafc', border: '2px dashed #3b82f6' }}>
        <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>
          Cole a URL do vídeo (YouTube, Vimeo, etc.)
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleUrlSubmit();
            }
            if (e.key === 'Escape') {
              setIsEditing(false);
              setUrl(element.content?.src || '');
            }
          }}
          onBlur={handleUrlSubmit}
          placeholder="https://www.youtube.com/watch?v=..."
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.25rem',
            fontSize: '0.875rem',
          }}
          autoFocus
        />
      </div>
    );
  }

  if (!element.content?.src || element.content.src === '') {
    return (
      <div
        style={{
          ...baseStyles,
          aspectRatio: '16 / 9',
          background: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '0.5rem',
          color: '#6b7280',
          border: editorMode ? '2px dashed #d1d5db' : 'none',
        }}
        onClick={() => {
          if (editorMode && onSelect) {
            onSelect();
          }
        }}
        onDoubleClick={handleDoubleClick}
        data-testid={`element-${element.id}`}
        data-element-type="video"
        data-selected={isSelected}
      >
        <Video size={32} />
        <span style={{ fontSize: '0.875rem' }}>
          {editorMode ? 'Clique duas vezes para adicionar vídeo' : 'Vídeo'}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        ...baseStyles,
        position: 'relative',
        paddingBottom: '56.25%', // 16:9 aspect ratio
        height: 0,
        overflow: 'hidden',
      }}
      onClick={() => {
        if (editorMode && onSelect) {
          onSelect();
        }
      }}
      onDoubleClick={handleDoubleClick}
      data-testid={`element-${element.id}`}
      data-element-type="video"
      data-selected={isSelected}
    >
      <iframe
        src={element.content.src}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        allowFullScreen
        title={element.content?.alt || 'Vídeo'}
      />
      {editorMode && (
        <div
          style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '0.25rem',
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <ExternalLink size={12} />
          Editar
        </div>
      )}
    </div>
  );
}