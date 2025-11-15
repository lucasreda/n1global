import { useState, useCallback, useEffect, useRef } from 'react';
import { PageModelV4, PageNodeV4, ResponsiveStylesV4 } from '@shared/schema';
import { PageModelV4Renderer } from './PageModelV4Renderer';
import { LayersPanelV4 } from './LayersPanelV4';
import { PropertiesPanelV4 } from './PropertiesPanelV4';
import { ElementsToolbarV4 } from './ElementsToolbarV4';
import { ComponentLibraryV4 } from './ComponentLibraryV4';
import { DropIndicatorLayer } from './DropIndicatorLayer';
import { SelectionOverlay } from './SelectionOverlay';
import { InlineTextToolbar } from './InlineTextToolbar';
import { HoverTooltip } from './HoverTooltip';
import { AlignmentGuides } from './AlignmentGuides';
import { useHistoryV4 } from './HistoryManagerV4';
import { nanoid } from 'nanoid';
import { isComponentInstance, addOverride } from '@/lib/componentInstance';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  MouseSensor,
  TouchSensor,
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
  showComponents?: boolean;
  className?: string;
  zoomLevel?: number;
  showGrid?: boolean;
  snapToGrid?: boolean;
  onSaveAsComponent?: (node: PageNodeV4) => void;
}

