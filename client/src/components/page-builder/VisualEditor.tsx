import { useState, useCallback, useEffect } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { PageModelV2, BlockSection, BlockRow, BlockColumn, BlockElement } from "@shared/schema";
import { createDefaultTheme } from './PageRenderer';
import { createDefaultElement, getElementIcon } from './elements/utils';
import { FloatingToolbar, StylesPanel, calculateToolbarPosition } from './FloatingToolbar';

interface VisualEditorProps {
  model: PageModelV2;
  onChange: (model: PageModelV2) => void;
  className?: string;
}

export function VisualEditor({ model, onChange, className = "" }: VisualEditorProps) {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null);
  const [isStylesPanelOpen, setIsStylesPanelOpen] = useState(false);
  const [selectedElement, setSelectedElement] = useState<BlockElement | null>(null);

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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setDraggedItem(active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedItem(null);

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

    // Handle adding new element from toolbar
    if (activeData?.type === 'new-element' && overData?.type === 'column') {
      const newElement = createDefaultElement(activeData.elementType);
      const newModel = addElementToColumn(model, newElement, overData.columnId);
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

  const updateElement = useCallback((elementId: string, updates: Partial<BlockElement>) => {
    const newModel = updateElementInModel(model, elementId, updates);
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
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1" style={{ height: '100%', minHeight: '100%' }}>
          {/* Elements Toolbar */}
          <ElementsToolbar />

          {/* Main Editor Canvas */}
          <div 
            className="flex-1 overflow-auto bg-background"
            style={{ 
              height: '100%', 
              minHeight: '100%'
            }}
          >
            <div 
              className="p-4"
              style={{ 
                height: '100%', 
                minHeight: '100%'
              }}
            >
              <SortableContext
                items={model.sections.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {model.sections.map((section) => (
                  <SortableSection
                    key={section.id}
                    section={section}
                    theme={model.theme}
                    selectedElementId={selectedElementId}
                    onSelectElement={setSelectedElementId}
                    onUpdateElement={updateElement}
                    onDeleteSection={deleteSection}
                  />
                ))}
              </SortableContext>

              {/* Add Section Button */}
              <div className="text-center py-8">
                <button
                  onClick={addSection}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  data-testid="button-add-section"
                >
                  + Adicionar Seção
                </button>
              </div>
            </div>
          </div>

          {/* Properties Panel */}
          <PropertiesPanel
            selectedElementId={selectedElementId}
            model={model}
            onUpdateElement={updateElement}
            onChange={onChange}
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

// Sortable Section Component
interface SortableSectionProps {
  section: BlockSection;
  theme: PageModelV2['theme'];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (elementId: string, updates: Partial<BlockElement>) => void;
  onDeleteSection: (sectionId: string) => void;
}

function SortableSection({ 
  section, 
  theme, 
  selectedElementId, 
  onSelectElement, 
  onUpdateElement,
  onDeleteSection 
}: SortableSectionProps) {
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
    <div
      ref={setNodeRef}
      style={style}
      className="mb-4 border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow relative group"
      data-testid={`section-${section.id}`}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab hover:cursor-grabbing p-1 hover:bg-gray-200 rounded"
          >
            ⋮⋮
          </div>
          <span className="font-medium text-sm text-gray-700">{section.name}</span>
        </div>
        <button
          onClick={() => onDeleteSection(section.id)}
          className="text-red-500 hover:text-red-700 text-sm"
        >
          Excluir
        </button>
      </div>

      {/* Section Content */}
      <div
        style={{
          ...section.styles,
          padding: section.styles.padding || '2rem',
          backgroundColor: section.styles.backgroundColor || 'transparent',
        }}
      >
        {section.rows.map((row) => (
          <SortableRow
            key={row.id}
            row={row}
            theme={theme}
            selectedElementId={selectedElementId}
            onSelectElement={onSelectElement}
            onUpdateElement={onUpdateElement}
          />
        ))}
      </div>
    </div>
  );
}

// Sortable Row Component
interface SortableRowProps {
  row: BlockRow;
  theme: PageModelV2['theme'];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (elementId: string, updates: Partial<BlockElement>) => void;
}

function SortableRow({ row, theme, selectedElementId, onSelectElement, onUpdateElement }: SortableRowProps) {
  return (
    <div
      className="flex flex-wrap w-full"
      style={{
        gap: row.styles.gap || '1rem',
        ...row.styles,
      }}
      data-testid={`row-${row.id}`}
    >
      {row.columns.map((column) => (
        <SortableColumn
          key={column.id}
          column={column}
          theme={theme}
          selectedElementId={selectedElementId}
          onSelectElement={onSelectElement}
          onUpdateElement={onUpdateElement}
        />
      ))}
    </div>
  );
}

// Sortable Column Component
interface SortableColumnProps {
  column: BlockColumn;
  theme: PageModelV2['theme'];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (elementId: string, updates: Partial<BlockElement>) => void;
}

function SortableColumn({ column, theme, selectedElementId, onSelectElement, onUpdateElement }: SortableColumnProps) {
  const {
    setNodeRef,
    isOver,
  } = useSortable({
    id: column.id,
    data: {
      type: 'column',
      columnId: column.id,
    },
  });

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
      ref={setNodeRef}
      className={`${widthClasses[column.width as keyof typeof widthClasses] || 'w-full'} min-h-24 p-2 border-2 border-dashed border-gray-200 rounded ${
        isOver ? 'border-blue-400 bg-blue-50' : ''
      }`}
      data-testid={`column-${column.id}`}
    >
      <SortableContext
        items={column.elements.map(e => e.id)}
        strategy={verticalListSortingStrategy}
      >
        {column.elements.map((element) => (
          <SortableElement
            key={element.id}
            element={element}
            theme={theme}
            isSelected={selectedElementId === element.id}
            onSelect={() => onSelectElement(element.id)}
            onUpdate={onUpdateElement}
          />
        ))}
      </SortableContext>

      {column.elements.length === 0 && (
        <div className="text-center text-gray-400 py-8 text-sm">
          Arraste elementos aqui
        </div>
      )}
    </div>
  );
}

// Sortable Element Component  
interface SortableElementProps {
  element: BlockElement;
  theme: PageModelV2['theme'];
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (elementId: string, updates: Partial<BlockElement>) => void;
}

function SortableElement({ element, theme, isSelected, onSelect, onUpdate }: SortableElementProps) {
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

  const handleUpdate = (updates: Partial<BlockElement>) => {
    onUpdate(element.id, updates);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`mb-2 relative group cursor-pointer ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onSelect}
      data-testid={`element-${element.id}`}
      data-element-id={element.id}
    >
      {/* Render the actual element using our PageRenderer components */}
      <ElementRenderer 
        element={element} 
        theme={theme} 
        editorMode={true}
        isSelected={isSelected}
        onUpdate={handleUpdate}
      />
    </div>
  );
}

// Elements Toolbar
function ElementsToolbar() {
  const elementTypes = [
    { type: 'heading', label: 'Título', icon: '📝' },
    { type: 'text', label: 'Texto', icon: '📄' },
    { type: 'button', label: 'Botão', icon: '🔘' },
    { type: 'image', label: 'Imagem', icon: '🖼️' },
    { type: 'video', label: 'Vídeo', icon: '🎥' },
    { type: 'form', label: 'Formulário', icon: '📋' },
    { type: 'spacer', label: 'Espaçador', icon: '📏' },
    { type: 'divider', label: 'Divisor', icon: '➖' },
  ];

  return (
    <div className="w-64 bg-card border-r border-border p-4">
      <h3 className="font-medium text-foreground mb-4">Elementos</h3>
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
    </div>
  );
}

// Draggable Element from Toolbar
interface DraggableElementProps {
  elementType: BlockElement['type'];
  label: string;
  icon: string;
}

function DraggableElement({ elementType, label, icon }: DraggableElementProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({
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
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </div>
  );
}

// Properties Panel
interface PropertiesPanelProps {
  selectedElementId: string | null;
  model: PageModelV2;
  onUpdateElement: (elementId: string, updates: Partial<BlockElement>) => void;
  onChange: (model: PageModelV2) => void;
}

function PropertiesPanel({ selectedElementId, model, onUpdateElement, onChange }: PropertiesPanelProps) {
  const selectedElement = selectedElementId ? findElementById(model, selectedElementId) : null;

  return (
    <div className="w-80 bg-card border-l border-border p-4">
      <h3 className="font-medium text-foreground mb-4">Propriedades</h3>
      
      {selectedElement ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tipo: {selectedElement.type}
            </label>
          </div>
          
          {/* Element-specific properties would go here */}
          <div className="text-sm text-muted-foreground">
            Propriedades do elemento em desenvolvimento...
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          Selecione um elemento para editar suas propriedades
        </div>
      )}
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

// Simple Element Renderer (we'll improve this later)
function ElementRenderer({ element, theme, editorMode, isSelected, onUpdate }: {
  element: BlockElement;
  theme: PageModelV2['theme'];
  editorMode: boolean;
  isSelected: boolean;
  onUpdate: (updates: Partial<BlockElement>) => void;
}) {
  // This is a simplified renderer - we'll integrate the full element components later
  const baseStyles = {
    ...element.styles,
    padding: element.styles.padding || '0.5rem',
    margin: element.styles.margin || '0',
    backgroundColor: element.styles.backgroundColor || 'transparent',
    border: isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
    borderRadius: '0.25rem',
    minHeight: '2rem',
    display: 'flex',
    alignItems: 'center',
  };

  const content = element.content?.text || `${element.type} element`;

  return (
    <div style={baseStyles} data-testid={`rendered-element-${element.id}`}>
      <span className="text-sm text-muted-foreground">{content}</span>
    </div>
  );
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

function addElementToColumn(model: PageModelV2, element: BlockElement, columnId: string): PageModelV2 {
  const newModel = { ...model };
  
  // Find the column and add the element
  for (const section of newModel.sections) {
    for (const row of section.rows) {
      for (const column of row.columns) {
        if (column.id === columnId) {
          column.elements = [...column.elements, element];
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