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
  Link,
  Settings,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { BlockElement } from '@shared/schema';

interface FloatingToolbarProps {
  element: BlockElement | null;
  position: { x: number; y: number } | null;
  onUpdateElement: (element: BlockElement) => void;
  onDeleteElement: () => void;
  onDuplicateElement: () => void;
  onMoveElement: (direction: 'up' | 'down') => void;
  onOpenStylePanel: () => void;
  onToggleFormat?: (format: 'bold' | 'italic' | 'underline') => void;
  onAlignText?: (alignment: 'left' | 'center' | 'right') => void;
}

export function FloatingToolbar({ 
  element, 
  position, 
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onMoveElement,
  onOpenStylePanel,
  onToggleFormat,
  onAlignText
}: FloatingToolbarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsVisible(!!element && !!position);
  }, [element, position]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        // Don't hide if clicking on the element itself
        const elementNode = document.querySelector(`[data-element-id="${element?.id}"]`);
        if (!elementNode?.contains(event.target as Node)) {
          setIsVisible(false);
        }
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, element?.id]);

  if (!isVisible || !element || !position) {
    return null;
  }

  const isTextElement = element.type === 'text' || element.type === 'heading';
  const isButtonElement = element.type === 'button';

  return createPortal(
    <div 
      ref={toolbarRef}
      className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg px-2 py-1 flex items-center gap-1"
      style={{
        left: position.x,
        top: position.y - 50, // Position above the element
        transform: 'translateX(-50%)',
      }}
      data-testid="floating-toolbar"
    >
      {/* Text Formatting Tools (for text/heading elements) */}
      {isTextElement && onToggleFormat && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onToggleFormat('bold')}
            data-testid="button-format-bold"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onToggleFormat('italic')}
            data-testid="button-format-italic"
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onToggleFormat('underline')}
            data-testid="button-format-underline"
          >
            <Underline className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
        </>
      )}

      {/* Text Alignment (for text/heading/button elements) */}
      {(isTextElement || isButtonElement) && onAlignText && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onAlignText('left')}
            data-testid="button-align-left"
          >
            <AlignLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onAlignText('center')}
            data-testid="button-align-center"
          >
            <AlignCenter className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onAlignText('right')}
            data-testid="button-align-right"
          >
            <AlignRight className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
        </>
      )}

      {/* Font Size Tool */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onOpenStylePanel()}
        title="Tamanho da fonte"
        data-testid="button-font-size"
      >
        <Type className="w-4 h-4" />
      </Button>

      {/* Color Tool */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onOpenStylePanel()}
        title="Cor"
        data-testid="button-color"
      >
        <Palette className="w-4 h-4" />
      </Button>

      {/* Link Tool (for text/button elements) */}
      {(isTextElement || isButtonElement) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => {
            const url = prompt('Digite a URL do link:', element.props?.href || '');
            if (url !== null) {
              onUpdateElement({
                ...element,
                props: { ...element.props, href: url }
              });
            }
          }}
          title="Adicionar link"
          data-testid="button-link"
        >
          <Link className="w-4 h-4" />
        </Button>
      )}

      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Element Actions */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onMoveElement('up')}
        title="Mover para cima"
        data-testid="button-move-up"
      >
        <ArrowUp className="w-4 h-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onMoveElement('down')}
        title="Mover para baixo"
        data-testid="button-move-down"
      >
        <ArrowDown className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onDuplicateElement}
        title="Duplicar elemento"
        data-testid="button-duplicate"
      >
        <Copy className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
        onClick={onDeleteElement}
        title="Excluir elemento"
        data-testid="button-delete"
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onOpenStylePanel}
        title="Configurações avançadas"
        data-testid="button-settings"
      >
        <Settings className="w-4 h-4" />
      </Button>
    </div>,
    document.body
  );
}

// Helper function to calculate optimal toolbar position
export function calculateToolbarPosition(
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

// Styles panel component for advanced styling options
interface StylesPanelProps {
  element: BlockElement;
  isOpen: boolean;
  onClose: () => void;
  onUpdateElement: (element: BlockElement) => void;
}

export function StylesPanel({ element, isOpen, onClose, onUpdateElement }: StylesPanelProps) {
  const [localStyles, setLocalStyles] = useState(element.styles || {});

  useEffect(() => {
    setLocalStyles(element.styles || {});
  }, [element.styles]);

  const updateStyle = (property: string, value: string) => {
    const newStyles = { ...localStyles, [property]: value };
    setLocalStyles(newStyles);
    onUpdateElement({ ...element, styles: newStyles });
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
      <div className="bg-white rounded-lg shadow-lg w-96 max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Estilos do Elemento</h3>
          <p className="text-sm text-gray-600">Elemento: {element.type}</p>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium mb-1">Tamanho da fonte</label>
            <input
              type="text"
              value={localStyles.fontSize || ''}
              onChange={(e) => updateStyle('fontSize', e.target.value)}
              placeholder="ex: 16px, 1.2rem"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Font Weight */}
          <div>
            <label className="block text-sm font-medium mb-1">Peso da fonte</label>
            <select
              value={localStyles.fontWeight || ''}
              onChange={(e) => updateStyle('fontWeight', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Padrão</option>
              <option value="300">Leve</option>
              <option value="400">Normal</option>
              <option value="500">Médio</option>
              <option value="600">Semi-negrito</option>
              <option value="700">Negrito</option>
              <option value="800">Extra-negrito</option>
            </select>
          </div>

          {/* Text Color */}
          <div>
            <label className="block text-sm font-medium mb-1">Cor do texto</label>
            <input
              type="color"
              value={localStyles.color || '#000000'}
              onChange={(e) => updateStyle('color', e.target.value)}
              className="w-full h-10 border border-gray-300 rounded-md"
            />
          </div>

          {/* Background Color */}
          <div>
            <label className="block text-sm font-medium mb-1">Cor de fundo</label>
            <input
              type="color"
              value={localStyles.backgroundColor || '#ffffff'}
              onChange={(e) => updateStyle('backgroundColor', e.target.value)}
              className="w-full h-10 border border-gray-300 rounded-md"
            />
          </div>

          {/* Padding */}
          <div>
            <label className="block text-sm font-medium mb-1">Espaçamento interno</label>
            <input
              type="text"
              value={localStyles.padding || ''}
              onChange={(e) => updateStyle('padding', e.target.value)}
              placeholder="ex: 10px, 1rem 2rem"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Margin */}
          <div>
            <label className="block text-sm font-medium mb-1">Margem externa</label>
            <input
              type="text"
              value={localStyles.margin || ''}
              onChange={(e) => updateStyle('margin', e.target.value)}
              placeholder="ex: 10px, 1rem auto"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Border Radius */}
          <div>
            <label className="block text-sm font-medium mb-1">Bordas arredondadas</label>
            <input
              type="text"
              value={localStyles.borderRadius || ''}
              onChange={(e) => updateStyle('borderRadius', e.target.value)}
              placeholder="ex: 4px, 8px"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}