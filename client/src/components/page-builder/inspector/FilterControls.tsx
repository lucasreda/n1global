import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface FilterControlsProps {
  value?: string;
  onChange: (value: string) => void;
  onReset?: () => void;
}

interface FilterValues {
  blur: number;
  brightness: number;
  contrast: number;
  grayscale: number;
  hueRotate: number;
  invert: number;
  saturate: number;
  sepia: number;
}

const defaultFilters: FilterValues = {
  blur: 0,
  brightness: 100,
  contrast: 100,
  grayscale: 0,
  hueRotate: 0,
  invert: 0,
  saturate: 100,
  sepia: 0,
};

// Parse filter string into values
function parseFilter(filterString?: string): FilterValues {
  if (!filterString || filterString === 'none') return { ...defaultFilters };
  
  const values = { ...defaultFilters };
  const regex = /([a-z-]+)\(([^)]+)\)/gi;
  let match;
  
  while ((match = regex.exec(filterString)) !== null) {
    const [, name, rawValue] = match;
    const numValue = parseFloat(rawValue);
    
    switch (name) {
      case 'blur':
        values.blur = numValue;
        break;
      case 'brightness':
        values.brightness = numValue;
        break;
      case 'contrast':
        values.contrast = numValue;
        break;
      case 'grayscale':
        values.grayscale = numValue;
        break;
      case 'hue-rotate':
        values.hueRotate = numValue;
        break;
      case 'invert':
        values.invert = numValue;
        break;
      case 'saturate':
        values.saturate = numValue;
        break;
      case 'sepia':
        values.sepia = numValue;
        break;
    }
  }
  
  return values;
}

// Build filter string from values
function buildFilter(values: FilterValues): string {
  const parts: string[] = [];
  
  if (values.blur > 0) parts.push(`blur(${values.blur}px)`);
  if (values.brightness !== 100) parts.push(`brightness(${values.brightness}%)`);
  if (values.contrast !== 100) parts.push(`contrast(${values.contrast}%)`);
  if (values.grayscale > 0) parts.push(`grayscale(${values.grayscale}%)`);
  if (values.hueRotate !== 0) parts.push(`hue-rotate(${values.hueRotate}deg)`);
  if (values.invert > 0) parts.push(`invert(${values.invert}%)`);
  if (values.saturate !== 100) parts.push(`saturate(${values.saturate}%)`);
  if (values.sepia > 0) parts.push(`sepia(${values.sepia}%)`);
  
  return parts.length > 0 ? parts.join(' ') : 'none';
}

export function FilterControls({ value, onChange, onReset }: FilterControlsProps) {
  const filters = parseFilter(value);
  
  const handleFilterChange = (filterName: keyof FilterValues, newValue: number) => {
    const updated = { ...filters, [filterName]: newValue };
    onChange(buildFilter(updated));
  };
  
  const handleReset = () => {
    onChange('none');
    onReset?.();
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Filter Effects</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-7 px-2 text-xs"
          data-testid="button-reset-filter"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </Button>
      </div>
      
      {/* Blur */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Blur</Label>
          <span className="text-xs text-muted-foreground">{filters.blur}px</span>
        </div>
        <Slider
          value={[filters.blur]}
          onValueChange={([v]) => handleFilterChange('blur', v)}
          min={0}
          max={50}
          step={0.5}
          className="w-full"
          data-testid="slider-blur"
        />
      </div>
      
      {/* Brightness */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Brightness</Label>
          <span className="text-xs text-muted-foreground">{filters.brightness}%</span>
        </div>
        <Slider
          value={[filters.brightness]}
          onValueChange={([v]) => handleFilterChange('brightness', v)}
          min={0}
          max={200}
          step={1}
          className="w-full"
          data-testid="slider-brightness"
        />
      </div>
      
      {/* Contrast */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Contrast</Label>
          <span className="text-xs text-muted-foreground">{filters.contrast}%</span>
        </div>
        <Slider
          value={[filters.contrast]}
          onValueChange={([v]) => handleFilterChange('contrast', v)}
          min={0}
          max={200}
          step={1}
          className="w-full"
          data-testid="slider-contrast"
        />
      </div>
      
      {/* Grayscale */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Grayscale</Label>
          <span className="text-xs text-muted-foreground">{filters.grayscale}%</span>
        </div>
        <Slider
          value={[filters.grayscale]}
          onValueChange={([v]) => handleFilterChange('grayscale', v)}
          min={0}
          max={100}
          step={1}
          className="w-full"
          data-testid="slider-grayscale"
        />
      </div>
      
      {/* Hue Rotate */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Hue Rotate</Label>
          <span className="text-xs text-muted-foreground">{filters.hueRotate}°</span>
        </div>
        <Slider
          value={[filters.hueRotate]}
          onValueChange={([v]) => handleFilterChange('hueRotate', v)}
          min={0}
          max={360}
          step={1}
          className="w-full"
          data-testid="slider-hue-rotate"
        />
      </div>
      
      {/* Invert */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Invert</Label>
          <span className="text-xs text-muted-foreground">{filters.invert}%</span>
        </div>
        <Slider
          value={[filters.invert]}
          onValueChange={([v]) => handleFilterChange('invert', v)}
          min={0}
          max={100}
          step={1}
          className="w-full"
          data-testid="slider-invert"
        />
      </div>
      
      {/* Saturate */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Saturate</Label>
          <span className="text-xs text-muted-foreground">{filters.saturate}%</span>
        </div>
        <Slider
          value={[filters.saturate]}
          onValueChange={([v]) => handleFilterChange('saturate', v)}
          min={0}
          max={200}
          step={1}
          className="w-full"
          data-testid="slider-saturate"
        />
      </div>
      
      {/* Sepia */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Sepia</Label>
          <span className="text-xs text-muted-foreground">{filters.sepia}%</span>
        </div>
        <Slider
          value={[filters.sepia]}
          onValueChange={([v]) => handleFilterChange('sepia', v)}
          min={0}
          max={100}
          step={1}
          className="w-full"
          data-testid="slider-sepia"
        />
      </div>
    </div>
  );
}
