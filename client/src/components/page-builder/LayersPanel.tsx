import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator
} from '@/components/ui/context-menu';
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
  arrayMove,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Layers, 
  Search, 
  ChevronRight, 
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  Trash2,
  Type,
  Image as ImageIcon,
  Video,
  Square,
  Circle,
  Grid3X3,
  Layout,
  Box,
  Container,
  FileText,
  GripVertical,
  Link2
} from 'lucide-react';
import { BlockSection, BlockElement } from '@shared/schema';
import { cn } from '@/lib/utils';

interface LayersPanelProps {
  sections: BlockSection[];
  selectedElementId?: string | null;
  selectedSectionId?: string | null;
  onSelectElement?: (elementId: string) => void;
  onSelectSection?: (sectionId: string) => void;
  onUpdateSection?: (sectionId: string, updates: Partial<BlockSection>) => void;
  onUpdateElement?: (elementId: string, updates: Partial<BlockElement>) => void;
  onDeleteElement?: (elementId: string) => void;
  onDeleteSection?: (sectionId: string) => void;
  onDuplicateElement?: (elementId: string) => void;
  onDuplicateSection?: (sectionId: string) => void;
  onReorderSections?: (oldIndex: number, newIndex: number) => void;
  onReorderElements?: (parentPath: string, oldIndex: number, newIndex: number) => void;
  onHoverElement?: (elementId: string | null) => void;
  testId?: string;
}

