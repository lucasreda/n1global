import { useState, useCallback, useEffect, useRef } from 'react';
import { PageModelV4, PageNodeV4, ResponsiveStylesV4 } from '@shared/schema';
import { PageModelV4Renderer } from './PageModelV4Renderer';
import { LayersPanelV4 } from './LayersPanelV4';
import { PropertiesPanelV4 } from './PropertiesPanelV4';
import { ElementsToolbarV4 } from './ElementsToolbarV4';
import { DropIndicatorLayer } from './DropIndicatorLayer';
import { SelectionOverlay } from './SelectionOverlay';
import { InlineTextToolbar } from './InlineTextToolbar';
import { HoverTooltip } from './HoverTooltip';
import { useHistoryV4 } from './HistoryManagerV4';
import { nanoid } from 'nanoid';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { findNodePath, removeNodeByPathWithReturn, insertNodeAtPath, canAcceptChild, canAcceptChildWithContext, getParentNode, validateDrop } from './tree-helpers';
import { getDropErrorMessage } from './semantic-rules';
import { useToast } from '@/hooks/use-toast';

interface VisualEditorV4Props {
  model: PageModelV4;
  onChange: (model: PageModelV4) => void;
  viewport: 'desktop' | 'tablet' | 'mobile';
  onViewportChange: (viewport: 'desktop' | 'tablet' | 'mobile') => void;
  showElements?: boolean;
  showLayers?: boolean;
  showProperties?: boolean;
  className?: string;
}

