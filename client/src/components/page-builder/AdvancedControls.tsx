import { useState, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Link, Unlink, CornerUpLeft, CornerUpRight, CornerDownLeft, CornerDownRight } from 'lucide-react';

// Interface for value with unit
interface ValueWithUnit {
  value: number;
  unit: 'px' | 'rem' | '%' | 'em' | 'auto' | '' | 'none' | 'vh' | 'vw';
}

// Helper function to parse value with unit
const parseValueWithUnit = (value: string = '0'): ValueWithUnit => {
  if (value === 'auto') return { value: 0, unit: 'auto' };
  if (value === 'none') return { value: 0, unit: 'none' };
  if (value === 'transparent') return { value: 0, unit: '' };
  const match = value.match(/^(-?\d*\.?\d+)(px|rem|%|em|vh|vw)?$/);
  return {
    value: match ? parseFloat(match[1]) : 0,
    unit: (match?.[2] as ValueWithUnit['unit']) || 'px'
  };
};

// Helper function to format value with unit
const formatValueWithUnit = (value: number, unit: ValueWithUnit['unit']): string => {
  if (unit === 'auto') return 'auto';
  if (unit === 'none') return 'none';
  if (unit === '') return value.toString();
  return `${value}${unit}`;
};

// Unit Slider Input Component
interface UnitSliderInputProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  units?: ValueWithUnit['unit'][];
  'data-testid'?: string;
}

export function UnitSliderInput({ 
  label, 
  value = '0px', 
  onChange, 
  min = 0, 
  max = 100, 
  step = 1,
  units = ['px', 'rem', '%'],
  'data-testid': testId
}: UnitSliderInputProps) {
  const parsed = parseValueWithUnit(value);
  
  const handleSliderChange = useCallback((sliderValue: number[]) => {
    onChange(formatValueWithUnit(sliderValue[0], parsed.unit));
  }, [onChange, parsed.unit]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = parseFloat(e.target.value) || 0;
    onChange(formatValueWithUnit(numValue, parsed.unit));
  }, [onChange, parsed.unit]);

  const handleUnitChange = useCallback((unit: string) => {
    onChange(formatValueWithUnit(parsed.value, unit as ValueWithUnit['unit']));
  }, [onChange, parsed.value]);

  return (
    <div className="space-y-3" data-testid={testId}>
      <div className="flex justify-between items-center">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={parsed.value}
            onChange={handleInputChange}
            className="w-16 h-8 text-xs"
            data-testid={`${testId}-input`}
          />
          <Select value={parsed.unit} onValueChange={handleUnitChange}>
            <SelectTrigger className="w-16 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.filter(unit => unit !== '').map(unit => (
                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {parsed.unit !== 'auto' && (
        <Slider
          value={[parsed.value]}
          onValueChange={handleSliderChange}
          min={min}
          max={max}
          step={step}
          className="w-full"
          data-testid={`${testId}-slider`}
        />
      )}
    </div>
  );
}

