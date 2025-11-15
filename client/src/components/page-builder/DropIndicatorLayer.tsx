import { useDndMonitor } from '@dnd-kit/core';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { PageNodeV4 } from '@shared/schema';
import { canAcceptChildWithContext, getParentNode } from './tree-helpers';

interface DropIndicatorLayerProps {
  canvasContainerId?: string;
  activeNode?: PageNodeV4 | null;
  findNode?: (nodeId: string) => PageNodeV4 | null;
  nodes?: PageNodeV4[];
  validation?: { allowed: boolean; reason?: string } | null;
}

type DropPosition = 'before' | 'after' | 'child' | null;

export function DropIndicatorLayer({ 
  canvasContainerId = 'visual-editor-canvas',
  activeNode = null,
  findNode = () => null,
  nodes = [],
  validation = null,
}: DropIndicatorLayerProps) {
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

  // Use validation from parent if available, otherwise calculate locally
  let isValidDrop = true;
  if (validation !== null) {
    isValidDrop = validation.allowed;
  } else if (activeNode) {
    // Fallback to local validation
    if (activeDropZone.position === 'child') {
      // For 'child' position, validate against target node
      const targetNode = findNode(activeDropZone.nodeId);
      if (targetNode) {
        isValidDrop = canAcceptChildWithContext(targetNode, activeNode);
      }
    } else if (activeDropZone.position === 'before' || activeDropZone.position === 'after') {
      // For 'before'/'after' position, validate against parent node
      const parentNode = getParentNode(nodes, activeDropZone.nodeId);
      if (parentNode) {
        isValidDrop = canAcceptChildWithContext(parentNode, activeNode);
      }
      // If no parent (root level), always allow
    }
  }

  // Show visual indicator for both valid and invalid drops
  let indicator: JSX.Element | null = null;
  
  if (!isValidDrop) {
    // Invalid drop - red indicator
    const invalidColor = '#ef4444'; // red-500
    const invalidShadowColor = 'rgba(239, 68, 68, 0.6)';
    
    if (activeDropZone.position === 'before' || activeDropZone.position === 'after') {
      indicator = (
        <div
          className="absolute z-[100] pointer-events-none animate-pulse"
          style={{
            top: activeDropZone.position === 'before' ? `${top}px` : `${top + height}px`,
            left: `${left}px`,
            width: `${width}px`,
            height: '4px',
            backgroundColor: invalidColor,
            boxShadow: `0 0 12px ${invalidShadowColor}`,
          }}
        />
      );
    } else if (activeDropZone.position === 'child') {
      indicator = (
        <div
          className="absolute z-[100] pointer-events-none border-2 border-dashed animate-pulse"
          style={{
            top: `${top}px`,
            left: `${left}px`,
            width: `${width}px`,
            height: `${height}px`,
            borderColor: invalidColor,
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            boxShadow: `0 0 16px ${invalidShadowColor}`,
          }}
        />
      );
    }
  } else {
    // Valid drop - blue indicator with smooth animation
    const validColor = '#3b82f6'; // blue-500
    const validShadowColor = 'rgba(59, 130, 246, 0.6)';
    
    if (activeDropZone.position === 'before') {
      // Line before element with pulsing animation
      indicator = (
        <div
          className="absolute z-[100] pointer-events-none animate-pulse"
          style={{
            top: `${top}px`,
            left: `${left}px`,
            width: `${width}px`,
            height: '4px',
            backgroundColor: validColor,
            boxShadow: `0 0 12px ${validShadowColor}`,
          }}
        />
      );
    } else if (activeDropZone.position === 'after') {
      // Line after element with pulsing animation
      indicator = (
        <div
          className="absolute z-[100] pointer-events-none animate-pulse"
          style={{
            top: `${top + height}px`,
            left: `${left}px`,
            width: `${width}px`,
            height: '4px',
            backgroundColor: validColor,
            boxShadow: `0 0 12px ${validShadowColor}`,
          }}
        />
      );
    } else if (activeDropZone.position === 'child') {
      // Semi-transparent overlay for container with smooth glow
      const bgColor = 'rgba(59, 130, 246, 0.15)';
      const boxShadowColor = 'rgba(59, 130, 246, 0.5)';
      
      indicator = (
        <div
          className="absolute z-[100] pointer-events-none border-2 transition-all duration-200"
          style={{
            top: `${top}px`,
            left: `${left}px`,
            width: `${width}px`,
            height: `${height}px`,
            borderColor: validColor,
            backgroundColor: bgColor,
            boxShadow: `0 0 16px ${boxShadowColor}`,
            animation: 'drop-zone-glow 1.5s ease-in-out infinite alternate',
          }}
        />
      );
    }
  }

  return canvasContainer ? createPortal(indicator, canvasContainer) : null;
}
