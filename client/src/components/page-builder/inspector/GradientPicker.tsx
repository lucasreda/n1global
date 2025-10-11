import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Palette } from 'lucide-react';

interface ColorStop {
  color: string;
  position: number; // 0-100%
}

interface Gradient {
  type: 'linear' | 'radial';
  angle?: number; // For linear (0-360deg)
  shape?: 'circle' | 'ellipse'; // For radial
  stops: ColorStop[];
}

interface GradientPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  'data-testid'?: string;
}

const PRESETS: Record<string, Gradient> = {
  sunset: {
    type: 'linear',
    angle: 135,
    stops: [
      { color: '#FF6B6B', position: 0 },
      { color: '#FFE66D', position: 100 }
    ]
  },
  ocean: {
    type: 'linear',
    angle: 180,
    stops: [
      { color: '#00d2ff', position: 0 },
      { color: '#3a7bd5', position: 100 }
    ]
  },
  'purple-haze': {
    type: 'linear',
    angle: 45,
    stops: [
      { color: '#667eea', position: 0 },
      { color: '#764ba2', position: 100 }
    ]
  },
  'soft-blue': {
    type: 'linear',
    angle: 90,
    stops: [
      { color: '#e0f7fa', position: 0 },
      { color: '#80deea', position: 100 }
    ]
  },
  'fire': {
    type: 'linear',
    angle: 90,
    stops: [
      { color: '#f12711', position: 0 },
      { color: '#f5af19', position: 100 }
    ]
  },
  'radial-glow': {
    type: 'radial',
    shape: 'circle',
    stops: [
      { color: '#4facfe', position: 0 },
      { color: '#00f2fe', position: 100 }
    ]
  },
};

