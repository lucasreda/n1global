import { PageNodeV4, ResponsiveStylesV4 } from '@shared/schema';
import { AnimationsEditor } from '../AnimationsEditor';
import { CustomCSSEditor } from '../CustomCSSEditor';
import { ColorPickerProfessional } from '../inspector/ColorPickerProfessional';
import { TransitionBuilder } from '../inspector/TransitionBuilder';
import { ShadowPicker } from '../inspector/ShadowPicker';
import { GradientPicker } from '../inspector/GradientPicker';
import { BackgroundImageControls } from '../inspector/BackgroundImageControls';
import { FilterControls } from '../inspector/FilterControls';
import { BorderStyleSelector } from '../inspector/BorderStyleSelector';
import { UnitSliderInput } from '../AdvancedControls';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface AdvancedControlsV4Props {
  node: PageNodeV4 | null;
  onUpdateNode: (updates: Partial<PageNodeV4>) => void;
}

export function AdvancedControlsV4({ node, onUpdateNode }: AdvancedControlsV4Props) {
  if (!node) return null;

  return (
    <div className="space-y-6">
      {/* Animations */}
      <AnimationsEditor
        animations={node.animations || []}
        onChange={(animations) => onUpdateNode({ animations })}
      />

      {/* Custom CSS */}
      <CustomCSSEditor
        css={node.customCSS || ''}
        onChange={(css) => onUpdateNode({ customCSS: css })}
      />
    </div>
  );
}

interface PseudoClassEditorV4Props {
  node: PageNodeV4 | null;
  breakpoint: 'desktop' | 'tablet' | 'mobile';
  onUpdateNode: (updates: Partial<PageNodeV4>) => void;
}

type PseudoClass = 'default' | 'hover' | 'focus' | 'active';