export function VisualEditorV4({ 
  model, 
  onChange, 
  viewport, 
  onViewportChange, 
  showElements = true,
  showLayers = false,
  showProperties = true,
  className = "" 
}: VisualEditorV4Props) {
  const { toast } = useToast();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [draggedTemplate, setDraggedTemplate] = useState<PageNodeV4 | null>(null);
  const [dropValidation, setDropValidation] = useState<{ allowed: boolean; reason?: string } | null>(null);
  const [clipboard, setClipboard] = useState<PageNodeV4 | null>(null);
  
  // History management
  const { addToHistory, undo, redo, canUndo, canRedo } = useHistoryV4(model);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleSelectNode = useCallback((nodeId: string) => {
    console.log('🖱️ handleSelectNode called with:', nodeId);
    setSelectedNodeId(nodeId);
  }, []);

  const findNodeInTree = (nodes: PageNodeV4[], id: string): PageNodeV4 | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeInTree(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const deepMergeStyles = (
    existing: ResponsiveStylesV4 | undefined,
    updates: Partial<ResponsiveStylesV4> | undefined
  ): ResponsiveStylesV4 => {
    if (!updates) return JSON.parse(JSON.stringify(existing || { desktop: {}, tablet: {}, mobile: {} }));
    
    const result: ResponsiveStylesV4 = {
      desktop: JSON.parse(JSON.stringify(existing?.desktop || {})),
      tablet: JSON.parse(JSON.stringify(existing?.tablet || {})),
      mobile: JSON.parse(JSON.stringify(existing?.mobile || {})),
    };
    
    if (updates.desktop) {
      result.desktop = { ...result.desktop, ...updates.desktop };
    }
    if (updates.tablet) {
      result.tablet = { ...result.tablet, ...updates.tablet };
    }
    if (updates.mobile) {
      result.mobile = { ...result.mobile, ...updates.mobile };
    }
    
    return result;
  };

  const updateNodeInTree = (nodes: PageNodeV4[], id: string, updates: Partial<PageNodeV4>): PageNodeV4[] => {
    return nodes.map(node => {
      if (node.id === id) {
        const updated: PageNodeV4 = JSON.parse(JSON.stringify(node));
        
        if (updates.attributes !== undefined) {
          updated.attributes = { ...updated.attributes, ...updates.attributes };
        }
        
        // CRITICAL: Process responsiveAttributes updates for images
        if (updates.responsiveAttributes !== undefined) {
          updated.responsiveAttributes = {
            ...updated.responsiveAttributes,
            ...updates.responsiveAttributes
          };
        }
        
        if (updates.styles !== undefined) {
          updated.styles = deepMergeStyles(node.styles, updates.styles);
        }
        
        if (updates.inlineStyles !== undefined) {
          updated.inlineStyles = { ...updated.inlineStyles, ...updates.inlineStyles };
        }
        
        if (updates.textContent !== undefined) updated.textContent = updates.textContent;
        if (updates.tag) updated.tag = updates.tag;
        if (updates.classNames) updated.classNames = [...(updates.classNames || [])];
        if (updates.children) updated.children = JSON.parse(JSON.stringify(updates.children));
        if (updates.states) updated.states = JSON.parse(JSON.stringify(updates.states));
        
        return updated;
      }
      if (node.children) {
        const updatedNode = JSON.parse(JSON.stringify(node));
        updatedNode.children = updateNodeInTree(node.children, id, updates);
        return updatedNode;
      }
      return JSON.parse(JSON.stringify(node));
    });
  };

  // Wrapper for onChange that adds to history
  const updateModel = useCallback((newModel: PageModelV4, description = 'Edit') => {
    onChange(newModel);
    addToHistory(newModel, description);
  }, [onChange, addToHistory]);

  const handleUpdateNode = useCallback((updates: Partial<PageNodeV4>) => {
    if (!selectedNodeId) return;
    
    const updatedNodes = updateNodeInTree(model.nodes, selectedNodeId, updates);
    updateModel({
      ...model,
      nodes: updatedNodes,
    }, 'Update node');
  }, [selectedNodeId, model, updateModel]);

  const handleInsertElement = useCallback((node: PageNodeV4) => {
    updateModel({
      ...model,
      nodes: [...model.nodes, node],
    }, 'Insert element');
  }, [model, updateModel]);

  const handleDeleteNode = useCallback(() => {
    if (!selectedNodeId) return;

    const deleteFromTree = (nodes: PageNodeV4[]): PageNodeV4[] => {
      return nodes.filter(node => {
        if (node.id === selectedNodeId) return false;
        if (node.children) {
          node.children = deleteFromTree(node.children);
        }
        return true;
      });
    };

    updateModel({
      ...model,
      nodes: deleteFromTree(model.nodes),
    }, 'Delete node');
    
    setSelectedNodeId(null);
  }, [selectedNodeId, model, updateModel]);

  const handleDuplicateNode = useCallback(() => {
    if (!selectedNodeId) return;

    const duplicateNode = (node: PageNodeV4): PageNodeV4 => {
      return {
        ...node,
        id: nanoid(),
        children: node.children?.map(duplicateNode),
      };
    };

    const selectedNode = findNodeInTree(model.nodes, selectedNodeId);
    if (!selectedNode) return;

    const duplicated = duplicateNode(selectedNode);
    
    // Find path and insert after selected node
    const selectedPath = findNodePath(model.nodes, selectedNodeId);
    if (selectedPath) {
      const newNodes = insertNodeAtPath(model.nodes, selectedPath, duplicated, 'after');
      updateModel({ ...model, nodes: newNodes }, 'Duplicate node');
    } else {
      // Fallback: append to root
      updateModel({
        ...model,
        nodes: [...model.nodes, duplicated],
      }, 'Duplicate node');
    }
  }, [selectedNodeId, model, updateModel]);

  // Copy/Paste handlers with visual feedback
  const handleCopyNode = useCallback(() => {
    if (!selectedNodeId) return;
    const selectedNode = findNodeInTree(model.nodes, selectedNodeId);
    if (selectedNode) {
      setClipboard(selectedNode);
      toast({
        title: "📋 Elemento copiado",
        description: `<${selectedNode.tag}> copiado para área de transferência`,
      });
    }
  }, [selectedNodeId, model.nodes, toast]);

  const handleCutNode = useCallback(() => {
    if (!selectedNodeId) return;
    const selectedNode = findNodeInTree(model.nodes, selectedNodeId);
    if (selectedNode) {
      setClipboard(selectedNode);
      handleDeleteNode();
      toast({
        title: "✂️ Elemento recortado",
        description: `<${selectedNode.tag}> removido e copiado`,
      });
    }
  }, [selectedNodeId, model.nodes, handleDeleteNode, toast]);

  const handlePasteNode = useCallback(() => {
    if (!clipboard) return;
    
    const duplicateNode = (node: PageNodeV4): PageNodeV4 => {
      return {
        ...node,
        id: nanoid(),
        children: node.children?.map(duplicateNode),
      };
    };

    const pasted = duplicateNode(clipboard);
    
    // If a node is selected, try to paste as sibling (after selected node)
    if (selectedNodeId) {
      const selectedPath = findNodePath(model.nodes, selectedNodeId);
      if (selectedPath) {
        const parentNode = getParentNode(model.nodes, selectedNodeId);
        
        // Validate semantic relationship with parent
        if (parentNode && !canAcceptChildWithContext(parentNode, pasted)) {
          toast({
            title: "❌ Colagem não permitida",
            description: getDropErrorMessage(parentNode, pasted),
            variant: "destructive",
          });
          return;
        }
        
        // Insert after selected node
        const newNodes = insertNodeAtPath(model.nodes, selectedPath, pasted, 'after');
        updateModel({ ...model, nodes: newNodes }, 'Paste node');
        
        toast({
          title: "📌 Elemento colado",
          description: `<${clipboard.tag}> inserido após elemento selecionado`,
        });
        return;
      }
    }
    
    // Fallback: paste at root level
    updateModel({
      ...model,
      nodes: [...model.nodes, pasted],
    }, 'Paste node');
    
    toast({
      title: "📌 Elemento colado",
      description: `<${clipboard.tag}> inserido no final`,
    });
  }, [clipboard, selectedNodeId, model, updateModel, toast]);

  // Arrow nudge handler
  const handleNudge = useCallback((direction: 'up' | 'down' | 'left' | 'right', shift: boolean) => {
    if (!selectedNodeId) return;
    
    const selectedNode = findNodeInTree(model.nodes, selectedNodeId);
    if (!selectedNode) return;

    const nudgeAmount = shift ? 10 : 1;
    const currentStyles = selectedNode.styles?.desktop || {};
    
    let updates: any = {};
    
    if (direction === 'left') {
      const currentLeft = parseInt(currentStyles.left as string || '0');
      updates.styles = {
        desktop: { ...currentStyles, position: 'relative', left: `${currentLeft - nudgeAmount}px` }
      };
    } else if (direction === 'right') {
      const currentLeft = parseInt(currentStyles.left as string || '0');
      updates.styles = {
        desktop: { ...currentStyles, position: 'relative', left: `${currentLeft + nudgeAmount}px` }
      };
    } else if (direction === 'up') {
      const currentTop = parseInt(currentStyles.top as string || '0');
      updates.styles = {
        desktop: { ...currentStyles, position: 'relative', top: `${currentTop - nudgeAmount}px` }
      };
    } else if (direction === 'down') {
      const currentTop = parseInt(currentStyles.top as string || '0');
      updates.styles = {
        desktop: { ...currentStyles, position: 'relative', top: `${currentTop + nudgeAmount}px` }
      };
    }
    
    handleUpdateNode(updates);
  }, [selectedNodeId, model.nodes, handleUpdateNode]);

  // Undo/Redo integration
  const handleUndo = useCallback(() => {
    const previousState = undo();
    if (previousState) {
      onChange(previousState);
    }
  }, [undo, onChange]);

  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState) {
      onChange(nextState);
    }
  }, [redo, onChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea or if focus is inside iframe
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      // Prevent keyboard events from iframes (they cause focus stealing and frozen shortcuts)
      if (target.tagName === 'IFRAME' || target.closest('iframe')) {
        return;
      }

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }

      // Copy/Cut/Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedNodeId) {
        e.preventDefault();
        handleCopyNode();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'x' && selectedNodeId) {
        e.preventDefault();
        handleCutNode();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboard) {
        e.preventDefault();
        handlePasteNode();
      }

      // Delete/Backspace - delete selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault();
        handleDeleteNode();
      }

      // Ctrl+D or Cmd+D - duplicate selected node
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedNodeId) {
        e.preventDefault();
        handleDuplicateNode();
      }

      // Arrow keys - nudge position
      if (e.key === 'ArrowLeft' && selectedNodeId) {
        e.preventDefault();
        handleNudge('left', e.shiftKey);
      }
      if (e.key === 'ArrowRight' && selectedNodeId) {
        e.preventDefault();
        handleNudge('right', e.shiftKey);
      }
      if (e.key === 'ArrowUp' && selectedNodeId) {
        e.preventDefault();
        handleNudge('up', e.shiftKey);
      }
      if (e.key === 'ArrowDown' && selectedNodeId) {
        e.preventDefault();
        handleNudge('down', e.shiftKey);
      }

      // Escape - deselect
      if (e.key === 'Escape' && selectedNodeId) {
        e.preventDefault();
        setSelectedNodeId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, clipboard, handleDeleteNode, handleDuplicateNode, handleCopyNode, handleCutNode, handlePasteNode, handleNudge, handleUndo, handleRedo]);

  // Prevent iframes from stealing focus (fixes keyboard shortcuts freezing)
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      
      // If an iframe gains focus, immediately refocus the canvas container
      if (target.tagName === 'IFRAME') {
        e.preventDefault();
        const canvasContainer = document.querySelector('[data-canvas-container]') as HTMLElement;
        if (canvasContainer) {
          canvasContainer.focus();
        }
      }
    };
    
    document.addEventListener('focusin', handleFocusIn, true); // Use capture phase
    return () => document.removeEventListener('focusin', handleFocusIn, true);
  }, []);

  // Drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    
    // Capture template being dragged
    const activeData = event.active.data.current;
    if (activeData?.kind === 'template') {
      setDraggedTemplate(activeData.template as PageNodeV4);
    } else {
      setDraggedTemplate(null);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    setOverId(over?.id as string | null);
    
    if (!over) {
      setDropValidation(null);
      return;
    }
    
    const activeData = active.data.current;
    const overData = over.data.current;
    
    // Get the dragged node (either template or existing node)
    let draggedNode: PageNodeV4 | null = null;
    
    if (activeData?.kind === 'template') {
      draggedNode = activeData.template as PageNodeV4;
    } else if (activeData?.kind === 'node') {
      draggedNode = findNodeInTree(model.nodes, activeData.nodeId);
    }
    
    if (!draggedNode || !overData || overData.kind !== 'node') {
      setDropValidation(null);
      return;
    }
    
    // Validate drop in real-time
    const position = overData.position || 'after';
    const validation = validateDrop(model.nodes, draggedNode, overData.nodeId, position);
    setDropValidation(validation);
  }, [model.nodes]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    // Block drop if validation failed
    if (dropValidation && !dropValidation.allowed) {
      toast({
        title: "Drop não permitido",
        description: dropValidation.reason || "Esta operação não é permitida",
        variant: "destructive",
      });
      
      setActiveId(null);
      setOverId(null);
      setDraggedTemplate(null);
      setDropValidation(null);
      return;
    }
    
    setActiveId(null);
    setOverId(null);
    setDraggedTemplate(null);
    setDropValidation(null);
    
    if (!over) return;
    
    const activeData = active.data.current;
    const overData = over.data.current;
    
    // Case 1: Dragging a template from toolbar
    if (activeData?.kind === 'template') {
      const newNode = activeData.template as PageNodeV4;
      
      // Drop on canvas root
      if (!overData) {
        updateModel({
          ...model,
          nodes: [...model.nodes, newNode],
        }, 'Drop template');
        return;
      }
      
      // Drop on a node
      if (overData.kind === 'node') {
        const targetPath = findNodePath(model.nodes, overData.nodeId);
        if (!targetPath) return;
        
        const targetNode = findNodeInTree(model.nodes, overData.nodeId);
        
        // If target can accept children and position is 'child', insert as child
        if (overData.position === 'child' && targetNode && canAcceptChild(targetNode)) {
          // Validate semantic relationship
          if (!canAcceptChildWithContext(targetNode, newNode)) {
            toast({
              title: "Drop não permitido",
              description: getDropErrorMessage(targetNode, newNode),
              variant: "destructive",
            });
            return;
          }
          const newNodes = insertNodeAtPath(model.nodes, targetPath, newNode, 'child');
          updateModel({ ...model, nodes: newNodes }, 'Drop template as child');
        } else {
          // Insert before/after - validate against parent
          const position = overData.position || 'after';
          const parentNode = getParentNode(model.nodes, overData.nodeId);
          
          // If has parent, validate semantic relationship
          if (parentNode && !canAcceptChildWithContext(parentNode, newNode)) {
            toast({
              title: "Drop não permitido",
              description: getDropErrorMessage(parentNode, newNode),
              variant: "destructive",
            });
            return;
          }
          
          const newNodes = insertNodeAtPath(model.nodes, targetPath, newNode, position);
          updateModel({ ...model, nodes: newNodes }, 'Drop template');
        }
      }
      return;
    }
    
    // Case 2: Moving an existing node
    if (activeData?.kind === 'node') {
      const sourcePath = findNodePath(model.nodes, activeData.nodeId);
      if (!sourcePath) return;
      
      // Remove from original position and get the removed node
      const { updatedTree, removedNode } = removeNodeByPathWithReturn(model.nodes, sourcePath);
      if (!removedNode) return;
      
      if (!overData) {
        // Drop on canvas root - reuse removed node directly
        updateModel({ ...model, nodes: [...updatedTree, removedNode] }, 'Move node');
        return;
      }
      
      if (overData.kind === 'node') {
        // Find new target path after removal
        const targetPath = findNodePath(updatedTree, overData.nodeId);
        if (!targetPath) return;
        
        const targetNode = findNodeInTree(updatedTree, overData.nodeId);
        
        // Insert at new position - reuse removed node directly
        let finalNodes: PageNodeV4[];
        if (overData.position === 'child' && targetNode && canAcceptChild(targetNode)) {
          // Validate semantic relationship
          if (!canAcceptChildWithContext(targetNode, removedNode)) {
            toast({
              title: "Drop não permitido",
              description: getDropErrorMessage(targetNode, removedNode),
              variant: "destructive",
            });
            // Don't restore - just cancel the operation
            return;
          }
          finalNodes = insertNodeAtPath(updatedTree, targetPath, removedNode, 'child');
        } else {
          // Insert before/after - validate against parent
          const position = overData.position || 'after';
          const parentNode = getParentNode(updatedTree, overData.nodeId);
          
          // If has parent, validate semantic relationship
          if (parentNode && !canAcceptChildWithContext(parentNode, removedNode)) {
            toast({
              title: "Drop não permitido",
              description: getDropErrorMessage(parentNode, removedNode),
              variant: "destructive",
            });
            // Don't restore - just cancel the operation
            return;
          }
          
          finalNodes = insertNodeAtPath(updatedTree, targetPath, removedNode, position);
        }
        
        updateModel({ ...model, nodes: finalNodes }, 'Move node');
      }
    }
  }, [model, updateModel, toast]);

  // CRITICAL: Always find fresh node from current model state
  const selectedNode = selectedNodeId ? findNodeInTree(model.nodes, selectedNodeId) : null;
  const activeNode = activeId ? findNodeInTree(model.nodes, activeId) : null;
  
  // Debug: Log selected node changes
  useEffect(() => {
    console.log('🎯 Selection changed:', { 
      selectedNodeId, 
      hasSelectedNode: !!selectedNode,
      tag: selectedNode?.tag 
    });
    
    if (selectedNode && selectedNode.tag === 'img') {
      console.log('🎯 Selected node updated:', {
        id: selectedNode.id,
        src: selectedNode.attributes?.src,
        responsiveAttributes: selectedNode.responsiveAttributes
      });
    }
  }, [selectedNode, selectedNodeId]);
  
  // Active node for drop indicator (either existing node or template being dragged)
  const dropIndicatorNode = draggedTemplate || activeNode;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
    <div className={`flex h-full ${className}`}>
      {/* Elements Toolbar */}
      {showElements && (
        <div className="w-56 border-r">
          <ElementsToolbarV4 onInsertElement={handleInsertElement} />
        </div>
      )}

      {/* Layers Panel */}
      {showLayers && (
        <div className="w-64 border-r bg-background overflow-auto">
          <LayersPanelV4
            nodes={model.nodes}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
          />
        </div>
      )}

      {/* Center - Canvas */}
      <div 
        id="page-builder-canvas" 
        data-canvas-container 
        tabIndex={0}
        className="flex-1 p-4 bg-gray-100 dark:bg-gray-900 overflow-auto relative focus:outline-none"
      >
        <div 
          className="mx-auto bg-white shadow-lg"
          style={{
            width: viewport === 'desktop' ? '100%' : viewport === 'tablet' ? '768px' : '375px',
            minHeight: '100vh'
          }}
        >
          <PageModelV4Renderer
            model={model}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
            onDuplicateNode={handleDuplicateNode}
            onDeleteNode={handleDeleteNode}
            onUpdateNode={handleUpdateNode}
            breakpoint={viewport}
          />
          
          {/* Overlays rendered outside PageModelV4Renderer for correct positioning */}
          {/* Selection Overlay with Label */}
          {selectedNodeId && (() => {
            const selectedNodeForOverlay = findNodeInTree(model.nodes, selectedNodeId);
            console.log('🔍 Rendering SelectionOverlay:', { selectedNodeId, tag: selectedNodeForOverlay?.tag });
            return (
              <SelectionOverlay
                nodeId={selectedNodeId}
                tag={selectedNodeForOverlay?.tag || 'div'}
                isVisible={true}
              />
            );
          })()}

          {/* Inline Text Toolbar for text elements */}
          {selectedNodeId && (() => {
            const selectedNode = findNodeInTree(model.nodes, selectedNodeId);
            const isTextElement = selectedNode && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'text'].includes(selectedNode.tag);
            
            if (isTextElement && selectedNode) {
              return (
                <InlineTextToolbar
                  node={selectedNode}
                  onUpdateStyle={(styleUpdates) => {
                    // Deep merge: preserve ALL existing style keys (pseudo-states, custom props, etc)
                    const currentStyles = selectedNode.styles || {};
                    
                    handleUpdateNode({
                      styles: {
                        ...currentStyles,
                        [viewport]: {
                          ...(currentStyles[viewport] || {}),
                          ...styleUpdates
                        }
                      }
                    });
                  }}
                  breakpoint={viewport}
                />
              );
            }
            return null;
          })()}
        </div>
      </div>

      {/* Right Sidebar - Properties Panel */}
      {showProperties && (
        <div className="w-80 border-l bg-background overflow-auto">
          <PropertiesPanelV4
            node={selectedNode}
            onUpdateNode={handleUpdateNode}
          />
        </div>
      )}
    </div>
    
    {/* Drop Indicator Layer */}
    <DropIndicatorLayer 
      canvasContainerId="visual-editor-canvas"
      activeNode={dropIndicatorNode}
      findNode={(nodeId) => findNodeInTree(model.nodes, nodeId)}
      nodes={model.nodes}
      validation={dropValidation}
    />
    
    {/* Drag Overlay */}
    <DragOverlay>
      {activeNode ? (
        <div className="bg-blue-600 text-white border-2 border-blue-700 rounded-md shadow-lg px-4 py-2">
          <span className="text-sm font-semibold flex items-center gap-2">
            <span className="text-xs opacity-75">{activeNode.tag}</span>
            {activeNode.classNames && activeNode.classNames.length > 0 && (
              <span className="text-xs opacity-60">.{activeNode.classNames[0]}</span>
            )}
          </span>
        </div>
      ) : null}
    </DragOverlay>
    </DndContext>
  );
}
