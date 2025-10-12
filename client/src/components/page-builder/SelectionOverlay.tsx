import { useEffect, useState, useRef } from 'react';

interface SelectionOverlayProps {
  nodeId: string;
  tag: string;
  isVisible: boolean;
}

export function SelectionOverlay({ nodeId, tag, isVisible }: SelectionOverlayProps) {
  const [dimensions, setDimensions] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!isVisible) return;

    const updatePosition = () => {
      const element = document.querySelector(`[data-node-id="${nodeId}"]`);
      if (element) {
        const rect = element.getBoundingClientRect();
        // Find the parent container (the white canvas div)
        const parentContainer = element.closest('.mx-auto.bg-white');
        const parentRect = parentContainer?.getBoundingClientRect();
        
        if (parentRect) {
          setDimensions({
            top: rect.top - parentRect.top,
            left: rect.left - parentRect.left,
            width: rect.width,
            height: rect.height,
          });
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
    <div
      className="pointer-events-none absolute"
      style={{
        top: dimensions.top,
        left: dimensions.left,
        width: dimensions.width,
        height: dimensions.height,
        zIndex: 1000,
      }}
    >
      {/* Selection Label */}
      <div className="selection-label">
        {tag}
      </div>
    </div>
  );
}
