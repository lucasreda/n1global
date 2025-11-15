import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Type,
  Palette
} from 'lucide-react';
import { PageNodeV4 } from '@shared/schema';

interface InlineTextToolbarProps {
  node: PageNodeV4;
  onUpdateStyle: (updates: Record<string, string>) => void;
  breakpoint: 'desktop' | 'tablet' | 'mobile';
}

export function InlineTextToolbar({ node, onUpdateStyle, breakpoint }: InlineTextToolbarProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const styles = node.styles?.[breakpoint] || {};

  useEffect(() => {
    const element = document.querySelector(`[data-node-id="${node.id}"]`);
    if (!element) {
      setIsVisible(false);
      return;
    }

    const rect = element.getBoundingClientRect();
    const canvasElement = element.closest('.page-builder-canvas');
    const canvasRect = canvasElement?.getBoundingClientRect();

    if (canvasRect) {
      const toolbarWidth = 400; // Approximate toolbar width
      const top = rect.top - canvasRect.top - 50; // 50px above element
      let left = rect.left - canvasRect.left + rect.width / 2 - toolbarWidth / 2;

      // Keep toolbar within canvas bounds
      if (left < 0) left = 10;
      if (left + toolbarWidth > canvasRect.width) {
        left = canvasRect.width - toolbarWidth - 10;
      }

      setPosition({ top, left });
      setIsVisible(true);
    }
  }, [node.id]);

  if (!isVisible) return null;

  // Check if text is bold/italic
  const isBold = styles.fontWeight === 'bold' || styles.fontWeight === '700';
  const isItalic = styles.fontStyle === 'italic';

  return (
    <div
      ref={toolbarRef}
      className="absolute bg-gray-900 text-white rounded-lg shadow-2xl border border-gray-700 px-2 py-2 flex items-center gap-1 z-[2000]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Bold */}
      <Button
        variant={isBold ? 'secondary' : 'ghost'}
        size="sm"
        className="h-8 w-8 p-0 text-white hover:bg-gray-700"
        onClick={() => onUpdateStyle({ 
          fontWeight: isBold ? 'normal' : 'bold' 
        })}
        title="Bold (Ctrl+B)"
        data-testid="toolbar-bold"
      >
        <Bold className="w-4 h-4" />
      </Button>

      {/* Italic */}
      <Button
        variant={isItalic ? 'secondary' : 'ghost'}
        size="sm"
        className="h-8 w-8 p-0 text-white hover:bg-gray-700"
        onClick={() => onUpdateStyle({ 
          fontStyle: isItalic ? 'normal' : 'italic' 
        })}
        title="Italic (Ctrl+I)"
        data-testid="toolbar-italic"
      >
        <Italic className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-gray-600 mx-1" />

      {/* Align Left */}
      <Button
        variant={styles.textAlign === 'left' ? 'secondary' : 'ghost'}
        size="sm"
        className="h-8 w-8 p-0 text-white hover:bg-gray-700"
        onClick={() => onUpdateStyle({ textAlign: 'left' })}
        title="Align Left"
        data-testid="toolbar-align-left"
      >
        <AlignLeft className="w-4 h-4" />
      </Button>

      {/* Align Center */}
      <Button
        variant={styles.textAlign === 'center' ? 'secondary' : 'ghost'}
        size="sm"
        className="h-8 w-8 p-0 text-white hover:bg-gray-700"
        onClick={() => onUpdateStyle({ textAlign: 'center' })}
        title="Align Center"
        data-testid="toolbar-align-center"
      >
        <AlignCenter className="w-4 h-4" />
      </Button>

      {/* Align Right */}
      <Button
        variant={styles.textAlign === 'right' ? 'secondary' : 'ghost'}
        size="sm"
        className="h-8 w-8 p-0 text-white hover:bg-gray-700"
        onClick={() => onUpdateStyle({ textAlign: 'right' })}
        title="Align Right"
        data-testid="toolbar-align-right"
      >
        <AlignRight className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-gray-600 mx-1" />

      {/* Font Size Selector */}
      <div className="flex items-center gap-1">
        <Type className="w-3.5 h-3.5 text-gray-400" />
        <select
          value={styles.fontSize || '16px'}
          onChange={(e) => onUpdateStyle({ fontSize: e.target.value })}
          className="bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-600 focus:outline-none focus:border-blue-500"
          data-testid="toolbar-font-size"
        >
          <option value="12px">12px</option>
          <option value="14px">14px</option>
          <option value="16px">16px</option>
          <option value="18px">18px</option>
          <option value="20px">20px</option>
          <option value="24px">24px</option>
          <option value="28px">28px</option>
          <option value="32px">32px</option>
          <option value="36px">36px</option>
          <option value="48px">48px</option>
        </select>
      </div>

      {/* Color Picker */}
      <div className="flex items-center gap-1 ml-1">
        <Palette className="w-3.5 h-3.5 text-gray-400" />
        <input
          type="color"
          value={styles.color || '#000000'}
          onChange={(e) => onUpdateStyle({ color: e.target.value })}
          className="w-8 h-7 rounded cursor-pointer bg-transparent"
          title="Text Color"
          data-testid="toolbar-color"
        />
      </div>
    </div>
  );
}