// Four Sides Input Component
interface FourSidesValue {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

interface FourSidesInputProps {
  label: string;
  value: FourSidesValue;
  onChange: (value: FourSidesValue) => void;
  min?: number;
  max?: number;
  units?: ValueWithUnit['unit'][];
  'data-testid'?: string;
}

export function FourSidesInput({ 
  label, 
  value, 
  onChange, 
  min = 0, 
  max = 100,
  units = ['px', 'rem', '%'],
  'data-testid': testId
}: FourSidesInputProps) {
  const [isLinked, setIsLinked] = useState(
    value.top === value.right && value.right === value.bottom && value.bottom === value.left
  );

  const handleLinkedChange = useCallback((newValue: string) => {
    onChange({
      top: newValue,
      right: newValue,
      bottom: newValue,
      left: newValue
    });
  }, [onChange]);

  const handleSideChange = useCallback((side: keyof FourSidesValue, newValue: string) => {
    onChange({ ...value, [side]: newValue });
  }, [onChange, value]);

  const toggleLinked = useCallback(() => {
    if (!isLinked) {
      // When linking, set all sides to top value
      handleLinkedChange(value.top);
    }
    setIsLinked(!isLinked);
  }, [isLinked, value.top, handleLinkedChange]);

  // Spacing presets (common design system scale) - values without units
  const spacingPresetValues = [0, 4, 8, 12, 16, 24, 32, 48];

  const applyPreset = useCallback((presetNum: number) => {
    if (isLinked) {
      // Linked mode: use shared unit from top
      const currentUnit = parseValueWithUnit(value.top).unit;
      const presetWithUnit = formatValueWithUnit(presetNum, currentUnit);
      handleLinkedChange(presetWithUnit);
    } else {
      // Unlinked mode: preserve each side's individual unit
      onChange({
        top: formatValueWithUnit(presetNum, parseValueWithUnit(value.top).unit),
        right: formatValueWithUnit(presetNum, parseValueWithUnit(value.right).unit),
        bottom: formatValueWithUnit(presetNum, parseValueWithUnit(value.bottom).unit),
        left: formatValueWithUnit(presetNum, parseValueWithUnit(value.left).unit)
      });
    }
  }, [isLinked, handleLinkedChange, onChange, value]);

  return (
    <div className="space-y-3" data-testid={testId}>
      <div className="flex justify-between items-center">
        <Label className="text-sm font-medium">{label}</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLinked}
          className="h-8 w-8 p-0"
          data-testid={`${testId}-link-toggle`}
        >
          {isLinked ? (
            <Link className="h-4 w-4" />
          ) : (
            <Unlink className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Spacing Presets Bar */}
      <div className="flex flex-wrap gap-1">
        {spacingPresetValues.map((presetNum) => {
          let isActive = false;
          
          if (isLinked) {
            // Linked mode: compare against shared unit
            const parsedTop = parseValueWithUnit(value.top);
            const presetWithUnit = formatValueWithUnit(presetNum, parsedTop.unit);
            isActive = value.top === presetWithUnit;
          } else {
            // Unlinked mode: check if ALL sides have the preset value (with their own units)
            const topPreset = formatValueWithUnit(presetNum, parseValueWithUnit(value.top).unit);
            const rightPreset = formatValueWithUnit(presetNum, parseValueWithUnit(value.right).unit);
            const bottomPreset = formatValueWithUnit(presetNum, parseValueWithUnit(value.bottom).unit);
            const leftPreset = formatValueWithUnit(presetNum, parseValueWithUnit(value.left).unit);
            
            isActive = value.top === topPreset && 
                      value.right === rightPreset && 
                      value.bottom === bottomPreset && 
                      value.left === leftPreset;
          }
          
          return (
            <Button
              key={presetNum}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(presetNum)}
              className={`h-7 px-2 text-xs font-mono ${isActive ? 'bg-accent' : ''}`}
              data-testid={`${testId}-preset-${presetNum}`}
            >
              {presetNum}
            </Button>
          );
        })}
      </div>

      {isLinked ? (
        <UnitSliderInput
          label="All Sides"
          value={value.top}
          onChange={handleLinkedChange}
          min={min}
          max={max}
          units={units}
          data-testid={`${testId}-linked`}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <UnitSliderInput
            label="Top"
            value={value.top}
            onChange={(val) => handleSideChange('top', val)}
            min={min}
            max={max}
            units={units}
            data-testid={`${testId}-top`}
          />
          <UnitSliderInput
            label="Right"
            value={value.right}
            onChange={(val) => handleSideChange('right', val)}
            min={min}
            max={max}
            units={units}
            data-testid={`${testId}-right`}
          />
          <UnitSliderInput
            label="Bottom"
            value={value.bottom}
            onChange={(val) => handleSideChange('bottom', val)}
            min={min}
            max={max}
            units={units}
            data-testid={`${testId}-bottom`}
          />
          <UnitSliderInput
            label="Left"
            value={value.left}
            onChange={(val) => handleSideChange('left', val)}
            min={min}
            max={max}
            units={units}
            data-testid={`${testId}-left`}
          />
        </div>
      )}
    </div>
  );
}

// Four Corners Input Component (for border-radius)
interface FourCornersValue {
  topLeft: string;
  topRight: string;
  bottomRight: string;
  bottomLeft: string;
}

interface FourCornersInputProps {
  label: string;
  value: FourCornersValue;
  onChange: (value: FourCornersValue) => void;
  min?: number;
  max?: number;
  units?: ValueWithUnit['unit'][];
  'data-testid'?: string;
}

