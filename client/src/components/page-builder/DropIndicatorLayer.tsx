import { useDndMonitor } from '@dnd-kit/core';
import { useState } from 'react';
import { createPortal } from 'react-dom';

interface DropIndicatorLayerProps {
  canvasContainerId?: string;
}

type DropPosition = 'before' | 'after' | 'child' | null;

export function DropIndicatorLayer({ canvasContainerId = 'visual-editor-canvas' }: DropIndicatorLayerProps) {
  const [activeDropZone, setActiveDropZone] = useState<{
    position: DropPosition;
    nodeId: string | null;
  }>({ position: null, nodeId: null });

  useDndMonitor({
    onDragStart() {
      setActiveDropZone({ position: null, nodeId: null });
    },
    onDragOver(event) {
      if (!event.over) {
        setActiveDropZone({ position: null, nodeId: null });
        return;
      }

      const overData = event.over.data.current;
      const position = overData?.position as DropPosition;
      const nodeId = overData?.nodeId as string;

      setActiveDropZone({ position, nodeId });
    },
    onDragEnd() {
      setActiveDropZone({ position: null, nodeId: null });
    },
    onDragCancel() {
      setActiveDropZone({ position: null, nodeId: null });
    },
  });

  if (!activeDropZone.position || !activeDropZone.nodeId) return null;

  // Get the element being hovered
  const targetElement = document.querySelector(`[data-node-id="${activeDropZone.nodeId}"]`);
  if (!targetElement) return null;

  const canvasContainer = document.getElementById(canvasContainerId);
  if (!canvasContainer) return null;

  const rect = targetElement.getBoundingClientRect();
  const canvasRect = canvasContainer.getBoundingClientRect();

  const top = rect.top - canvasRect.top + canvasContainer.scrollTop;
  const left = rect.left - canvasRect.left + canvasContainer.scrollLeft;
  const width = rect.width;
  const height = rect.height;

  let indicator: JSX.Element | null = null;

  if (activeDropZone.position === 'before') {
    // Blue line before element
    indicator = (
      <div
        className="absolute z-[100] pointer-events-none"
        style={{
          top: `${top}px`,
          left: `${left}px`,
          width: `${width}px`,
          height: '3px',
          backgroundColor: '#3b82f6',
          boxShadow: '0 0 8px rgba(59, 130, 246, 0.6)',
        }}
      />
    );
  } else if (activeDropZone.position === 'after') {
    // Blue line after element
    indicator = (
      <div
        className="absolute z-[100] pointer-events-none"
        style={{
          top: `${top + height}px`,
          left: `${left}px`,
          width: `${width}px`,
          height: '3px',
          backgroundColor: '#3b82f6',
          boxShadow: '0 0 8px rgba(59, 130, 246, 0.6)',
        }}
      />
    );
  } else if (activeDropZone.position === 'child') {
    // Semi-transparent overlay for container
    indicator = (
      <div
        className="absolute z-[100] pointer-events-none border-2 border-blue-500"
        style={{
          top: `${top}px`,
          left: `${left}px`,
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          boxShadow: '0 0 12px rgba(59, 130, 246, 0.4)',
        }}
      />
    );
  }

  return canvasContainer ? createPortal(indicator, canvasContainer) : null;
}
