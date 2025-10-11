import { useState, useEffect } from 'react';
import { PageNodeV4, ResponsiveStylesV4 } from '@shared/schema';
import { BoxModelInspector } from '../inspector/BoxModelInspector';
import { ColorPickerProfessional } from '../inspector/ColorPickerProfessional';
import { FontFamilySelectorProfessional } from '../inspector/FontFamilySelectorProfessional';
import { ShadowPicker } from '../inspector/ShadowPicker';
import { GradientPicker } from '../inspector/GradientPicker';
import { BackgroundImageControls } from '../inspector/BackgroundImageControls';
import { FilterControls } from '../inspector/FilterControls';
import { BackdropFilterControls } from '../inspector/BackdropFilterControls';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { UnitSliderInput } from '../AdvancedControls';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface StylingControlsV4Props {
  node: PageNodeV4 | null;
  breakpoint: 'desktop' | 'tablet' | 'mobile';
  onUpdateNode: (updates: Partial<PageNodeV4>) => void;
  computedStyles?: { [property: string]: string };
  hasOverrides?: { [property: string]: boolean };
  isFromClasses?: boolean;
}

export function StylingControlsV4({ node, breakpoint, onUpdateNode, computedStyles = {}, hasOverrides = {}, isFromClasses = false }: StylingControlsV4Props) {
  if (!node) return null;

  // Merge responsive styles with inline styles (inline has precedence)
  // If element has classes, show computed styles as fallback
  const currentStyles = {
    ...computedStyles,
    ...(node.styles?.[breakpoint] || {}),
    ...(node.inlineStyles || {}),
  };

  // Detect active background type
  const detectBackgroundType = (): 'color' | 'gradient' | 'image' => {
    const bgImage = currentStyles.backgroundImage;
    if (bgImage && bgImage !== 'none') {
      if (bgImage.includes('gradient')) return 'gradient';
      if (bgImage.includes('url(')) return 'image';
    }
    return 'color';
  };

  // State for active background tab with sync from styles
  const [activeBackgroundTab, setActiveBackgroundTab] = useState(detectBackgroundType());
  
  // State for collapsible sections
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isBackdropOpen, setIsBackdropOpen] = useState(false);
  
  // Sync tab when node/breakpoint changes
  useEffect(() => {
    setActiveBackgroundTab(detectBackgroundType());
  }, [node?.id, breakpoint, currentStyles.backgroundImage]);

  const handleStyleChange = (updates: Record<string, string | any>) => {
    console.log('Style change received:', updates, 'for breakpoint:', breakpoint);
    
    const updatedStyles: ResponsiveStylesV4 = {
      desktop: { ...(node.styles?.desktop || {}) },
      tablet: { ...(node.styles?.tablet || {}) },
      mobile: { ...(node.styles?.mobile || {}) },
      [breakpoint]: {
        ...(node.styles?.[breakpoint] || {}),
        ...updates,
      },
    };

    console.log('Updating node styles:', updatedStyles[breakpoint]);
    
    onUpdateNode({
      styles: updatedStyles,
    });
  };

  return (
    <div className="space-y-6">
      {/* Class Styles Badge */}
      {isFromClasses && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Estilos de Classes CSS</span>
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Este elemento usa classes CSS. Os valores mostrados são os estilos computados. 
            Ao editar uma propriedade, você criará uma sobrescrita customizada.
          </p>
        </div>
      )}
      
      {/* Box Model */}
      <BoxModelInspector
        margin={{
          top: currentStyles.marginTop,
          right: currentStyles.marginRight,
          bottom: currentStyles.marginBottom,
          left: currentStyles.marginLeft,
        }}
        padding={{
          top: currentStyles.paddingTop,
          right: currentStyles.paddingRight,
          bottom: currentStyles.paddingBottom,
          left: currentStyles.paddingLeft,
        }}
        border={{
          width: currentStyles.borderWidth,
          topWidth: currentStyles.borderTopWidth,
          rightWidth: currentStyles.borderRightWidth,
          bottomWidth: currentStyles.borderBottomWidth,
          leftWidth: currentStyles.borderLeftWidth,
          style: currentStyles.borderStyle,
          color: currentStyles.borderColor,
        }}
        onChange={handleStyleChange}
        data-testid="box-model-v4"
      />

      {/* Background (Color/Gradient/Image) */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Background</Label>
        
        <Tabs value={activeBackgroundTab} onValueChange={(v) => setActiveBackgroundTab(v as 'color' | 'gradient' | 'image')} className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="color" className="text-xs">Color</TabsTrigger>
            <TabsTrigger value="gradient" className="text-xs">Gradient</TabsTrigger>
            <TabsTrigger value="image" className="text-xs">Image</TabsTrigger>
          </TabsList>
          
          <TabsContent value="color" className="mt-4 space-y-0">
            <ColorPickerProfessional
              label="Background Color"
              value={currentStyles.backgroundColor || '#ffffff'}
              onChange={(value) => handleStyleChange({ backgroundColor: value, backgroundImage: 'none' })}
              data-testid="bg-color-v4"
            />
          </TabsContent>
          
          <TabsContent value="gradient" className="mt-4 space-y-0">
            <GradientPicker
              label="Gradient"
              value={currentStyles.backgroundImage?.includes('gradient') ? currentStyles.backgroundImage : 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'}
              onChange={(value) => handleStyleChange({ backgroundImage: value, backgroundColor: 'transparent' })}
              data-testid="bg-gradient-v4"
            />
          </TabsContent>
          
          <TabsContent value="image" className="mt-4 space-y-0">
            <BackgroundImageControls
              value={{
                url: (() => {
                  const bgImage = currentStyles.backgroundImage;
                  // Only extract URL if it's actually a url() value
                  if (bgImage && bgImage.startsWith('url(')) {
                    return bgImage.replace(/^url\(['"]?(.+?)['"]?\)$/, '$1');
                  }
                  return '';
                })(),
                size: currentStyles.backgroundSize,
                position: currentStyles.backgroundPosition,
                repeat: currentStyles.backgroundRepeat,
                attachment: currentStyles.backgroundAttachment
              }}
              onChange={(bg) => handleStyleChange({
                backgroundImage: bg.url ? `url('${bg.url}')` : 'none',
                backgroundSize: bg.size,
                backgroundPosition: bg.position,
                backgroundRepeat: bg.repeat,
                backgroundAttachment: bg.attachment,
                backgroundColor: 'transparent'
              })}
              data-testid="bg-image-v4"
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Text Color */}
      <ColorPickerProfessional
        label="Text Color"
        value={currentStyles.color || '#000000'}
        onChange={(value) => handleStyleChange({ color: value })}
        data-testid="text-color-v4"
      />

      {/* Border Color */}
      <ColorPickerProfessional
        label="Border Color"
        value={currentStyles.borderColor || '#000000'}
        onChange={(value) => handleStyleChange({ borderColor: value })}
        data-testid="border-color-v4"
      />

      {/* Border Radius */}
      <UnitSliderInput
        label="Border Radius"
        value={currentStyles.borderRadius || '0px'}
        onChange={(value) => handleStyleChange({ borderRadius: value })}
        max={100}
        units={['px', 'rem', '%']}
        data-testid="border-radius-v4"
      />

      {/* Width & Height */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Dimensions</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-foreground">Width</Label>
            <Input
              value={currentStyles.width || ''}
              onChange={(e) => handleStyleChange({ width: e.target.value })}
              placeholder="auto"
              className="text-xs h-8"
              data-testid="width-v4"
            />
          </div>
          <div>
            <Label className="text-xs text-foreground">Height</Label>
            <Input
              value={currentStyles.height || ''}
              onChange={(e) => handleStyleChange({ height: e.target.value })}
              placeholder="auto"
              className="text-xs h-8"
              data-testid="height-v4"
            />
          </div>
        </div>
      </div>

      {/* Opacity */}
      <UnitSliderInput
        label="Opacity"
        value={currentStyles.opacity || '1'}
        onChange={(value) => handleStyleChange({ opacity: value })}
        min={0}
        max={1}
        step={0.01}
        units={['']}
        data-testid="opacity-v4"
      />

      {/* Box Shadow */}
      <ShadowPicker
        label="Box Shadow"
        value={currentStyles.boxShadow || 'none'}
        onChange={(value) => handleStyleChange({ boxShadow: value })}
        type="box"
        data-testid="box-shadow-v4"
      />

      {/* Filter Effects */}
      <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-accent/50 rounded-md px-2 transition-colors">
          <Label className="text-sm font-medium text-foreground cursor-pointer">Filter Effects</Label>
          <ChevronDown className={`h-4 w-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <FilterControls
            value={currentStyles.filter}
            onChange={(value) => handleStyleChange({ filter: value })}
            onReset={() => handleStyleChange({ filter: 'none' })}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Backdrop Filter */}
      <Collapsible open={isBackdropOpen} onOpenChange={setIsBackdropOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-accent/50 rounded-md px-2 transition-colors">
          <Label className="text-sm font-medium text-foreground cursor-pointer">Backdrop Filter</Label>
          <ChevronDown className={`h-4 w-4 transition-transform ${isBackdropOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <BackdropFilterControls
            value={currentStyles.backdropFilter}
            onChange={(value) => handleStyleChange({ backdropFilter: value })}
            onReset={() => handleStyleChange({ backdropFilter: 'none' })}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function TypographyControlsV4({ node, breakpoint, onUpdateNode, computedStyles = {}, hasOverrides = {}, isFromClasses = false }: StylingControlsV4Props) {
  if (!node) return null;

  // Merge responsive styles with inline styles (inline has precedence)
  // If element has classes, show computed styles as fallback
  const currentStyles = {
    ...computedStyles,
    ...(node.styles?.[breakpoint] || {}),
    ...(node.inlineStyles || {}),
  };

  const handleStyleChange = (updates: Record<string, string>) => {
    const updatedStyles: ResponsiveStylesV4 = {
      desktop: { ...(node.styles?.desktop || {}) },
      tablet: { ...(node.styles?.tablet || {}) },
      mobile: { ...(node.styles?.mobile || {}) },
      [breakpoint]: {
        ...currentStyles,
        ...updates,
      },
    };

    onUpdateNode({
      styles: updatedStyles,
    });
  };

  return (
    <div className="space-y-6">
      {/* Class Styles Badge */}
      {isFromClasses && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Estilos de Classes CSS</span>
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Este elemento usa classes CSS. Os valores mostrados são os estilos computados. 
            Ao editar uma propriedade, você criará uma sobrescrita customizada.
          </p>
        </div>
      )}
      
      {/* Font Family */}
      <FontFamilySelectorProfessional
        label="Font Family"
        value={currentStyles.fontFamily}
        onChange={(value) => handleStyleChange({ fontFamily: value })}
        data-testid="font-family-v4"
      />

      {/* Font Size */}
      <UnitSliderInput
        label="Font Size"
        value={currentStyles.fontSize || '16px'}
        onChange={(value) => handleStyleChange({ fontSize: value })}
        max={100}
        units={['px', 'rem', 'em']}
        data-testid="font-size-v4"
      />

      {/* Font Weight */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Font Weight</Label>
        <Input
          type="number"
          value={currentStyles.fontWeight || '400'}
          onChange={(e) => handleStyleChange({ fontWeight: e.target.value })}
          min="100"
          max="900"
          step="100"
          className="text-xs"
          data-testid="font-weight-v4"
        />
      </div>

      {/* Line Height */}
      <UnitSliderInput
        label="Line Height"
        value={currentStyles.lineHeight || '1.5'}
        onChange={(value) => handleStyleChange({ lineHeight: value })}
        min={0.5}
        max={3}
        step={0.1}
        units={['', 'px', 'rem']}
        data-testid="line-height-v4"
      />

      {/* Letter Spacing */}
      <UnitSliderInput
        label="Letter Spacing"
        value={currentStyles.letterSpacing || '0px'}
        onChange={(value) => handleStyleChange({ letterSpacing: value })}
        min={-5}
        max={10}
        step={0.1}
        units={['px', 'em']}
        data-testid="letter-spacing-v4"
      />

      {/* Text Align */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Text Align</Label>
        <div className="grid grid-cols-4 gap-2">
          {['left', 'center', 'right', 'justify'].map((align) => (
            <button
              key={align}
              onClick={() => handleStyleChange({ textAlign: align })}
              className={`px-3 py-1.5 text-xs rounded border ${
                currentStyles.textAlign === align
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted border-input'
              }`}
              data-testid={`text-align-${align}-v4`}
            >
              {align}
            </button>
          ))}
        </div>
      </div>

      {/* Text Transform */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Text Transform</Label>
        <div className="grid grid-cols-3 gap-2">
          {['none', 'uppercase', 'lowercase', 'capitalize'].map((transform) => (
            <button
              key={transform}
              onClick={() => handleStyleChange({ textTransform: transform })}
              className={`px-3 py-1.5 text-xs rounded border ${
                currentStyles.textTransform === transform
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted border-input'
              }`}
              data-testid={`text-transform-${transform}-v4`}
            >
              {transform}
            </button>
          ))}
        </div>
      </div>

      {/* Text Shadow */}
      <ShadowPicker
        label="Text Shadow"
        value={currentStyles.textShadow || 'none'}
        onChange={(value) => handleStyleChange({ textShadow: value })}
        type="text"
        data-testid="text-shadow-v4"
      />
    </div>
  );
}
