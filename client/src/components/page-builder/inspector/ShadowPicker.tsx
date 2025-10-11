import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Copy } from 'lucide-react';
import { ColorPickerProfessional } from './ColorPickerProfessional';

interface Shadow {
  offsetX: number;
  offsetXUnit: string;
  offsetY: number;
  offsetYUnit: string;
  blur: number;
  blurUnit: string;
  spread?: number; // Only for box-shadow
  spreadUnit?: string;
  color: string;
  inset?: boolean; // Only for box-shadow
}

interface ShadowPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: 'box' | 'text';
  'data-testid'?: string;
}

const PRESETS: Record<string, Shadow[]> = {
  soft: [{ offsetX: 0, offsetXUnit: 'px', offsetY: 2, offsetYUnit: 'px', blur: 8, blurUnit: 'px', spread: 0, spreadUnit: 'px', color: 'rgba(0, 0, 0, 0.1)' }],
  medium: [{ offsetX: 0, offsetXUnit: 'px', offsetY: 4, offsetYUnit: 'px', blur: 12, blurUnit: 'px', spread: -2, spreadUnit: 'px', color: 'rgba(0, 0, 0, 0.15)' }],
  hard: [{ offsetX: 0, offsetXUnit: 'px', offsetY: 10, offsetYUnit: 'px', blur: 20, blurUnit: 'px', spread: -5, spreadUnit: 'px', color: 'rgba(0, 0, 0, 0.25)' }],
  glow: [{ offsetX: 0, offsetXUnit: 'px', offsetY: 0, offsetYUnit: 'px', blur: 20, blurUnit: 'px', spread: 0, spreadUnit: 'px', color: 'rgba(59, 130, 246, 0.5)' }],
  'multi-layer': [
    { offsetX: 0, offsetXUnit: 'px', offsetY: 1, offsetYUnit: 'px', blur: 3, blurUnit: 'px', spread: 0, spreadUnit: 'px', color: 'rgba(0, 0, 0, 0.12)' },
    { offsetX: 0, offsetXUnit: 'px', offsetY: 4, offsetYUnit: 'px', blur: 8, blurUnit: 'px', spread: -2, spreadUnit: 'px', color: 'rgba(0, 0, 0, 0.08)' },
    { offsetX: 0, offsetXUnit: 'px', offsetY: 10, offsetYUnit: 'px', blur: 20, blurUnit: 'px', spread: -5, spreadUnit: 'px', color: 'rgba(0, 0, 0, 0.06)' }
  ],
  inset: [{ offsetX: 0, offsetXUnit: 'px', offsetY: 2, offsetYUnit: 'px', blur: 4, blurUnit: 'px', spread: 0, spreadUnit: 'px', color: 'rgba(0, 0, 0, 0.1)', inset: true }],
};