export function VisualEditorV4({ 
  model, 
  onChange, 
  viewport, 
  onViewportChange, 
  showElements = true,
  showLayers = false,
  showProperties = true,
  showComponents = false,
  className = "",
  zoomLevel = 100,
  showGrid = false,
  snapToGrid = false,
  onSaveAsComponent,
  savedComponents = [],
  onSaveComponent,
  onDeleteComponent,
  onInsertComponent
}: VisualEditorV4Props & {
  savedComponents?: any[];
  onSaveComponent?: (component: any) => void;
  onDeleteComponent?: (componentId: string) => void;
  onInsertComponent?: (node: PageNodeV4) => void;
}) {
  const { toast } = useToast();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [draggedTemplate, setDraggedTemplate] = useState<PageNodeV4 | null>(null);
  const [dropValidation, setDropValidation] = useState<{ allowed: boolean; reason?: string } | null>(null);
  const [clipboard, setClipboard] = useState<PageNodeV4 | null>(null);
  
  // History management
  const { addToHistory, undo, redo, canUndo, canRedo } = useHistoryV4(model);

  // Drag and drop sensors - using MouseSensor with optimized constraints
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5, // Increased from 3px to 5px to prevent accidental drags
        delay: 100, // Add small delay to differentiate click from drag
        tolerance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleSelectNode = useCallback((nodeId: string, modifiers?: { ctrlKey?: boolean; shiftKey?: boolean; metaKey?: boolean; altKey?: boolean }) => {
    console.log('🖱️ handleSelectNode called with:', nodeId, modifiers);
    
    if (modifiers?.altKey) {
      // Alt+Click - select parent element
      const parentNode = getParentNode(model.nodes, nodeId);
      if (parentNode) {
        setSelectedNodeIds(new Set([parentNode.id]));
        setSelectedNodeId(parentNode.id);
        toast({
          title: "Pai selecionado",
          description: `Selecionado: <${parentNode.tag}>`,
        });
      }
    } else if (modifiers?.ctrlKey || modifiers?.metaKey) {
      // Ctrl+Click - toggle selection
      setSelectedNodeIds(prev => {
        const next = new Set(prev);
        if (next.has(nodeId)) {
          next.delete(nodeId);
          setSelectedNodeId(null);
        } else {
          next.add(nodeId);
          setSelectedNodeId(nodeId);
        }
        return next;
      });
    } else if (modifiers?.shiftKey && selectedNodeIds.size > 0) {
      // Shift+Click - select range (if one node selected, select all between)
      // TODO: Implement range selection between selected nodes
      setSelectedNodeIds(prev => {
        const next = new Set(prev);
        next.add(nodeId);
        return next;
      });
      setSelectedNodeId(nodeId);
    } else {
      // Regular click - single selection
      setSelectedNodeIds(new Set([nodeId]));
      setSelectedNodeId(nodeId);
    }
  }, [selectedNodeIds, model.nodes, toast]);

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
  
  // Build breadcrumb path for selected node
  const buildBreadcrumb = useCallback((nodes: PageNodeV4[], targetId: string): { id: string; tag: string; label?: string }[] => {
    const result: { id: string; tag: string; label?: string }[] = [];
    
    const findPath = (nodeList: PageNodeV4[]): boolean => {
      for (const node of nodeList) {
        result.push({ id: node.id, tag: node.tag, label: node.textContent?.substring(0, 20) });
        
        if (node.id === targetId) {
          return true; // Found target
        }
        
        if (node.children && findPath(node.children)) {
          return true; // Found in children
        }
        
        result.pop(); // Remove if not in path
      }
      return false;
    };
    
    findPath(nodes);
    return result;
  }, []);

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
    
    const selectedNode = findNodeInTree(model.nodes, selectedNodeId);
    
    // If this is a component instance, apply updates as overrides
    if (selectedNode && isComponentInstance(selectedNode)) {
      let nodeWithOverrides = selectedNode;
      
      // Apply style overrides if styles are being updated
      if (updates.styles && viewport) {
        const styleOverrides = updates.styles[viewport] || {};
        nodeWithOverrides = addOverride(nodeWithOverrides, 'styles', viewport, styleOverrides);
      }
      
      // Apply attribute overrides
      if (updates.attributes) {
        nodeWithOverrides = addOverride(nodeWithOverrides, 'attributes', null, updates.attributes);
      }
      
      // Apply text content override
      if (updates.textContent !== undefined) {
        nodeWithOverrides = addOverride(nodeWithOverrides, 'textContent', null, updates.textContent);
      }
      
      // Apply responsive attributes override
      if (updates.responsiveAttributes) {
        nodeWithOverrides = addOverride(nodeWithOverrides, 'responsiveAttributes', null, updates.responsiveAttributes);
      }
      
      // Apply inline styles override
      if (updates.inlineStyles) {
        nodeWithOverrides = addOverride(nodeWithOverrides, 'inlineStyles', null, updates.inlineStyles);
      }
      
      // Update the node in tree
      const updatedNodes = updateNodeInTree(model.nodes, selectedNodeId, nodeWithOverrides);
      updateModel({
        ...model,
        nodes: updatedNodes,
      }, 'Override component instance');
    } else {
      // Regular update for non-instance nodes
      const updatedNodes = updateNodeInTree(model.nodes, selectedNodeId, updates);
      updateModel({
        ...model,
        nodes: updatedNodes,
      }, 'Update node');
    }
  }, [selectedNodeId, model, updateModel, viewport]);

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

  const handleSaveAsComponent = useCallback(() => {
    if (!selectedNodeId || !onSaveAsComponent) return;

    const selectedNode = findNodeInTree(model.nodes, selectedNodeId);
    if (!selectedNode) return;

    // Deep clone to avoid mutations
    const nodeToSave = JSON.parse(JSON.stringify(selectedNode));
    onSaveAsComponent(nodeToSave);
    
    toast({
      title: 'Componente selecionado',
      description: 'Abra a biblioteca de componentes para salvar',
    });
  }, [selectedNodeId, model.nodes, onSaveAsComponent, toast]);

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
      
      // Ctrl+A - select all elements
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const collectAllIds = (nodes: PageNodeV4[]): string[] => {
          const ids: string[] = [];
          const traverse = (n: PageNodeV4) => {
            ids.push(n.id);
            if (n.children) {
              n.children.forEach(traverse);
            }
          };
          nodes.forEach(traverse);
          return ids;
        };
        const allIds = collectAllIds(model.nodes);
        setSelectedNodeIds(new Set(allIds));
        if (allIds.length > 0) {
          setSelectedNodeId(allIds[allIds.length - 1]);
        }
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
      
      // Tab/Shift+Tab - navigate between elements
      if (e.key === 'Tab' && selectedNodeId) {
        e.preventDefault();
        const collectAllIds = (nodes: PageNodeV4[]): string[] => {
          const ids: string[] = [];
          const traverse = (n: PageNodeV4) => {
            ids.push(n.id);
            if (n.children) {
              n.children.forEach(traverse);
            }
          };
          nodes.forEach(traverse);
          return ids;
        };
        const allIds = collectAllIds(model.nodes);
        const currentIndex = allIds.indexOf(selectedNodeId);
        if (currentIndex !== -1) {
          const nextIndex = e.shiftKey 
            ? (currentIndex - 1 + allIds.length) % allIds.length
            : (currentIndex + 1) % allIds.length;
          const nextId = allIds[nextIndex];
          setSelectedNodeIds(new Set([nextId]));
          setSelectedNodeId(nextId);
        }
      }
      
      // Ctrl+G or Cmd+G - group selected elements
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && selectedNodeIds.size > 1) {
        e.preventDefault();
        toast({
          title: "Agrupar elementos",
          description: "Funcionalidade em desenvolvimento",
        });
      }
      
      // Ctrl+L or Cmd+L - lock/unlock selected element
      if ((e.ctrlKey || e.metaKey) && e.key === 'l' && selectedNodeId) {
        e.preventDefault();
        toast({
          title: "Bloquear elemento",
          description: "Funcionalidade em desenvolvimento",
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedNodeIds, clipboard, model.nodes, handleDeleteNode, handleDuplicateNode, handleCopyNode, handleCutNode, handlePasteNode, handleNudge, handleUndo, handleRedo, toast]);

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
    console.log('🎯 DRAG START:', event.active.id, event.active.data.current);
    setActiveId(event.active.id as string);
    
    // Capture template being dragged
    const activeData = event.active.data.current;
    if (activeData?.kind === 'template') {
      setDraggedTemplate(activeData.template as PageNodeV4);
      console.log('📦 Dragging template:', activeData.template);
    } else if (activeData?.kind === 'node') {
      setDraggedTemplate(null);
      console.log('📦 Dragging existing node:', activeData.nodeId);
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

      {/* Components Library Panel */}
      {showComponents && onSaveComponent && onDeleteComponent && onInsertComponent && (
        <div className="w-72 border-r bg-background overflow-auto">
          <ComponentLibraryV4
            components={savedComponents}
            selectedNode={findNodeInTree(model.nodes, selectedNodeId || '')}
            onSaveComponent={onSaveComponent}
            onDeleteComponent={onDeleteComponent}
            onInsertComponent={onInsertComponent}
          />
        </div>
      )}

      {/* Center - Canvas */}
      <div 
        id="page-builder-canvas" 
        data-canvas-container 
        tabIndex={0}
        className="flex-1 p-4 bg-gray-100 dark:bg-gray-900 overflow-auto relative focus:outline-none"
        style={{
          transform: `scale(${(zoomLevel || 100) / 100})`,
          transformOrigin: 'top center'
        }}
      >
        {/* Grid Overlay */}
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none opacity-5"
            style={{
              backgroundImage: `
                linear-gradient(to right, #000 1px, transparent 1px),
                linear-gradient(to bottom, #000 1px, transparent 1px)
              `,
              backgroundSize: '16px 16px'
            }}
          />
        )}
        
        <div 
          className="mx-auto bg-white shadow-lg relative"
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
            savedComponents={savedComponents}
          />
          
          {/* Overlays rendered outside PageModelV4Renderer for correct positioning */}
          {/* Selection Overlay with Label and Controls */}
          {selectedNodeId && (() => {
            const selectedNodeForOverlay = findNodeInTree(model.nodes, selectedNodeId);
            const breadcrumbPath = buildBreadcrumb(model.nodes, selectedNodeId);
            console.log('🔍 Rendering SelectionOverlay:', { selectedNodeId, tag: selectedNodeForOverlay?.tag, breadcrumb: breadcrumbPath.length });
            return (
              <SelectionOverlay
                nodeId={selectedNodeId}
                tag={selectedNodeForOverlay?.tag || 'div'}
                isVisible={true}
                onDuplicate={handleDuplicateNode}
                onDelete={handleDeleteNode}
                onSaveAsComponent={onSaveAsComponent ? handleSaveAsComponent : undefined}
                breadcrumb={breadcrumbPath}
                onSelectParent={handleSelectNode}
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
            savedComponents={savedComponents}
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

    {/* Alignment Guides - Shows alignment lines when dragging */}
    <AlignmentGuides
      canvasContainerId="visual-editor-canvas"
      draggedElementId={activeId ? (findNodeInTree(model.nodes, activeId)?.id || null) : null}
      activeId={activeId}
      showGrid={showGrid}
      gridSize={16}
      snapToGrid={snapToGrid}
    />
    
    {/* Drag Overlay - Shows visual preview of dragged element */}
    <DragOverlay dropAnimation={null}>
      {activeNode ? (
        <div className="opacity-80 pointer-events-none shadow-2xl border-2 border-blue-500 rounded">
          <PageModelV4Renderer
            model={{
              ...model,
              nodes: [activeNode]
            }}
            selectedNodeId={null}
            onSelectNode={() => {}}
            breakpoint={viewport}
          />
        </div>
      ) : null}
    </DragOverlay>
    </DndContext>
  );
}
