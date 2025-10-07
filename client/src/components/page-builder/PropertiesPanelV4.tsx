import { useState } from 'react';
import { PageNodeV4 } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Monitor, Tablet, Smartphone, Settings, Type as TypeIcon, Palette, Layout as LayoutIcon, Zap, FileCode } from 'lucide-react';
import { LayoutControlsV4 } from './v4/LayoutControlsV4';
import { StylingControlsV4, TypographyControlsV4 } from './v4/StylingControlsV4';
import { AdvancedControlsV4, PseudoClassEditorV4 } from './v4/AdvancedControlsV4';
import { ImageControlsV4 } from './v4/ImageControlsV4';
import { useComputedStyles } from '@/hooks/useComputedStyles';

interface PropertiesPanelV4Props {
  node: PageNodeV4 | null;
  onUpdateNode?: (updates: Partial<PageNodeV4>) => void;
}

export function PropertiesPanelV4({ node, onUpdateNode }: PropertiesPanelV4Props) {
  const [breakpoint, setBreakpoint] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const { computedStyles, hasOverrides, isFromClasses } = useComputedStyles(node, breakpoint);

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

  const handleTextContentChange = (value: string) => {
    if (onUpdateNode) {
      onUpdateNode({ textContent: value });
    }
  };

  const handleAttributeChange = (key: string, value: string) => {
    if (onUpdateNode) {
      const newAttributes = { ...node.attributes, [key]: value };
      onUpdateNode({ attributes: newAttributes });
    }
  };

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
      <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full grid grid-cols-6 h-auto p-1 mx-4 mt-3">
          <TabsTrigger value="content" className="text-xs py-1.5" data-testid="tab-content">
            <FileCode className="h-3.5 w-3.5" />
          </TabsTrigger>
          <TabsTrigger value="layout" className="text-xs py-1.5" data-testid="tab-layout">
            <LayoutIcon className="h-3.5 w-3.5" />
          </TabsTrigger>
          <TabsTrigger value="styles" className="text-xs py-1.5" data-testid="tab-styles">
            <Palette className="h-3.5 w-3.5" />
          </TabsTrigger>
          <TabsTrigger value="typography" className="text-xs py-1.5" data-testid="tab-typography">
            <TypeIcon className="h-3.5 w-3.5" />
          </TabsTrigger>
          <TabsTrigger value="states" className="text-xs py-1.5" data-testid="tab-states">
            <Zap className="h-3.5 w-3.5" />
          </TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs py-1.5" data-testid="tab-advanced">
            <Settings className="h-3.5 w-3.5" />
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <div className="p-4">
            {/* Content Tab */}
            <TabsContent value="content" className="mt-0 space-y-4">
              {/* Image Controls for img elements */}
              {node.tag === 'img' && (
                <ImageControlsV4
                  node={node}
                  breakpoint={breakpoint}
                  onUpdateNode={onUpdateNode!}
                />
              )}
              
              {/* Text Content */}
              {node.tag !== 'img' && node.textContent !== undefined && (
                <div className="space-y-2">
                  <Label htmlFor="text-content" className="text-sm font-medium text-foreground">Text Content</Label>
                  <Textarea
                    id="text-content"
                    value={node.textContent}
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
                {node.attributes && Object.keys(node.attributes).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(node.attributes).map(([key, value]) => (
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

            {/* Layout Tab */}
            <TabsContent value="layout" className="mt-0">
              <LayoutControlsV4
                node={node}
                breakpoint={breakpoint}
                onUpdateNode={onUpdateNode!}
              />
            </TabsContent>

            {/* Styles Tab */}
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

            {/* Typography Tab */}
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

            {/* States Tab */}
            <TabsContent value="states" className="mt-0">
              <PseudoClassEditorV4
                node={node}
                breakpoint={breakpoint}
                onUpdateNode={onUpdateNode!}
              />
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="mt-0">
              <AdvancedControlsV4
                node={node}
                onUpdateNode={onUpdateNode!}
              />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