export function GradientPicker({ label, value, onChange, 'data-testid': testId }: GradientPickerProps) {
  const [gradient, setGradient] = useState<Gradient>(() => parseGradientValue(value));
  const [activeStopIndex, setActiveStopIndex] = useState(0);

  // Sync when value changes externally
  useEffect(() => {
    const newGradient = parseGradientValue(value);
    const currentSerialized = gradientToString(gradient);
    
    if (value !== currentSerialized && value !== '') {
      setGradient(newGradient);
      setActiveStopIndex(prev => prev >= newGradient.stops.length ? 0 : prev);
    }
  }, [value]);

  const activeStop = gradient.stops[activeStopIndex] || { color: '#000000', position: 0 };

  function parseGradientValue(gradientStr: string): Gradient {
    if (!gradientStr || gradientStr === 'none') {
      return createDefaultGradient();
    }

    // Try to parse linear-gradient
    const linearMatch = gradientStr.match(/linear-gradient\((\d+)deg,\s*(.+)\)/);
    if (linearMatch) {
      const angle = parseInt(linearMatch[1]);
      const stopsStr = linearMatch[2];
      const stops = parseColorStops(stopsStr);
      return { type: 'linear', angle, stops };
    }

    // Try to parse radial-gradient
    const radialMatch = gradientStr.match(/radial-gradient\((circle|ellipse),\s*(.+)\)/);
    if (radialMatch) {
      const shape = radialMatch[1] as 'circle' | 'ellipse';
      const stopsStr = radialMatch[2];
      const stops = parseColorStops(stopsStr);
      return { type: 'radial', shape, stops };
    }

    return createDefaultGradient();
  }

  function parseColorStops(stopsStr: string): ColorStop[] {
    const stopParts = stopsStr.split(/,\s*(?![^()]*\))/);
    return stopParts.map(part => {
      const match = part.match(/(.+?)\s+(\d+)%/);
      if (match) {
        return {
          color: match[1].trim(),
          position: parseInt(match[2])
        };
      }
      return { color: part.trim(), position: 0 };
    });
  }

  function createDefaultGradient(): Gradient {
    return {
      type: 'linear',
      angle: 90,
      stops: [
        { color: '#667eea', position: 0 },
        { color: '#764ba2', position: 100 }
      ]
    };
  }

  function gradientToString(grad: Gradient): string {
    const stopsStr = grad.stops
      .map(stop => `${stop.color} ${stop.position}%`)
      .join(', ');

    if (grad.type === 'linear') {
      return `linear-gradient(${grad.angle || 90}deg, ${stopsStr})`;
    } else {
      return `radial-gradient(${grad.shape || 'circle'}, ${stopsStr})`;
    }
  }

  function updateGradient(updates: Partial<Gradient>) {
    const newGradient = { ...gradient, ...updates };
    setGradient(newGradient);
    onChange(gradientToString(newGradient));
  }

  function updateActiveStop(updates: Partial<ColorStop>) {
    const newStops = [...gradient.stops];
    newStops[activeStopIndex] = { ...activeStop, ...updates };
    // Sort stops by position
    newStops.sort((a, b) => a.position - b.position);
    updateGradient({ stops: newStops });
  }

  function addStop() {
    const newStops = [...gradient.stops, { color: '#000000', position: 50 }];
    updateGradient({ stops: newStops });
    setActiveStopIndex(newStops.length - 1);
  }

  function removeStop(index: number) {
    if (gradient.stops.length <= 2) return; // Keep at least 2 stops
    const newStops = gradient.stops.filter((_, i) => i !== index);
    updateGradient({ stops: newStops });
    setActiveStopIndex(Math.max(0, Math.min(index, newStops.length - 1)));
  }

  function applyPreset(presetKey: string) {
    const preset = PRESETS[presetKey];
    if (preset) {
      setGradient({ ...preset });
      onChange(gradientToString(preset));
      setActiveStopIndex(0);
    }
  }

  return (
    <div className="space-y-4" data-testid={testId}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={addStop}
          className="h-7 text-xs"
          data-testid="add-gradient-stop"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Stop
        </Button>
      </div>

      {/* Presets */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Presets</Label>
        <div className="grid grid-cols-3 gap-2">
          {Object.keys(PRESETS).map((preset) => (
            <Button
              key={preset}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset)}
              className="h-8 text-xs capitalize p-0 overflow-hidden"
              data-testid={`gradient-preset-${preset}`}
            >
              <div
                className="w-full h-full flex items-center justify-center text-white font-medium"
                style={{ background: gradientToString(PRESETS[preset]) }}
              >
                {preset.split('-').join(' ')}
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Gradient Type */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Type</Label>
        <Tabs value={gradient.type} onValueChange={(type) => updateGradient({ type: type as 'linear' | 'radial' })}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="linear" data-testid="gradient-type-linear">Linear</TabsTrigger>
            <TabsTrigger value="radial" data-testid="gradient-type-radial">Radial</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Linear: Angle Control */}
      {gradient.type === 'linear' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-foreground">Angle</Label>
            <Input
              type="number"
              value={gradient.angle || 90}
              onChange={(e) => updateGradient({ angle: parseInt(e.target.value) || 0 })}
              className="w-20 h-7 text-xs"
              min="0"
              max="360"
              data-testid="gradient-angle"
            />
          </div>
          <Slider
            value={[gradient.angle || 90]}
            onValueChange={([angle]) => updateGradient({ angle })}
            min={0}
            max={360}
            step={1}
            className="w-full"
          />
        </div>
      )}

      {/* Radial: Shape Control */}
      {gradient.type === 'radial' && (
        <div className="space-y-2">
          <Label className="text-xs text-foreground">Shape</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={gradient.shape === 'circle' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateGradient({ shape: 'circle' })}
              className="h-8 text-xs"
              data-testid="gradient-shape-circle"
            >
              Circle
            </Button>
            <Button
              variant={gradient.shape === 'ellipse' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateGradient({ shape: 'ellipse' })}
              className="h-8 text-xs"
              data-testid="gradient-shape-ellipse"
            >
              Ellipse
            </Button>
          </div>
        </div>
      )}

      {/* Color Stops */}
      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Color Stops ({gradient.stops.length})</Label>
        
        {/* Stop Selector */}
        <div className="flex gap-1 flex-wrap">
          {gradient.stops.map((stop, index) => (
            <div key={index} className="flex items-center gap-1">
              <Button
                variant={activeStopIndex === index ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveStopIndex(index)}
                className="h-8 px-2"
                style={{
                  background: activeStopIndex === index ? stop.color : undefined,
                  color: activeStopIndex === index ? '#fff' : undefined
                }}
                data-testid={`gradient-stop-${index}`}
              >
                {stop.position}%
              </Button>
              {gradient.stops.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStop(index)}
                  className="h-7 w-7 p-0"
                  data-testid={`remove-gradient-stop-${index}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Active Stop Controls */}
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
          {/* Color */}
          <div className="space-y-2">
            <Label className="text-xs text-foreground">Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={activeStop.color}
                onChange={(e) => updateActiveStop({ color: e.target.value })}
                className="w-12 h-8 rounded cursor-pointer"
                data-testid="gradient-stop-color"
              />
              <Input
                type="text"
                value={activeStop.color}
                onChange={(e) => updateActiveStop({ color: e.target.value })}
                className="flex-1 h-8 text-xs"
                placeholder="#000000"
                data-testid="gradient-stop-color-input"
              />
            </div>
          </div>

          {/* Position */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-foreground">Position</Label>
              <Input
                type="number"
                value={activeStop.position}
                onChange={(e) => updateActiveStop({ position: parseInt(e.target.value) || 0 })}
                className="w-16 h-7 text-xs"
                min="0"
                max="100"
                data-testid="gradient-stop-position"
              />
            </div>
            <Slider
              value={[activeStop.position]}
              onValueChange={([position]) => updateActiveStop({ position })}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Preview</Label>
        <div
          className="w-full h-24 rounded-lg"
          style={{ background: gradientToString(gradient) }}
          data-testid="gradient-preview"
        />
      </div>
    </div>
  );
}