export function PseudoClassEditorV4({ node, breakpoint, onUpdateNode }: PseudoClassEditorV4Props) {
  const [activeState, setActiveState] = useState<PseudoClass>('default');
  const [isColorsOpen, setIsColorsOpen] = useState(true);
  const [isBackgroundOpen, setIsBackgroundOpen] = useState(false);
  const [isSpacingOpen, setIsSpacingOpen] = useState(false);
  const [isBorderOpen, setIsBorderOpen] = useState(false);
  const [isShadowOpen, setIsShadowOpen] = useState(false);
  const [isEffectsOpen, setIsEffectsOpen] = useState(false);
  const [isTypographyOpen, setIsTypographyOpen] = useState(false);
  const [isTransitionOpen, setIsTransitionOpen] = useState(false);

  if (!node) return null;

  const currentStateStyles = node.states?.[activeState]?.[breakpoint] || {};

  const handleStateStyleChange = (updates: Record<string, string>) => {
    const updatedStates = {
      ...node.states,
      [activeState]: {
        ...node.states?.[activeState],
        [breakpoint]: {
          ...currentStateStyles,
          ...updates,
        },
      },
    };

    onUpdateNode({ states: updatedStates });
  };

  const pseudoClassOptions: { value: PseudoClass; label: string; desc: string }[] = [
    { value: 'default', label: 'Default', desc: 'Normal state' },
    { value: 'hover', label: 'Hover', desc: 'Mouse over' },
    { value: 'focus', label: 'Focus', desc: 'Keyboard/input focus' },
    { value: 'active', label: 'Active', desc: 'Being clicked' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-foreground mb-2 block">Element State</Label>
        <div className="grid grid-cols-2 gap-2">
          {pseudoClassOptions.map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => setActiveState(value)}
              className={`px-3 py-2 text-left rounded-lg border transition-colors ${
                activeState === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted border-input'
              }`}
              data-testid={`pseudo-class-${value}`}
            >
              <div className="text-sm font-medium">{label}</div>
              <div className="text-xs opacity-70">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {activeState !== 'default' && (
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5 border border-muted">
            Define styles for <span className="font-semibold text-foreground">:{activeState}</span> state
          </div>

          {/* Colors Section */}
          <Collapsible open={isColorsOpen} onOpenChange={setIsColorsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-accent/50 rounded-md px-2 transition-colors">
              <Label className="text-sm font-medium text-foreground cursor-pointer">Colors</Label>
              <ChevronDown className={`h-4 w-4 transition-transform ${isColorsOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <ColorPickerProfessional
                label="Background Color"
                value={currentStateStyles.backgroundColor || '#ffffff'}
                onChange={(value) => handleStateStyleChange({ backgroundColor: value })}
                data-testid={`state-bg-color-${activeState}`}
              />
              <ColorPickerProfessional
                label="Text Color"
                value={currentStateStyles.color || '#000000'}
                onChange={(value) => handleStateStyleChange({ color: value })}
                data-testid={`state-text-color-${activeState}`}
              />
              <ColorPickerProfessional
                label="Border Color"
                value={currentStateStyles.borderColor || '#000000'}
                onChange={(value) => handleStateStyleChange({ borderColor: value })}
                data-testid={`state-border-color-${activeState}`}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Background Section */}
          <Collapsible open={isBackgroundOpen} onOpenChange={setIsBackgroundOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-accent/50 rounded-md px-2 transition-colors">
              <Label className="text-sm font-medium text-foreground cursor-pointer">Background</Label>
              <ChevronDown className={`h-4 w-4 transition-transform ${isBackgroundOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <Tabs defaultValue="color" className="w-full">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="color" className="text-xs">Color</TabsTrigger>
                  <TabsTrigger value="gradient" className="text-xs">Gradient</TabsTrigger>
                </TabsList>
                <TabsContent value="color" className="mt-3">
                  <ColorPickerProfessional
                    label="Background Color"
                    value={currentStateStyles.backgroundColor || '#ffffff'}
                    onChange={(value) => handleStateStyleChange({ backgroundColor: value, backgroundImage: 'none' })}
                    data-testid={`state-bg-color-${activeState}`}
                  />
                </TabsContent>
                <TabsContent value="gradient" className="mt-3">
                  <GradientPicker
                    label="Gradient"
                    value={currentStateStyles.backgroundImage?.includes('gradient') ? currentStateStyles.backgroundImage : 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'}
                    onChange={(value) => handleStateStyleChange({ backgroundImage: value, backgroundColor: 'transparent' })}
                    data-testid={`state-bg-gradient-${activeState}`}
                  />
                </TabsContent>
              </Tabs>
            </CollapsibleContent>
          </Collapsible>

          {/* Spacing Section */}
          <Collapsible open={isSpacingOpen} onOpenChange={setIsSpacingOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-accent/50 rounded-md px-2 transition-colors">
              <Label className="text-sm font-medium text-foreground cursor-pointer">Spacing & Size</Label>
              <ChevronDown className={`h-4 w-4 transition-transform ${isSpacingOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <UnitSliderInput
                label="Padding"
                value={currentStateStyles.padding || '0px'}
                onChange={(value) => handleStateStyleChange({ padding: value })}
                max={100}
                units={['px', 'rem', 'em']}
                data-testid={`state-padding-${activeState}`}
              />
              <UnitSliderInput
                label="Margin"
                value={currentStateStyles.margin || '0px'}
                onChange={(value) => handleStateStyleChange({ margin: value })}
                max={100}
                units={['px', 'rem', 'em']}
                data-testid={`state-margin-${activeState}`}
              />
              <UnitSliderInput
                label="Border Radius"
                value={currentStateStyles.borderRadius || '0px'}
                onChange={(value) => handleStateStyleChange({ borderRadius: value })}
                max={100}
                units={['px', 'rem', '%']}
                data-testid={`state-border-radius-${activeState}`}
              />
              <UnitSliderInput
                label="Width"
                value={currentStateStyles.width || 'auto'}
                onChange={(value) => handleStateStyleChange({ width: value })}
                max={1000}
                units={['px', '%', 'rem', 'auto']}
                data-testid={`state-width-${activeState}`}
              />
              <UnitSliderInput
                label="Height"
                value={currentStateStyles.height || 'auto'}
                onChange={(value) => handleStateStyleChange({ height: value })}
                max={1000}
                units={['px', '%', 'rem', 'auto']}
                data-testid={`state-height-${activeState}`}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Borders Section */}
          <Collapsible open={isBorderOpen} onOpenChange={setIsBorderOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-accent/50 rounded-md px-2 transition-colors">
              <Label className="text-sm font-medium text-foreground cursor-pointer">Borders</Label>
              <ChevronDown className={`h-4 w-4 transition-transform ${isBorderOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <BorderStyleSelector
                values={{
                  borderStyle: currentStateStyles.borderStyle,
                  borderWidth: currentStateStyles.borderWidth,
                  borderColor: currentStateStyles.borderColor,
                  borderTopStyle: currentStateStyles.borderTopStyle,
                  borderTopWidth: currentStateStyles.borderTopWidth,
                  borderTopColor: currentStateStyles.borderTopColor,
                  borderRightStyle: currentStateStyles.borderRightStyle,
                  borderRightWidth: currentStateStyles.borderRightWidth,
                  borderRightColor: currentStateStyles.borderRightColor,
                  borderBottomStyle: currentStateStyles.borderBottomStyle,
                  borderBottomWidth: currentStateStyles.borderBottomWidth,
                  borderBottomColor: currentStateStyles.borderBottomColor,
                  borderLeftStyle: currentStateStyles.borderLeftStyle,
                  borderLeftWidth: currentStateStyles.borderLeftWidth,
                  borderLeftColor: currentStateStyles.borderLeftColor,
                }}
                onChange={handleStateStyleChange}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Shadow Section */}
          <Collapsible open={isShadowOpen} onOpenChange={setIsShadowOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-accent/50 rounded-md px-2 transition-colors">
              <Label className="text-sm font-medium text-foreground cursor-pointer">Shadows</Label>
              <ChevronDown className={`h-4 w-4 transition-transform ${isShadowOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <ShadowPicker
                label="Box Shadow"
                value={currentStateStyles.boxShadow || 'none'}
                onChange={(value) => handleStateStyleChange({ boxShadow: value })}
                type="box"
                data-testid={`state-box-shadow-${activeState}`}
              />
              <ShadowPicker
                label="Text Shadow"
                value={currentStateStyles.textShadow || 'none'}
                onChange={(value) => handleStateStyleChange({ textShadow: value })}
                type="text"
                data-testid={`state-text-shadow-${activeState}`}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Typography Section */}
          <Collapsible open={isTypographyOpen} onOpenChange={setIsTypographyOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-accent/50 rounded-md px-2 transition-colors">
              <Label className="text-sm font-medium text-foreground cursor-pointer">Typography</Label>
              <ChevronDown className={`h-4 w-4 transition-transform ${isTypographyOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <UnitSliderInput
                label="Font Size"
                value={currentStateStyles.fontSize || '16px'}
                onChange={(value) => handleStateStyleChange({ fontSize: value })}
                max={100}
                units={['px', 'rem', 'em']}
                data-testid={`state-font-size-${activeState}`}
              />
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Font Weight</Label>
                <Input
                  type="number"
                  value={currentStateStyles.fontWeight || '400'}
                  onChange={(e) => handleStateStyleChange({ fontWeight: e.target.value })}
                  min="100"
                  max="900"
                  step="100"
                  className="text-xs"
                  data-testid={`state-font-weight-${activeState}`}
                />
              </div>
              <UnitSliderInput
                label="Letter Spacing"
                value={currentStateStyles.letterSpacing || '0px'}
                onChange={(value) => handleStateStyleChange({ letterSpacing: value })}
                min={-5}
                max={10}
                step={0.1}
                units={['px', 'em']}
                data-testid={`state-letter-spacing-${activeState}`}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Effects Section */}
          <Collapsible open={isEffectsOpen} onOpenChange={setIsEffectsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-accent/50 rounded-md px-2 transition-colors">
              <Label className="text-sm font-medium text-foreground cursor-pointer">Effects & Transform</Label>
              <ChevronDown className={`h-4 w-4 transition-transform ${isEffectsOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Opacity</Label>
                <Input
                  type="number"
                  value={currentStateStyles.opacity || '1'}
                  onChange={(e) => handleStateStyleChange({ opacity: e.target.value })}
                  min="0"
                  max="1"
                  step="0.1"
                  className="text-xs"
                  data-testid={`state-opacity-${activeState}`}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Transform</Label>
                <Input
                  value={currentStateStyles.transform || ''}
                  onChange={(e) => handleStateStyleChange({ transform: e.target.value })}
                  placeholder="scale(1.1) or translateY(-2px)"
                  className="text-xs"
                  data-testid={`state-transform-${activeState}`}
                />
              </div>
              <FilterControls
                value={currentStateStyles.filter}
                onChange={(value) => handleStateStyleChange({ filter: value })}
                onReset={() => handleStateStyleChange({ filter: 'none' })}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Transition Section */}
          <Collapsible open={isTransitionOpen} onOpenChange={setIsTransitionOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-accent/50 rounded-md px-2 transition-colors">
              <Label className="text-sm font-medium text-foreground cursor-pointer">Transitions</Label>
              <ChevronDown className={`h-4 w-4 transition-transform ${isTransitionOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <TransitionBuilder
                value={currentStateStyles.transition || 'all 0.3s ease'}
                onChange={(value) => handleStateStyleChange({ transition: value })}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
