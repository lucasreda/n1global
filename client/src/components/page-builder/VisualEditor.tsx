import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import { Type, FileText, RectangleHorizontal, Image, Video, FileInput, Space, Minus, Monitor, Tablet, Smartphone, Plus, GripVertical, Trash2, Copy, Layout, Star, Users, MessageCircle, Mail } from 'lucide-react';

interface VisualEditorProps {
  model: PageModelV2;
  onChange: (model: PageModelV2) => void;
  viewport: 'desktop' | 'tablet' | 'mobile';
  onViewportChange: (viewport: 'desktop' | 'tablet' | 'mobile') => void;
  className?: string;
}

export function VisualEditor({ model, onChange, viewport, onViewportChange, className = "" }: VisualEditorProps) {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
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
    console.log('🔥 addSection called!', { sectionsCount: model.sections.length });
    
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

    const newModel = {
      ...model,
      sections: [...model.sections, newSection],
    };
    
    console.log('🔥 New model created:', { newSectionsCount: newModel.sections.length });
    onChange(newModel);
  }, [model, onChange]);

  const deleteSection = useCallback((sectionId: string) => {
    onChange({
      ...model,
      sections: model.sections.filter(s => s.id !== sectionId),
    });
  }, [model, onChange]);

  // Memoize hover handlers to prevent infinite loops
  const handleHoverSection = useCallback((sectionId: string | null) => {
    setHoveredSectionId(sectionId);
  }, []);

  const handleSelectElement = useCallback((elementId: string | null) => {
    setSelectedElementId(elementId);
  }, []);

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
            className="flex-1 flex flex-col bg-background overflow-hidden"
            style={{ 
              height: '100%', 
              minHeight: '100%'
            }}
          >
            
            {/* Page Frame */}
            <div className="flex-1 overflow-auto p-6">
              <PageFrame 
                viewport={viewport}
                model={model}
                selectedElementId={selectedElementId}
                hoveredSectionId={hoveredSectionId}
                onSelectElement={handleSelectElement}
                onHoverSection={handleHoverSection}
                onUpdateElement={updateElement}
                onDeleteSection={deleteSection}
                onAddSection={addSection}
              />
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

// Modern Sortable Row Component (used by EnhancedSortableSection)
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
}

function ModernColumn({ column, theme, selectedElementId, onSelectElement, onUpdateElement }: ModernColumnProps) {
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
        {column.elements.map((element) => (
          <ModernElement
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
        <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
          <Plus size={16} className="mb-2 opacity-50" />
          <span className="text-xs">Arrastar elementos aqui</span>
        </div>
      )}
    </div>
  );
}

// Modern Element Component
interface ModernElementProps {
  element: BlockElement;
  theme: PageModelV2['theme'];
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (elementId: string, updates: Partial<BlockElement>) => void;
}

const ModernElement = React.memo(function ModernElement({ 
  element, 
  theme, 
  isSelected, 
  onSelect, 
  onUpdate 
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

  const handleClick = useCallback(() => {
    onSelect();
  }, [onSelect]);

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
      />
    </div>
  );
});

// Elements Toolbar (Memoized for performance)
const ElementsToolbar = React.memo(function ElementsToolbar() {
  const [activeTab, setActiveTab] = useState<'elements' | 'templates'>('elements');
  
  const elementTypes = [
    { type: 'heading', label: 'Título', icon: Type },
    { type: 'text', label: 'Texto', icon: FileText },
    { type: 'button', label: 'Botão', icon: RectangleHorizontal },
    { type: 'image', label: 'Imagem', icon: Image },
    { type: 'video', label: 'Vídeo', icon: Video },
    { type: 'form', label: 'Formulário', icon: FileInput },
    { type: 'spacer', label: 'Espaçador', icon: Space },
    { type: 'divider', label: 'Divisor', icon: Minus },
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({
    id: `template-${template.id}`,
    data: {
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
  hoveredSectionId: string | null;
  onSelectElement: (id: string | null) => void;
  onHoverSection: (id: string | null) => void;
  onUpdateElement: (elementId: string, updates: Partial<BlockElement>) => void;
  onDeleteSection: (sectionId: string) => void;
  onAddSection: () => void;
}

function PageFrame({ 
  viewport, 
  model, 
  selectedElementId, 
  hoveredSectionId,
  onSelectElement, 
  onHoverSection,
  onUpdateElement, 
  onDeleteSection, 
  onAddSection 
}: PageFrameProps) {
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
                      isHovered={hoveredSectionId === section.id}
                      onSelectElement={onSelectElement}
                      onHover={onHoverSection}
                      onUpdateElement={onUpdateElement}
                      onDeleteSection={onDeleteSection}
                      onAddSectionAfter={() => onAddSection()}
                      showAddButton={index === model.sections.length - 1}
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
  isHovered: boolean;
  onSelectElement: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onUpdateElement: (elementId: string, updates: Partial<BlockElement>) => void;
  onDeleteSection: (sectionId: string) => void;
  onAddSectionAfter: () => void;
  showAddButton: boolean;
}

function EnhancedSortableSection({ 
  section, 
  theme, 
  selectedElementId, 
  isHovered,
  onSelectElement, 
  onHover,
  onUpdateElement,
  onDeleteSection,
  onAddSectionAfter,
  showAddButton
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
        data-testid={`section-${section.id}`}
      >
        {/* Section Hover Overlay */}
        {isHovered && !isDragging && (
          <div className="absolute inset-0 border-2 border-primary border-dashed bg-primary/5 rounded-lg pointer-events-none z-10">
            {/* Section Label */}
            <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
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
                // TODO: Implement section copy
                console.log('Copy section', section.id);
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

        {/* Section Content */}
        <div 
          className={`min-h-[80px] p-6 transition-all duration-200 ${
            isHovered ? 'bg-muted/20' : ''
          }`}
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
              />
            ))}
          </SortableContext>

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
      </div>

      {/* Add Section Button */}
      {showAddButton && (
        <div className="flex items-center justify-center py-6">
          <button
            onClick={(e) => {
              console.log('🚀 Add Section button clicked!');
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