export function FourCornersInput({ 
  label, 
  value, 
  onChange, 
  min = 0, 
  max = 50,
  units = ['px', 'rem', '%'],
  'data-testid': testId
}: FourCornersInputProps) {
  const [isLinked, setIsLinked] = useState(
    value.topLeft === value.topRight && 
    value.topRight === value.bottomRight && 
    value.bottomRight === value.bottomLeft
  );

  const handleLinkedChange = useCallback((newValue: string) => {
    onChange({
      topLeft: newValue,
      topRight: newValue,
      bottomRight: newValue,
      bottomLeft: newValue
    });
  }, [onChange]);

  const handleCornerChange = useCallback((corner: keyof FourCornersValue, newValue: string) => {
    onChange({ ...value, [corner]: newValue });
  }, [onChange, value]);

  const toggleLinked = useCallback(() => {
    if (!isLinked) {
      handleLinkedChange(value.topLeft);
    }
    setIsLinked(!isLinked);
  }, [isLinked, value.topLeft, handleLinkedChange]);

  return (
    <div className="space-y-3" data-testid={testId}>
      <div className="flex justify-between items-center">
        <Label className="text-sm font-medium">{label}</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLinked}
          className="h-8 w-8 p-0"
          data-testid={`${testId}-link-toggle`}
        >
          {isLinked ? (
            <Link className="h-4 w-4" />
          ) : (
            <Unlink className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isLinked ? (
        <UnitSliderInput
          label="All Corners"
          value={value.topLeft}
          onChange={handleLinkedChange}
          min={min}
          max={max}
          units={units}
          data-testid={`${testId}-linked`}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1">
            <CornerUpLeft className="h-3 w-3 text-muted-foreground" />
            <UnitSliderInput
              label="TL"
              value={value.topLeft}
              onChange={(val) => handleCornerChange('topLeft', val)}
              min={min}
              max={max}
              units={units}
              data-testid={`${testId}-top-left`}
            />
          </div>
          <div className="flex items-center gap-1">
            <CornerUpRight className="h-3 w-3 text-muted-foreground" />
            <UnitSliderInput
              label="TR"
              value={value.topRight}
              onChange={(val) => handleCornerChange('topRight', val)}
              min={min}
              max={max}
              units={units}
              data-testid={`${testId}-top-right`}
            />
          </div>
          <div className="flex items-center gap-1">
            <CornerDownLeft className="h-3 w-3 text-muted-foreground" />
            <UnitSliderInput
              label="BL"
              value={value.bottomLeft}
              onChange={(val) => handleCornerChange('bottomLeft', val)}
              min={min}
              max={max}
              units={units}
              data-testid={`${testId}-bottom-left`}
            />
          </div>
          <div className="flex items-center gap-1">
            <CornerDownRight className="h-3 w-3 text-muted-foreground" />
            <UnitSliderInput
              label="BR"
              value={value.bottomRight}
              onChange={(val) => handleCornerChange('bottomRight', val)}
              min={min}
              max={max}
              units={units}
              data-testid={`${testId}-bottom-right`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Color Picker Popover Component
interface ColorPickerPopoverProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  'data-testid'?: string;
}

export function ColorPickerPopover({ 
  label, 
  value = '#000000', 
  onChange,
  'data-testid': testId
}: ColorPickerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const handleHexInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    if (hex.match(/^#[0-9A-Fa-f]{0,6}$/)) {
      onChange(hex);
    }
  }, [onChange]);

  return (
    <div className="space-y-2" data-testid={testId}>
      <Label className="text-sm font-medium">{label}</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full h-10 p-1 justify-start"
            data-testid={`${testId}-trigger`}
          >
            <div 
              className="w-6 h-6 rounded border mr-2"
              style={{ backgroundColor: value }}
            />
            <span className="text-sm font-mono">{value}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={value}
                onChange={handleColorChange}
                className="w-12 h-12 border-0 bg-transparent cursor-pointer"
                data-testid={`${testId}-color-input`}
              />
              <div className="flex-1">
                <Label htmlFor="hex-input" className="text-xs text-muted-foreground">
                  Hex Color
                </Label>
                <Input
                  id="hex-input"
                  value={value}
                  onChange={handleHexInputChange}
                  placeholder="#000000"
                  className="mt-1 font-mono text-sm"
                  data-testid={`${testId}-hex-input`}
                />
              </div>
            </div>
            
            <Separator />
            
            {/* Preset Colors */}
            <div>
              <Label className="text-xs text-muted-foreground">Presets</Label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {[
                  '#000000', '#ffffff', '#ef4444', '#22c55e', 
                  '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4'
                ].map(preset => (
                  <button
                    key={preset}
                    onClick={() => onChange(preset)}
                    className="w-8 h-8 rounded border hover:scale-110 transition-transform"
                    style={{ backgroundColor: preset }}
                    data-testid={`${testId}-preset-${preset}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}