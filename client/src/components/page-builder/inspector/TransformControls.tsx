import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';

interface TransformControlsProps {
  value: string;
  onChange: (value: string) => void;
}

interface TransformToken {
  type: 'translate' | 'rotate' | 'scale' | 'skew' | 'unknown';
  raw: string; // Original token
}

interface TransformValues {
  translateX: string;
  translateY: string;
  rotate: string;
  scaleX: string;
  scaleY: string;
  skewX: string;
  skewY: string;
  tokens: TransformToken[]; // Track original order
  originalCSS: string; // Store original for reference
}

function parseTransform(cssValue: string): TransformValues {
  const defaults: TransformValues = {
    translateX: '0px',
    translateY: '0px',
    rotate: '0deg',
    scaleX: '1',
    scaleY: '1',
    skewX: '0deg',
    skewY: '0deg',
    tokens: [],
    originalCSS: cssValue,
  };

  if (!cssValue || cssValue === 'none' || cssValue.trim() === '') {
    return defaults;
  }

  const regex = /([a-zA-Z0-9]+)\(([^)]+)\)/g;
  let match;

  while ((match = regex.exec(cssValue)) !== null) {
    const func = match[1];
    const value = match[2];
    const fullMatch = match[0];

    switch (func) {
      case 'translateX':
        defaults.translateX = value;
        defaults.tokens.push({ type: 'translate', raw: fullMatch });
        break;
      case 'translateY':
        defaults.translateY = value;
        defaults.tokens.push({ type: 'translate', raw: fullMatch });
        break;
      case 'translate':
        const [x, y] = value.split(/[,\s]+/).filter(Boolean);
        defaults.translateX = x || '0px';
        defaults.translateY = y || '0px';
        defaults.tokens.push({ type: 'translate', raw: fullMatch });
        break;
      case 'rotate':
        defaults.rotate = value;
        defaults.tokens.push({ type: 'rotate', raw: fullMatch });
        break;
      case 'scaleX':
        defaults.scaleX = value;
        defaults.tokens.push({ type: 'scale', raw: fullMatch });
        break;
      case 'scaleY':
        defaults.scaleY = value;
        defaults.tokens.push({ type: 'scale', raw: fullMatch });
        break;
      case 'scale':
        const [sx, sy] = value.split(/[,\s]+/).filter(Boolean);
        defaults.scaleX = sx || '1';
        defaults.scaleY = sy || sx || '1';
        defaults.tokens.push({ type: 'scale', raw: fullMatch });
        break;
      case 'skewX':
        defaults.skewX = value;
        defaults.tokens.push({ type: 'skew', raw: fullMatch });
        break;
      case 'skewY':
        defaults.skewY = value;
        defaults.tokens.push({ type: 'skew', raw: fullMatch });
        break;
      default:
        defaults.tokens.push({ type: 'unknown', raw: fullMatch });
        break;
    }
  }

  return defaults;
}

function serializeTransform(values: TransformValues): string {
  // If CSS hasn't changed, return original
  const hasTranslate = values.translateX !== '0px' || values.translateY !== '0px';
  const hasRotate = values.rotate !== '0deg';
  const hasScale = values.scaleX !== '1' || values.scaleY !== '1';
  const hasSkew = values.skewX !== '0deg' || values.skewY !== '0deg';

  if (!hasTranslate && !hasRotate && !hasScale && !hasSkew && values.tokens.every(t => t.type === 'unknown')) {
    return values.tokens.map(t => t.raw).join(' ') || 'none';
  }

  // Build result preserving original token order
  const result: string[] = [];
  const handled = new Set<string>();

  values.tokens.forEach(token => {
    if (token.type === 'unknown') {
      result.push(token.raw);
      return;
    }

    // Check if this token type needs updating
    if (token.type === 'translate' && !handled.has('translate')) {
      handled.add('translate');
      if (hasTranslate) {
        result.push(`translate(${values.translateX}, ${values.translateY})`);
      }
    } else if (token.type === 'rotate' && !handled.has('rotate')) {
      handled.add('rotate');
      if (hasRotate) {
        result.push(`rotate(${values.rotate})`);
      }
    } else if (token.type === 'scale' && !handled.has('scale')) {
      handled.add('scale');
      if (hasScale) {
        result.push(`scale(${values.scaleX}, ${values.scaleY})`);
      }
    } else if (token.type === 'skew' && !handled.has('skew')) {
      handled.add('skew');
      if (hasSkew) {
        result.push(`skew(${values.skewX}, ${values.skewY})`);
      }
    }
  });

  // Add new tokens if not in original
  if (hasTranslate && !handled.has('translate')) {
    result.push(`translate(${values.translateX}, ${values.translateY})`);
  }
  if (hasRotate && !handled.has('rotate')) {
    result.push(`rotate(${values.rotate})`);
  }
  if (hasScale && !handled.has('scale')) {
    result.push(`scale(${values.scaleX}, ${values.scaleY})`);
  }
  if (hasSkew && !handled.has('skew')) {
    result.push(`skew(${values.skewX}, ${values.skewY})`);
  }

  return result.length > 0 ? result.join(' ') : 'none';
}

