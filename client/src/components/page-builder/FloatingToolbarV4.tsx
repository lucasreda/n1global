import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  Underline, 
  Type, 
  Palette, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  AlignJustify,
  Settings,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Link
} from 'lucide-react';
import { PageNodeV4 } from '@shared/schema';

interface FloatingToolbarV4Props {
  node: PageNodeV4 | null;
  position: { x: number; y: number } | null;
  breakpoint: 'desktop' | 'tablet' | 'mobile';
  onUpdateNode: (updates: Partial<PageNodeV4>) => void;
  onDeleteNode: () => void;
  onDuplicateNode: () => void;
  onMoveNode: (direction: 'up' | 'down') => void;
  onOpenPropertiesPanel?: () => void;
}

export function FloatingToolbarV4({ 
  node, 
  position, 
  breakpoint,
  onUpdateNode,
  onDeleteNode,
  onDuplicateNode,
  onMoveNode,
  onOpenPropertiesPanel
}: FloatingToolbarV4Props) {
  const [isVisible, setIsVisible] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsVisible(!!node && !!position);
  }, [node, position]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        const nodeElement = document.querySelector(`[data-node-id="${node?.id}"]`);
        if (!nodeElement?.contains(event.target as Node)) {
          setIsVisible(false);
        }
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, node?.id]);

  if (!isVisible || !node || !position) {
    return null;
  }

  const currentStyles = node.styles?.[breakpoint] || {};
  const hasTextContent = node.textContent !== undefined;

  const handleToggleFormat = (format: 'bold' | 'italic' | 'underline') => {
    const formatMap = {
      bold: 'fontWeight',
      italic: 'fontStyle',
      underline: 'textDecoration',
    } as const;

    const valueMap = {
      bold: currentStyles.fontWeight === '700' ? '400' : '700',
      italic: currentStyles.fontStyle === 'italic' ? 'normal' : 'italic',
      underline: currentStyles.textDecoration === 'underline' ? 'none' : 'underline',
    };

    const property = formatMap[format];
    const value = valueMap[format];

    onUpdateNode({
      styles: {
        ...node.styles,
        [breakpoint]: {
          ...currentStyles,
          [property]: value,
        },
      },
    });
  };

  const handleAlignText = (alignment: 'left' | 'center' | 'right' | 'justify') => {
    onUpdateNode({
      styles: {
        ...node.styles,
        [breakpoint]: {
          ...currentStyles,
          textAlign: alignment,
        },
      },
    });
  };

  const handleAddLink = () => {
    const url = prompt('Enter URL:', node.attributes?.href || '');
    if (url !== null) {
      onUpdateNode({
        attributes: {
          ...node.attributes,
          href: url,
        },
      });
    }
  };

  return createPortal(
    <div 
      ref={toolbarRef}
      className="fixed z-[9999] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl px-2 py-1.5 flex items-center gap-0.5"
      style={{
        left: position.x,
        top: position.y - 50,
        transform: 'translateX(-50%)',
      }}
      data-testid="floating-toolbar-v4"
    >
      {/* Text Formatting (only for text elements) */}
      {hasTextContent && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${currentStyles.fontWeight === '700' ? 'bg-accent' : ''}`}
            onClick={() => handleToggleFormat('bold')}
            data-testid="button-format-bold-v4"
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${currentStyles.fontStyle === 'italic' ? 'bg-accent' : ''}`}
            onClick={() => handleToggleFormat('italic')}
            data-testid="button-format-italic-v4"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${currentStyles.textDecoration === 'underline' ? 'bg-accent' : ''}`}
            onClick={() => handleToggleFormat('underline')}
            data-testid="button-format-underline-v4"
            title="Underline"
          >
            <Underline className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
        </>
      )}

      {/* Text Alignment */}
      {hasTextContent && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${currentStyles.textAlign === 'left' ? 'bg-accent' : ''}`}
            onClick={() => handleAlignText('left')}
            data-testid="button-align-left-v4"
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${currentStyles.textAlign === 'center' ? 'bg-accent' : ''}`}
            onClick={() => handleAlignText('center')}
            data-testid="button-align-center-v4"
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${currentStyles.textAlign === 'right' ? 'bg-accent' : ''}`}
            onClick={() => handleAlignText('right')}
            data-testid="button-align-right-v4"
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${currentStyles.textAlign === 'justify' ? 'bg-accent' : ''}`}
            onClick={() => handleAlignText('justify')}
            data-testid="button-align-justify-v4"
            title="Justify"
          >
            <AlignJustify className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
        </>
      )}

      {/* Quick Style Access */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onOpenPropertiesPanel}
        title="Typography"
        data-testid="button-typography-v4"
      >
        <Type className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onOpenPropertiesPanel}
        title="Colors"
        data-testid="button-colors-v4"
      >
        <Palette className="w-4 h-4" />
      </Button>

      {/* Link */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={handleAddLink}
        title="Add Link"
        data-testid="button-link-v4"
      >
        <Link className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Element Actions */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onMoveNode('up')}
        title="Move Up"
        data-testid="button-move-up-v4"
      >
        <ArrowUp className="w-4 h-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onMoveNode('down')}
        title="Move Down"
        data-testid="button-move-down-v4"
      >
        <ArrowDown className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onDuplicateNode}
        title="Duplicate"
        data-testid="button-duplicate-v4"
      >
        <Copy className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        onClick={onDeleteNode}
        title="Delete"
        data-testid="button-delete-v4"
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onOpenPropertiesPanel}
        title="Properties Panel"
        data-testid="button-settings-v4"
      >
        <Settings className="w-4 h-4" />
      </Button>
    </div>,
    document.body
  );
}

// Helper function to calculate optimal toolbar position
export function calculateToolbarPositionV4(
  elementRect: DOMRect, 
  toolbarWidth: number = 400
): { x: number; y: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Default position: centered above the element
  let x = elementRect.left + elementRect.width / 2;
  let y = elementRect.top;
  
  // Adjust horizontal position to keep toolbar in viewport
  const halfToolbarWidth = toolbarWidth / 2;
  if (x - halfToolbarWidth < 10) {
    x = halfToolbarWidth + 10;
  } else if (x + halfToolbarWidth > viewportWidth - 10) {
    x = viewportWidth - halfToolbarWidth - 10;
  }
  
  // If not enough space above, position below
  if (y < 60) {
    y = elementRect.bottom + 10;
  }
  
  // Ensure toolbar doesn't go off bottom of viewport
  if (y + 60 > viewportHeight) {
    y = Math.max(10, viewportHeight - 70);
  }
  
  return { x, y };
}
