import { useEffect, useState, useRef } from 'react';
import { Copy, Trash2, MoveVertical, ChevronRight, BookmarkPlus } from 'lucide-react';

interface SelectionOverlayProps {
  nodeId: string;
  tag: string;
  isVisible: boolean;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onSaveAsComponent?: () => void;
  breadcrumb?: { id: string; tag: string; label?: string }[];
  onSelectParent?: (nodeId: string) => void;
}

export function SelectionOverlay({ 
  nodeId, 
  tag, 
  isVisible, 
  onDuplicate, 
  onDelete,
  onSaveAsComponent,
  breadcrumb = [],
  onSelectParent
}: SelectionOverlayProps) {
  const [dimensions, setDimensions] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [toolbarPosition, setToolbarPosition] = useState<'top' | 'bottom'>('top');
  const rafRef = useRef<number>();
  const canvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    console.log('🎯 SelectionOverlay mounted:', { nodeId, tag, isVisible });
    if (!isVisible) return;

    const updatePosition = () => {
      const element = document.querySelector(`[data-node-id="${nodeId}"]`);
      console.log('📍 Looking for element:', nodeId, 'found:', !!element);
      
      if (element) {
        const rect = element.getBoundingClientRect();
        // Find the parent container (the white canvas div)
        const parentContainer = element.closest('.mx-auto.bg-white');
        const parentRect = parentContainer?.getBoundingClientRect();
        
        // Cache canvas reference
        if (!canvasRef.current) {
          canvasRef.current = document.getElementById('page-builder-canvas');
        }
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        
        console.log('📦 Element rect:', rect, 'Parent rect:', parentRect);
        
        if (parentRect) {
          const newDimensions = {
            top: rect.top - parentRect.top,
            left: rect.left - parentRect.left,
            width: rect.width,
            height: rect.height,
          };
          console.log('📐 Setting dimensions:', newDimensions);
          setDimensions(newDimensions);
          
          // Determine if toolbar should be on top or bottom
          const toolbarHeight = 42; // Approximate height of toolbar
          const spaceAbove = newDimensions.top;
          const spaceBelow = (canvasRect?.height || 0) - newDimensions.top - newDimensions.height;
          
          setToolbarPosition(spaceAbove > toolbarHeight || spaceBelow < toolbarHeight ? 'top' : 'bottom');
        }
      }
      rafRef.current = requestAnimationFrame(updatePosition);
    };

    updatePosition();

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [nodeId, isVisible]);

  if (!isVisible) return null;

  const toolbarOffset = toolbarPosition === 'top' ? -42 : dimensions.height;
  const toolbarClasses = toolbarPosition === 'top' ? 'rounded-t' : 'rounded-b';

  return (
    <>
      {/* Selection Border */}
      <div
        className="pointer-events-none absolute border-2 border-blue-500"
        style={{
          top: dimensions.top,
          left: dimensions.left,
          width: dimensions.width,
          height: dimensions.height,
          zIndex: 1000,
        }}
      />
      
      {/* Breadcrumb Navigation */}
      {breadcrumb.length > 1 && (
        <div
          className="absolute flex items-center gap-1 bg-gray-900 text-white text-xs px-2 py-1 rounded font-mono pointer-events-auto shadow-lg"
          style={{
            top: toolbarPosition === 'top' ? dimensions.top - 66 : dimensions.top + dimensions.height + 4,
            left: dimensions.left,
            maxWidth: '90%',
            zIndex: 1002,
          }}
        >
          {breadcrumb.map((crumb, index) => (
            <span key={crumb.id} className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectParent?.(crumb.id);
                }}
                className="hover:text-blue-400 transition-colors"
              >
                &lt;{crumb.tag}&gt;
              </button>
              {index < breadcrumb.length - 1 && <ChevronRight className="w-3 h-3 text-gray-500" />}
            </span>
          ))}
        </div>
      )}
      
      {/* Selection Label and Controls */}
      <div
        className={`absolute flex items-center gap-1 ${toolbarClasses} pointer-events-auto shadow-lg`}
        style={{
          top: dimensions.top + toolbarOffset,
          left: dimensions.left,
          zIndex: 1001,
        }}
      >
        {/* Tag Label with Dimensions */}
        <div className="bg-blue-500 text-white text-xs px-3 py-1.5 font-mono pointer-events-none whitespace-nowrap">
          &lt;{tag}&gt;
          <span className="text-blue-200 ml-2 opacity-75">
            {Math.round(dimensions.width)}×{Math.round(dimensions.height)}
          </span>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-0.5 bg-gray-800 pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate?.();
            }}
            className="p-2 hover:bg-gray-700 text-white transition-colors"
            title="Duplicar (Ctrl+D)"
          >
            <Copy className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="p-2 hover:bg-red-600 text-white transition-colors"
            title="Deletar (Delete)"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          {onSaveAsComponent && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSaveAsComponent?.();
              }}
              className="p-2 hover:bg-blue-600 text-white transition-colors"
              title="Salvar como Componente"
            >
              <BookmarkPlus className="w-5 h-5" />
            </button>
          )}
          <div className="p-2 text-gray-400 cursor-move" title="Arrastar">
            <MoveVertical className="w-5 h-5" />
          </div>
        </div>
      </div>
    </>
  );
}
