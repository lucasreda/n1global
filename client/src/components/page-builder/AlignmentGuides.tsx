import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface AlignmentGuide {
  type: 'vertical' | 'horizontal';
  position: number; // pixel position
  color: string;
}

interface AlignmentGuidesProps {
  canvasContainerId?: string;
  draggedElementId?: string | null;
  activeId?: string | null;
  showGrid?: boolean;
  gridSize?: number;
  snapToGrid?: boolean;
}

// Tolerance for alignment detection (in pixels)
const ALIGNMENT_TOLERANCE = 5;

export function AlignmentGuides({
  canvasContainerId = 'visual-editor-canvas',
  draggedElementId,
  activeId,
  showGrid = false,
  gridSize = 16,
  snapToGrid = false,
}: AlignmentGuidesProps) {
  const [guides, setGuides] = useState<AlignmentGuide[]>([]);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!activeId || !draggedElementId || !showGrid) {
      setGuides([]);
      return;
    }

    const updateGuides = () => {
      const canvasContainer = document.getElementById(canvasContainerId);
      if (!canvasContainer) {
        setGuides([]);
        return;
      }

      const draggedElement = document.querySelector(`[data-node-id="${draggedElementId}"]`);
      if (!draggedElement) {
        setGuides([]);
        return;
      }

      const canvasRect = canvasContainer.getBoundingClientRect();
      const draggedRect = draggedElement.getBoundingClientRect();

      // Calculate position relative to canvas
      const draggedTop = draggedRect.top - canvasRect.top + canvasContainer.scrollTop;
      const draggedLeft = draggedRect.left - canvasRect.left + canvasContainer.scrollLeft;

      // Get all other elements on the canvas (excluding dragged element)
      const allElements = canvasContainer.querySelectorAll('[data-node-id]');
      const otherElements: { element: Element; rect: DOMRect }[] = [];

      allElements.forEach((el) => {
        if (el.getAttribute('data-node-id') !== draggedElementId) {
          const rect = el.getBoundingClientRect();
          const top = rect.top - canvasRect.top + canvasContainer.scrollTop;
          const left = rect.left - canvasRect.left + canvasContainer.scrollLeft;

          otherElements.push({
            element: el,
            rect: {
              ...rect,
              top,
              left,
              bottom: top + rect.height,
              right: left + rect.width,
            } as DOMRect,
          });
        }
      });

      const detectedGuides: AlignmentGuide[] = [];

      // Detect vertical alignment (left, center, right edges)
      otherElements.forEach(({ rect }) => {
        // Left edge alignment
        if (Math.abs(draggedLeft - rect.left) < ALIGNMENT_TOLERANCE) {
          detectedGuides.push({
            type: 'vertical',
            position: rect.left,
            color: '#3b82f6', // blue-500
          });
        }

        // Right edge alignment
        const draggedRight = draggedLeft + draggedRect.width;
        const otherRight = rect.right;
        if (Math.abs(draggedRight - otherRight) < ALIGNMENT_TOLERANCE) {
          detectedGuides.push({
            type: 'vertical',
            position: otherRight,
            color: '#3b82f6',
          });
        }

        // Center alignment
        const draggedCenter = draggedLeft + draggedRect.width / 2;
        const otherCenter = rect.left + rect.width / 2;
        if (Math.abs(draggedCenter - otherCenter) < ALIGNMENT_TOLERANCE) {
          detectedGuides.push({
            type: 'vertical',
            position: otherCenter,
            color: '#10b981', // green-500
          });
        }
      });

      // Detect horizontal alignment (top, middle, bottom edges)
      otherElements.forEach(({ rect }) => {
        // Top edge alignment
        if (Math.abs(draggedTop - rect.top) < ALIGNMENT_TOLERANCE) {
          detectedGuides.push({
            type: 'horizontal',
            position: rect.top,
            color: '#3b82f6',
          });
        }

        // Bottom edge alignment
        const draggedBottom = draggedTop + draggedRect.height;
        const otherBottom = rect.bottom;
        if (Math.abs(draggedBottom - otherBottom) < ALIGNMENT_TOLERANCE) {
          detectedGuides.push({
            type: 'horizontal',
            position: otherBottom,
            color: '#3b82f6',
          });
        }

        // Middle alignment
        const draggedMiddle = draggedTop + draggedRect.height / 2;
        const otherMiddle = rect.top + rect.height / 2;
        if (Math.abs(draggedMiddle - otherMiddle) < ALIGNMENT_TOLERANCE) {
          detectedGuides.push({
            type: 'horizontal',
            position: otherMiddle,
            color: '#10b981',
          });
        }
      });

      // Add grid snap guides if snap-to-grid is enabled
      if (snapToGrid && gridSize > 0) {
        const snappedLeft = Math.round(draggedLeft / gridSize) * gridSize;
        const snappedTop = Math.round(draggedTop / gridSize) * gridSize;

        // Only show grid guides if element is close to snap point
        if (Math.abs(draggedLeft - snappedLeft) < ALIGNMENT_TOLERANCE) {
          detectedGuides.push({
            type: 'vertical',
            position: snappedLeft,
            color: '#6b7280', // gray-500
          });
        }

        if (Math.abs(draggedTop - snappedTop) < ALIGNMENT_TOLERANCE) {
          detectedGuides.push({
            type: 'horizontal',
            position: snappedTop,
            color: '#6b7280',
          });
        }
      }

      // Remove duplicates (same type and position)
      const uniqueGuides = detectedGuides.filter((guide, index, self) =>
        index === self.findIndex((g) => g.type === guide.type && Math.abs(g.position - guide.position) < 1)
      );

      setGuides(uniqueGuides);
    };

    const animate = () => {
      updateGuides();
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [activeId, draggedElementId, showGrid, gridSize, snapToGrid, canvasContainerId]);

  if (!activeId || guides.length === 0) return null;

  const canvasContainer = document.getElementById(canvasContainerId);
  if (!canvasContainer) return null;

  const canvasRect = canvasContainer.getBoundingClientRect();

  return createPortal(
    <div className="pointer-events-none absolute inset-0 z-[999]" style={{ top: 0, left: 0 }}>
      {guides.map((guide, index) => {
        if (guide.type === 'vertical') {
          return (
            <div
              key={`v-${guide.position}-${index}`}
              className="absolute top-0 bottom-0 w-0.5 opacity-80 animate-pulse"
              style={{
                left: `${guide.position - canvasRect.left + canvasContainer.scrollLeft}px`,
                backgroundColor: guide.color,
                boxShadow: `0 0 4px ${guide.color}`,
              }}
            />
          );
        } else {
          return (
            <div
              key={`h-${guide.position}-${index}`}
              className="absolute left-0 right-0 h-0.5 opacity-80 animate-pulse"
              style={{
                top: `${guide.position - canvasRect.top + canvasContainer.scrollTop}px`,
                backgroundColor: guide.color,
                boxShadow: `0 0 4px ${guide.color}`,
              }}
            />
          );
        }
      })}
    </div>,
    canvasContainer
  );
}




