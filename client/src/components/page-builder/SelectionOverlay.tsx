import { useEffect, useState, useRef } from 'react';
import { Copy, Trash2, MoveVertical } from 'lucide-react';

interface SelectionOverlayProps {
  nodeId: string;
  tag: string;
  isVisible: boolean;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

export function SelectionOverlay({ nodeId, tag, isVisible, onDuplicate, onDelete }: SelectionOverlayProps) {
  const [dimensions, setDimensions] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const rafRef = useRef<number>();

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
      
      {/* Selection Label and Controls */}
      <div
        className="absolute flex items-center gap-1"
        style={{
          top: dimensions.top - 32,
          left: dimensions.left,
          zIndex: 1001,
        }}
      >
        {/* Tag Label */}
        <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-t font-mono pointer-events-none">
          {tag}
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-0.5 bg-gray-800 rounded-t pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate?.();
            }}
            className="p-1.5 hover:bg-gray-700 text-white transition-colors"
            title="Duplicar (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="p-1.5 hover:bg-red-600 text-white transition-colors"
            title="Deletar (Delete)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <div className="p-1.5 text-gray-400 cursor-move" title="Arrastar">
            <MoveVertical className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </>
  );
}
