import { useState, useCallback, useRef, useEffect } from 'react';
import { PageNodeV4 } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Monitor, Tablet, Smartphone, Settings, Type as TypeIcon, Palette, Layout as LayoutIcon, Zap, FileCode } from 'lucide-react';
import { LayoutControlsV4 } from './v4/LayoutControlsV4';
import { StylingControlsV4, TypographyControlsV4 } from './v4/StylingControlsV4';
import { AdvancedControlsV4, PseudoClassEditorV4 } from './v4/AdvancedControlsV4';
import { ImageControlsV4 } from './v4/ImageControlsV4';
import { useComputedStyles } from '@/hooks/useComputedStyles';
import { getVisibleControlGroups, getDefaultActiveTab, CONTROL_GROUPS } from './v4/ControlGroupManager';
import { isComponentInstance, resetOverride, getInstanceStyles, getInstanceAttributes, getInstanceTextContent } from '@/lib/componentInstance';
import { OverrideIndicator } from './v4/OverrideIndicator';

interface PropertiesPanelV4Props {
  node: PageNodeV4 | null;
  onUpdateNode?: (updates: Partial<PageNodeV4>) => void;
  savedComponents?: any[]; // For component instances to get base component
}

export function PropertiesPanelV4({ node, onUpdateNode, savedComponents = [] }: PropertiesPanelV4Props) {
  const [breakpoint, setBreakpoint] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const { computedStyles, hasOverrides, isFromClasses } = useComputedStyles(node, breakpoint);
  
  // Get base component if this is an instance
  const baseComponent = node?.componentRef 
    ? savedComponents.find(c => c.id === node.componentRef)
    : null;
  const baseNode = baseComponent?.node || null;
  const isInstance = isComponentInstance(node);
  
  // Get visible control groups based on node type
  const visibleGroups = node ? getVisibleControlGroups(node) : [];
  const defaultTab = node ? getDefaultActiveTab(node) : 'content';
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  
  // Update active tab when node changes
  useEffect(() => {
    if (node) {
      const newDefaultTab = getDefaultActiveTab(node);
      setActiveTab(newDefaultTab);
    }
  }, [node?.id]);
  
  // Local state for inputs (immediate feedback)
  // For instances, use effective values from base + overrides
  const getEffectiveTextContent = () => {
    if (!node) return '';
    return isInstance 
      ? (getInstanceTextContent(node, baseNode) ?? node.textContent ?? '')
      : (node.textContent || '');
  };
  
  const getEffectiveAttributes = () => {
    if (!node) return {};
    return isInstance
      ? getInstanceAttributes(node, baseNode)
      : (node.attributes || {});
  };
  
  const [localTextContent, setLocalTextContent] = useState(getEffectiveTextContent());
  const [localAttributes, setLocalAttributes] = useState(getEffectiveAttributes());
  
  // Debounce timer refs
  const textDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const attrDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Track last known node state to detect external changes
  const lastNodeSnapshot = useRef<{ id: string; textContent?: string; attributes?: Record<string, string> } | null>(null);

  // Detect external changes (undo/redo/selection) and cancel pending updates
  useEffect(() => {
    // Get effective values (considering instance overrides)
    const currentEffectiveTextContent = node 
      ? (isInstance 
          ? (getInstanceTextContent(node, baseNode) ?? node.textContent)
          : node.textContent)
      : undefined;
    const currentEffectiveAttributes = node
      ? (isInstance
          ? getInstanceAttributes(node, baseNode)
          : (node.attributes || {}))
      : {};
    
    const currentSnapshot = {
      id: node?.id || '',
      textContent: currentEffectiveTextContent,
      attributes: currentEffectiveAttributes
    };
    
    // Check if node changed externally (not from our debounce)
    const hasExternalChange = 
      !lastNodeSnapshot.current ||
      lastNodeSnapshot.current.id !== currentSnapshot.id ||
      lastNodeSnapshot.current.textContent !== currentSnapshot.textContent ||
      JSON.stringify(lastNodeSnapshot.current.attributes) !== JSON.stringify(currentSnapshot.attributes);
    
    if (hasExternalChange) {
      // Cancel ALL pending timers immediately
      if (textDebounceTimer.current) {
        clearTimeout(textDebounceTimer.current);
        textDebounceTimer.current = null;
      }
      if (attrDebounceTimer.current) {
        clearTimeout(attrDebounceTimer.current);
        attrDebounceTimer.current = null;
      }
      
      // Sync local state with external changes (effective values)
      setLocalTextContent(currentEffectiveTextContent || '');
      setLocalAttributes(currentEffectiveAttributes);
      
      // Update snapshot
      lastNodeSnapshot.current = currentSnapshot;
    }
  }, [node?.id, node?.textContent, node?.attributes, isInstance, baseNode]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (textDebounceTimer.current) clearTimeout(textDebounceTimer.current);
      if (attrDebounceTimer.current) clearTimeout(attrDebounceTimer.current);
    };
  }, []);

  // Immediate local update + debounced persist - MUST be before early return
  const handleTextContentChange = useCallback((value: string) => {
    setLocalTextContent(value); // Immediate UI update
    
    if (!onUpdateNode) return;
    
    if (textDebounceTimer.current) {
      clearTimeout(textDebounceTimer.current);
    }
    
    textDebounceTimer.current = setTimeout(() => {
      onUpdateNode({ textContent: value });
      // Update snapshot after successful persist
      if (node) {
        lastNodeSnapshot.current = {
          id: node.id,
          textContent: value,
          attributes: node.attributes
        };
      }
    }, 150);
  }, [onUpdateNode, node]);

  const handleAttributeChange = useCallback((key: string, value: string) => {
    // Immediate local update
    const newAttributes = { ...localAttributes, [key]: value };
    setLocalAttributes(newAttributes);
    
    if (!onUpdateNode) return;
    
    if (attrDebounceTimer.current) {
      clearTimeout(attrDebounceTimer.current);
    }
    
    attrDebounceTimer.current = setTimeout(() => {
      onUpdateNode({ attributes: newAttributes });
      // Update snapshot after successful persist
      if (node) {
        lastNodeSnapshot.current = {
          id: node.id,
          textContent: node.textContent,
          attributes: newAttributes
        };
      }
    }, 150);
  }, [onUpdateNode, node, localAttributes]);

  // Early return AFTER all hooks (Rules of Hooks)
  if (!node) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center">
        <Settings className="w-12 h-12 text-muted-foreground opacity-20 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No Element Selected</p>
        <p className="text-xs text-muted-foreground mt-1">
          Select an element from the canvas or layers panel to edit its properties
        </p>
      </div>
    );
  }

  return (
    <div className="properties-panel-v4 flex flex-col h-full bg-background text-foreground">
      {/* Header with Breakpoint Selector */}
      <div className="p-4 border-b bg-muted/30">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-sm text-foreground">Properties</h3>
            <p className="text-xs text-muted-foreground dark:text-gray-400 mt-0.5">
              &lt;{node.tag}&gt;
            </p>
          </div>
          
          {/* Breakpoint Selector */}
          <div className="flex gap-1">
            <Button
              variant={breakpoint === 'desktop' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBreakpoint('desktop')}
              className="flex-1"
              data-testid="breakpoint-desktop"
            >
              <Monitor className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={breakpoint === 'tablet' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBreakpoint('tablet')}
              className="flex-1"
              data-testid="breakpoint-tablet"
            >
              <Tablet className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={breakpoint === 'mobile' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBreakpoint('mobile')}
              className="flex-1"
              data-testid="breakpoint-mobile"
            >
              <Smartphone className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className={`w-full grid h-auto p-1 mx-4 mt-3 ${visibleGroups.length === 6 ? 'grid-cols-6' : visibleGroups.length === 5 ? 'grid-cols-5' : visibleGroups.length === 4 ? 'grid-cols-4' : visibleGroups.length === 3 ? 'grid-cols-3' : visibleGroups.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {visibleGroups.map((group) => {
            const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
              content: FileCode,
              layout: LayoutIcon,
              styles: Palette,
              typography: TypeIcon,
              states: Zap,
              advanced: Settings,
            };
            const GroupIcon = iconMap[group.id];
            
            return (
              <TabsTrigger
                key={group.id}
                value={group.id}
                className="text-xs py-1.5 flex items-center justify-center"
                data-testid={`tab-${group.id}`}
              >
                {GroupIcon && <GroupIcon className="h-3.5 w-3.5" />}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <ScrollArea className="flex-1">
          <div className="p-4">
            {/* Content Tab */}
            {visibleGroups.some(g => g.id === 'content') && (
            <TabsContent value="content" className="mt-0 space-y-4">
              {/* Image Controls for img elements */}
              {node.tag === 'img' && (
                <ImageControlsV4
                  node={node}
                  breakpoint={breakpoint}
                  onUpdateNode={onUpdateNode!}
                />
              )}
              
              {/* Component Instance Banner */}
              {isInstance && baseComponent && (
                <div className="space-y-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        Instância de Componente
                      </span>
                      <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                        {baseComponent.name}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Alterações aqui sobrescrevem apenas esta instância. O componente original não será alterado.
                  </p>
                </div>
              )}

              {/* Text Content */}
              {node.tag !== 'img' && (node.textContent !== undefined || isInstance) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="text-content" className="text-sm font-medium text-foreground">Text Content</Label>
                    {isInstance && (
                      <OverrideIndicator
                        node={node}
                        property="textContent"
                        onReset={() => {
                          if (node && onUpdateNode) {
                            const resetNode = resetOverride(node, 'textContent');
                            onUpdateNode(resetNode);
                          }
                        }}
                      />
                    )}
                  </div>
                  <Textarea
                    id="text-content"
                    value={localTextContent}
                    onChange={(e) => handleTextContentChange(e.target.value)}
                    placeholder="Enter text content..."
                    rows={4}
                    className="text-sm bg-background text-foreground"
                    data-testid="textarea-content"
                  />
                </div>
              )}

              {/* Attributes */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">HTML Attributes</Label>
                {localAttributes && Object.keys(localAttributes).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(localAttributes).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-3 gap-2">
                        <Input
                          value={key}
                          disabled
                          className="col-span-1 text-xs bg-muted"
                        />
                        <Input
                          value={value}
                          onChange={(e) => handleAttributeChange(key, e.target.value)}
                          placeholder="Value"
                          className="col-span-2 text-xs"
                          data-testid={`attr-${key}`}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground dark:text-gray-400 italic bg-muted/30 p-3 rounded">
                    No attributes defined
                  </div>
                )}
              </div>

              {/* CSS Classes */}
              {node.classNames && node.classNames.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">CSS Classes</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {node.classNames.map((className, index) => (
                      <span
                        key={index}
                        className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md font-mono"
                      >
                        .{className}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
            )}

            {/* Layout Tab */}
            {visibleGroups.some(g => g.id === 'layout') && (
            <TabsContent value="layout" className="mt-0">
              <LayoutControlsV4
                node={node}
                breakpoint={breakpoint}
                onUpdateNode={onUpdateNode!}
              />
            </TabsContent>
            )}

            {/* Styles Tab */}
            {visibleGroups.some(g => g.id === 'styles') && (
            <TabsContent value="styles" className="mt-0">
              <StylingControlsV4
                node={node}
                breakpoint={breakpoint}
                onUpdateNode={onUpdateNode!}
                computedStyles={computedStyles}
                hasOverrides={hasOverrides}
                isFromClasses={isFromClasses}
              />
            </TabsContent>
            )}

            {/* Typography Tab */}
            {visibleGroups.some(g => g.id === 'typography') && (
            <TabsContent value="typography" className="mt-0">
              <TypographyControlsV4
                node={node}
                breakpoint={breakpoint}
                onUpdateNode={onUpdateNode!}
                computedStyles={computedStyles}
                hasOverrides={hasOverrides}
                isFromClasses={isFromClasses}
              />
            </TabsContent>
            )}

            {/* States Tab */}
            {visibleGroups.some(g => g.id === 'states') && (
            <TabsContent value="states" className="mt-0">
              <PseudoClassEditorV4
                node={node}
                breakpoint={breakpoint}
                onUpdateNode={onUpdateNode!}
              />
            </TabsContent>
            )}

            {/* Advanced Tab */}
            {visibleGroups.some(g => g.id === 'advanced') && (
            <TabsContent value="advanced" className="mt-0">
              <AdvancedControlsV4
                node={node}
                onUpdateNode={onUpdateNode!}
              />
            </TabsContent>
            )}
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