export function TransformControls({ value, onChange }: TransformControlsProps) {
  const [values, setValues] = useState<TransformValues>(parseTransform(value));

  useEffect(() => {
    setValues(parseTransform(value));
  }, [value]);

  const handleChange = (updates: Partial<TransformValues>) => {
    const newValues = { ...values, ...updates };
    setValues(newValues);
    onChange(serializeTransform(newValues));
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium text-foreground">Transform</Label>

      <Tabs defaultValue="translate" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="translate" className="text-xs">Translate</TabsTrigger>
          <TabsTrigger value="rotate" className="text-xs">Rotate</TabsTrigger>
          <TabsTrigger value="scale" className="text-xs">Scale</TabsTrigger>
          <TabsTrigger value="skew" className="text-xs">Skew</TabsTrigger>
        </TabsList>

        {/* Translate */}
        <TabsContent value="translate" className="mt-3 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">X-Axis</Label>
              <Input
                value={values.translateX}
                onChange={(e) => handleChange({ translateX: e.target.value })}
                className="w-20 h-7 text-xs"
                data-testid="transform-translate-x"
              />
            </div>
            <Slider
              value={[parseFloat(values.translateX) || 0]}
              onValueChange={([v]) => handleChange({ translateX: `${v}px` })}
              min={-500}
              max={500}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Y-Axis</Label>
              <Input
                value={values.translateY}
                onChange={(e) => handleChange({ translateY: e.target.value })}
                className="w-20 h-7 text-xs"
                data-testid="transform-translate-y"
              />
            </div>
            <Slider
              value={[parseFloat(values.translateY) || 0]}
              onValueChange={([v]) => handleChange({ translateY: `${v}px` })}
              min={-500}
              max={500}
              step={1}
              className="w-full"
            />
          </div>
        </TabsContent>

        {/* Rotate */}
        <TabsContent value="rotate" className="mt-3 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Rotation</Label>
              <Input
                value={values.rotate}
                onChange={(e) => handleChange({ rotate: e.target.value })}
                className="w-20 h-7 text-xs"
                data-testid="transform-rotate"
              />
            </div>
            <Slider
              value={[parseFloat(values.rotate) || 0]}
              onValueChange={([v]) => handleChange({ rotate: `${v}deg` })}
              min={-180}
              max={180}
              step={1}
              className="w-full"
            />
          </div>
        </TabsContent>

        {/* Scale */}
        <TabsContent value="scale" className="mt-3 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">X-Axis</Label>
              <Input
                value={values.scaleX}
                onChange={(e) => handleChange({ scaleX: e.target.value })}
                className="w-20 h-7 text-xs"
                data-testid="transform-scale-x"
              />
            </div>
            <Slider
              value={[parseFloat(values.scaleX) || 1]}
              onValueChange={([v]) => handleChange({ scaleX: v.toString() })}
              min={0}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Y-Axis</Label>
              <Input
                value={values.scaleY}
                onChange={(e) => handleChange({ scaleY: e.target.value })}
                className="w-20 h-7 text-xs"
                data-testid="transform-scale-y"
              />
            </div>
            <Slider
              value={[parseFloat(values.scaleY) || 1]}
              onValueChange={([v]) => handleChange({ scaleY: v.toString() })}
              min={0}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>
        </TabsContent>

        {/* Skew */}
        <TabsContent value="skew" className="mt-3 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">X-Axis</Label>
              <Input
                value={values.skewX}
                onChange={(e) => handleChange({ skewX: e.target.value })}
                className="w-20 h-7 text-xs"
                data-testid="transform-skew-x"
              />
            </div>
            <Slider
              value={[parseFloat(values.skewX) || 0]}
              onValueChange={([v]) => handleChange({ skewX: `${v}deg` })}
              min={-45}
              max={45}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Y-Axis</Label>
              <Input
                value={values.skewY}
                onChange={(e) => handleChange({ skewY: e.target.value })}
                className="w-20 h-7 text-xs"
                data-testid="transform-skew-y"
              />
            </div>
            <Slider
              value={[parseFloat(values.skewY) || 0]}
              onValueChange={([v]) => handleChange({ skewY: `${v}deg` })}
              min={-45}
              max={45}
              step={1}
              className="w-full"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
