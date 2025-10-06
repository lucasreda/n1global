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
  Settings,
  Grid3X3,
  LayoutGrid,
  Anchor,
  Tablet,
  Smartphone,
  Zap,
  Plus,
  Trash2
} from 'lucide-react';
import { 
  UnitSliderInput, 
  FourSidesInput, 
  FourCornersInput
} from './AdvancedControls';
import { FlexLayoutControls } from './FlexLayoutControls';
import { GridLayoutControls } from './GridLayoutControls';
import { PositionControls } from './PositionControls';
import { BoxModelInspector } from './inspector/BoxModelInspector';
import { ColorPickerProfessional } from './inspector/ColorPickerProfessional';
import { FontFamilySelectorProfessional } from './inspector/FontFamilySelectorProfessional';
import { AnimationsEditor } from './AnimationsEditor';
import { BlockElement, BlockSection, ComponentDefinitionV3, ComponentProp } from '@shared/schema';
import { resetOverride, isComponentInstance } from '@/lib/componentInstance';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

interface AdvancedPropertiesPanelProps {
  selectedElement?: BlockElement | null;
  selectedSection?: BlockSection | null;
  activeBreakpoint?: Breakpoint;
  components?: ComponentDefinitionV3[];
  onUpdateElement?: (elementId: string, updates: Partial<BlockElement>) => void;
  onUpdateSection?: (sectionId: string, updates: Partial<BlockSection>) => void;
  'data-testid'?: string;
}

export type PseudoClass = 'default' | 'hover' | 'focus' | 'active' | 'disabled';

/**
 * Check if a style property is overridden in an instance
 */
function isPropertyOverridden(
  element: BlockElement | null | undefined,
  breakpoint: Breakpoint,
  property: string
): boolean {
  if (!element?.instanceData?.overrides) return false;
  
  const elementOverrides = element.instanceData.overrides[element.id];
  if (!elementOverrides?.styles) return false;
  
  const bpOverrides = elementOverrides.styles[breakpoint];
  return !!bpOverrides?.[property]?.isOverridden;
}

/**
 * Visual indicator for overridden properties
 */
