import { useState, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator
} from '@/components/ui/context-menu';
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
  FileText
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
  testId = 'layers-panel'
}: LayersPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set());

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

  // Filter sections and elements based on search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;

    const query = searchQuery.toLowerCase();
    
    const matchesQuery = (text: string) => text.toLowerCase().includes(query);
    
    const filterElements = (elements: BlockElement[]): BlockElement[] => {
      return elements.filter(element => {
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
        
        const hasMatchingChildren = element.children && filterElements(element.children).length > 0;
        
        return nameMatch || typeMatch || contentMatch || hasMatchingChildren;
      });
    };

    return sections.filter(section => {
      const nameMatch = section.name && matchesQuery(section.name);
      
      let hasMatchingElements = false;
      section.rows?.forEach(row => {
        row.columns?.forEach(column => {
          if (column.elements && filterElements(column.elements).length > 0) {
            hasMatchingElements = true;
          }
        });
      });

      return nameMatch || hasMatchingElements;
    });
  }, [sections, searchQuery]);

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
              
              <span className="text-sm truncate flex-1">
                {elementName}
              </span>

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
            filteredSections.map((section, index) => renderSection(section, index))
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
