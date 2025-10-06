import { PageNodeV4, ResponsiveStylesV4 } from '@shared/schema';
import { BoxModelInspector } from '../inspector/BoxModelInspector';
import { ColorPickerProfessional } from '../inspector/ColorPickerProfessional';
import { FontFamilySelectorProfessional } from '../inspector/FontFamilySelectorProfessional';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { UnitSliderInput } from '../AdvancedControls';

interface StylingControlsV4Props {
  node: PageNodeV4 | null;
  breakpoint: 'desktop' | 'tablet' | 'mobile';
  onUpdateNode: (updates: Partial<PageNodeV4>) => void;
}

export function StylingControlsV4({ node, breakpoint, onUpdateNode }: StylingControlsV4Props) {
  if (!node) return null;

  const currentStyles = node.styles?.[breakpoint] || {};

  const handleStyleChange = (updates: Record<string, string | any>) => {
    const updatedStyles: Partial<ResponsiveStylesV4> = {
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

      {/* Background Color */}
      <ColorPickerProfessional
        label="Background Color"
        value={currentStyles.backgroundColor || '#ffffff'}
        onChange={(value) => handleStyleChange({ backgroundColor: value })}
        data-testid="bg-color-v4"
      />

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
        <Label className="text-sm font-medium">Dimensions</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Width</Label>
            <Input
              value={currentStyles.width || ''}
              onChange={(e) => handleStyleChange({ width: e.target.value })}
              placeholder="auto"
              className="text-xs h-8"
              data-testid="width-v4"
            />
          </div>
          <div>
            <Label className="text-xs">Height</Label>
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
    </div>
  );
}

export function TypographyControlsV4({ node, breakpoint, onUpdateNode }: StylingControlsV4Props) {
  if (!node) return null;

  const currentStyles = node.styles?.[breakpoint] || {};

  const handleStyleChange = (updates: Record<string, string>) => {
    const updatedStyles: Partial<ResponsiveStylesV4> = {
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
        <Label className="text-sm font-medium">Font Weight</Label>
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
        <Label className="text-sm font-medium">Text Align</Label>
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
        <Label className="text-sm font-medium">Text Transform</Label>
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
    </div>
  );
}