export function ShadowPicker({ label, value, onChange, type, 'data-testid': testId }: ShadowPickerProps) {
  const [shadows, setShadows] = useState<Shadow[]>(() => parseShadowValue(value, type));
  const [activeIndex, setActiveIndex] = useState(0);

  // Sync shadows when value or type changes (node/breakpoint change)
  // Only update if the incoming value differs from our current state (external change)
  useEffect(() => {
    const newShadows = parseShadowValue(value, type);
    const currentSerialized = shadows.map(shadowToString).join(', ') || 'none';
    
    // Only update if the value actually changed from external source
    if (value !== currentSerialized) {
      setShadows(newShadows);
      // Only reset index if current index is out of bounds
      setActiveIndex(prev => prev >= newShadows.length ? 0 : prev);
    }
  }, [value, type]);

  const activeShadow = shadows[activeIndex] || createDefaultShadow(type);

  function parseShadowValue(shadowStr: string, shadowType: 'box' | 'text'): Shadow[] {
    if (!shadowStr || shadowStr === 'none') return [];
    
    const parts = shadowStr.split(/,\s*(?![^()]*\))/);
    return parts.map(part => {
      const inset = part.includes('inset');
      const cleanPart = part.replace('inset', '').trim();
      const matches = cleanPart.match(/(-?\d+(?:\.\d+)?)(px|rem|em|%)?\s+(-?\d+(?:\.\d+)?)(px|rem|em|%)?\s+(-?\d+(?:\.\d+)?)(px|rem|em|%)?(?:\s+(-?\d+(?:\.\d+)?)(px|rem|em|%)?)?\s+(.*)/);
      
      if (!matches) return createDefaultShadow(shadowType);
      
      return {
        offsetX: parseFloat(matches[1]),
        offsetXUnit: matches[2] || 'px',
        offsetY: parseFloat(matches[3]),
        offsetYUnit: matches[4] || 'px',
        blur: parseFloat(matches[5]),
        blurUnit: matches[6] || 'px',
        spread: shadowType === 'box' && matches[7] ? parseFloat(matches[7]) : undefined,
        spreadUnit: shadowType === 'box' && matches[8] ? matches[8] : 'px',
        color: matches[9] || 'rgba(0, 0, 0, 0.1)',
        inset: shadowType === 'box' ? inset : undefined,
      };
    });
  }

  function createDefaultShadow(shadowType: 'box' | 'text'): Shadow {
    return {
      offsetX: 0,
      offsetXUnit: 'px',
      offsetY: 4,
      offsetYUnit: 'px',
      blur: 6,
      blurUnit: 'px',
      spread: shadowType === 'box' ? 0 : undefined,
      spreadUnit: shadowType === 'box' ? 'px' : undefined,
      color: 'rgba(0, 0, 0, 0.1)',
      inset: shadowType === 'box' ? false : undefined,
    };
  }

  function shadowToString(shadow: Shadow): string {
    const parts = [
      `${shadow.offsetX}${shadow.offsetXUnit}`,
      `${shadow.offsetY}${shadow.offsetYUnit}`,
      `${shadow.blur}${shadow.blurUnit}`,
    ];
    
    if (type === 'box' && shadow.spread !== undefined) {
      parts.push(`${shadow.spread}${shadow.spreadUnit || 'px'}`);
    }
    
    parts.push(shadow.color);
    
    if (type === 'box' && shadow.inset) {
      return `inset ${parts.join(' ')}`;
    }
    
    return parts.join(' ');
  }

  function updateShadows(newShadows: Shadow[]) {
    setShadows(newShadows);
    const shadowStr = newShadows.length > 0 
      ? newShadows.map(shadowToString).join(', ')
      : 'none';
    onChange(shadowStr);
  }

  function updateActiveShadow(updates: Partial<Shadow>) {
    const newShadows = [...shadows];
    newShadows[activeIndex] = { ...activeShadow, ...updates };
    updateShadows(newShadows);
  }

  function addShadow() {
    const newShadows = [...shadows, createDefaultShadow(type)];
    setShadows(newShadows);
    setActiveIndex(newShadows.length - 1);
  }

  function removeShadow(index: number) {
    const newShadows = shadows.filter((_, i) => i !== index);
    updateShadows(newShadows);
    setActiveIndex(Math.max(0, Math.min(index, newShadows.length - 1)));
  }

  function applyPreset(presetKey: string) {
    const preset = PRESETS[presetKey];
    if (preset) {
      updateShadows(preset.map(p => ({ ...p })));
      setActiveIndex(0);
    }
  }

  return (
    <div className="space-y-4" data-testid={testId}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={addShadow}
          className="h-7 text-xs"
          data-testid="add-shadow"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Layer
        </Button>
      </div>

      {/* Presets */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Presets</Label>
        <div className="grid grid-cols-3 gap-2">
          {Object.keys(PRESETS).slice(0, 6).map((preset) => (
            <Button
              key={preset}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset)}
              className="h-8 text-xs capitalize"
              data-testid={`preset-${preset}`}
            >
              {preset}
            </Button>
          ))}
        </div>
      </div>

      {/* Shadow Layers */}
      {shadows.length > 0 && (
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">Layers ({shadows.length})</Label>
          
          {/* Layer Tabs */}
          {shadows.length > 1 && (
            <div className="flex gap-1 flex-wrap">
              {shadows.map((_, index) => (
                <div key={index} className="flex items-center gap-1">
                  <Button
                    variant={activeIndex === index ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveIndex(index)}
                    className="h-7 px-2"
                    data-testid={`shadow-layer-${index}`}
                  >
                    {index + 1}
                  </Button>
                  {shadows.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeShadow(index)}
                      className="h-7 w-7 p-0"
                      data-testid={`remove-shadow-${index}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Active Shadow Controls */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            {/* Offset X */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-foreground">Offset X</Label>
                <Input
                  type="number"
                  value={activeShadow.offsetX}
                  onChange={(e) => updateActiveShadow({ offsetX: parseFloat(e.target.value) || 0 })}
                  className="w-16 h-7 text-xs"
                  data-testid="shadow-offset-x"
                />
              </div>
              <Slider
                value={[activeShadow.offsetX]}
                onValueChange={([v]) => updateActiveShadow({ offsetX: v })}
                min={-50}
                max={50}
                step={1}
                className="w-full"
              />
            </div>

            {/* Offset Y */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-foreground">Offset Y</Label>
                <Input
                  type="number"
                  value={activeShadow.offsetY}
                  onChange={(e) => updateActiveShadow({ offsetY: parseFloat(e.target.value) || 0 })}
                  className="w-16 h-7 text-xs"
                  data-testid="shadow-offset-y"
                />
              </div>
              <Slider
                value={[activeShadow.offsetY]}
                onValueChange={([v]) => updateActiveShadow({ offsetY: v })}
                min={-50}
                max={50}
                step={1}
                className="w-full"
              />
            </div>

            {/* Blur */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-foreground">Blur</Label>
                <Input
                  type="number"
                  value={activeShadow.blur}
                  onChange={(e) => updateActiveShadow({ blur: parseFloat(e.target.value) || 0 })}
                  className="w-16 h-7 text-xs"
                  data-testid="shadow-blur"
                />
              </div>
              <Slider
                value={[activeShadow.blur]}
                onValueChange={([v]) => updateActiveShadow({ blur: v })}
                min={0}
                max={50}
                step={1}
                className="w-full"
              />
            </div>

            {/* Spread (Box Shadow Only) */}
            {type === 'box' && activeShadow.spread !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-foreground">Spread</Label>
                  <Input
                    type="number"
                    value={activeShadow.spread}
                    onChange={(e) => updateActiveShadow({ spread: parseFloat(e.target.value) || 0 })}
                    className="w-16 h-7 text-xs"
                    data-testid="shadow-spread"
                  />
                </div>
                <Slider
                  value={[activeShadow.spread]}
                  onValueChange={([v]) => updateActiveShadow({ spread: v })}
                  min={-20}
                  max={20}
                  step={1}
                  className="w-full"
                />
              </div>
            )}

            {/* Color */}
            <ColorPickerProfessional
              label="Color"
              value={activeShadow.color}
              onChange={(color) => updateActiveShadow({ color })}
              data-testid="shadow-color"
            />

            {/* Inset (Box Shadow Only) */}
            {type === 'box' && (
              <div className="flex items-center justify-between">
                <Label className="text-xs text-foreground">Inset</Label>
                <Button
                  variant={activeShadow.inset ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateActiveShadow({ inset: !activeShadow.inset })}
                  className="h-7 text-xs"
                  data-testid="shadow-inset"
                >
                  {activeShadow.inset ? 'On' : 'Off'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {shadows.length === 0 && (
        <div className="text-xs text-muted-foreground italic bg-muted/30 p-3 rounded text-center">
          No shadows defined. Click "Add Layer" to create one.
        </div>
      )}

      {/* Preview */}
      {shadows.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Preview</Label>
          <div className="p-8 bg-muted/50 rounded-lg flex items-center justify-center">
            <div
              className="w-24 h-24 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center"
              style={{
                [type === 'box' ? 'boxShadow' : 'textShadow']: 
                  shadows.map(shadowToString).join(', ')
              }}
            >
              {type === 'text' && (
                <span className="text-2xl font-bold">Aa</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
