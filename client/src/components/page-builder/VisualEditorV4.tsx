import { useState, useCallback, useEffect } from 'react';
import { PageModelV4, PageNodeV4, ResponsiveStylesV4 } from '@shared/schema';
import { PageModelV4Renderer } from './PageModelV4Renderer';
import { LayersPanelV4 } from './LayersPanelV4';
import { PropertiesPanelV4 } from './PropertiesPanelV4';
import { ElementsToolbarV4 } from './ElementsToolbarV4';
import { DropIndicatorLayer } from './DropIndicatorLayer';
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

  const handleUpdateNode = useCallback((updates: Partial<PageNodeV4>) => {
    if (!selectedNodeId) return;
    
    const updatedNodes = updateNodeInTree(model.nodes, selectedNodeId, updates);
    onChange({
      ...model,
      nodes: updatedNodes,
    });
  }, [selectedNodeId, model, onChange]);

  const handleInsertElement = useCallback((node: PageNodeV4) => {
    onChange({
      ...model,
      nodes: [...model.nodes, node],
    });
  }, [model, onChange]);

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

    onChange({
      ...model,
      nodes: deleteFromTree(model.nodes),
    });
    
    setSelectedNodeId(null);
  }, [selectedNodeId, model, onChange]);

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
    onChange({
      ...model,
      nodes: [...model.nodes, duplicated],
    });
  }, [selectedNodeId, model, onChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
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

      // Escape - deselect
      if (e.key === 'Escape' && selectedNodeId) {
        e.preventDefault();
        setSelectedNodeId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, handleDeleteNode, handleDuplicateNode]);

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
        onChange({
          ...model,
          nodes: [...model.nodes, newNode],
        });
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
          onChange({ ...model, nodes: newNodes });
        } else {
          // Insert before/after - validate against parent
          const position = overData.position || 'after';
          const parentNode = getParentNode(model.nodes, overData.nodeId);
          
          console.log('🔍 DROP BEFORE/AFTER VALIDATION:', {
            position,
            targetNodeId: overData.nodeId,
            parentNode: parentNode ? { id: parentNode.id, tag: parentNode.tag } : null,
            newNodeTag: newNode.tag,
            hasParent: !!parentNode
          });
          
          // If has parent, validate semantic relationship
          if (parentNode && !canAcceptChildWithContext(parentNode, newNode)) {
            console.log('❌ DROP BLOCKED:', {
              parentTag: parentNode.tag,
              childTag: newNode.tag,
              reason: getDropErrorMessage(parentNode, newNode)
            });
            toast({
              title: "Drop não permitido",
              description: getDropErrorMessage(parentNode, newNode),
              variant: "destructive",
            });
            return;
          }
          
          console.log('✅ DROP ALLOWED');
          
          const newNodes = insertNodeAtPath(model.nodes, targetPath, newNode, position);
          onChange({ ...model, nodes: newNodes });
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
        onChange({ ...model, nodes: [...updatedTree, removedNode] });
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
            // Restore node to original position
            onChange({ ...model, nodes: model.nodes });
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
            // Restore node to original position
            onChange({ ...model, nodes: model.nodes });
            return;
          }
          
          finalNodes = insertNodeAtPath(updatedTree, targetPath, removedNode, position);
        }
        
        onChange({ ...model, nodes: finalNodes });
      }
    }
  }, [model, onChange]);

  const selectedNode = selectedNodeId ? findNodeInTree(model.nodes, selectedNodeId) : null;
  const activeNode = activeId ? findNodeInTree(model.nodes, activeId) : null;
  
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
      <div id="visual-editor-canvas" className="flex-1 p-4 bg-gray-100 dark:bg-gray-900 overflow-auto relative">
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
            breakpoint={viewport}
          />
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
