import { useState, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { 
  Type, 
  Move, 
  Frame, 
  Palette, 
  Monitor,
  ChevronDown,
  RotateCcw,
  Settings
} from 'lucide-react';
import { 
  UnitSliderInput, 
  FourSidesInput, 
  FourCornersInput, 
  ColorPickerPopover 
} from './AdvancedControls';
import { BlockElement, BlockSection } from '@shared/schema';

interface AdvancedPropertiesPanelProps {
  selectedElement?: BlockElement | null;
  selectedSection?: BlockSection | null;
  onUpdateElement?: (elementId: string, updates: Partial<BlockElement>) => void;
  onUpdateSection?: (sectionId: string, updates: Partial<BlockSection>) => void;
  'data-testid'?: string;
}

export function AdvancedPropertiesPanel({
  selectedElement,
  selectedSection,
  onUpdateElement,
  onUpdateSection,
  'data-testid': testId = 'advanced-properties-panel'
}: AdvancedPropertiesPanelProps) {
  const [openSections, setOpenSections] = useState({
    typography: true,
    spacing: true,
    border: false,
    background: true,
    layout: false
  });

  // Determine current target (element or section)
  const target = selectedElement || selectedSection;
  const targetType = selectedElement ? 'element' : 'section';
  const targetStyles = target?.styles || {};

  // Toggle section collapse
  const toggleSection = useCallback((section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  }, []);

  // Helper to get current style values with fallbacks
  const getStyleValue = useCallback((key: string, fallback = '0px') => {
    return targetStyles[key] || fallback;
  }, [targetStyles]);

  // Update handler
  const handleStyleUpdate = useCallback((updates: Record<string, any>) => {
    if (!target) return;

    const newStyles = { ...target.styles, ...updates };
    
    if (selectedElement && onUpdateElement) {
      onUpdateElement(selectedElement.id, { styles: newStyles });
    } else if (selectedSection && onUpdateSection) {
      onUpdateSection(selectedSection.id, { styles: newStyles });
    }
  }, [target, selectedElement, selectedSection, onUpdateElement, onUpdateSection]);

  // Reset styles for current section
  const resetSection = useCallback((section: string) => {
    const resetUpdates: Record<string, any> = {};
    
    switch (section) {
      case 'typography':
        resetUpdates.fontSize = undefined;
        resetUpdates.lineHeight = undefined;
        resetUpdates.letterSpacing = undefined;
        resetUpdates.fontWeight = undefined;
        resetUpdates.fontStyle = undefined;
        resetUpdates.textTransform = undefined;
        resetUpdates.color = undefined;
        break;
      case 'spacing':
        resetUpdates.paddingTop = undefined;
        resetUpdates.paddingRight = undefined;
        resetUpdates.paddingBottom = undefined;
        resetUpdates.paddingLeft = undefined;
        resetUpdates.marginTop = undefined;
        resetUpdates.marginRight = undefined;
        resetUpdates.marginBottom = undefined;
        resetUpdates.marginLeft = undefined;
        break;
      case 'border':
        resetUpdates.borderStyle = undefined;
        resetUpdates.borderColor = undefined;
        resetUpdates.borderWidth = undefined;
        resetUpdates.borderTopWidth = undefined;
        resetUpdates.borderRightWidth = undefined;
        resetUpdates.borderBottomWidth = undefined;
        resetUpdates.borderLeftWidth = undefined;
        resetUpdates.borderRadius = undefined;
        resetUpdates.borderTopLeftRadius = undefined;
        resetUpdates.borderTopRightRadius = undefined;
        resetUpdates.borderBottomRightRadius = undefined;
        resetUpdates.borderBottomLeftRadius = undefined;
        break;
      case 'background':
        resetUpdates.backgroundColor = undefined;
        resetUpdates.backgroundImage = undefined;
        break;
      case 'layout':
        resetUpdates.width = undefined;
        resetUpdates.height = undefined;
        resetUpdates.minWidth = undefined;
        resetUpdates.maxWidth = undefined;
        resetUpdates.minHeight = undefined;
        resetUpdates.maxHeight = undefined;
        break;
    }
    
    handleStyleUpdate(resetUpdates);
  }, [handleStyleUpdate]);

  // Helper to get four-sides values
  const getFourSidesValue = useCallback((prefix: 'padding' | 'margin') => ({
    top: getStyleValue(`${prefix}Top`, '0px'),
    right: getStyleValue(`${prefix}Right`, '0px'),
    bottom: getStyleValue(`${prefix}Bottom`, '0px'),
    left: getStyleValue(`${prefix}Left`, '0px')
  }), [getStyleValue]);

  // Helper to get four-corners values
  const getFourCornersValue = useCallback(() => ({
    topLeft: getStyleValue('borderTopLeftRadius', '0px'),
    topRight: getStyleValue('borderTopRightRadius', '0px'),
    bottomRight: getStyleValue('borderBottomRightRadius', '0px'),
    bottomLeft: getStyleValue('borderBottomLeftRadius', '0px')
  }), [getStyleValue]);

  // Memoized section header component
  const SectionHeader = useMemo(() => {
    return ({ title, icon: Icon, section, hasChanges }: {
      title: string;
      icon: any;
      section: string;
      hasChanges?: boolean;
    }) => (
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{title}</span>
            {hasChanges && <Badge variant="secondary" className="h-5 px-1.5 text-xs">•</Badge>}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                resetSection(section);
              }}
              data-testid={`${testId}-reset-${section}`}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
            <ChevronDown 
              className={`h-4 w-4 transition-transform ${
                openSections[section as keyof typeof openSections] ? 'rotate-180' : ''
              }`} 
            />
          </div>
        </div>
      </CollapsibleTrigger>
    );
  }, [openSections, resetSection, testId]);

  if (!target) {
    return (
      <Card className="w-80 h-full" data-testid={testId}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Properties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Monitor className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Select an element or section to edit its properties</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-80 h-full flex flex-col" data-testid={testId}>
      {/* Header */}
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle className="text-lg">Properties</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {targetType === 'element' ? selectedElement?.type : 'section'}
          </Badge>
        </div>
        {target && (
          <p className="text-sm text-muted-foreground truncate">
            {targetType === 'element' 
              ? `Element: ${selectedElement?.type}` 
              : `Section: ${selectedSection?.name || 'Untitled'}`
            }
          </p>
        )}
      </CardHeader>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-1">
          {/* Typography Section - Only show for elements */}
          {targetType === 'element' && (
            <Collapsible 
              open={openSections.typography}
              onOpenChange={() => toggleSection('typography')}
            >
              <SectionHeader 
                title="Typography" 
                icon={Type} 
                section="typography"
                hasChanges={!!(targetStyles.fontSize || targetStyles.fontWeight || targetStyles.color)}
              />
              <CollapsibleContent>
                <div className="px-3 pb-4 space-y-4">
                  <UnitSliderInput
                    label="Font Size"
                    value={getStyleValue('fontSize', '16px')}
                    onChange={(value) => handleStyleUpdate({ fontSize: value })}
                    min={8}
                    max={72}
                    units={['px', 'rem', 'em']}
                    data-testid={`${testId}-font-size`}
                  />
                  
                  <UnitSliderInput
                    label="Line Height"
                    value={getStyleValue('lineHeight', '1.5')}
                    onChange={(value) => handleStyleUpdate({ lineHeight: value })}
                    min={0.8}
                    max={3}
                    step={0.1}
                    units={['', 'px', 'rem']}
                    data-testid={`${testId}-line-height`}
                  />

                  <UnitSliderInput
                    label="Letter Spacing"
                    value={getStyleValue('letterSpacing', '0px')}
                    onChange={(value) => handleStyleUpdate({ letterSpacing: value })}
                    min={-2}
                    max={5}
                    step={0.1}
                    units={['px', 'em']}
                    data-testid={`${testId}-letter-spacing`}
                  />

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Font Weight</Label>
                    <Select
                      value={getStyleValue('fontWeight', 'normal')}
                      onValueChange={(value) => handleStyleUpdate({ fontWeight: value })}
                    >
                      <SelectTrigger data-testid={`${testId}-font-weight`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100">Thin (100)</SelectItem>
                        <SelectItem value="200">Extra Light (200)</SelectItem>
                        <SelectItem value="300">Light (300)</SelectItem>
                        <SelectItem value="normal">Normal (400)</SelectItem>
                        <SelectItem value="500">Medium (500)</SelectItem>
                        <SelectItem value="600">Semi Bold (600)</SelectItem>
                        <SelectItem value="bold">Bold (700)</SelectItem>
                        <SelectItem value="800">Extra Bold (800)</SelectItem>
                        <SelectItem value="900">Black (900)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Text Transform</Label>
                    <Select
                      value={getStyleValue('textTransform', 'none')}
                      onValueChange={(value) => handleStyleUpdate({ textTransform: value })}
                    >
                      <SelectTrigger data-testid={`${testId}-text-transform`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="uppercase">UPPERCASE</SelectItem>
                        <SelectItem value="lowercase">lowercase</SelectItem>
                        <SelectItem value="capitalize">Capitalize</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <ColorPickerPopover
                    label="Text Color"
                    value={getStyleValue('color', '#000000')}
                    onChange={(value) => handleStyleUpdate({ color: value })}
                    data-testid={`${testId}-text-color`}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <Separator />

          {/* Spacing Section */}
          <Collapsible 
            open={openSections.spacing}
            onOpenChange={() => toggleSection('spacing')}
          >
            <SectionHeader 
              title="Spacing" 
              icon={Move} 
              section="spacing"
              hasChanges={!!(targetStyles.paddingTop || targetStyles.marginTop)}
            />
            <CollapsibleContent>
              <div className="px-3 pb-4 space-y-4">
                <FourSidesInput
                  label="Padding"
                  value={getFourSidesValue('padding')}
                  onChange={(value) => handleStyleUpdate({
                    paddingTop: value.top,
                    paddingRight: value.right,
                    paddingBottom: value.bottom,
                    paddingLeft: value.left
                  })}
                  max={200}
                  data-testid={`${testId}-padding`}
                />

                <FourSidesInput
                  label="Margin"
                  value={getFourSidesValue('margin')}
                  onChange={(value) => handleStyleUpdate({
                    marginTop: value.top,
                    marginRight: value.right,
                    marginBottom: value.bottom,
                    marginLeft: value.left
                  })}
                  min={-100}
                  max={200}
                  data-testid={`${testId}-margin`}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Border Section */}
          <Collapsible 
            open={openSections.border}
            onOpenChange={() => toggleSection('border')}
          >
            <SectionHeader 
              title="Border" 
              icon={Frame} 
              section="border"
              hasChanges={!!(targetStyles.borderWidth || targetStyles.borderRadius)}
            />
            <CollapsibleContent>
              <div className="px-3 pb-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Style</Label>
                  <Select
                    value={getStyleValue('borderStyle', 'none')}
                    onValueChange={(value) => handleStyleUpdate({ borderStyle: value })}
                  >
                    <SelectTrigger data-testid={`${testId}-border-style`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="solid">Solid</SelectItem>
                      <SelectItem value="dashed">Dashed</SelectItem>
                      <SelectItem value="dotted">Dotted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <UnitSliderInput
                  label="Width"
                  value={getStyleValue('borderWidth', '0px')}
                  onChange={(value) => handleStyleUpdate({ borderWidth: value })}
                  max={20}
                  data-testid={`${testId}-border-width`}
                />

                <ColorPickerPopover
                  label="Border Color"
                  value={getStyleValue('borderColor', '#000000')}
                  onChange={(value) => handleStyleUpdate({ borderColor: value })}
                  data-testid={`${testId}-border-color`}
                />

                <FourCornersInput
                  label="Border Radius"
                  value={getFourCornersValue()}
                  onChange={(value) => handleStyleUpdate({
                    borderTopLeftRadius: value.topLeft,
                    borderTopRightRadius: value.topRight,
                    borderBottomRightRadius: value.bottomRight,
                    borderBottomLeftRadius: value.bottomLeft
                  })}
                  max={100}
                  data-testid={`${testId}-border-radius`}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Background Section */}
          <Collapsible 
            open={openSections.background}
            onOpenChange={() => toggleSection('background')}
          >
            <SectionHeader 
              title="Background" 
              icon={Palette} 
              section="background"
              hasChanges={!!(targetStyles.backgroundColor)}
            />
            <CollapsibleContent>
              <div className="px-3 pb-4 space-y-4">
                <ColorPickerPopover
                  label="Background Color"
                  value={getStyleValue('backgroundColor', 'transparent')}
                  onChange={(value) => handleStyleUpdate({ backgroundColor: value })}
                  data-testid={`${testId}-background-color`}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Layout Section */}
          <Collapsible 
            open={openSections.layout}
            onOpenChange={() => toggleSection('layout')}
          >
            <SectionHeader 
              title="Size & Layout" 
              icon={Monitor} 
              section="layout"
              hasChanges={!!(targetStyles.width || targetStyles.height)}
            />
            <CollapsibleContent>
              <div className="px-3 pb-4 space-y-4">
                <UnitSliderInput
                  label="Width"
                  value={getStyleValue('width', 'auto')}
                  onChange={(value) => handleStyleUpdate({ width: value })}
                  max={1200}
                  units={['px', '%', 'rem', 'auto']}
                  data-testid={`${testId}-width`}
                />

                <UnitSliderInput
                  label="Height"
                  value={getStyleValue('height', 'auto')}
                  onChange={(value) => handleStyleUpdate({ height: value })}
                  max={800}
                  units={['px', '%', 'rem', 'auto']}
                  data-testid={`${testId}-height`}
                />

                <UnitSliderInput
                  label="Max Width"
                  value={getStyleValue('maxWidth', 'none')}
                  onChange={(value) => handleStyleUpdate({ maxWidth: value })}
                  max={1200}
                  units={['px', '%', 'rem', 'none']}
                  data-testid={`${testId}-max-width`}
                />

                <UnitSliderInput
                  label="Min Height"
                  value={getStyleValue('minHeight', '0px')}
                  onChange={(value) => handleStyleUpdate({ minHeight: value })}
                  max={800}
                  units={['px', '%', 'rem', 'vh']}
                  data-testid={`${testId}-min-height`}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </Card>
  );
}