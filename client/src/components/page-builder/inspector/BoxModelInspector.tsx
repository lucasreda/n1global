import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

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
    setEditingValues(prev => ({ ...prev, [key]: value }));
  };

  // Handle blur (commit the value with proper unit)
  const handleInputBlur = (fieldType: FieldType, side: Side) => {
    const key = `${fieldType}-${side}`;
    const value = editingValues[key];
    
    // If no edit occurred (value is undefined), don't commit anything
    if (value === undefined) {
      return;
    }
    
    // Clear editing state
    setEditingValues(prev => {
      const newState = { ...prev };
      delete newState[key];
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
    const propName = fieldType === 'margin' ? `margin${side.charAt(0).toUpperCase() + side.slice(1)}` :
                     fieldType === 'padding' ? `padding${side.charAt(0).toUpperCase() + side.slice(1)}` :
                     `border${side.charAt(0).toUpperCase() + side.slice(1)}Width`;
    
    onChange({ [propName]: formatted });
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
      
      {/* Chrome DevTools-style Box Model Visualization */}
      <div className="relative bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
        {/* Margin Layer */}
        <div className="relative">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-orange-700 dark:text-orange-300 font-mono">
            margin
          </div>
          
          {/* Top Margin Input */}
          <Input
            type="text"
            value={getDisplayValue('margin', 'top')}
            onChange={(e) => handleInputChange('margin', 'top', e.target.value)}
            onBlur={() => handleInputBlur('margin', 'top')}
            className="absolute -top-3 left-1/2 -translate-x-1/2 w-14 h-6 text-xs text-center bg-white dark:bg-gray-800 border-orange-300 dark:border-orange-700"
            placeholder="0"
            data-testid="input-margin-top"
          />
          
          {/* Right Margin Input */}
          <Input
            type="text"
            value={getDisplayValue('margin', 'right')}
            onChange={(e) => handleInputChange('margin', 'right', e.target.value)}
            onBlur={() => handleInputBlur('margin', 'right')}
            className="absolute top-1/2 -right-3 -translate-y-1/2 w-14 h-6 text-xs text-center bg-white dark:bg-gray-800 border-orange-300 dark:border-orange-700"
            placeholder="0"
            data-testid="input-margin-right"
          />
          
          {/* Bottom Margin Input */}
          <Input
            type="text"
            value={getDisplayValue('margin', 'bottom')}
            onChange={(e) => handleInputChange('margin', 'bottom', e.target.value)}
            onBlur={() => handleInputBlur('margin', 'bottom')}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-14 h-6 text-xs text-center bg-white dark:bg-gray-800 border-orange-300 dark:border-orange-700"
            placeholder="0"
            data-testid="input-margin-bottom"
          />
          
          {/* Left Margin Input */}
          <Input
            type="text"
            value={getDisplayValue('margin', 'left')}
            onChange={(e) => handleInputChange('margin', 'left', e.target.value)}
            onBlur={() => handleInputBlur('margin', 'left')}
            className="absolute top-1/2 -left-3 -translate-y-1/2 w-14 h-6 text-xs text-center bg-white dark:bg-gray-800 border-orange-300 dark:border-orange-700"
            placeholder="0"
            data-testid="input-margin-left"
          />
          
          {/* Border Layer */}
          <div className="relative bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 p-4 rounded border border-yellow-200 dark:border-yellow-800">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-yellow-700 dark:text-yellow-300 font-mono">
              border
            </div>
            
            {/* Border Width Inputs */}
            <Input
              type="text"
              value={getDisplayValue('border', 'top')}
              onChange={(e) => handleInputChange('border', 'top', e.target.value)}
              onBlur={() => handleInputBlur('border', 'top')}
              className="absolute -top-3 left-1/2 -translate-x-1/2 w-14 h-6 text-xs text-center bg-white dark:bg-gray-800 border-yellow-300 dark:border-yellow-700"
              placeholder="0"
              data-testid="input-border-top"
            />
            
            <Input
              type="text"
              value={getDisplayValue('border', 'right')}
              onChange={(e) => handleInputChange('border', 'right', e.target.value)}
              onBlur={() => handleInputBlur('border', 'right')}
              className="absolute top-1/2 -right-3 -translate-y-1/2 w-14 h-6 text-xs text-center bg-white dark:bg-gray-800 border-yellow-300 dark:border-yellow-700"
              placeholder="0"
              data-testid="input-border-right"
            />
            
            <Input
              type="text"
              value={getDisplayValue('border', 'bottom')}
              onChange={(e) => handleInputChange('border', 'bottom', e.target.value)}
              onBlur={() => handleInputBlur('border', 'bottom')}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-14 h-6 text-xs text-center bg-white dark:bg-gray-800 border-yellow-300 dark:border-yellow-700"
              placeholder="0"
              data-testid="input-border-bottom"
            />
            
            <Input
              type="text"
              value={getDisplayValue('border', 'left')}
              onChange={(e) => handleInputChange('border', 'left', e.target.value)}
              onBlur={() => handleInputBlur('border', 'left')}
              className="absolute top-1/2 -left-3 -translate-y-1/2 w-14 h-6 text-xs text-center bg-white dark:bg-gray-800 border-yellow-300 dark:border-yellow-700"
              placeholder="0"
              data-testid="input-border-left"
            />
            
            {/* Padding Layer */}
            <div className="relative bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-4 rounded border border-green-200 dark:border-green-800">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-green-700 dark:text-green-300 font-mono">
                padding
              </div>
              
              {/* Padding Inputs */}
              <Input
                type="text"
                value={getDisplayValue('padding', 'top')}
                onChange={(e) => handleInputChange('padding', 'top', e.target.value)}
                onBlur={() => handleInputBlur('padding', 'top')}
                className="absolute -top-3 left-1/2 -translate-x-1/2 w-14 h-6 text-xs text-center bg-white dark:bg-gray-800 border-green-300 dark:border-green-700"
                placeholder="0"
                data-testid="input-padding-top"
              />
              
              <Input
                type="text"
                value={getDisplayValue('padding', 'right')}
                onChange={(e) => handleInputChange('padding', 'right', e.target.value)}
                onBlur={() => handleInputBlur('padding', 'right')}
                className="absolute top-1/2 -right-3 -translate-y-1/2 w-14 h-6 text-xs text-center bg-white dark:bg-gray-800 border-green-300 dark:border-green-700"
                placeholder="0"
                data-testid="input-padding-right"
              />
              
              <Input
                type="text"
                value={getDisplayValue('padding', 'bottom')}
                onChange={(e) => handleInputChange('padding', 'bottom', e.target.value)}
                onBlur={() => handleInputBlur('padding', 'bottom')}
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-14 h-6 text-xs text-center bg-white dark:bg-gray-800 border-green-300 dark:border-green-700"
                placeholder="0"
                data-testid="input-padding-bottom"
              />
              
              <Input
                type="text"
                value={getDisplayValue('padding', 'left')}
                onChange={(e) => handleInputChange('padding', 'left', e.target.value)}
                onBlur={() => handleInputBlur('padding', 'left')}
                className="absolute top-1/2 -left-3 -translate-y-1/2 w-14 h-6 text-xs text-center bg-white dark:bg-gray-800 border-green-300 dark:border-green-700"
                placeholder="0"
                data-testid="input-padding-left"
              />
              
              {/* Content Box */}
              <div className="relative bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-8 rounded flex items-center justify-center min-h-[80px] border border-blue-200 dark:border-blue-800">
                <div className="text-xs text-blue-700 dark:text-blue-300 font-mono text-center">
                  content
                  <div className="text-xs opacity-60 mt-1">
                    (element box)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Numeric Summary with Units */}
      <Card className="p-3 bg-gray-50 dark:bg-gray-900">
        <div className="space-y-1 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-orange-600 dark:text-orange-400 font-semibold">margin:</span>
            <span className="text-gray-700 dark:text-gray-300">
              {margin.top || '0px'} / {margin.right || '0px'} / {margin.bottom || '0px'} / {margin.left || '0px'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-green-600 dark:text-green-400 font-semibold">padding:</span>
            <span className="text-gray-700 dark:text-gray-300">
              {padding.top || '0px'} / {padding.right || '0px'} / {padding.bottom || '0px'} / {padding.left || '0px'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-yellow-600 dark:text-yellow-400 font-semibold">border:</span>
            <span className="text-gray-700 dark:text-gray-300">
              {border.topWidth || border.width || '0'} / {border.rightWidth || border.width || '0'} / {border.bottomWidth || border.width || '0'} / {border.leftWidth || border.width || '0'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
