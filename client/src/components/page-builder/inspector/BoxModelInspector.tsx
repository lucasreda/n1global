import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, Unlink } from 'lucide-react';

interface BoxModelInspectorProps {
  margin?: { top?: string; right?: string; bottom?: string; left?: string };
  padding?: { top?: string; right?: string; bottom?: string; left?: string };
  border?: { 
    width?: string;
    style?: string;
    color?: string;
    topWidth?: string;
    rightWidth?: string;
    bottomWidth?: string;
    leftWidth?: string;
  };
  onChange: (updates: Record<string, any>) => void;
  'data-testid'?: string;
}

type Side = 'top' | 'right' | 'bottom' | 'left';
type FieldType = 'margin' | 'padding' | 'border';

export function BoxModelInspector({
  margin = {},
  padding = {},
  border = {},
  onChange,
  'data-testid': testId = 'box-model-inspector'
}: BoxModelInspectorProps) {
  // Track editing state for each field to allow free-form input
  const [editingValues, setEditingValues] = useState<Record<string, string | undefined>>({});
  
  // Track linked state for each property type
  const [marginLinked, setMarginLinked] = useState(false);
  const [paddingLinked, setPaddingLinked] = useState(false);
  const [borderLinked, setBorderLinked] = useState(false);

  // Extract unit from a CSS value
  const extractUnit = (value: string | undefined): string => {
    if (!value) return 'px';
    const match = value.match(/(%|rem|em|vh|vw|vmin|vmax|px)$/);
    return match ? match[0] : 'px';
  };

  // Get the display value (either editing state or parsed from props)
  const getDisplayValue = (fieldType: FieldType, side: Side): string => {
    const key = `${fieldType}-${side}`;
    
    // If currently editing, show the editing value
    if (editingValues[key] !== undefined) {
      return editingValues[key] || '';
    }
    
    // Otherwise, parse from props
    let sourceValue: string | undefined;
    if (fieldType === 'margin') sourceValue = margin[side];
    else if (fieldType === 'padding') sourceValue = padding[side];
    else sourceValue = side === 'top' ? (border.topWidth || border.width) :
                       side === 'right' ? (border.rightWidth || border.width) :
                       side === 'bottom' ? (border.bottomWidth || border.width) :
                       (border.leftWidth || border.width);

    if (!sourceValue || sourceValue === '0') return '';
    
    // Handle keywords
    if (sourceValue === 'auto' || sourceValue === 'inherit' || sourceValue === 'initial' || sourceValue === 'unset') {
      return sourceValue;
    }
    
    // Extract numeric part
    const numeric = parseFloat(sourceValue);
    return isNaN(numeric) || numeric === 0 ? '' : numeric.toString();
  };

  // Handle input change (just update local state)
  const handleInputChange = (fieldType: FieldType, side: Side, value: string) => {
    const key = `${fieldType}-${side}`;
    
    // If linked, update all sides with the same value
    const isLinked = fieldType === 'margin' ? marginLinked : 
                     fieldType === 'padding' ? paddingLinked : 
                     borderLinked;
    
    if (isLinked) {
      setEditingValues(prev => ({
        ...prev,
        [`${fieldType}-top`]: value,
        [`${fieldType}-right`]: value,
        [`${fieldType}-bottom`]: value,
        [`${fieldType}-left`]: value,
      }));
    } else {
      setEditingValues(prev => ({ ...prev, [key]: value }));
    }
  };

  // Handle blur (commit the value with proper unit)
  const handleInputBlur = (fieldType: FieldType, side: Side) => {
    const key = `${fieldType}-${side}`;
    const value = editingValues[key];
    
    // If no edit occurred (value is undefined), don't commit anything
    if (value === undefined) {
      return;
    }
    
    const isLinked = fieldType === 'margin' ? marginLinked : 
                     fieldType === 'padding' ? paddingLinked : 
                     borderLinked;
    
    // Clear editing state
    setEditingValues(prev => {
      const newState = { ...prev };
      if (isLinked) {
        delete newState[`${fieldType}-top`];
        delete newState[`${fieldType}-right`];
        delete newState[`${fieldType}-bottom`];
        delete newState[`${fieldType}-left`];
      } else {
        delete newState[key];
      }
      return newState;
    });
    
    // Get original value to extract unit
    let originalValue: string | undefined;
    if (fieldType === 'margin') originalValue = margin[side];
    else if (fieldType === 'padding') originalValue = padding[side];
    else originalValue = side === 'top' ? (border.topWidth || border.width) :
                         side === 'right' ? (border.rightWidth || border.width) :
                         side === 'bottom' ? (border.bottomWidth || border.width) :
                         (border.leftWidth || border.width);
    
    // Format and save
    const formatted = formatValueWithUnit(value, originalValue);
    
    if (isLinked) {
      // Update all sides when linked
      const updates: Record<string, string> = {};
      const sides: Side[] = ['top', 'right', 'bottom', 'left'];
      sides.forEach(s => {
        const propName = fieldType === 'margin' ? `margin${s.charAt(0).toUpperCase() + s.slice(1)}` :
                         fieldType === 'padding' ? `padding${s.charAt(0).toUpperCase() + s.slice(1)}` :
                         `border${s.charAt(0).toUpperCase() + s.slice(1)}Width`;
        updates[propName] = formatted;
      });
      onChange(updates);
    } else {
      // Update single side
      const propName = fieldType === 'margin' ? `margin${side.charAt(0).toUpperCase() + side.slice(1)}` :
                       fieldType === 'padding' ? `padding${side.charAt(0).toUpperCase() + side.slice(1)}` :
                       `border${side.charAt(0).toUpperCase() + side.slice(1)}Width`;
      onChange({ [propName]: formatted });
    }
  };

  // Format value with unit preservation
  const formatValueWithUnit = (value: string, originalValue?: string): string => {
    const trimmed = value.trim();
    
    // Empty or zero
    if (!trimmed || trimmed === '0') return '0';
    
    // Keywords
    if (trimmed === 'auto' || trimmed === 'inherit' || trimmed === 'initial' || trimmed === 'unset') {
      return trimmed;
    }
    
    // User typed unit explicitly
    const withUnit = trimmed.match(/^(-?\d*\.?\d+)(%|rem|em|vh|vw|vmin|vmax|px)$/);
    if (withUnit) return trimmed;
    
    // Parse number
    const numValue = parseFloat(trimmed);
    if (isNaN(numValue)) return '0';
    
    // Preserve original unit
    const unit = extractUnit(originalValue);
    return numValue === 0 ? '0' : `${numValue}${unit}`;
  };

  return (
    <div className="space-y-4" data-testid={testId}>
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Box Model</div>
      
      {/* Margin */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-white">Margin</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMarginLinked(!marginLinked)}
            className="h-6 w-6 p-0"
            data-testid="link-margin"
          >
            {marginLinked ? (
              <Link className="h-3 w-3" />
            ) : (
              <Unlink className="h-3 w-3" />
            )}
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Top</Label>
            <Input
              type="text"
              value={getDisplayValue('margin', 'top')}
              onChange={(e) => handleInputChange('margin', 'top', e.target.value)}
              onBlur={() => handleInputBlur('margin', 'top')}
              className="h-8 text-xs"
              placeholder="0"
              data-testid="input-margin-top"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Right</Label>
            <Input
              type="text"
              value={getDisplayValue('margin', 'right')}
              onChange={(e) => handleInputChange('margin', 'right', e.target.value)}
              onBlur={() => handleInputBlur('margin', 'right')}
              className="h-8 text-xs"
              placeholder="0"
              data-testid="input-margin-right"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Bottom</Label>
            <Input
              type="text"
              value={getDisplayValue('margin', 'bottom')}
              onChange={(e) => handleInputChange('margin', 'bottom', e.target.value)}
              onBlur={() => handleInputBlur('margin', 'bottom')}
              className="h-8 text-xs"
              placeholder="0"
              data-testid="input-margin-bottom"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Left</Label>
            <Input
              type="text"
              value={getDisplayValue('margin', 'left')}
              onChange={(e) => handleInputChange('margin', 'left', e.target.value)}
              onBlur={() => handleInputBlur('margin', 'left')}
              className="h-8 text-xs"
              placeholder="0"
              data-testid="input-margin-left"
            />
          </div>
        </div>
      </div>

      {/* Padding */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-white">Padding</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPaddingLinked(!paddingLinked)}
            className="h-6 w-6 p-0"
            data-testid="link-padding"
          >
            {paddingLinked ? (
              <Link className="h-3 w-3" />
            ) : (
              <Unlink className="h-3 w-3" />
            )}
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Top</Label>
            <Input
              type="text"
              value={getDisplayValue('padding', 'top')}
              onChange={(e) => handleInputChange('padding', 'top', e.target.value)}
              onBlur={() => handleInputBlur('padding', 'top')}
              className="h-8 text-xs"
              placeholder="0"
              data-testid="input-padding-top"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Right</Label>
            <Input
              type="text"
              value={getDisplayValue('padding', 'right')}
              onChange={(e) => handleInputChange('padding', 'right', e.target.value)}
              onBlur={() => handleInputBlur('padding', 'right')}
              className="h-8 text-xs"
              placeholder="0"
              data-testid="input-padding-right"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Bottom</Label>
            <Input
              type="text"
              value={getDisplayValue('padding', 'bottom')}
              onChange={(e) => handleInputChange('padding', 'bottom', e.target.value)}
              onBlur={() => handleInputBlur('padding', 'bottom')}
              className="h-8 text-xs"
              placeholder="0"
              data-testid="input-padding-bottom"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Left</Label>
            <Input
              type="text"
              value={getDisplayValue('padding', 'left')}
              onChange={(e) => handleInputChange('padding', 'left', e.target.value)}
              onBlur={() => handleInputBlur('padding', 'left')}
              className="h-8 text-xs"
              placeholder="0"
              data-testid="input-padding-left"
            />
          </div>
        </div>
      </div>

      {/* Border */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-white">Border Width</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBorderLinked(!borderLinked)}
            className="h-6 w-6 p-0"
            data-testid="link-border"
          >
            {borderLinked ? (
              <Link className="h-3 w-3" />
            ) : (
              <Unlink className="h-3 w-3" />
            )}
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Top</Label>
            <Input
              type="text"
              value={getDisplayValue('border', 'top')}
              onChange={(e) => handleInputChange('border', 'top', e.target.value)}
              onBlur={() => handleInputBlur('border', 'top')}
              className="h-8 text-xs"
              placeholder="0"
              data-testid="input-border-top"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Right</Label>
            <Input
              type="text"
              value={getDisplayValue('border', 'right')}
              onChange={(e) => handleInputChange('border', 'right', e.target.value)}
              onBlur={() => handleInputBlur('border', 'right')}
              className="h-8 text-xs"
              placeholder="0"
              data-testid="input-border-right"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Bottom</Label>
            <Input
              type="text"
              value={getDisplayValue('border', 'bottom')}
              onChange={(e) => handleInputChange('border', 'bottom', e.target.value)}
              onBlur={() => handleInputBlur('border', 'bottom')}
              className="h-8 text-xs"
              placeholder="0"
              data-testid="input-border-bottom"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Left</Label>
            <Input
              type="text"
              value={getDisplayValue('border', 'left')}
              onChange={(e) => handleInputChange('border', 'left', e.target.value)}
              onBlur={() => handleInputBlur('border', 'left')}
              className="h-8 text-xs"
              placeholder="0"
              data-testid="input-border-left"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
