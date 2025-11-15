import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image, Maximize2, Minimize2, Move, Square } from 'lucide-react';

interface ObjectFitControlsProps {
  values: {
    objectFit?: string;
    objectPosition?: string;
  };
  onChange: (updates: Record<string, string>) => void;
}

const objectFitOptions = [
  { value: 'fill', label: 'Fill', icon: Maximize2, desc: 'Stretch to fill' },
  { value: 'contain', label: 'Contain', icon: Minimize2, desc: 'Fit inside' },
  { value: 'cover', label: 'Cover', icon: Image, desc: 'Cover area' },
  { value: 'none', label: 'None', icon: Square, desc: 'Original size' },
  { value: 'scale-down', label: 'Scale Down', icon: Minimize2, desc: 'Smallest fit' },
];

const objectPositionPresets = [
  { value: 'center', label: 'Center' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'top left', label: 'Top Left' },
  { value: 'top right', label: 'Top Right' },
  { value: 'bottom left', label: 'Bottom Left' },
  { value: 'bottom right', label: 'Bottom Right' },
];

export function ObjectFitControls({ values, onChange }: ObjectFitControlsProps) {
  return (
    <div className="space-y-4">
      {/* Object Fit */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Object Fit</Label>
        <Select
          value={values.objectFit || 'fill'}
          onValueChange={(value) => onChange({ objectFit: value })}
        >
          <SelectTrigger className="text-xs h-8" data-testid="select-object-fit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {objectFitOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3 h-3" />
                    <div>
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-[10px] text-muted-foreground">{opt.desc}</div>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Object Position */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Object Position</Label>
        <Select
          value={values.objectPosition || 'center'}
          onValueChange={(value) => onChange({ objectPosition: value })}
        >
          <SelectTrigger className="text-xs h-8" data-testid="select-object-position">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {objectPositionPresets.map((preset) => (
              <SelectItem key={preset.value} value={preset.value} className="text-xs">
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
