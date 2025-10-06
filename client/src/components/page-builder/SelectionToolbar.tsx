import { GripVertical, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPortal } from 'react-dom';
import { useEffect, useState, useRef } from 'react';

interface SelectionToolbarProps {
  nodeId: string;
  onDuplicate: () => void;
  onDelete: () => void;
  dragListeners?: any;
  dragAttributes?: any;
}

export function SelectionToolbar({
  nodeId,
  onDuplicate,
  onDelete,
  dragListeners,
  dragAttributes,
}: SelectionToolbarProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePosition = () => {
      const element = document.querySelector(`[data-node-id="${nodeId}"]`);
      if (!element) {
        setPosition(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      const canvasContainer = document.getElementById('visual-editor-canvas');
      const canvasRect = canvasContainer?.getBoundingClientRect();

      if (!canvasRect) {
        setPosition(null);
        return;
      }

      // Position toolbar at top-left of selected element, offset slightly above
      const top = rect.top - canvasRect.top - 40;
      const left = rect.left - canvasRect.left;

      setPosition({ top, left });
    };

    updatePosition();

    // Update on scroll/resize
    const canvasContainer = document.getElementById('visual-editor-canvas');
    if (canvasContainer) {
      canvasContainer.addEventListener('scroll', updatePosition);
    }
    window.addEventListener('resize', updatePosition);

    return () => {
      if (canvasContainer) {
        canvasContainer.removeEventListener('scroll', updatePosition);
      }
      window.removeEventListener('resize', updatePosition);
    };
  }, [nodeId]);

  if (!position) return null;

  const toolbar = (
    <div
      ref={toolbarRef}
      className="absolute z-50 flex items-center gap-1 bg-blue-600 rounded-md shadow-lg border border-blue-700 p-1"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Drag Handle */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-white hover:bg-blue-700 cursor-grab active:cursor-grabbing"
        title="Arrastar elemento"
        {...dragListeners}
        {...dragAttributes}
      >
        <GripVertical className="h-4 w-4" />
      </Button>

      {/* Duplicate */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-white hover:bg-blue-700"
        onClick={onDuplicate}
        title="Duplicar elemento (Ctrl+D)"
        data-testid="button-duplicate-node"
      >
        <Copy className="h-4 w-4" />
      </Button>

      {/* Delete */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-white hover:bg-red-600"
        onClick={onDelete}
        title="Deletar elemento (Delete)"
        data-testid="button-delete-node"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  // Render in portal to ensure it appears above all other elements
  const canvasContainer = document.getElementById('visual-editor-canvas');
  return canvasContainer ? createPortal(toolbar, canvasContainer) : null;
}