function OverrideIndicator({ 
  element, 
  breakpoint, 
  property,
  onReset 
}: { 
  element: BlockElement | null | undefined; 
  breakpoint: Breakpoint;
  property: string;
  onReset: () => void;
}) {
  const isOverridden = isPropertyOverridden(element, breakpoint, property);
  
  if (!isOverridden) return null;
  
  return (
    <div className="flex items-center gap-1 ml-2">
      <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
        Override
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={onReset}
        title="Reset to component default"
        data-testid={`reset-override-${property}`}
      >
        <RotateCcw className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function AdvancedPropertiesPanel({
  selectedElement,
  selectedSection,
  activeBreakpoint = 'desktop',
  components = [],
  onUpdateElement,
  onUpdateSection,
  'data-testid': testId = 'advanced-properties-panel'
}: AdvancedPropertiesPanelProps) {
  const [activePseudoClass, setActivePseudoClass] = useState<PseudoClass>('default');
  const [openSections, setOpenSections] = useState({
    states: true,
    componentProps: true,
    componentVariants: true,
    typography: true,
    boxModel: true,
    spacing: true,
    border: false,
    background: true,
    layout: false,
    flexbox: false,
    grid: false,
    position: false,
    structure: true,
    animations: false
  });

  // Determine current target (element or section)
  const target = selectedElement || selectedSection;
  const targetType = selectedElement ? 'element' : 'section';
  
  // Get styles for active breakpoint with cascading (V3: mobile→tablet→desktop fallback)
  // AND pseudo-class (default → hover/focus/active/disabled)
  const targetStyles = useMemo(() => {
    if (!target?.styles) return {};
    
    // Check if styles object has breakpoint keys (V3 format)
    const hasBreakpoints = target.styles.desktop || target.styles.tablet || target.styles.mobile;
    
    let baseStyles: any = {};
    
    if (hasBreakpoints) {
      // V3 format: Cascade from desktop → tablet → mobile
      const desktopStyles = target.styles.desktop || {};
      const tabletStyles = target.styles.tablet || {};
      const mobileStyles = target.styles.mobile || {};
      
      if (activeBreakpoint === 'desktop') {
        baseStyles = desktopStyles;
      } else if (activeBreakpoint === 'tablet') {
        // Tablet inherits from desktop
        baseStyles = { ...desktopStyles, ...tabletStyles };
      } else {
        // Mobile inherits from desktop + tablet
        baseStyles = { ...desktopStyles, ...tabletStyles, ...mobileStyles };
      }
    } else {
      // V2 format: use styles directly
      baseStyles = target.styles;
    }
    
    // Apply default state styles first (if exists)
    let stylesWithDefault = baseStyles;
    if (target.states?.default) {
      const defaultState = target.states.default;
      const hasDefaultBreakpoints = defaultState.desktop || defaultState.tablet || defaultState.mobile;
      
      if (hasDefaultBreakpoints) {
        const desktopDefault = defaultState.desktop || {};
        const tabletDefault = defaultState.tablet || {};
        const mobileDefault = defaultState.mobile || {};
        
        let defaultStyles: any = {};
        if (activeBreakpoint === 'desktop') {
          defaultStyles = desktopDefault;
        } else if (activeBreakpoint === 'tablet') {
          defaultStyles = { ...desktopDefault, ...tabletDefault };
        } else {
          defaultStyles = { ...desktopDefault, ...tabletDefault, ...mobileDefault };
        }
        
        stylesWithDefault = { ...baseStyles, ...defaultStyles };
      } else {
        // Legacy: default state is a flat object
        stylesWithDefault = { ...baseStyles, ...defaultState };
      }
    }
    
    // Apply pseudo-class styles with breakpoint cascade (if not default)
    if (activePseudoClass !== 'default' && target.states?.[activePseudoClass]) {
      const stateObject = target.states[activePseudoClass];
      
      // Check if state has breakpoint structure
      const hasStateBreakpoints = stateObject.desktop || stateObject.tablet || stateObject.mobile;
      
      if (hasStateBreakpoints) {
        // Apply breakpoint cascade for state styles
        const desktopState = stateObject.desktop || {};
        const tabletState = stateObject.tablet || {};
        const mobileState = stateObject.mobile || {};
        
        let stateStyles: any = {};
        if (activeBreakpoint === 'desktop') {
          stateStyles = desktopState;
        } else if (activeBreakpoint === 'tablet') {
          stateStyles = { ...desktopState, ...tabletState };
        } else {
          stateStyles = { ...desktopState, ...tabletState, ...mobileState };
        }
        
        return { ...stylesWithDefault, ...stateStyles };
      } else {
        // Legacy: state is a flat object
        return { ...stylesWithDefault, ...stateObject };
      }
    }
    
    return stylesWithDefault;
  }, [target?.styles, target?.states, activeBreakpoint, activePseudoClass]);

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

  // Update handler (breakpoint-aware AND pseudo-class-aware)
  const handleStyleUpdate = useCallback((updates: Record<string, any>) => {
    if (!target) return;

    // Check if we should use states structure
    // Use states if: (1) editing non-default pseudo-class, OR (2) any states already exist, OR (3) using V3 responsive structure
    const hasStatesStructure = target.states?.default || target.states?.hover || target.states?.focus || target.states?.active || target.states?.disabled;
    const hasResponsiveStructure = target.styles?.desktop || target.styles?.tablet || target.styles?.mobile;
    const useStates = activePseudoClass !== 'default' || hasStatesStructure || hasResponsiveStructure;

    // If editing states (default or other pseudo-classes), update states with breakpoints
    if (useStates) {
      const currentStates = target.states || {};
      const currentStateObject = currentStates[activePseudoClass] || {};
      
      // Check if using breakpoint structure
      const hasStateBreakpoints = currentStateObject.desktop || currentStateObject.tablet || currentStateObject.mobile;
      
      let newStateObject: any;
      if (hasStateBreakpoints || target.styles?.desktop || target.styles?.tablet || target.styles?.mobile) {
        // Use breakpoint structure (align with styles structure)
        newStateObject = {
          ...currentStateObject,
          [activeBreakpoint]: {
            ...(currentStateObject[activeBreakpoint] || {}),
            ...updates
          }
        };
      } else {
        // Legacy: flat object (backwards compatibility)
        newStateObject = {
          ...currentStateObject,
          ...updates
        };
      }
      
      const newStates = {
        ...currentStates,
        [activePseudoClass]: newStateObject
      };
      
      if (selectedElement && onUpdateElement) {
        onUpdateElement(selectedElement.id, { states: newStates });
      } else if (selectedSection && onUpdateSection) {
        onUpdateSection(selectedSection.id, { states: newStates });
      }
      return;
    }

    // Otherwise, update styles as usual
    const currentStyles = target.styles || {};
    
    // Check if using V3-style responsive breakpoints
    const hasBreakpoints = currentStyles.desktop || currentStyles.tablet || currentStyles.mobile;
    
    let newStyles: any;
    if (hasBreakpoints) {
      // Update specific breakpoint
      newStyles = {
        ...currentStyles,
        [activeBreakpoint]: {
          ...(currentStyles[activeBreakpoint] || {}),
          ...updates
        }
      };
    } else {
      // V2 format: update styles directly
      newStyles = {
        ...currentStyles,
        ...updates
      };
    }
    
    if (selectedElement && onUpdateElement) {
      onUpdateElement(selectedElement.id, { styles: newStyles });
    } else if (selectedSection && onUpdateSection) {
      onUpdateSection(selectedSection.id, { styles: newStyles });
    }
  }, [target, selectedElement, selectedSection, activeBreakpoint, activePseudoClass, onUpdateElement, onUpdateSection]);

  // Config update handler for structural elements
  const handleConfigUpdate = useCallback((updates: Record<string, any>) => {
    if (!selectedElement || !onUpdateElement) return;
    
    const newConfig = { ...selectedElement.config, ...updates };
    onUpdateElement(selectedElement.id, { config: newConfig });
  }, [selectedElement, onUpdateElement]);

  // Reset override for a specific property (for instances)
  const handleResetOverride = useCallback((property: string) => {
    if (!selectedElement?.instanceData || !onUpdateElement) return;
    
    // Reset the override for this property at the current breakpoint
    const key = `${activeBreakpoint}.${property}`;
    const newInstanceData = resetOverride(
      selectedElement.instanceData,
      selectedElement.id,
      'styles',
      key
    );
    
    onUpdateElement(selectedElement.id, { instanceData: newInstanceData });
  }, [selectedElement, activeBreakpoint, onUpdateElement]);

  // Reset styles for current section (breakpoint-aware)
  const resetSection = useCallback((section: string) => {
    if (!target) return;
    
    const currentStyles = target.styles || {};
    const hasBreakpoints = currentStyles.desktop || currentStyles.tablet || currentStyles.mobile;
    
    // List of keys to remove based on section
    const keysToRemove: string[] = [];
    
    switch (section) {
      case 'typography':
        keysToRemove.push('fontFamily', 'fontSize', 'lineHeight', 'letterSpacing', 'fontWeight', 'fontStyle', 'textTransform', 'color');
        break;
      case 'spacing':
        keysToRemove.push('paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft');
        break;
      case 'border':
        keysToRemove.push('borderStyle', 'borderColor', 'borderWidth', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius');
        break;
      case 'background':
        keysToRemove.push('backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat');
        break;
      case 'layout':
        keysToRemove.push('width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight');
        break;
      case 'flexbox':
        keysToRemove.push('display', 'flexDirection', 'justifyContent', 'alignItems', 'gap', 'flexWrap');
        break;
      case 'grid':
        keysToRemove.push('display', 'gridTemplateColumns', 'gridTemplateRows', 'gap', 'gridAutoFlow', 'gridAutoColumns', 'gridAutoRows');
        break;
      case 'position':
        keysToRemove.push('position', 'top', 'right', 'bottom', 'left', 'zIndex');
        break;
      case 'structure':
        // Reset config properties for structural elements (not style-related)
        if (selectedElement && onUpdateElement) {
          onUpdateElement(selectedElement.id, { 
            config: {
              ...selectedElement.config,
              columns: selectedElement.type === 'block' ? 2 : undefined,
              columnDistribution: 'equal',
              columnWidths: selectedElement.type === 'block' ? ['50%', '50%'] : undefined
            }
          });
        }
        return;
    }
    
    // Remove keys from styles (preserves all unknown metadata fields)
    if (hasBreakpoints) {
      // V3 format: Clone entire styles object to preserve unknown fields
      const newStyles = { ...currentStyles };
      
      // Remove keys from active breakpoint only
      const newBreakpointStyles = { ...(currentStyles[activeBreakpoint] || {}) };
      keysToRemove.forEach(key => delete newBreakpointStyles[key]);
      
      // Update or delete breakpoint key if empty
      if (Object.keys(newBreakpointStyles).length > 0) {
        newStyles[activeBreakpoint] = newBreakpointStyles;
      } else {
        delete newStyles[activeBreakpoint];
      }
      
      if (selectedElement && onUpdateElement) {
        onUpdateElement(selectedElement.id, { styles: newStyles });
      } else if (selectedSection && onUpdateSection) {
        onUpdateSection(selectedSection.id, { styles: newStyles });
      }
    } else {
      // V2 format: Remove keys from flat styles (preserves unknown fields)
      const newStyles = { ...currentStyles };
      keysToRemove.forEach(key => delete newStyles[key]);
      
      if (selectedElement && onUpdateElement) {
        onUpdateElement(selectedElement.id, { styles: newStyles });
      } else if (selectedSection && onUpdateSection) {
        onUpdateSection(selectedSection.id, { styles: newStyles });
      }
    }
  }, [target, selectedElement, selectedSection, activeBreakpoint, onUpdateElement, onUpdateSection]);

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
      <CardHeader className="pb-3 border-b space-y-2">
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
        {/* Active Breakpoint Indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <Monitor className={`h-3.5 w-3.5 ${activeBreakpoint === 'desktop' ? 'text-primary' : ''}`} />
          <Tablet className={`h-3.5 w-3.5 ${activeBreakpoint === 'tablet' ? 'text-primary' : ''}`} />
          <Smartphone className={`h-3.5 w-3.5 ${activeBreakpoint === 'mobile' ? 'text-primary' : ''}`} />
          <span className="ml-auto">
            <span className="font-medium text-foreground capitalize">{activeBreakpoint}</span> styles
          </span>
        </div>
      </CardHeader>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-1">
          {/* Pseudo-Classes States Section */}
          <Collapsible 
            open={openSections.states}
            onOpenChange={() => toggleSection('states')}
          >
            <SectionHeader 
              title="States" 
              icon={Settings} 
              section="states"
              hasChanges={activePseudoClass !== 'default'}
            />
            <CollapsibleContent>
              <div className="px-3 pb-4">
                <Label className="text-sm font-medium mb-2 block">Pseudo-Class State</Label>
                <div className="grid grid-cols-5 gap-1">
                  <Button
                    variant={activePseudoClass === 'default' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActivePseudoClass('default')}
                    className="text-xs"
                    data-testid={`${testId}-state-default`}
                  >
                    Default
                  </Button>
                  <Button
                    variant={activePseudoClass === 'hover' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActivePseudoClass('hover')}
                    className="text-xs"
                    data-testid={`${testId}-state-hover`}
                  >
                    Hover
                  </Button>
                  <Button
                    variant={activePseudoClass === 'focus' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActivePseudoClass('focus')}
                    className="text-xs"
                    data-testid={`${testId}-state-focus`}
                  >
                    Focus
                  </Button>
                  <Button
                    variant={activePseudoClass === 'active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActivePseudoClass('active')}
                    className="text-xs"
                    data-testid={`${testId}-state-active`}
                  >
                    Active
                  </Button>
                  <Button
                    variant={activePseudoClass === 'disabled' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActivePseudoClass('disabled')}
                    className="text-xs"
                    data-testid={`${testId}-state-disabled`}
                  >
                    Disabled
                  </Button>
                </div>
                {activePseudoClass !== 'default' && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Editing <span className="font-medium text-foreground">{activePseudoClass}</span> state styles. Changes apply only when element is in this state.
                  </p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Component Props Section - Only show for component instances */}
          {targetType === 'element' && isComponentInstance(selectedElement as any) && (() => {
            const componentDef = components.find(c => c.id === (selectedElement as any).instanceData?.componentId);
            const hasProps = componentDef?.props && componentDef.props.length > 0;
            
            if (!hasProps) return null;
            
            const handlePropUpdate = (propKey: string, value: any) => {
              if (!selectedElement || !onUpdateElement) return;
              
              const currentPropValues = (selectedElement as any).instanceData?.propValues || {};
              const updatedPropValues = { ...currentPropValues, [propKey]: value };
              
              // Only update instanceData, don't spread the resolved element
              onUpdateElement(selectedElement.id, {
                instanceData: {
                  ...(selectedElement as any).instanceData,
                  propValues: updatedPropValues
                }
              } as any);
            };
            
            return (
              <>
                <Separator />
                <Collapsible 
                  open={openSections.componentProps}
                  onOpenChange={() => toggleSection('componentProps')}
                >
                  <SectionHeader 
                    title="Component Props" 
                    icon={Settings} 
                    section="componentProps"
                    hasChanges={!!((selectedElement as any).instanceData?.propValues && Object.keys((selectedElement as any).instanceData.propValues).length > 0)}
                  />
                  <CollapsibleContent>
                    <div className="px-3 pb-4 space-y-3">
                      <p className="text-xs text-muted-foreground mb-3">
                        Customize this instance's properties
                      </p>
                      {componentDef?.props?.map(prop => {
                        const currentValue = (selectedElement as any).instanceData?.propValues?.[prop.key] ?? prop.defaultValue;
                        
                        return (
                          <div key={prop.id} className="space-y-1.5">
                            <Label className="text-sm">{prop.name}</Label>
                            {prop.type === 'text' && (
                              <Input
                                value={currentValue || ''}
                                onChange={e => handlePropUpdate(prop.key, e.target.value)}
                                placeholder={prop.defaultValue}
                                className="h-8"
                                data-testid={`prop-input-${prop.key}`}
                              />
                            )}
                            {prop.type === 'number' && (
                              <Input
                                type="number"
                                value={currentValue ?? 0}
                                onChange={e => handlePropUpdate(prop.key, parseFloat(e.target.value) || 0)}
                                className="h-8"
                                data-testid={`prop-input-${prop.key}`}
                              />
                            )}
                            {prop.type === 'boolean' && (
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={!!currentValue}
                                  onCheckedChange={checked => handlePropUpdate(prop.key, checked)}
                                  data-testid={`prop-checkbox-${prop.key}`}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {currentValue ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                            )}
                            {prop.type === 'select' && prop.options && (
                              <Select
                                value={currentValue}
                                onValueChange={value => handlePropUpdate(prop.key, value)}
                              >
                                <SelectTrigger className="h-8" data-testid={`prop-select-${prop.key}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {prop.options.map(option => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {prop.type === 'color' && (
                              <ColorPickerProfessional
                                label=""
                                value={currentValue || '#000000'}
                                onChange={value => handlePropUpdate(prop.key, value)}
                                data-testid={`prop-color-${prop.key}`}
                              />
                            )}
                            {prop.type === 'image' && (
                              <Input
                                value={currentValue || ''}
                                onChange={e => handlePropUpdate(prop.key, e.target.value)}
                                placeholder="Image URL"
                                className="h-8"
                                data-testid={`prop-input-${prop.key}`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            );
          })()}

          {/* Component Variants Section - Only show for component instances with variants */}
          {targetType === 'element' && isComponentInstance(selectedElement as any) && (() => {
            const componentDef = components.find(c => c.id === (selectedElement as any).instanceData?.componentId);
            const hasVariants = componentDef?.variantProperties && componentDef.variantProperties.length > 0;
            
            if (!hasVariants) return null;
            
            const handleVariantUpdate = (propertyName: string, value: string) => {
              if (!selectedElement || !onUpdateElement) return;
              
              const currentVariant = (selectedElement as any).instanceData?.selectedVariant || {};
              const updatedVariant = { ...currentVariant, [propertyName]: value };
              
              // Only update instanceData, don't spread the resolved element
              onUpdateElement(selectedElement.id, {
                instanceData: {
                  ...(selectedElement as any).instanceData,
                  selectedVariant: updatedVariant
                }
              } as any);
            };
            
            return (
              <>
                <Separator />
                <Collapsible 
                  open={openSections.componentVariants}
                  onOpenChange={() => toggleSection('componentVariants')}
                >
                  <SectionHeader 
                    title="Component Variants" 
                    icon={Grid3X3} 
                    section="componentVariants"
                    hasChanges={!!((selectedElement as any).instanceData?.selectedVariant && Object.keys((selectedElement as any).instanceData.selectedVariant).length > 0)}
                  />
                  <CollapsibleContent>
                    <div className="px-3 pb-4 space-y-3">
                      <p className="text-xs text-muted-foreground mb-3">
                        Switch between component variants
                      </p>
                      {componentDef?.variantProperties?.map(variantProp => {
                        const currentValue = (selectedElement as any).instanceData?.selectedVariant?.[variantProp.name] ?? variantProp.values[0];
                        
                        return (
                          <div key={variantProp.name} className="space-y-1.5">
                            <Label className="text-sm">{variantProp.name}</Label>
                            <Select
                              value={currentValue}
                              onValueChange={value => handleVariantUpdate(variantProp.name, value)}
                            >
                              <SelectTrigger className="h-8" data-testid={`variant-select-${variantProp.name}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {variantProp.values.map(value => (
                                  <SelectItem key={value} value={value}>
                                    {value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                      
                      {/* Show current variant combination info */}
                      {componentDef?.variants && (selectedElement as any).instanceData?.selectedVariant && (
                        <div className="mt-4 p-2 bg-muted rounded text-xs">
                          <p className="font-medium mb-1">Current Variant:</p>
                          <p className="text-muted-foreground">
                            {Object.entries((selectedElement as any).instanceData.selectedVariant)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(' / ')}
                          </p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            );
          })()}

          <Separator />

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
                hasChanges={!!(targetStyles.fontFamily || targetStyles.fontSize || targetStyles.fontWeight || targetStyles.color)}
              />
              <CollapsibleContent>
                <div className="px-3 pb-4 space-y-4">
                  <FontFamilySelectorProfessional
                    value={getStyleValue('fontFamily', 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif')}
                    onChange={(value) => handleStyleUpdate({ fontFamily: value })}
                    data-testid={`${testId}-font-family`}
                  />
                  
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

                  <div className="flex items-center gap-2">
                    <ColorPickerProfessional
                      label="Text Color"
                      value={getStyleValue('color', '#000000')}
                      onChange={(value) => handleStyleUpdate({ color: value })}
                      data-testid={`${testId}-text-color`}
                    />
                    <OverrideIndicator
                      element={selectedElement}
                      breakpoint={activeBreakpoint}
                      property="color"
                      onReset={() => handleResetOverride('color')}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <Separator />

          {/* Box Model Section - Chrome DevTools Style */}
          <Collapsible 
            open={openSections.boxModel}
            onOpenChange={() => toggleSection('boxModel')}
          >
            <SectionHeader 
              title="Box Model" 
              icon={Frame} 
              section="boxModel"
              hasChanges={!!(targetStyles.marginTop || targetStyles.paddingTop || targetStyles.borderWidth)}
            />
            <CollapsibleContent>
              <div className="px-3 pb-4">
                <BoxModelInspector
                  margin={{
                    top: getStyleValue('marginTop', '0px'),
                    right: getStyleValue('marginRight', '0px'),
                    bottom: getStyleValue('marginBottom', '0px'),
                    left: getStyleValue('marginLeft', '0px')
                  }}
                  padding={{
                    top: getStyleValue('paddingTop', '0px'),
                    right: getStyleValue('paddingRight', '0px'),
                    bottom: getStyleValue('paddingBottom', '0px'),
                    left: getStyleValue('paddingLeft', '0px')
                  }}
                  border={{
                    width: getStyleValue('borderWidth', '0px'),
                    topWidth: getStyleValue('borderTopWidth', '0px'),
                    rightWidth: getStyleValue('borderRightWidth', '0px'),
                    bottomWidth: getStyleValue('borderBottomWidth', '0px'),
                    leftWidth: getStyleValue('borderLeftWidth', '0px'),
                    style: getStyleValue('borderStyle', 'solid'),
                    color: getStyleValue('borderColor', '#000000')
                  }}
                  onChange={handleStyleUpdate}
                  data-testid={`${testId}-box-model`}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

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

                <ColorPickerProfessional
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
                <ColorPickerProfessional
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

          <Separator />

          {/* Flexbox Section */}
          <Collapsible 
            open={openSections.flexbox}
            onOpenChange={() => toggleSection('flexbox')}
          >
            <SectionHeader 
              title="Flexbox Layout" 
              icon={LayoutGrid} 
              section="flexbox"
              hasChanges={!!(targetStyles.display === 'flex')}
            />
            <CollapsibleContent>
              <div className="px-3 pb-4">
                <FlexLayoutControls
                  display={getStyleValue('display', 'block')}
                  flexDirection={getStyleValue('flexDirection', 'row')}
                  justifyContent={getStyleValue('justifyContent', 'flex-start')}
                  alignItems={getStyleValue('alignItems', 'stretch')}
                  gap={getStyleValue('gap', '0px')}
                  flexWrap={getStyleValue('flexWrap', 'nowrap')}
                  onChange={handleStyleUpdate}
                  data-testid={`${testId}-flexbox`}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Grid Section */}
          <Collapsible 
            open={openSections.grid}
            onOpenChange={() => toggleSection('grid')}
          >
            <SectionHeader 
              title="Grid Layout" 
              icon={Grid3X3} 
              section="grid"
              hasChanges={!!(targetStyles.display === 'grid')}
            />
            <CollapsibleContent>
              <div className="px-3 pb-4">
                <GridLayoutControls
                  display={getStyleValue('display', 'block')}
                  gridTemplateColumns={getStyleValue('gridTemplateColumns', 'none')}
                  gridTemplateRows={getStyleValue('gridTemplateRows', 'none')}
                  gap={getStyleValue('gap', '0px')}
                  gridAutoFlow={getStyleValue('gridAutoFlow', 'row')}
                  gridAutoColumns={getStyleValue('gridAutoColumns', 'auto')}
                  gridAutoRows={getStyleValue('gridAutoRows', 'auto')}
                  onChange={handleStyleUpdate}
                  data-testid={`${testId}-grid`}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Position Section */}
          <Collapsible 
            open={openSections.position}
            onOpenChange={() => toggleSection('position')}
          >
            <SectionHeader 
              title="Position & Z-Index" 
              icon={Anchor} 
              section="position"
              hasChanges={!!(targetStyles.position && targetStyles.position !== 'static')}
            />
            <CollapsibleContent>
              <div className="px-3 pb-4">
                <PositionControls
                  position={getStyleValue('position', 'static')}
                  top={getStyleValue('top', 'auto')}
                  right={getStyleValue('right', 'auto')}
                  bottom={getStyleValue('bottom', 'auto')}
                  left={getStyleValue('left', 'auto')}
                  zIndex={getStyleValue('zIndex', 'auto')}
                  onChange={handleStyleUpdate}
                  data-testid={`${testId}-position`}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Structure Section - Only show for structural elements */}
          {targetType === 'element' && selectedElement && 
           (selectedElement.type === 'block' || selectedElement.type === 'container') && (
            <>
              <Separator />
              <Collapsible 
                open={openSections.structure}
                onOpenChange={() => toggleSection('structure')}
              >
                <SectionHeader 
                  title="Estrutura" 
                  icon={Grid3X3} 
                  section="structure"
                  hasChanges={!!(selectedElement.config?.columns && selectedElement.config.columns !== 2)}
                />
                <CollapsibleContent>
                  <div className="px-3 pb-4 space-y-4">
                    {/* Show column controls only for block elements */}
                    {selectedElement.type === 'block' && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Número de Colunas</Label>
                          <Select
                            value={String(selectedElement.config?.columns || 2)}
                            onValueChange={(value) => {
                              const columns = parseInt(value);
                              const columnWidths = Array(columns).fill(`${100/columns}%`);
                              handleConfigUpdate({ 
                                columns,
                                columnWidths,
                                columnDistribution: 'equal'
                              });
                            }}
                          >
                            <SelectTrigger data-testid={`${testId}-columns`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 Coluna</SelectItem>
                              <SelectItem value="2">2 Colunas</SelectItem>
                              <SelectItem value="3">3 Colunas</SelectItem>
                              <SelectItem value="4">4 Colunas</SelectItem>
                              <SelectItem value="6">6 Colunas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Distribuição das Colunas</Label>
                          <Select
                            value={selectedElement.config?.columnDistribution || 'equal'}
                            onValueChange={(value) => {
                              const columns = selectedElement.config?.columns || 2;
                              let columnWidths: string[] = [];
                              
                              if (value === 'equal') {
                                columnWidths = Array(columns).fill(`${100/columns}%`);
                              } else if (value === '2-1' && columns === 2) {
                                columnWidths = ['66.67%', '33.33%'];
                              } else if (value === '1-2' && columns === 2) {
                                columnWidths = ['33.33%', '66.67%'];
                              } else if (value === '3-1-1' && columns === 3) {
                                columnWidths = ['60%', '20%', '20%'];
                              } else if (value === '1-3-1' && columns === 3) {
                                columnWidths = ['20%', '60%', '20%'];
                              } else {
                                columnWidths = Array(columns).fill(`${100/columns}%`);
                              }
                              
                              handleConfigUpdate({ 
                                columnDistribution: value,
                                columnWidths
                              });
                            }}
                          >
                            <SelectTrigger data-testid={`${testId}-column-distribution`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equal">Igual</SelectItem>
                              {(selectedElement.config?.columns || 2) === 2 && (
                                <>
                                  <SelectItem value="2-1">2:1</SelectItem>
                                  <SelectItem value="1-2">1:2</SelectItem>
                                </>
                              )}
                              {(selectedElement.config?.columns || 2) === 3 && (
                                <>
                                  <SelectItem value="3-1-1">3:1:1</SelectItem>
                                  <SelectItem value="1-3-1">1:3:1</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Gap entre Colunas</Label>
                          <UnitSliderInput
                            label=""
                            value={selectedElement.styles?.gap || '1rem'}
                            onChange={(value) => handleStyleUpdate({ gap: value })}
                            min={0}
                            max={5}
                            step={0.25}
                            units={['rem', 'px']}
                            data-testid={`${testId}-column-gap`}
                          />
                        </div>
                      </>
                    )}
                    
                    {/* Container specific controls */}
                    {selectedElement.type === 'container' && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Tipo de Container</Label>
                        <div className="text-sm text-muted-foreground">
                          Container simples para agrupar elementos. Use blocos para layouts em colunas.
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {/* Animations & Transitions Section */}
          <Separator />
          <Collapsible 
            open={openSections.animations}
            onOpenChange={() => toggleSection('animations')}
          >
            <SectionHeader 
              title="Animations & Transitions" 
              icon={Zap} 
              section="animations"
              hasChanges={!!(target.transitions?.length || target.animations?.length)}
            />
            <CollapsibleContent>
              <div className="px-3 pb-4 space-y-4">
                {/* Transitions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Transitions</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newTransition = {
                          property: 'all',
                          duration: '300ms',
                          timingFunction: 'ease',
                          delay: '0ms'
                        };
                        const currentTransitions = target.transitions || [];
                        const newTransitions = [...currentTransitions, newTransition];
                        
                        if (selectedElement && onUpdateElement) {
                          onUpdateElement(selectedElement.id, { transitions: newTransitions });
                        } else if (selectedSection && onUpdateSection) {
                          onUpdateSection(selectedSection.id, { transitions: newTransitions });
                        }
                      }}
                      className="h-6 gap-1"
                      data-testid={`${testId}-add-transition`}
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </Button>
                  </div>

                  {(!target.transitions || target.transitions.length === 0) && (
                    <p className="text-xs text-muted-foreground">
                      No transitions defined. Click "Add" to create one.
                    </p>
                  )}

                  {target.transitions?.map((transition, index) => (
                    <Card key={index} className="p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Transition {index + 1}</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newTransitions = target.transitions?.filter((_, i) => i !== index) || [];
                            if (selectedElement && onUpdateElement) {
                              onUpdateElement(selectedElement.id, { transitions: newTransitions });
                            } else if (selectedSection && onUpdateSection) {
                              onUpdateSection(selectedSection.id, { transitions: newTransitions });
                            }
                          }}
                          className="h-6 w-6 p-0"
                          data-testid={`${testId}-remove-transition-${index}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Property</Label>
                        <Select
                          value={transition.property}
                          onValueChange={(value) => {
                            const newTransitions = [...(target.transitions || [])];
                            newTransitions[index] = { ...newTransitions[index], property: value };
                            if (selectedElement && onUpdateElement) {
                              onUpdateElement(selectedElement.id, { transitions: newTransitions });
                            } else if (selectedSection && onUpdateSection) {
                              onUpdateSection(selectedSection.id, { transitions: newTransitions });
                            }
                          }}
                        >
                          <SelectTrigger className="h-8" data-testid={`${testId}-transition-property-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="opacity">Opacity</SelectItem>
                            <SelectItem value="transform">Transform</SelectItem>
                            <SelectItem value="background-color">Background Color</SelectItem>
                            <SelectItem value="color">Color</SelectItem>
                            <SelectItem value="width">Width</SelectItem>
                            <SelectItem value="height">Height</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <UnitSliderInput
                        label="Duration"
                        value={transition.duration || '300ms'}
                        onChange={(value) => {
                          const newTransitions = [...(target.transitions || [])];
                          newTransitions[index] = { ...newTransitions[index], duration: value };
                          if (selectedElement && onUpdateElement) {
                            onUpdateElement(selectedElement.id, { transitions: newTransitions });
                          } else if (selectedSection && onUpdateSection) {
                            onUpdateSection(selectedSection.id, { transitions: newTransitions });
                          }
                        }}
                        min={0}
                        max={2000}
                        step={50}
                        units={['ms', 's']}
                        data-testid={`${testId}-transition-duration-${index}`}
                      />

                      <div className="space-y-2">
                        <Label className="text-xs">Timing Function</Label>
                        <Select
                          value={transition.timingFunction || 'ease'}
                          onValueChange={(value) => {
                            const newTransitions = [...(target.transitions || [])];
                            newTransitions[index] = { ...newTransitions[index], timingFunction: value };
                            if (selectedElement && onUpdateElement) {
                              onUpdateElement(selectedElement.id, { transitions: newTransitions });
                            } else if (selectedSection && onUpdateSection) {
                              onUpdateSection(selectedSection.id, { transitions: newTransitions });
                            }
                          }}
                        >
                          <SelectTrigger className="h-8" data-testid={`${testId}-transition-timing-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ease">Ease</SelectItem>
                            <SelectItem value="linear">Linear</SelectItem>
                            <SelectItem value="ease-in">Ease In</SelectItem>
                            <SelectItem value="ease-out">Ease Out</SelectItem>
                            <SelectItem value="ease-in-out">Ease In Out</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <UnitSliderInput
                        label="Delay"
                        value={transition.delay || '0ms'}
                        onChange={(value) => {
                          const newTransitions = [...(target.transitions || [])];
                          newTransitions[index] = { ...newTransitions[index], delay: value };
                          if (selectedElement && onUpdateElement) {
                            onUpdateElement(selectedElement.id, { transitions: newTransitions });
                          } else if (selectedSection && onUpdateSection) {
                            onUpdateSection(selectedSection.id, { transitions: newTransitions });
                          }
                        }}
                        min={0}
                        max={2000}
                        step={50}
                        units={['ms', 's']}
                        data-testid={`${testId}-transition-delay-${index}`}
                      />
                    </Card>
                  ))}
                </div>

                {/* Keyframe Animations */}
                <AnimationsEditor
                  animations={target.animations || []}
                  onChange={(animations) => {
                    if (selectedElement && onUpdateElement) {
                      onUpdateElement(selectedElement.id, { animations });
                    } else if (selectedSection && onUpdateSection) {
                      onUpdateSection(selectedSection.id, { animations });
                    }
                  }}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </Card>
  );
}