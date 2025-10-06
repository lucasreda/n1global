import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  closestCenter,
  CollisionDetection,
  rectIntersection
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { PageModelV2, BlockSection, BlockRow, BlockColumn, BlockElement } from "@shared/schema";
import { createDefaultTheme, ElementRenderer } from './PageRenderer';
import { createDefaultElement, getElementIcon } from './elements/utils';
import { FloatingToolbar, StylesPanel, calculateToolbarPosition } from './FloatingToolbar';
import { AdvancedPropertiesPanel } from './AdvancedPropertiesPanel';
import { BreakpointSelector, Breakpoint } from './BreakpointSelector';
import { LayersPanel } from './LayersPanel';
import { Type, FileText, RectangleHorizontal, Image, Video, FileInput, Space, Minus, Monitor, Tablet, Smartphone, Plus, GripVertical, Trash2, Copy, Layout, Star, Users, MessageCircle, Mail, Box, Grid3X3, Images } from 'lucide-react';

interface VisualEditorProps {
  model: PageModelV2;
  onChange: (model: PageModelV2) => void;
  viewport: 'desktop' | 'tablet' | 'mobile';
  onViewportChange: (viewport: 'desktop' | 'tablet' | 'mobile') => void;
  className?: string;
}

export function VisualEditor({ model, onChange, viewport, onViewportChange, className = "" }: VisualEditorProps) {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null);
  const [isStylesPanelOpen, setIsStylesPanelOpen] = useState(false);
  const [selectedElement, setSelectedElement] = useState<BlockElement | null>(null);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);


  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  // Custom collision detection that prioritizes drop zones over elements
  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    const { droppableContainers } = args;
    
    // Get all intersections using rect intersection
    const intersections = rectIntersection(args);
    
    if (intersections.length === 0) {
      return [];
    }

    // Priority order: block-column-zone > element-zone > section-drop-zone > drop-zone > column > container > section > element
    const priorityOrder = ['block-column-zone', 'element-zone', 'section-drop-zone', 'drop-zone', 'column', 'container', 'section', 'element'];
    
    // Sort intersections by priority
    const sortedIntersections = intersections.sort((a, b) => {
      const aContainer = Array.from(droppableContainers.values()).find(c => c.id === a.id);
      const bContainer = Array.from(droppableContainers.values()).find(c => c.id === b.id);
      
      const aType = aContainer?.data.current?.type || 'element';
      const bType = bContainer?.data.current?.type || 'element';
      
      const aPriority = priorityOrder.indexOf(aType);
      const bPriority = priorityOrder.indexOf(bType);
      
      return aPriority - bPriority;
    });

    console.log('🎯 Collision Detection:', {
      total: intersections.length,
      sorted: sortedIntersections.map(i => ({ 
        id: i.id, 
        type: Array.from(droppableContainers.values()).find(c => c.id === i.id)?.data.current?.type 
      })),
      selected: sortedIntersections[0]?.id
    });

    return [sortedIntersections[0]];
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    console.log('🚀 Drag Start Event:', { id: active.id, data: active.data.current });
    setDraggedItem(active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedItem(null);

    console.log('🎯 Drag End Event:', { 
      active: { id: active.id, data: active.data.current }, 
      over: over ? { id: over.id, data: over.data.current } : null 
    });

    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Handle section reordering
    if (activeData?.type === 'section' && overData?.type === 'section') {
      const activeIndex = model.sections.findIndex(s => s.id === active.id);
      const overIndex = model.sections.findIndex(s => s.id === over.id);

      if (activeIndex !== -1 && overIndex !== -1) {
        const newSections = arrayMove(model.sections, activeIndex, overIndex);
        onChange({
          ...model,
          sections: newSections,
        });
      }
    }

    // Handle element reordering within columns
    if (activeData?.type === 'element' && overData?.type === 'element') {
      const newModel = moveElement(model, active.id as string, overData.columnId);
      onChange(newModel);
    }

    // Handle moving existing element to block columns
    if (activeData?.type === 'element' && overData?.type === 'block-column-zone') {
      const newModel = moveElementToBlockColumn(model, active.id as string, overData.elementId, overData.columnIndex, overData.position);
      onChange(newModel);
    }

    // Handle moving existing element to structural elements (blocks/containers)
    if (activeData?.type === 'element' && overData?.type === 'element-zone') {
      const newModel = moveElementToStructuralElement(model, active.id as string, overData.elementId, overData.position);
      onChange(newModel);
    }

    // Handle moving existing element to containers
    if (activeData?.type === 'element' && overData?.type === 'container') {
      const newModel = moveElementToContainer(model, active.id as string, overData.containerId);
      onChange(newModel);
    }

    // Handle adding new element to block columns
    if (activeData?.type === 'new-element' && overData?.type === 'block-column-zone') {
      const newElement = createDefaultElement(activeData.elementType);
      const newModel = addElementToBlockColumn(model, newElement, overData.elementId, overData.columnIndex, overData.position);
      onChange(newModel);
    }

    // Handle adding new element to structural elements (blocks/containers)
    if (activeData?.type === 'new-element' && overData?.type === 'element-zone') {
      const newElement = createDefaultElement(activeData.elementType);
      const newModel = addElementToStructuralElement(model, newElement, overData.elementId, overData.position);
      onChange(newModel);
    }

    // Handle adding new element from toolbar to drop zones (precise positioning)
    if (activeData?.type === 'new-element' && overData?.type === 'drop-zone') {
      const newElement = createDefaultElement(activeData.elementType);
      const newModel = addElementToColumn(model, newElement, overData.columnId, overData.position);
      onChange(newModel);
    }

    // Handle adding new element from toolbar to columns (fallback)
    if (activeData?.type === 'new-element' && overData?.type === 'column') {
      const newElement = createDefaultElement(activeData.elementType);
      const newModel = addElementToColumn(model, newElement, overData.columnId);
      onChange(newModel);
    }

    // Handle moving element to structural elements
    if (activeData?.type === 'element' && overData?.type === 'element-zone') {
      const newModel = moveElementToStructuralElement(model, active.id as string, overData.elementId, overData.position);
      onChange(newModel);
    }

    // Handle adding new element from toolbar to containers/blocks
    if (activeData?.type === 'new-element' && overData?.type === 'container') {
      const newElement = createDefaultElement(activeData.elementType);
      const newModel = addElementToContainer(model, newElement, overData.containerId);
      onChange(newModel);
    }

    // Handle element reordering within containers/blocks
    if (activeData?.type === 'element' && overData?.type === 'container') {
      const newModel = moveElementToContainer(model, active.id as string, overData.containerId);
      onChange(newModel);
    }

    // Handle moving existing element to section drop zones
    if (activeData?.type === 'element' && overData?.type === 'section-drop-zone') {
      const newModel = moveElementToSectionDropZone(model, active.id as string, overData.columnId, overData.position);
      onChange(newModel);
    }

    // Handle adding new element to section drop zones
    if (activeData?.type === 'new-element' && overData?.type === 'section-drop-zone') {
      const newElement = createDefaultElement(activeData.elementType);
      const newModel = addElementToColumn(model, newElement, overData.columnId, overData.position);
      onChange(newModel);
    }

    // Handle moving existing element to section (fallback)
    if (activeData?.type === 'element' && overData?.type === 'section') {
      const newModel = moveElementToSection(model, active.id as string, over.id as string);
      onChange(newModel);
    }
  };

  const addSection = useCallback(() => {
    const newSection: BlockSection = {
      id: `section_${Date.now()}`,
      type: 'content',
      name: 'Nova Seção',
      rows: [{
        id: `row_${Date.now()}`,
        columns: [{
          id: `column_${Date.now()}`,
          width: 'full',
          elements: [],
          styles: {},
        }],
        styles: {},
      }],
      styles: {
        padding: '2rem 0',
      },
      settings: {
        containerWidth: 'container',
      },
    };

    onChange({
      ...model,
      sections: [...model.sections, newSection],
    });
  }, [model, onChange]);

  const deleteSection = useCallback((sectionId: string) => {
    onChange({
      ...model,
      sections: model.sections.filter(s => s.id !== sectionId),
    });
  }, [model, onChange]);

  const duplicateSection = useCallback((sectionId: string) => {
    const sectionIndex = model.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;

    const originalSection = model.sections[sectionIndex];
    
    // Create a deep copy with new IDs
    const duplicatedSection: BlockSection = {
      ...originalSection,
      id: `section_${Date.now()}`,
      name: `${originalSection.name} (Cópia)`,
      rows: originalSection.rows.map(row => ({
        ...row,
        id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        columns: row.columns.map(column => ({
          ...column,
          id: `column_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          elements: column.elements.map(element => ({
            ...element,
            id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          }))
        }))
      }))
    };

    // Insert the duplicated section right after the original
    const newSections = [...model.sections];
    newSections.splice(sectionIndex + 1, 0, duplicatedSection);
    
    onChange({
      ...model,
      sections: newSections,
    });
  }, [model, onChange]);

  // Memoize hover handlers to prevent infinite loops
  const handleHoverSection = useCallback((sectionId: string | null) => {
    setHoveredSectionId(sectionId);
  }, []);

  const handleSelectElement = useCallback((elementId: string | null) => {
    setSelectedElementId(elementId);
    setSelectedSectionId(null); // Deselect section when selecting element
  }, []);

  const handleSelectSection = useCallback((sectionId: string | null) => {
    setSelectedSectionId(sectionId);
    setSelectedElementId(null); // Deselect element when selecting section
  }, []);

  const updateElement = useCallback((elementId: string, updates: Partial<BlockElement>) => {
    const newModel = updateElementInModel(model, elementId, updates);
    onChange(newModel);
  }, [model, onChange]);

  const updateSection = useCallback((sectionId: string, updates: Partial<BlockSection>) => {
    const newModel = updateSectionInModel(model, sectionId, updates);
    onChange(newModel);
  }, [model, onChange]);

  // Update selected element and toolbar position when selection changes
  useEffect(() => {
    if (selectedElementId) {
      const element = findElementById(model, selectedElementId);
      setSelectedElement(element);
      
      // Calculate toolbar position
      const elementNode = document.querySelector(`[data-element-id="${selectedElementId}"]`);
      if (elementNode) {
        const rect = elementNode.getBoundingClientRect();
        const position = calculateToolbarPosition(rect);
        setToolbarPosition(position);
      } else {
        setToolbarPosition(null);
      }
    } else {
      setSelectedElement(null);
      setToolbarPosition(null);
    }
  }, [selectedElementId, model]);

  // Toolbar action handlers
  const handleUpdateElement = useCallback((element: BlockElement) => {
    updateElement(element.id, element);
  }, [updateElement]);

  const handleDeleteElement = useCallback(() => {
    if (selectedElementId) {
      const newModel = deleteElementInModel(model, selectedElementId);
      onChange(newModel);
      setSelectedElementId(null);
    }
  }, [selectedElementId, model, onChange]);

  const handleDuplicateElement = useCallback(() => {
    if (selectedElement) {
      const newElement = {
        ...selectedElement,
        id: `element_${Date.now()}`,
      };
      const newModel = duplicateElementInModel(model, selectedElementId!, newElement);
      onChange(newModel);
    }
  }, [selectedElement, selectedElementId, model, onChange]);

  const handleMoveElement = useCallback((direction: 'up' | 'down') => {
    if (selectedElementId) {
      const newModel = moveElementInColumn(model, selectedElementId, direction);
      onChange(newModel);
    }
  }, [selectedElementId, model, onChange]);

  const handleToggleFormat = useCallback((format: 'bold' | 'italic' | 'underline') => {
    if (selectedElement) {
      const currentStyles = selectedElement.styles || {};
      const updates: Partial<BlockElement> = {
        styles: {
          ...currentStyles,
          fontWeight: format === 'bold' ? (currentStyles.fontWeight === '700' ? '400' : '700') : currentStyles.fontWeight,
          fontStyle: format === 'italic' ? (currentStyles.fontStyle === 'italic' ? 'normal' : 'italic') : currentStyles.fontStyle,
          textDecoration: format === 'underline' ? (currentStyles.textDecoration === 'underline' ? 'none' : 'underline') : currentStyles.textDecoration,
        }
      };
      updateElement(selectedElementId!, updates);
    }
  }, [selectedElement, selectedElementId, updateElement]);

  const handleAlignText = useCallback((alignment: 'left' | 'center' | 'right') => {
    if (selectedElement) {
      const updates: Partial<BlockElement> = {
        styles: {
          ...selectedElement.styles,
          textAlign: alignment,
        }
      };
      updateElement(selectedElementId!, updates);
    }
  }, [selectedElement, selectedElementId, updateElement]);

  return (
    <div 
      className={`visual-editor ${className}`} 
      data-testid="visual-editor"
      style={{ 
        height: '100%', 
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1" style={{ height: '100%', minHeight: '100%' }}>
          {/* Elements Toolbar */}
          <ElementsToolbar />

          {/* Layers Panel */}
          <LayersPanel
            sections={model.sections}
            selectedElementId={selectedElementId}
            selectedSectionId={selectedSectionId}
            onSelectElement={handleSelectElement}
            onSelectSection={handleSelectSection}
            onUpdateSection={updateSection}
            onUpdateElement={updateElement}
            onDeleteElement={(elementId) => {
              const newModel = deleteElementInModel(model, elementId);
              onChange(newModel);
              if (selectedElementId === elementId) {
                setSelectedElementId(null);
              }
            }}
            onDeleteSection={deleteSection}
            onDuplicateElement={(elementId) => {
              const element = findElementById(model, elementId);
              if (element) {
                const newElement = {
                  ...element,
                  id: `element_${Date.now()}`,
                };
                const newModel = duplicateElementInModel(model, elementId, newElement);
                onChange(newModel);
              }
            }}
            onDuplicateSection={duplicateSection}
            data-testid="visual-editor-layers-panel"
          />

          {/* Main Editor Canvas */}
          <div 
            className="flex-1 flex flex-col bg-background overflow-hidden"
            style={{ 
              height: '100%', 
              minHeight: '100%'
            }}
          >
            {/* Breakpoint Selector */}
            <div className="border-b border-border p-3">
              <BreakpointSelector
                activeBreakpoint={viewport as Breakpoint}
                onChange={(bp) => onViewportChange(bp)}
                data-testid="visual-editor-breakpoint-selector"
              />
            </div>
            
            {/* Page Frame */}
            <div className="flex-1 overflow-auto p-6">
              <PageFrame 
                viewport={viewport}
                model={model}
                selectedElementId={selectedElementId}
                selectedSectionId={selectedSectionId}
                hoveredSectionId={hoveredSectionId}
                onSelectElement={handleSelectElement}
                onSelectSection={handleSelectSection}
                onHoverSection={handleHoverSection}
                onUpdateElement={updateElement}
                onDeleteSection={deleteSection}
                onDuplicateSection={duplicateSection}
                onAddSection={addSection}
                draggedItem={draggedItem}
              />
            </div>
          </div>

          {/* Advanced Properties Panel */}
          <AdvancedPropertiesPanel
            selectedElement={selectedElementId ? findElementById(model, selectedElementId) : null}
            selectedSection={selectedSectionId ? model.sections.find(s => s.id === selectedSectionId) : null}
            activeBreakpoint={viewport as Breakpoint}
            onUpdateElement={updateElement}
            onUpdateSection={updateSection}
            data-testid="visual-editor-properties-panel"
          />
        </div>

        <DragOverlay>
          {draggedItem && <DragOverlayContent item={draggedItem} />}
        </DragOverlay>
      </DndContext>

      {/* Floating Toolbar */}
      <FloatingToolbar
        element={selectedElement}
        position={toolbarPosition}
        onUpdateElement={handleUpdateElement}
        onDeleteElement={handleDeleteElement}
        onDuplicateElement={handleDuplicateElement}
        onMoveElement={handleMoveElement}
        onOpenStylePanel={() => setIsStylesPanelOpen(true)}
        onToggleFormat={handleToggleFormat}
        onAlignText={handleAlignText}
      />

      {/* Styles Panel */}
      {selectedElement && (
        <StylesPanel
          element={selectedElement}
          isOpen={isStylesPanelOpen}
          onClose={() => setIsStylesPanelOpen(false)}
          onUpdateElement={handleUpdateElement}
        />
      )}
    </div>
  );
}

// Modern Sortable Row Component (used by EnhancedSortableSection)
interface SortableRowProps {
  row: BlockRow;
  theme: PageModelV2['theme'];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (elementId: string, updates: Partial<BlockElement>) => void;
  viewport: 'desktop' | 'tablet' | 'mobile';
}

function SortableRow({ row, theme, selectedElementId, onSelectElement, onUpdateElement, viewport }: SortableRowProps) {
  return (
    <div
      className="flex flex-wrap w-full mb-4"
      style={{
        gap: row.styles?.gap || '1rem',
        ...row.styles,
      }}
      data-testid={`row-${row.id}`}
    >
      {row.columns.map((column) => (
        <ModernColumn
          key={column.id}
          column={column}
          theme={theme}
          selectedElementId={selectedElementId}
          onSelectElement={onSelectElement}
          onUpdateElement={onUpdateElement}
          viewport={viewport}
        />
      ))}
    </div>
  );
}

// Modern Column Component (droppable-only, no sortable)
interface ModernColumnProps {
  column: BlockColumn;
  theme: PageModelV2['theme'];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (elementId: string, updates: Partial<BlockElement>) => void;
  viewport: 'desktop' | 'tablet' | 'mobile';
}

function ModernColumn({ column, theme, selectedElementId, onSelectElement, onUpdateElement, viewport }: ModernColumnProps) {
  const widthClasses = {
    'full': 'w-full',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
    '2/3': 'w-2/3',
    '1/4': 'w-1/4',
    '3/4': 'w-3/4',
  };

  return (
    <div
      className={`${widthClasses[column.width as keyof typeof widthClasses] || 'w-full'} min-h-20 p-3 border border-dashed border-border/30 rounded-lg transition-colors hover:border-primary/50`}
      data-testid={`column-${column.id}`}
    >
      <SortableContext
        items={column.elements.map(e => e.id)}
        strategy={verticalListSortingStrategy}
      >
        {/* Drop zone at the beginning */}
        <DropZone
          id={`${column.id}-start`}
          columnId={column.id}
          position={0}
        />

        {column.elements.map((element, index) => (
          <div key={element.id}>
            <ModernElement
              element={element}
              theme={theme}
              isSelected={selectedElementId === element.id}
              onSelect={() => onSelectElement(element.id)}
              onUpdate={onUpdateElement}
              viewport={viewport}
            />
            {/* Drop zone after each element */}
            <DropZone
              id={`${column.id}-${index + 1}`}
              columnId={column.id}
              position={index + 1}
            />
          </div>
        ))}
      </SortableContext>

      {column.elements.length === 0 && (
        <DropZone
          id={`${column.id}-empty`}
          columnId={column.id}
          position={0}
          isEmpty={true}
        />
      )}
    </div>
  );
}

// Drop Zone Component for precise insertion
interface DropZoneProps {
  id: string;
  columnId: string;
  position: number;
  isEmpty?: boolean;
}

function DropZone({ id, columnId, position, isEmpty = false }: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'drop-zone',
      columnId,
      position,
    },
  });

  if (isEmpty) {
    return (
      <div
        ref={setNodeRef}
        className={`flex flex-col items-center justify-center py-6 text-center text-muted-foreground ${
          isOver ? 'bg-primary/10 border-primary' : ''
        } rounded-md transition-colors`}
      >
        <Plus size={16} className="mb-2 opacity-50" />
        <span className="text-xs">
          {isOver ? 'Solte o elemento aqui!' : 'Adicionar elementos'}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`h-2 transition-colors ${
        isOver ? 'bg-primary/20' : 'transparent'
      }`}
      style={{
        marginTop: position === 0 ? 0 : '4px',
        marginBottom: '4px',
      }}
    />
  );
}

// Modern Element Component
interface ModernElementProps {
  element: BlockElement;
  theme: PageModelV2['theme'];
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (elementId: string, updates: Partial<BlockElement>) => void;
  viewport: 'desktop' | 'tablet' | 'mobile';
}

const ModernElement = React.memo(function ModernElement({ 
  element, 
  theme, 
  isSelected, 
  onSelect, 
  onUpdate,
  viewport 
}: ModernElementProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: element.id,
    data: {
      type: 'element',
      element,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleUpdate = useCallback((updates: Partial<BlockElement>) => {
    onUpdate(element.id, updates);
  }, [element.id, onUpdate]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Impede que o clique seja propagado para a seção
    onSelect();
  }, [onSelect]);

  // Check if element is structural (can contain other elements)
  const isStructural = element.type === 'container' || element.type === 'block';

  if (isStructural) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`mb-2 relative group cursor-pointer rounded-md transition-colors ${
          isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/20'
        }`}
        onClick={handleClick}
        data-testid={`element-${element.id}`}
        data-element-id={element.id}
      >
        <StructuralElementRenderer
          element={element}
          theme={theme}
          isSelected={isSelected}
          onUpdate={handleUpdate}
          viewport={viewport}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`mb-2 relative group cursor-pointer rounded-md transition-colors ${
        isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/20'
      }`}
      onClick={handleClick}
      data-testid={`element-${element.id}`}
      data-element-id={element.id}
    >
      <ElementRenderer 
        element={element} 
        theme={theme} 
        editorMode={true}
        isSelected={isSelected}
        onUpdate={handleUpdate}
        viewport={viewport}
      />
    </div>
  );
});

// Structural Element Renderer with nested drop zones
interface StructuralElementRendererProps {
  element: BlockElement;
  theme: PageModelV2['theme'];
  isSelected: boolean;
  onUpdate: (updates: Partial<BlockElement>) => void;
  viewport: 'desktop' | 'tablet' | 'mobile';
}

function StructuralElementRenderer({ element, theme, isSelected, onUpdate, viewport }: StructuralElementRendererProps) {
  const children = element.children || [];
  const isBlock = element.type === 'block';
  const isContainer = element.type === 'container';
  const hasColumns = isBlock && element.config?.columns && element.config.columns > 1;

  // If it's a block with columns configured, render custom columns with drop zones
  if (hasColumns) {
    const columnCount = element.config!.columns!;
    const columnWidths = element.config!.columnWidths || Array(columnCount).fill(`${100/columnCount}%`);
    
    // Apply element styles to main container with defaults based on type
    const defaultStyles = isContainer ? {
      padding: '2rem',
      margin: '2rem 0', 
      backgroundColor: '#f8fafc',
      border: '2px dashed #cbd5e1',
      borderRadius: '0.5rem',
      minHeight: '100px',
    } : {
      padding: '1rem',
      margin: '1rem 0',
      backgroundColor: '#f1f5f9', 
      border: '2px dashed #94a3b8',
      borderRadius: '0.5rem',
      minHeight: '100px',
    };

    const elementStyles = {
      padding: element.styles?.padding || defaultStyles.padding,
      margin: element.styles?.margin || defaultStyles.margin,
      backgroundColor: element.styles?.backgroundColor || defaultStyles.backgroundColor,
      border: element.styles?.border || defaultStyles.border,
      borderRadius: element.styles?.borderRadius || defaultStyles.borderRadius,
      minHeight: element.styles?.minHeight || defaultStyles.minHeight,
    };

    const elementTypeLabel = 'Bloco';

    return (
      <div className="structural-element" style={elementStyles}>
        {/* Element header/title if any */}
        {element.props?.title && (
          <div className="mb-2 font-semibold text-sm text-gray-600">
            {element.props.title}
          </div>
        )}
        
        {/* Columns layout - REPLACE original rendering */}
        <div className="flex gap-2 h-full">
          {Array.from({ length: columnCount }, (_, index) => {
            // Get elements for this column from children array
            const columnElements = children.filter((child, childIndex) => 
              childIndex % columnCount! === index
            );
            
            return (
              <div 
                key={index}
                className="flex-1 min-h-16 p-2 border border-dashed border-gray-300 rounded bg-white/50"
                style={{ width: columnWidths[index] }}
              >
                <div className="text-xs text-gray-500 mb-2">Coluna {index + 1}</div>
                
                {/* Drop zone at the beginning of column */}
                <BlockColumnDropZone
                  id={`${element.id}-col-${index}-start`}
                  elementId={element.id}
                  columnIndex={index}
                  position={0}
                />

                {columnElements.map((child, childIndex) => {
                  const actualPosition = Math.floor(children.indexOf(child) / columnCount!) * columnCount! + index;
                  return (
                    <div key={child.id}>
                      <ModernElement
                        element={child}
                        theme={theme}
                        isSelected={isSelected}
                        onSelect={() => {}}
                        onUpdate={(elementId, updates) => onUpdate(updates)}
                        viewport={viewport}
                      />
                      {/* Drop zone after each element in column */}
                      <BlockColumnDropZone
                        id={`${element.id}-col-${index}-${childIndex + 1}`}
                        elementId={element.id}
                        columnIndex={index}
                        position={actualPosition + columnCount!}
                      />
                    </div>
                  );
                })}

                {columnElements.length === 0 && (
                  <BlockColumnDropZone
                    id={`${element.id}-col-${index}-empty`}
                    elementId={element.id}
                    columnIndex={index}
                    position={index}
                    isEmpty={true}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // For containers, render without the element wrapper to avoid duplication
  if (isContainer) {
    const containerStyles = {
      display: element.styles?.display || 'block',
      padding: element.styles?.padding || theme.spacing.md,
      backgroundColor: element.styles?.backgroundColor || 'transparent',
      border: '2px dashed #cbd5e1',
      borderRadius: '0.5rem',
      minHeight: children.length === 0 ? '80px' : 'auto',
    };

    return (
      <div className="structural-element" style={containerStyles}>
        {/* Drop zone at the beginning */}
        <ElementDropZone
          id={`${element.id}-start`}
          elementId={element.id}
          position={0}
        />

        {children.map((child, index) => (
          <div key={child.id}>
            <ModernElement
              element={child}
              theme={theme}
              isSelected={isSelected}
              onSelect={() => {}}
              onUpdate={(elementId, updates) => onUpdate(updates)}
              viewport={viewport}
            />
            {/* Drop zone after each child */}
            <ElementDropZone
              id={`${element.id}-${index + 1}`}
              elementId={element.id}
              position={index + 1}
            />
          </div>
        ))}

        {children.length === 0 && (
          <ElementDropZone
            id={`${element.id}-empty`}
            elementId={element.id}
            position={0}
            isEmpty={true}
          />
        )}
      </div>
    );
  }

  // For blocks without columns, use simple nested element layout  
  return (
    <div className="structural-element">
      <ElementRenderer 
        element={element} 
        theme={theme} 
        editorMode={true}
        isSelected={isSelected}
        onUpdate={onUpdate}
        viewport={viewport}
      />
      
      {/* Container for nested elements */}
      <div className="p-2 border-2 border-dashed border-border/20 rounded mt-2">
        {/* Drop zone at the beginning */}
        <ElementDropZone
          id={`${element.id}-start`}
          elementId={element.id}
          position={0}
        />

        {children.map((child, index) => (
          <div key={child.id}>
            <ModernElement
              element={child}
              theme={theme}
              isSelected={isSelected}
              onSelect={() => {}}
              onUpdate={(elementId, updates) => onUpdate(updates)}
              viewport={viewport}
            />
            {/* Drop zone after each child */}
            <ElementDropZone
              id={`${element.id}-${index + 1}`}
              elementId={element.id}
              position={index + 1}
            />
          </div>
        ))}

        {children.length === 0 && (
          <ElementDropZone
            id={`${element.id}-empty`}
            elementId={element.id}
            position={0}
            isEmpty={true}
          />
        )}
      </div>
    </div>
  );
}

// Drop Zone Component for structural elements
interface ElementDropZoneProps {
  id: string;
  elementId: string;
  position: number;
  isEmpty?: boolean;
}

function ElementDropZone({ id, elementId, position, isEmpty = false }: ElementDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'element-zone',
      elementId,
      position,
    },
  });

  if (isEmpty) {
    return (
      <div
        ref={setNodeRef}
        className={`flex flex-col items-center justify-center py-4 text-center text-muted-foreground ${
          isOver ? 'bg-primary/10 border-primary' : ''
        } rounded-md transition-colors`}
      >
        <Plus size={12} className="mb-1 opacity-50" />
        <span className="text-xs">
          {isOver ? 'Solte aqui!' : 'Adicionar elementos'}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`h-2 transition-colors ${
        isOver ? 'bg-primary/20' : 'transparent'
      }`}
      style={{
        marginTop: position === 0 ? 0 : '2px',
        marginBottom: '2px',
      }}
    />
  );
}

// Drop Zone Component for block columns
interface BlockColumnDropZoneProps {
  id: string;
  elementId: string;
  columnIndex: number;
  position: number;
  isEmpty?: boolean;
}

function BlockColumnDropZone({ id, elementId, columnIndex, position, isEmpty = false }: BlockColumnDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'block-column-zone',
      elementId,
      columnIndex,
      position,
    },
  });

  if (isEmpty) {
    return (
      <div
        ref={setNodeRef}
        className={`flex flex-col items-center justify-center py-3 text-center text-muted-foreground ${
          isOver ? 'bg-primary/10 border-primary' : ''
        } rounded-md transition-colors`}
      >
        <Plus size={12} className="mb-1 opacity-50" />
        <span className="text-xs">
          {isOver ? 'Solte aqui!' : 'Adicionar elementos'}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`h-2 transition-colors ${
        isOver ? 'bg-primary/20' : 'transparent'
      }`}
      style={{
        marginTop: position === 0 ? 0 : '2px',
        marginBottom: '2px',
      }}
    />
  );
}

// Elements Toolbar (Memoized for performance)
const ElementsToolbar = React.memo(function ElementsToolbar() {
  const [activeTab, setActiveTab] = useState<'elements' | 'templates'>('elements');
  
  const elementTypes = [
    // Basic Elements
    { type: 'heading', label: 'Título', icon: Type },
    { type: 'text', label: 'Texto', icon: FileText },
    { type: 'button', label: 'Botão', icon: RectangleHorizontal },
    { type: 'image', label: 'Imagem', icon: Image },
    { type: 'video', label: 'Vídeo', icon: Video },
    { type: 'form', label: 'Formulário', icon: FileInput },
    { type: 'spacer', label: 'Espaçador', icon: Space },
    { type: 'divider', label: 'Divisor', icon: Minus },
    
    // Structural Elements
    { type: 'container', label: 'Container', icon: Box },
    { type: 'block', label: 'Bloco', icon: Grid3X3 },
  ];

  const sectionTemplates = [
    { 
      id: 'hero', 
      label: 'Hero Section', 
      icon: Layout,
      description: 'Cabeçalho com título, subtítulo e CTA'
    },
    { 
      id: 'features', 
      label: 'Funcionalidades', 
      icon: Star,
      description: 'Grid de características do produto'
    },
    { 
      id: 'testimonials', 
      label: 'Depoimentos', 
      icon: MessageCircle,
      description: 'Seção de depoimentos de clientes'
    },
    { 
      id: 'team', 
      label: 'Nossa Equipe', 
      icon: Users,
      description: 'Apresentação da equipe'
    },
    { 
      id: 'contact', 
      label: 'Contato', 
      icon: Mail,
      description: 'Formulário de contato'
    },
    // Template Elements
    { 
      id: 'benefits', 
      label: 'Benefícios', 
      icon: Star,
      description: 'Lista de benefícios editável'
    },
    { 
      id: 'reviews', 
      label: 'Depoimentos', 
      icon: MessageCircle,
      description: 'Avaliações e comentários de clientes'
    },
    { 
      id: 'slider', 
      label: 'Slider', 
      icon: Images,
      description: 'Carrossel de imagens customizável'
    },
  ];

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Tab Headers */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('elements')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'elements'
              ? 'text-primary border-b-2 border-primary bg-primary/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Elementos
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'templates'
              ? 'text-primary border-b-2 border-primary bg-primary/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Templates
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'elements' && (
          <div className="space-y-2">
            {elementTypes.map((elementType) => (
              <DraggableElement
                key={elementType.type}
                elementType={elementType.type as BlockElement['type']}
                label={elementType.label}
                icon={elementType.icon}
              />
            ))}
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-3">
            {sectionTemplates.map((template) => (
              <SectionTemplate
                key={template.id}
                template={template}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

// Section Template Component
interface SectionTemplateProps {
  template: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string; size?: number | string }>;
    description: string;
  };
}

function SectionTemplate({ template }: SectionTemplateProps) {
  // Check if this is an element template (not a section template)
  const isElementTemplate = ['benefits', 'reviews', 'slider'].includes(template.id);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `template-${template.id}`,
    data: isElementTemplate ? {
      type: 'new-element',
      elementType: template.id,
    } : {
      type: 'section-template',
      templateId: template.id,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex flex-col gap-2 p-3 bg-secondary hover:bg-secondary/80 rounded-lg cursor-grab hover:cursor-grabbing transition-colors border-2 border-transparent hover:border-primary/30"
      data-testid={`template-${template.id}`}
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-6 h-6 text-primary">
          <template.icon size={20} />
        </div>
        <span className="text-sm font-medium text-foreground">{template.label}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {template.description}
      </p>
    </div>
  );
}

// Draggable Element from Toolbar
interface DraggableElementProps {
  elementType: BlockElement['type'];
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number | string }>;
}

function DraggableElement({ elementType, label, icon: IconComponent }: DraggableElementProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `new-${elementType}`,
    data: {
      type: 'new-element',
      elementType,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-3 p-3 bg-secondary hover:bg-secondary/80 rounded-lg cursor-grab hover:cursor-grabbing transition-colors"
      data-testid={`draggable-${elementType}`}
    >
      <div className="flex items-center justify-center w-5 h-5 text-muted-foreground">
        <IconComponent size={18} />
      </div>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </div>
  );
}


// Page Frame Component
interface PageFrameProps {
  viewport: 'desktop' | 'tablet' | 'mobile';
  model: PageModelV2;
  selectedElementId: string | null;
  selectedSectionId: string | null;
  hoveredSectionId: string | null;
  onSelectElement: (id: string | null) => void;
  onSelectSection: (id: string | null) => void;
  onHoverSection: (id: string | null) => void;
  onUpdateElement: (elementId: string, updates: Partial<BlockElement>) => void;
  onDeleteSection: (sectionId: string) => void;
  onDuplicateSection: (sectionId: string) => void;
  onAddSection: () => void;
  draggedItem: any;
}

function PageFrame({ 
  viewport, 
  model, 
  selectedElementId, 
  selectedSectionId,
  hoveredSectionId,
  onSelectElement, 
  onSelectSection,
  onHoverSection,
  onUpdateElement, 
  onDeleteSection, 
  onDuplicateSection,
  onAddSection,
  draggedItem 
}: PageFrameProps) {
  // Debug logs for sections rendering
  React.useEffect(() => {
    console.log('🎨 PageFrame: Rendering with model:', {
      sectionsCount: model.sections.length,
      sectionsIds: model.sections.map(s => s.id),
      sectionsTypes: model.sections.map(s => s.type),
      sectionsHaveRows: model.sections.map(s => ({
        id: s.id,
        type: s.type,
        name: s.name,
        rowsCount: s.rows?.length || 0,
        hasValidRows: !!s.rows && s.rows.length > 0
      }))
    });
    
    // Check each section structure
    model.sections.forEach((section, index) => {
      console.log(`📦 Section ${index + 1} (${section.id}):`, {
        type: section.type,
        name: section.name,
        rowsCount: section.rows?.length || 0,
        rows: section.rows?.map(r => ({
          id: r.id,
          columnsCount: r.columns?.length || 0,
          columns: r.columns?.map(c => ({
            id: c.id,
            width: c.width,
            elementsCount: c.elements?.length || 0,
            elements: c.elements?.map(e => ({ id: e.id, type: e.type }))
          }))
        }))
      });
    });
  }, [model.sections]);
  
  const viewportStyles = {
    desktop: 'w-full max-w-none',
    tablet: 'w-[768px]',
    mobile: 'w-[375px]',
  };

  return (
    <div className="flex justify-center h-full">
      {/* Browser Frame */}
      <div 
        className={`${viewportStyles[viewport]} mx-auto transition-all duration-300 bg-white dark:bg-background rounded-lg shadow-2xl border border-border overflow-hidden flex flex-col`}
        style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}
      >
        {/* Browser Header */}
        <div className="flex items-center gap-2 bg-muted px-4 py-3 border-b border-border">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-background rounded-md px-3 py-1 text-xs text-muted-foreground border border-border">
              preview.minhamarcafunil.com
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="relative bg-white flex-1 overflow-auto">
          <SortableContext
            items={model.sections.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {model.sections.length === 0 ? (
              // Empty State
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <FileText size={24} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">Página vazia</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Comece criando sua primeira seção. Você pode adicionar títulos, textos, imagens e muito mais.
                </p>
                <button
                  onClick={onAddSection}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  data-testid="button-add-first-section"
                >
                  <Plus size={20} />
                  Criar primeira seção
                </button>
              </div>
            ) : (
              // Sections
              <>
                {model.sections.map((section, index) => (
                  <div key={section.id}>
                    <EnhancedSortableSection
                      section={section}
                      theme={model.theme}
                      selectedElementId={selectedElementId}
                      selectedSectionId={selectedSectionId}
                      isHovered={hoveredSectionId === section.id}
                      onSelectElement={onSelectElement}
                      onSelectSection={onSelectSection}
                      onHover={onHoverSection}
                      onUpdateElement={onUpdateElement}
                      onDeleteSection={onDeleteSection}
                      onDuplicateSection={onDuplicateSection}
                      onAddSectionAfter={() => onAddSection()}
                      showAddButton={index === model.sections.length - 1}
                      draggedItem={draggedItem}
                      viewport={viewport}
                    />
                  </div>
                ))}
              </>
            )}
          </SortableContext>
        </div>
      </div>
    </div>
  );
}

// Enhanced Sortable Section Component
interface EnhancedSortableSectionProps {
  section: BlockSection;
  theme: PageModelV2['theme'];
  selectedElementId: string | null;
  selectedSectionId: string | null;
  isHovered: boolean;
  onSelectElement: (id: string | null) => void;
  onSelectSection: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onUpdateElement: (elementId: string, updates: Partial<BlockElement>) => void;
  onDeleteSection: (sectionId: string) => void;
  onDuplicateSection: (sectionId: string) => void;
  onAddSectionAfter: () => void;
  showAddButton: boolean;
  draggedItem: any;
  viewport: 'desktop' | 'tablet' | 'mobile';
}

function EnhancedSortableSection({ 
  section, 
  theme, 
  selectedElementId, 
  selectedSectionId,
  isHovered,
  onSelectElement, 
  onSelectSection,
  onHover,
  onUpdateElement,
  onDeleteSection,
  onDuplicateSection,
  onAddSectionAfter,
  showAddButton,
  draggedItem,
  viewport
}: EnhancedSortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.id,
    data: {
      type: 'section',
      section,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`relative group ${isDragging ? 'z-50' : ''}`}
        onMouseEnter={() => onHover(section.id)}
        onMouseLeave={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          onSelectSection(section.id);
        }}
        data-testid={`section-${section.id}`}
      >
        {/* Section Selected Overlay */}
        {selectedSectionId === section.id && !isDragging && (
          <div className="absolute inset-0 border-2 border-blue-500 bg-blue-500/10 rounded-lg pointer-events-none z-10">
            {/* Section Label */}
            <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
              ✓ Seção Selecionada
            </div>
          </div>
        )}

        {/* Section Hover Overlay */}
        {isHovered && selectedSectionId !== section.id && !isDragging && (
          <div className="absolute inset-0 border-2 border-primary border-dashed bg-primary/5 rounded-lg pointer-events-none z-10">
            {/* Section Label */}
            <div className="absolute top-2 left-2 bg-primary text-white px-2 py-1 rounded text-xs font-medium">
              Seção {section.name || section.id.slice(0, 8)}
            </div>
          </div>
        )}

        {/* Section Controls */}
        {isHovered && !isDragging && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-card border border-border rounded-lg shadow-lg p-1 z-20">
            {/* Drag Handle */}
            <button
              {...attributes}
              {...listeners}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors cursor-grab active:cursor-grabbing"
              title="Arrastar seção"
            >
              <GripVertical size={14} />
            </button>
            
            {/* Copy Section */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicateSection(section.id);
              }}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Duplicar seção"
            >
              <Copy size={14} />
            </button>

            {/* Delete Section */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSection(section.id);
              }}
              className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
              title="Excluir seção"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}

        {/* Section Content with enhanced dropzones */}
        <SectionWithDropZones 
          section={section}
          theme={theme}
          selectedElementId={selectedElementId}
          onSelectElement={onSelectElement}
          onUpdateElement={onUpdateElement}
          isHovered={isHovered}
          isDragging={!!draggedItem}
          viewport={viewport}
        />
      </div>

      {/* Add Section Button */}
      {showAddButton && (
        <div className="flex items-center justify-center py-6">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddSectionAfter();
            }}
            className="group flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg border-2 border-blue-600 hover:border-blue-700 transition-all duration-200"
            data-testid="button-add-section-after"
          >
            <Plus size={16} className="group-hover:rotate-90 transition-transform duration-200" />
            <span className="text-sm font-medium">Adicionar seção</span>
          </button>
        </div>
      )}
    </>
  );
}

// Properties Panel
interface PropertiesPanelProps {
  selectedElementId: string | null;
  selectedSectionId: string | null;
  model: PageModelV2;
  onUpdateElement: (elementId: string, updates: Partial<BlockElement>) => void;
  onUpdateSection?: (sectionId: string, updates: Partial<BlockSection>) => void;
  onChange: (model: PageModelV2) => void;
}

function PropertiesPanel({ selectedElementId, selectedSectionId, model, onUpdateElement, onUpdateSection, onChange }: PropertiesPanelProps) {
  const selectedElement = selectedElementId ? findElementById(model, selectedElementId) : null;
  const selectedSection = selectedSectionId ? model.sections.find(s => s.id === selectedSectionId) : null;

  const handleUpdateProperty = useCallback((property: string, value: any) => {
    if (!selectedElement || !selectedElementId) return;
    
    if (property.startsWith('content.')) {
      const contentKey = property.replace('content.', '');
      onUpdateElement(selectedElementId, {
        content: {
          ...selectedElement.content,
          [contentKey]: value,
        }
      });
    } else if (property.startsWith('styles.')) {
      const styleKey = property.replace('styles.', '');
      onUpdateElement(selectedElementId, {
        styles: {
          ...selectedElement.styles,
          [styleKey]: value,
        }
      });
    } else {
      onUpdateElement(selectedElementId, {
        [property]: value,
      });
    }
  }, [selectedElement, selectedElementId, onUpdateElement]);

  const handleUpdateSectionProperty = useCallback((property: string, value: any) => {
    if (!selectedSection || !selectedSectionId || !onUpdateSection) return;
    
    if (property.startsWith('styles.')) {
      const styleKey = property.replace('styles.', '');
      onUpdateSection(selectedSectionId, {
        styles: {
          ...selectedSection.styles,
          [styleKey]: value,
        }
      });
    } else {
      onUpdateSection(selectedSectionId, {
        [property]: value,
      });
    }
  }, [selectedSection, selectedSectionId, onUpdateSection]);

  if (!selectedElement && !selectedSection) {
    return (
      <div className="w-80 bg-card border-l border-border p-4">
        <h3 className="font-medium text-foreground mb-4">Propriedades</h3>
        <div className="text-sm text-muted-foreground">
          Selecione um elemento ou seção para editar suas propriedades
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-card border-l border-border p-4 overflow-y-auto">
      <h3 className="font-medium text-foreground mb-4">Propriedades</h3>
      
      <div className="space-y-6">
        {/* Section Properties */}
        {selectedSection && !selectedElement && (
          <>
            {/* Section Type Badge */}
            <div>
              <div className="inline-flex items-center gap-2 px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded text-xs font-medium">
                <span className="text-xs">🔧</span>
                Seção
              </div>
            </div>

            {/* Section Style Properties */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Estilo da Seção</h4>
              
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Cor de Fundo
                </label>
                <input
                  type="color"
                  value={selectedSection.styles?.backgroundColor || '#ffffff'}
                  onChange={(e) => handleUpdateSectionProperty('styles.backgroundColor', e.target.value)}
                  className="w-full h-8 bg-background border border-border rounded-md cursor-pointer"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Padding (Espaçamento Interno)
                </label>
                <input
                  type="text"
                  value={selectedSection.styles?.padding || ''}
                  onChange={(e) => handleUpdateSectionProperty('styles.padding', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
                  placeholder="Ex: 20px ou 2rem"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Margin (Espaçamento Externo)
                </label>
                <input
                  type="text"
                  value={selectedSection.styles?.margin || ''}
                  onChange={(e) => handleUpdateSectionProperty('styles.margin', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
                  placeholder="Ex: 10px 0 ou 1rem"
                />
              </div>
            </div>
          </>
        )}

        {/* Element Properties */}
        {selectedElement && (
          <>
            {/* Element Type Badge */}
            <div>
              <div className="inline-flex items-center gap-2 px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                <span className="text-xs">📝</span>
                {selectedElement.type}
              </div>
            </div>

        {/* Content Properties */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Conteúdo</h4>
          
          {(selectedElement.type === 'heading' || selectedElement.type === 'text') && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Texto
              </label>
              <textarea
                value={selectedElement.content?.text || ''}
                onChange={(e) => handleUpdateProperty('content.text', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md resize-none"
                rows={3}
                placeholder="Digite o texto..."
              />
            </div>
          )}

          {selectedElement.type === 'button' && (
            <>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Texto do Botão
                </label>
                <input
                  type="text"
                  value={selectedElement.content?.text || ''}
                  onChange={(e) => handleUpdateProperty('content.text', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
                  placeholder="Texto do botão"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Link (URL)
                </label>
                <input
                  type="url"
                  value={selectedElement.content?.href || ''}
                  onChange={(e) => handleUpdateProperty('content.href', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
                  placeholder="https://..."
                />
              </div>
            </>
          )}

          {selectedElement.type === 'image' && (
            <>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  URL da Imagem
                </label>
                <input
                  type="url"
                  value={selectedElement.content?.src || ''}
                  onChange={(e) => handleUpdateProperty('content.src', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Texto Alternativo
                </label>
                <input
                  type="text"
                  value={selectedElement.content?.alt || ''}
                  onChange={(e) => handleUpdateProperty('content.alt', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
                  placeholder="Descrição da imagem"
                />
              </div>
            </>
          )}
        </div>

        {/* Style Properties */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Estilo</h4>
          
          {/* Colors */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Cor do Texto
              </label>
              <input
                type="color"
                value={selectedElement.styles?.color || '#000000'}
                onChange={(e) => handleUpdateProperty('styles.color', e.target.value)}
                className="w-full h-8 bg-background border border-border rounded-md cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Cor de Fundo
              </label>
              <input
                type="color"
                value={selectedElement.styles?.backgroundColor || '#ffffff'}
                onChange={(e) => handleUpdateProperty('styles.backgroundColor', e.target.value)}
                className="w-full h-8 bg-background border border-border rounded-md cursor-pointer"
              />
            </div>
          </div>

          {/* Typography */}
          {(selectedElement.type === 'heading' || selectedElement.type === 'text' || selectedElement.type === 'button') && (
            <>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Tamanho da Fonte
                </label>
                <input
                  type="text"
                  value={selectedElement.styles?.fontSize || '16px'}
                  onChange={(e) => handleUpdateProperty('styles.fontSize', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
                  placeholder="16px"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Peso da Fonte
                </label>
                <select
                  value={selectedElement.styles?.fontWeight || 'normal'}
                  onChange={(e) => handleUpdateProperty('styles.fontWeight', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
                >
                  <option value="normal">Normal</option>
                  <option value="500">Médio</option>
                  <option value="600">Semi-negrito</option>
                  <option value="700">Negrito</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Alinhamento
                </label>
                <select
                  value={selectedElement.styles?.textAlign || 'left'}
                  onChange={(e) => handleUpdateProperty('styles.textAlign', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
                >
                  <option value="left">Esquerda</option>
                  <option value="center">Centro</option>
                  <option value="right">Direita</option>
                </select>
              </div>
            </>
          )}

          {/* Spacing */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Padding
              </label>
              <input
                type="text"
                value={selectedElement.styles?.padding || '0'}
                onChange={(e) => handleUpdateProperty('styles.padding', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
                placeholder="1rem"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Margin
              </label>
              <input
                type="text"
                value={selectedElement.styles?.margin || '0'}
                onChange={(e) => handleUpdateProperty('styles.margin', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
                placeholder="0"
              />
            </div>
          </div>

          {/* Border */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Borda
            </label>
            <input
              type="text"
              value={selectedElement.styles?.border || 'none'}
              onChange={(e) => handleUpdateProperty('styles.border', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
              placeholder="1px solid #ccc"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Raio da Borda
            </label>
            <input
              type="text"
              value={selectedElement.styles?.borderRadius || '0'}
              onChange={(e) => handleUpdateProperty('styles.borderRadius', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
              placeholder="8px"
            />
          </div>

          {/* Dimensions */}
          {(selectedElement.type === 'image' || selectedElement.type === 'spacer') && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Largura
                </label>
                <input
                  type="text"
                  value={selectedElement.styles?.width || 'auto'}
                  onChange={(e) => handleUpdateProperty('styles.width', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
                  placeholder="auto"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Altura
                </label>
                <input
                  type="text"
                  value={selectedElement.styles?.height || 'auto'}
                  onChange={(e) => handleUpdateProperty('styles.height', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
                  placeholder="auto"
                />
              </div>
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}

// Drag Overlay Content
function DragOverlayContent({ item }: { item: any }) {
  if (item.type === 'new-element') {
    return (
      <div className="bg-primary/20 border-2 border-primary rounded-lg p-2 text-sm font-medium text-primary-foreground">
        Novo {item.elementType}
      </div>
    );
  }

  if (item.type === 'element') {
    return (
      <div className="bg-card border-2 border-primary rounded-lg p-2 shadow-lg text-foreground">
        {item.element.type}
      </div>
    );
  }

  if (item.type === 'section') {
    return (
      <div className="bg-card border-2 border-primary rounded-lg p-2 shadow-lg text-foreground">
        Seção: {item.section.name}
      </div>
    );
  }

  return null;
}

// Utility functions
function moveElement(model: PageModelV2, elementId: string, targetColumnId: string): PageModelV2 {
  const newModel = { ...model };
  let elementToMove: BlockElement | null = null;
  
  // First, find and remove the element from its current location
  for (const section of newModel.sections) {
    for (const row of section.rows) {
      for (const column of row.columns) {
        const elementIndex = column.elements.findIndex(e => e.id === elementId);
        if (elementIndex !== -1) {
          elementToMove = column.elements[elementIndex];
          column.elements = column.elements.filter(e => e.id !== elementId);
          break;
        }
      }
      if (elementToMove) break;
    }
    if (elementToMove) break;
  }
  
  // If element wasn't found, return original model
  if (!elementToMove) {
    return model;
  }
  
  // Now add the element to the target column
  for (const section of newModel.sections) {
    for (const row of section.rows) {
      for (const column of row.columns) {
        if (column.id === targetColumnId) {
          column.elements = [...column.elements, elementToMove];
          return newModel;
        }
      }
    }
  }
  
  // If target column wasn't found, return original model
  return model;
}

function addElementToColumn(model: PageModelV2, element: BlockElement, columnId: string, position?: number): PageModelV2 {
  const newModel = { ...model };
  
  // Find the column and add the element at the specified position
  for (const section of newModel.sections) {
    for (const row of section.rows) {
      for (const column of row.columns) {
        if (column.id === columnId) {
          if (position !== undefined && position >= 0 && position <= column.elements.length) {
            // Insert at specific position
            const newElements = [...column.elements];
            newElements.splice(position, 0, element);
            column.elements = newElements;
          } else {
            // Fallback to append at end
            column.elements = [...column.elements, element];
          }
          return newModel;
        }
      }
    }
  }
  
  return model;
}

// Add element to structural element (block/container)
function addElementToStructuralElement(model: PageModelV2, element: BlockElement, parentElementId: string, position?: number): PageModelV2 {
  const newModel = JSON.parse(JSON.stringify(model)); // Deep clone
  
  function findAndUpdateElement(elements: BlockElement[]): boolean {
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      
      if (el.id === parentElementId) {
        // Ensure children array exists
        if (!el.children) {
          el.children = [];
        }
        
        // Insert at specific position or append
        if (position !== undefined && position >= 0 && position <= el.children.length) {
          el.children.splice(position, 0, element);
        } else {
          el.children.push(element);
        }
        return true;
      }
      
      // Recursively search in children
      if (el.children && findAndUpdateElement(el.children)) {
        return true;
      }
    }
    return false;
  }
  
  // Search in all sections, rows, columns
  for (const section of newModel.sections) {
    for (const row of section.rows) {
      for (const column of row.columns) {
        if (findAndUpdateElement(column.elements)) {
          return newModel;
        }
      }
    }
  }
  
  return model;
}

// Add element to specific column in block
function addElementToBlockColumn(model: PageModelV2, element: BlockElement, parentElementId: string, columnIndex: number, position: number): PageModelV2 {
  const newModel = JSON.parse(JSON.stringify(model)); // Deep clone
  
  function findAndUpdateBlockElement(elements: BlockElement[]): boolean {
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      
      if (el.id === parentElementId && el.type === 'block') {
        // Ensure children array exists
        if (!el.children) {
          el.children = [];
        }
        
        const columnCount = el.config?.columns || 1;
        
        // Calculate the correct position in the children array
        // Children are stored linearly but represent a grid layout
        // Position calculation: row * columnCount + columnIndex
        let targetIndex = position;
        
        // If position is provided as a column-relative position, convert to absolute
        if (position >= 0) {
          // For simple insertion, just add at the appropriate spot
          targetIndex = Math.min(position, el.children.length);
        }
        
        // Insert the element
        el.children.splice(targetIndex, 0, element);
        return true;
      }
      
      // Recursively search in children
      if (el.children && findAndUpdateBlockElement(el.children)) {
        return true;
      }
    }
    return false;
  }
  
  // Search in all sections, rows, columns
  for (const section of newModel.sections) {
    for (const row of section.rows) {
      for (const column of row.columns) {
        if (findAndUpdateBlockElement(column.elements)) {
          return newModel;
        }
      }
    }
  }
  
  return model;
}

// Move element to structural element
function moveElementToStructuralElement(model: PageModelV2, elementId: string, targetElementId: string, position?: number): PageModelV2 {
  let elementToMove: BlockElement | null = null;
  
  // First, find and remove the element
  const modelAfterRemove = removeElementFromModel(model, elementId);
  elementToMove = findElementInModel(model, elementId);
  
  if (!elementToMove) {
    return model;
  }
  
  // Then add it to the target
  return addElementToStructuralElement(modelAfterRemove, elementToMove, targetElementId, position);
}

// Move element to block column
function moveElementToBlockColumn(model: PageModelV2, elementId: string, targetElementId: string, columnIndex: number, position: number): PageModelV2 {
  let elementToMove: BlockElement | null = null;
  
  // First, find and remove the element
  const modelAfterRemove = removeElementFromModel(model, elementId);
  elementToMove = findElementInModel(model, elementId);
  
  if (!elementToMove) {
    return model;
  }
  
  // Then add it to the target block column
  return addElementToBlockColumn(modelAfterRemove, elementToMove, targetElementId, columnIndex, position);
}

// Helper function to find an element in the model
function findElementInModel(model: PageModelV2, elementId: string): BlockElement | null {
  function searchInElements(elements: BlockElement[]): BlockElement | null {
    for (const element of elements) {
      if (element.id === elementId) {
        return element;
      }
      if (element.children) {
        const found = searchInElements(element.children);
        if (found) return found;
      }
    }
    return null;
  }
  
  // Search in all sections, rows, columns
  for (const section of model.sections) {
    for (const row of section.rows) {
      for (const column of row.columns) {
        const found = searchInElements(column.elements);
        if (found) return found;
      }
    }
  }
  
  return null;
}

// Helper function to remove an element from the model
function removeElementFromModel(model: PageModelV2, elementId: string): PageModelV2 {
  const newModel = JSON.parse(JSON.stringify(model)); // Deep clone
  
  function removeFromElements(elements: BlockElement[]): boolean {
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].id === elementId) {
        elements.splice(i, 1);
        return true;
      }
      if (elements[i].children && removeFromElements(elements[i].children!)) {
        return true;
      }
    }
    return false;
  }
  
  // Search and remove from all sections, rows, columns
  for (const section of newModel.sections) {
    for (const row of section.rows) {
      for (const column of row.columns) {
        if (removeFromElements(column.elements)) {
          return newModel;
        }
      }
    }
  }
  
  return model;
}

function updateElementInModel(model: PageModelV2, elementId: string, updates: Partial<BlockElement>): PageModelV2 {
  const newModel = { ...model };
  
  // Find and update the element
  for (const section of newModel.sections) {
    for (const row of section.rows) {
      for (const column of row.columns) {
        const elementIndex = column.elements.findIndex(e => e.id === elementId);
        if (elementIndex !== -1) {
          column.elements[elementIndex] = { ...column.elements[elementIndex], ...updates };
          return newModel;
        }
      }
    }
  }
  
  return model;
}

function updateSectionInModel(model: PageModelV2, sectionId: string, updates: Partial<BlockSection>): PageModelV2 {
  const newModel = { ...model };
  
  // Find and update the section
  const sectionIndex = newModel.sections.findIndex(s => s.id === sectionId);
  if (sectionIndex !== -1) {
    newModel.sections[sectionIndex] = { ...newModel.sections[sectionIndex], ...updates };
  }
  
  return newModel;
}

function findElementById(model: PageModelV2, elementId: string): BlockElement | null {
  for (const section of model.sections) {
    for (const row of section.rows) {
      for (const column of row.columns) {
        const element = column.elements.find(e => e.id === elementId);
        if (element) return element;
      }
    }
  }
  return null;
}

function deleteElementInModel(model: PageModelV2, elementId: string): PageModelV2 {
  const newModel = { ...model };
  
  // Find and delete the element
  for (const section of newModel.sections) {
    for (const row of section.rows) {
      for (const column of row.columns) {
        const elementIndex = column.elements.findIndex(e => e.id === elementId);
        if (elementIndex !== -1) {
          column.elements = column.elements.filter(e => e.id !== elementId);
          return newModel;
        }
      }
    }
  }
  
  return model;
}

function duplicateElementInModel(model: PageModelV2, elementId: string, newElement: BlockElement): PageModelV2 {
  const newModel = { ...model };
  
  // Find element and duplicate it
  for (const section of newModel.sections) {
    for (const row of section.rows) {
      for (const column of row.columns) {
        const elementIndex = column.elements.findIndex(e => e.id === elementId);
        if (elementIndex !== -1) {
          // Insert the new element after the original
          column.elements.splice(elementIndex + 1, 0, newElement);
          return newModel;
        }
      }
    }
  }
  
  return model;
}

function moveElementInColumn(model: PageModelV2, elementId: string, direction: 'up' | 'down'): PageModelV2 {
  const newModel = { ...model };
  
  // Find element and move it within its column
  for (const section of newModel.sections) {
    for (const row of section.rows) {
      for (const column of row.columns) {
        const elementIndex = column.elements.findIndex(e => e.id === elementId);
        if (elementIndex !== -1) {
          const newIndex = direction === 'up' ? elementIndex - 1 : elementIndex + 1;
          
          // Check bounds
          if (newIndex < 0 || newIndex >= column.elements.length) {
            return model; // Can't move beyond bounds
          }
          
          // Swap elements
          const element = column.elements[elementIndex];
          column.elements[elementIndex] = column.elements[newIndex];
          column.elements[newIndex] = element;
          
          return newModel;
        }
      }
    }
  }
  
  return model;
}

// Utility functions for structural elements (containers/blocks)
function addElementToContainer(model: PageModelV2, element: BlockElement, containerId: string): PageModelV2 {
  const newModel = { ...model };
  
  // First, search in columns (traditional structure)
  for (const section of newModel.sections) {
    for (const row of section.rows) {
      for (const column of row.columns) {
        // Find container/block in column elements
        const containerIndex = column.elements.findIndex(e => e.id === containerId);
        if (containerIndex !== -1) {
          const container = column.elements[containerIndex];
          if (container.type === 'container' || container.type === 'block') {
            column.elements[containerIndex] = {
              ...container,
              children: [...(container.children || []), element]
            };
            return newModel;
          }
        }
        
        // Recursively search in nested containers/blocks
        if (addElementToNestedContainer(column.elements, element, containerId)) {
          return newModel;
        }
      }
    }
  }
  
  return model;
}

function moveElementToContainer(model: PageModelV2, elementId: string, targetContainerId: string): PageModelV2 {
  const newModel = { ...model };
  let elementToMove: BlockElement | null = null;
  
  // First, find and remove the element from its current location
  for (const section of newModel.sections) {
    for (const row of section.rows) {
      for (const column of row.columns) {
        // Check in column elements
        const elementIndex = column.elements.findIndex(e => e.id === elementId);
        if (elementIndex !== -1) {
          elementToMove = column.elements[elementIndex];
          column.elements = column.elements.filter(e => e.id !== elementId);
          break;
        }
        
        // Check in nested containers/blocks
        elementToMove = removeElementFromNested(column.elements, elementId);
        if (elementToMove) break;
      }
      if (elementToMove) break;
    }
    if (elementToMove) break;
  }
  
  // If element wasn't found, return original model
  if (!elementToMove) {
    return model;
  }
  
  // Now add the element to the target container using addElementToContainer
  return addElementToContainer(newModel, elementToMove, targetContainerId);
}

// Move element to section drop zone with precise positioning
function moveElementToSectionDropZone(model: PageModelV2, elementId: string, targetColumnId: string, position: number): PageModelV2 {
  let elementToMove: BlockElement | null = null;
  
  // First, find and remove the element from its current location
  const modelAfterRemove = removeElementFromModel(model, elementId);
  elementToMove = findElementInModel(model, elementId);
  
  if (!elementToMove) {
    return model;
  }
  
  // Then add it to the target column at the specific position
  return addElementToColumn(modelAfterRemove, elementToMove, targetColumnId, position);
}

// Move element to section (adds to first column of first row) - fallback
function moveElementToSection(model: PageModelV2, elementId: string, targetSectionId: string): PageModelV2 {
  let elementToMove: BlockElement | null = null;
  
  // First, find and remove the element from its current location
  const modelAfterRemove = removeElementFromModel(model, elementId);
  elementToMove = findElementInModel(model, elementId);
  
  if (!elementToMove) {
    return model;
  }
  
  // Find the target section and add element to its first column
  const newModel = { ...modelAfterRemove };
  for (const section of newModel.sections) {
    if (section.id === targetSectionId) {
      // Add to first row, first column
      if (section.rows.length > 0 && section.rows[0].columns.length > 0) {
        const firstColumn = section.rows[0].columns[0];
        firstColumn.elements = [...firstColumn.elements, elementToMove];
        return newModel;
      }
    }
  }
  
  return model;
}

// Section Drop Zone Component
interface SectionDropZoneProps {
  id: string;
  sectionId: string;
  columnId: string;
  position: number;
  isEmpty?: boolean;
  isDragging: boolean;
}

function SectionDropZone({ id, sectionId, columnId, position, isEmpty = false, isDragging }: SectionDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'section-drop-zone',
      sectionId,
      columnId,
      position,
    },
  });

  // Only show drop zone when dragging
  if (!isDragging) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      className={`section-drop-zone transition-all duration-200 pointer-events-auto ${
        isOver ? 'bg-blue-100 border-blue-400' : 'border-transparent'
      } ${
        isEmpty 
          ? 'min-h-[60px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center m-2'
          : 'min-h-[12px] border-2 border-dashed rounded m-1'
      }`}
      style={{
        opacity: isOver ? 1 : 0.3,
      }}
    >
      {isEmpty && (
        <div className="text-sm text-gray-500 font-medium">
          Adicionar elementos
        </div>
      )}
    </div>
  );
}

// Enhanced Section Content with Precise Drop Zones
interface SectionWithDropZonesProps {
  section: BlockSection;
  theme: PageModelV2['theme'];
  selectedElementId: string | null;
  onSelectElement: (elementId: string | null) => void;
  onUpdateElement: (elementId: string, updates: Partial<BlockElement>) => void;
  isHovered: boolean;
  isDragging: boolean;
  viewport: 'desktop' | 'tablet' | 'mobile';
}

function SectionWithDropZones({ 
  section, 
  theme, 
  selectedElementId, 
  onSelectElement, 
  onUpdateElement, 
  isHovered,
  isDragging,
  viewport
}: SectionWithDropZonesProps) {
  return (
    <div 
      className={`min-h-[80px] transition-all duration-200 ${
        isHovered ? 'bg-muted/20' : ''
      }`}
      style={{
        backgroundColor: section.styles?.backgroundColor || 'transparent',
        padding: section.styles?.padding || '1.5rem',
        margin: section.styles?.margin || '0',
        ...section.styles
      }}
    >
      {/* Section Rows */}
      <SortableContext
        items={section.rows.map(r => r.id)}
        strategy={verticalListSortingStrategy}
      >
        {section.rows.map((row) => (
          <SortableRow
            key={row.id}
            row={row}
            theme={theme}
            selectedElementId={selectedElementId}
            onSelectElement={onSelectElement}
            onUpdateElement={onUpdateElement}
            viewport={viewport}
          />
        ))}
      </SortableContext>

      {/* Enhanced Drop Zones for first column elements - only when dragging */}
      {isDragging && section.rows.length > 0 && section.rows[0].columns.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-20">
          <div 
            className="pointer-events-auto" 
            style={{
              padding: section.styles?.padding || '1.5rem',
              margin: section.styles?.margin || '0',
            }}
          >
            {(() => {
              const firstColumn = section.rows[0].columns[0];
              const elements = firstColumn.elements || [];
              
              return (
                <>
                  {/* Drop zone at the beginning */}
                  <SectionDropZone
                    id={`section-${section.id}-start`}
                    sectionId={section.id}
                    columnId={firstColumn.id}
                    position={0}
                    isEmpty={elements.length === 0}
                    isDragging={isDragging}
                  />

                  {/* Drop zones between elements */}
                  {elements.map((_, index) => (
                    <div key={`drop-${index}`} className="relative">
                      {/* Invisible spacer to align with actual elements */}
                      <div className="invisible pointer-events-none">
                        {/* This helps position our dropzones correctly */}
                        <div className="min-h-[40px]"></div>
                      </div>
                      {/* Drop zone after each element */}
                      <SectionDropZone
                        id={`section-${section.id}-${index + 1}`}
                        sectionId={section.id}
                        columnId={firstColumn.id}
                        position={index + 1}
                        isDragging={isDragging}
                      />
                    </div>
                  ))}
                </>
              );
            })()
            }
          </div>
        </div>
      )}

      {/* Empty Section State */}
      {section.rows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-3">
            <Plus size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">Seção vazia</p>
          <button
            onClick={() => {
              // TODO: Add row to section
              console.log('Add row to section', section.id);
            }}
            className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-md hover:bg-primary/90 transition-colors"
          >
            Adicionar conteúdo
          </button>
        </div>
      )}
    </div>
  );
}

// Helper function to recursively add element to nested containers
function addElementToNestedContainer(elements: BlockElement[], newElement: BlockElement, targetContainerId: string): boolean {
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    
    if (element.id === targetContainerId && (element.type === 'container' || element.type === 'block')) {
      elements[i] = {
        ...element,
        children: [...(element.children || []), newElement]
      };
      return true;
    }
    
    // Recurse into children if this is a structural element
    if ((element.type === 'container' || element.type === 'block') && element.children) {
      if (addElementToNestedContainer(element.children, newElement, targetContainerId)) {
        return true;
      }
    }
  }
  
  return false;
}

// Helper function to recursively remove element from nested containers
function removeElementFromNested(elements: BlockElement[], elementId: string): BlockElement | null {
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    
    // Check if this is a structural element with children
    if ((element.type === 'container' || element.type === 'block') && element.children) {
      // Check direct children
      const childIndex = element.children.findIndex(child => child.id === elementId);
      if (childIndex !== -1) {
        const removedElement = element.children[childIndex];
        element.children = element.children.filter(child => child.id !== elementId);
        return removedElement;
      }
      
      // Recurse into nested children
      const found = removeElementFromNested(element.children, elementId);
      if (found) return found;
    }
  }
  
  return null;
}