export function LayersPanel({
  sections,
  selectedElementId,
  selectedSectionId,
  onSelectElement,
  onSelectSection,
  onUpdateSection,
  onUpdateElement,
  onDeleteElement,
  onDeleteSection,
  onDuplicateElement,
  onDuplicateSection,
  onReorderSections,
  onReorderElements,
  onHoverElement,
  testId = 'layers-panel'
}: LayersPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState('');

  // DnD sensors
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

  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  // Toggle element expansion (for elements with children)
  const toggleElement = useCallback((elementId: string) => {
    setExpandedElements(prev => {
      const next = new Set(prev);
      if (next.has(elementId)) {
        next.delete(elementId);
      } else {
        next.add(elementId);
      }
      return next;
    });
  }, []);

  // Inline rename handlers
  const handleStartEditing = useCallback((layerId: string, currentName: string) => {
    setEditingLayerId(layerId);
    setEditingLayerName(currentName);
  }, []);

  const handleFinishEditing = useCallback((layerId: string, isSection: boolean, currentConfig?: any) => {
    if (!editingLayerName.trim()) {
      setEditingLayerId(null);
      return;
    }

    if (isSection && onUpdateSection) {
      onUpdateSection(layerId, { name: editingLayerName.trim() });
    } else if (!isSection && onUpdateElement) {
      // CRITICAL: Merge with existing config to preserve hidden, locked, etc.
      // Use empty object if currentConfig is undefined to ensure merge always works
      onUpdateElement(layerId, { 
        config: { 
          ...(currentConfig || {}),
          name: editingLayerName.trim() 
        } 
      });
    }

    setEditingLayerId(null);
    setEditingLayerName('');
  }, [editingLayerName, onUpdateSection, onUpdateElement]);

  const handleCancelEditing = useCallback(() => {
    setEditingLayerId(null);
    setEditingLayerName('');
  }, []);

  // Get icon for element type
  const getElementIcon = useCallback((type: string) => {
    const iconMap: Record<string, any> = {
      heading: Type,
      text: FileText,
      button: Square,
      image: ImageIcon,
      video: Video,
      block: Grid3X3,
      container: Container,
      grid: Layout,
      spacer: Circle,
      divider: Circle
    };
    return iconMap[type] || Box;
  }, []);

  // Filter sections and elements based on search (returns filtered hierarchy)
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;

    const query = searchQuery.toLowerCase();
    
    const matchesQuery = (text: string) => text.toLowerCase().includes(query);
    
    // Recursively filter elements and preserve hierarchy
    const filterElements = (elements: BlockElement[]): BlockElement[] => {
      const filtered: BlockElement[] = [];
      
      for (const element of elements) {
        const nameMatch = element.config?.name && matchesQuery(element.config.name);
        const typeMatch = matchesQuery(element.type);
        
        // Check content - it can be string or object
        let contentMatch = false;
        if (element.content) {
          if (typeof element.content === 'string') {
            contentMatch = matchesQuery(element.content);
          } else if (typeof element.content === 'object') {
            const contentText = element.content.text || element.content.html || '';
            contentMatch = matchesQuery(contentText);
          }
        }
        
        // Filter children recursively
        const filteredChildren = element.children ? filterElements(element.children) : [];
        const hasMatchingChildren = filteredChildren.length > 0;
        
        // Include if element matches OR has matching children
        if (nameMatch || typeMatch || contentMatch || hasMatchingChildren) {
          filtered.push({
            ...element,
            children: hasMatchingChildren ? filteredChildren : element.children
          });
        }
      }
      
      return filtered;
    };

    // Filter sections and return filtered copies
    const filtered: BlockSection[] = [];
    
    for (const section of sections) {
      const nameMatch = section.name && matchesQuery(section.name);
      
      // Filter rows and columns
      const filteredRows = section.rows?.map(row => ({
        ...row,
        columns: row.columns?.map(column => ({
          ...column,
          elements: column.elements ? filterElements(column.elements) : []
        })).filter(column => column.elements.length > 0) // Remove empty columns
      })).filter(row => row.columns && row.columns.length > 0); // Remove empty rows
      
      const hasMatchingElements = filteredRows && filteredRows.length > 0;
      
      // Include section if it matches OR has matching elements
      if (nameMatch || hasMatchingElements) {
        filtered.push({
          ...section,
          rows: hasMatchingElements ? filteredRows : section.rows
        });
      }
    }
    
    return filtered;
  }, [sections, searchQuery]);

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDraggedItem(event.active.data.current);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedItem(null);

    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Handle section reordering
    if (activeData?.type === 'section' && overData?.type === 'section') {
      // CRITICAL: Use canonical sections list, not filtered list
      // Find indices in the ORIGINAL sections array
      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1 && onReorderSections) {
        onReorderSections(oldIndex, newIndex);
      }
    }

    // Handle element reordering (same parent)
    if (activeData?.type === 'element' && overData?.type === 'element' && 
        activeData?.parentPath === overData?.parentPath) {
      // Elements in the same container
      if (onReorderElements) {
        onReorderElements(activeData.parentPath, activeData.index, overData.index);
      }
    }
  }, [sections, onReorderSections, onReorderElements]);

  // Render element tree recursively
  const renderElement = useCallback((element: BlockElement, depth: number = 0, parentPath: string = '') => {
    const hasChildren = element.children && element.children.length > 0;
    const isExpanded = expandedElements.has(element.id);
    const isSelected = selectedElementId === element.id;
    const isHidden = element.config?.hidden;
    const isLocked = element.config?.locked;
    const Icon = getElementIcon(element.type);
    const elementName = element.config?.name || element.type;

    return (
      <div key={element.id} data-testid={`${testId}-element-${element.id}`}>
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              className={cn(
                "flex items-center gap-1 py-1 px-2 hover:bg-muted/50 cursor-pointer rounded transition-colors",
                isSelected && "bg-primary/10 hover:bg-primary/15",
                isHidden && "opacity-50"
              )}
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
              onClick={() => onSelectElement?.(element.id)}
              data-testid={`${testId}-element-item-${element.id}`}
            >
              {hasChildren && (
                <button
                  className="p-0.5 hover:bg-muted rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleElement(element.id);
                  }}
                  data-testid={`${testId}-toggle-element-${element.id}`}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              )}
              {!hasChildren && <div className="w-4" />}
              
              <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              
              {editingLayerId === element.id ? (
                <Input
                  value={editingLayerName}
                  onChange={(e) => setEditingLayerName(e.target.value)}
                  onBlur={() => handleFinishEditing(element.id, false, element.config)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFinishEditing(element.id, false, element.config);
                    if (e.key === 'Escape') handleCancelEditing();
                  }}
                  autoFocus
                  className="h-6 text-sm flex-1"
                  data-testid={`${testId}-element-rename-input`}
                />
              ) : (
                <div className="flex items-center gap-1 flex-1">
                  <span 
                    className="text-sm truncate cursor-text"
                    onDoubleClick={() => handleStartEditing(element.id, elementName)}
                    data-testid={`${testId}-element-name`}
                  >
                    {elementName}
                  </span>
                  {element.instanceData && (
                    <Badge 
                      variant="outline" 
                      className="text-[10px] px-1 py-0 h-4 bg-purple-500/10 text-purple-500 border-purple-500/20"
                      data-testid={`${testId}-instance-badge`}
                    >
                      <Link2 className="h-2.5 w-2.5 mr-0.5" />
                      Instance
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                {isHidden ? (
                  <EyeOff className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <Eye className="h-3 w-3 text-muted-foreground opacity-0" />
                )}
              </div>
            </div>
          </ContextMenuTrigger>

          <ContextMenuContent>
            <ContextMenuItem
              onClick={() => onSelectElement?.(element.id)}
              data-testid={`${testId}-context-select-${element.id}`}
            >
              Select
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => onUpdateElement?.(element.id, { 
                config: { ...element.config, hidden: !isHidden } 
              })}
              data-testid={`${testId}-context-visibility-${element.id}`}
            >
              {isHidden ? <Eye className="h-3 w-3 mr-2" /> : <EyeOff className="h-3 w-3 mr-2" />}
              {isHidden ? 'Show' : 'Hide'}
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => onUpdateElement?.(element.id, { 
                config: { ...element.config, locked: !isLocked } 
              })}
              data-testid={`${testId}-context-lock-${element.id}`}
            >
              {isLocked ? <Unlock className="h-3 w-3 mr-2" /> : <Lock className="h-3 w-3 mr-2" />}
              {isLocked ? 'Unlock' : 'Lock'}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => onDuplicateElement?.(element.id)}
              data-testid={`${testId}-context-duplicate-${element.id}`}
            >
              <Copy className="h-3 w-3 mr-2" />
              Duplicate
            </ContextMenuItem>
            {element.instanceData && (
              <ContextMenuItem
                onClick={() => {
                  // Detach instance: remove instanceData, keep resolved properties
                  const { instanceData, ...elementWithoutInstance } = element;
                  onUpdateElement?.(element.id, elementWithoutInstance);
                }}
                data-testid={`${testId}-context-detach-${element.id}`}
              >
                <Link2 className="h-3 w-3 mr-2" />
                Detach Instance
              </ContextMenuItem>
            )}
            <ContextMenuItem
              onClick={() => onDeleteElement?.(element.id)}
              className="text-destructive"
              data-testid={`${testId}-context-delete-${element.id}`}
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div>
            {element.children!.map(child => renderElement(child, depth + 1, `${parentPath}/${element.id}`))}
          </div>
        )}
      </div>
    );
  }, [
    expandedElements, 
    selectedElementId, 
    getElementIcon, 
    toggleElement, 
    onSelectElement, 
    onUpdateElement, 
    onDuplicateElement, 
    onDeleteElement,
    editingLayerId,
    editingLayerName,
    handleStartEditing,
    handleFinishEditing,
    handleCancelEditing,
    testId
  ]);

  // Render section with its elements
  const renderSection = useCallback((section: BlockSection, index: number) => {
    const isExpanded = expandedSections.has(section.id);
    const isSelected = selectedSectionId === section.id;
    const sectionName = section.name || `Section ${index + 1}`;

    return (
      <div key={section.id} className="group" data-testid={`${testId}-section-${section.id}`}>
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              className={cn(
                "flex items-center gap-2 py-2 px-3 hover:bg-muted/70 cursor-pointer rounded transition-colors",
                isSelected && "bg-primary/10 hover:bg-primary/15"
              )}
              onClick={() => onSelectSection?.(section.id)}
              data-testid={`${testId}-section-item-${section.id}`}
            >
              <button
                className="p-0.5 hover:bg-muted rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSection(section.id);
                }}
                data-testid={`${testId}-toggle-section-${section.id}`}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              
              <Layout className="h-4 w-4 text-muted-foreground" />
              
              <span className="text-sm font-medium flex-1 truncate">
                {sectionName}
              </span>

              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  {section.rows?.reduce((acc, row) => 
                    acc + (row.columns?.reduce((colAcc, col) => 
                      colAcc + (col.elements?.length || 0), 0) || 0), 0
                  ) || 0} items
                </span>
              </div>
            </div>
          </ContextMenuTrigger>

          <ContextMenuContent>
            <ContextMenuItem
              onClick={() => onSelectSection?.(section.id)}
              data-testid={`${testId}-context-select-section-${section.id}`}
            >
              Select Section
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => onDuplicateSection?.(section.id)}
              data-testid={`${testId}-context-duplicate-section-${section.id}`}
            >
              <Copy className="h-3 w-3 mr-2" />
              Duplicate Section
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => onDeleteSection?.(section.id)}
              className="text-destructive"
              data-testid={`${testId}-context-delete-section-${section.id}`}
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Delete Section
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Render section elements when expanded */}
        {isExpanded && (
          <div className="ml-2">
            {section.rows?.map((row, rowIndex) => (
              <div key={rowIndex}>
                {row.columns?.map((column, colIndex) => (
                  <div key={colIndex}>
                    {column.elements?.map(element => renderElement(element, 1))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }, [
    expandedSections, 
    selectedSectionId, 
    toggleSection, 
    onSelectSection, 
    onDuplicateSection, 
    onDeleteSection, 
    renderElement,
    testId
  ]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Card className="w-80 h-full flex flex-col" data-testid={testId}>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              <CardTitle className="text-lg">Layers</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              {sections.length} sections
            </span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search layers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
              data-testid={`${testId}-search`}
            />
          </div>
        </CardHeader>

        <ScrollArea className="flex-1">
          <CardContent className="p-2 space-y-0.5">
            {filteredSections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  {searchQuery ? 'No matching layers found' : 'No layers yet'}
                </p>
              </div>
            ) : (
              <SortableContext
                items={filteredSections.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {filteredSections.map((section, index) => (
                  <SortableSection
                    key={section.id}
                    section={section}
                    index={index}
                    isExpanded={expandedSections.has(section.id)}
                    isSelected={selectedSectionId === section.id}
                    onToggle={toggleSection}
                    onSelect={onSelectSection}
                    onDuplicate={onDuplicateSection}
                    onDelete={onDeleteSection}
                    onHover={onHoverElement}
                    testId={testId}
                    editingLayerId={editingLayerId}
                    editingLayerName={editingLayerName}
                    onStartEditing={handleStartEditing}
                    onFinishEditing={handleFinishEditing}
                    onCancelEditing={handleCancelEditing}
                    setEditingLayerName={setEditingLayerName}
                  >
                    {section.rows?.map((row, rowIndex) => (
                      <div key={rowIndex}>
                        {row.columns?.map((column, colIndex) => (
                          <div key={colIndex}>
                            {column.elements?.map(element => renderElement(element, 1))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </SortableSection>
                ))}
              </SortableContext>
            )}
          </CardContent>
        </ScrollArea>
      </Card>

      <DragOverlay>
        {draggedItem && (
          <div className="bg-background border rounded px-3 py-2 shadow-lg">
            <span className="text-sm font-medium">
              {draggedItem.type === 'section' 
                ? (draggedItem.name || 'Section') 
                : (draggedItem.elementType || 'Element')
              }
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// Sortable Section Component
interface SortableSectionProps {
  section: BlockSection;
  index: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: (sectionId: string) => void;
  onSelect?: (sectionId: string) => void;
  onDuplicate?: (sectionId: string) => void;
  onDelete?: (sectionId: string) => void;
  onHover?: (elementId: string | null) => void;
  children: React.ReactNode;
  testId: string;
  editingLayerId: string | null;
  editingLayerName: string;
  onStartEditing: (layerId: string, currentName: string) => void;
  onFinishEditing: (layerId: string, isSection: boolean, currentConfig?: any) => void;
  onCancelEditing: () => void;
  setEditingLayerName: (name: string) => void;
}

function SortableSection({
  section,
  index,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  onDuplicate,
  onDelete,
  onHover,
  children,
  testId,
  editingLayerId,
  editingLayerName,
  onStartEditing,
  onFinishEditing,
  onCancelEditing,
  setEditingLayerName
}: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: section.id,
    data: {
      type: 'section',
      name: section.name,
      index
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sectionName = section.name || `Section ${index + 1}`;

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="group" 
      data-testid={`${testId}-section-${section.id}`}
      onMouseEnter={() => onHover?.(section.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={cn(
              "flex items-center gap-2 py-2 px-3 hover:bg-muted/70 cursor-pointer rounded transition-colors",
              isSelected && "bg-primary/10 hover:bg-primary/15"
            )}
            onClick={() => onSelect?.(section.id)}
            data-testid={`${testId}-section-item-${section.id}`}
          >
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            
            <button
              className="p-0.5 hover:bg-muted rounded"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(section.id);
              }}
              data-testid={`${testId}-toggle-section-${section.id}`}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            
            <Layout className="h-4 w-4 text-muted-foreground" />
            
            {editingLayerId === section.id ? (
              <Input
                value={editingLayerName}
                onChange={(e) => setEditingLayerName(e.target.value)}
                onBlur={() => onFinishEditing(section.id, true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onFinishEditing(section.id, true);
                  if (e.key === 'Escape') onCancelEditing();
                }}
                autoFocus
                className="h-6 text-sm flex-1 font-medium"
                data-testid={`${testId}-section-rename-input`}
              />
            ) : (
              <span 
                className="text-sm font-medium flex-1 truncate cursor-text"
                onDoubleClick={() => onStartEditing(section.id, sectionName)}
                data-testid={`${testId}-section-name`}
              >
                {sectionName}
              </span>
            )}

            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">
                {section.rows?.reduce((acc, row) => 
                  acc + (row.columns?.reduce((colAcc, col) => 
                    colAcc + (col.elements?.length || 0), 0) || 0), 0
                ) || 0} items
              </span>
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => onSelect?.(section.id)}
            data-testid={`${testId}-context-select-section-${section.id}`}
          >
            Select Section
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => onDuplicate?.(section.id)}
            data-testid={`${testId}-context-duplicate-section-${section.id}`}
          >
            <Copy className="h-3 w-3 mr-2" />
            Duplicate Section
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => onDelete?.(section.id)}
            className="text-destructive"
            data-testid={`${testId}-context-delete-section-${section.id}`}
          >
            <Trash2 className="h-3 w-3 mr-2" />
            Delete Section
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Render section elements when expanded */}
      {isExpanded && (
        <div className="ml-2">
          {children}
        </div>
      )}
    </div>
  );
}
