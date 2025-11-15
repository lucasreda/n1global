import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SizingConstraintsProps {
  values: {
    minWidth?: string;
    minHeight?: string;
    maxWidth?: string;
    maxHeight?: string;
    aspectRatio?: string;
  };
  onChange: (updates: Record<string, string>) => void;
}

const aspectRatioPresets = [
  { value: 'auto', label: 'Auto' },
  { value: '1/1', label: '1:1 (Square)' },
  { value: '16/9', label: '16:9 (Landscape)' },
  { value: '9/16', label: '9:16 (Portrait)' },
  { value: '4/3', label: '4:3 (Classic)' },
  { value: '3/4', label: '3:4 (Portrait)' },
  { value: '3/2', label: '3:2 (Photo)' },
  { value: '21/9', label: '21:9 (Ultrawide)' },
  { value: '2/1', label: '2:1 (Cinema)' },
];

export function SizingConstraints({ values, onChange }: SizingConstraintsProps) {
  return (
    <div className="space-y-4">
      {/* Min/Max Width */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Min Width</Label>
          <Input
            value={values.minWidth || ''}
            onChange={(e) => onChange({ minWidth: e.target.value })}
            placeholder="0px"
            className="text-xs h-8"
            data-testid="input-min-width"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Max Width</Label>
          <Input
            value={values.maxWidth || ''}
            onChange={(e) => onChange({ maxWidth: e.target.value })}
            placeholder="none"
            className="text-xs h-8"
            data-testid="input-max-width"
          />
        </div>
      </div>

      {/* Min/Max Height */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Min Height</Label>
          <Input
            value={values.minHeight || ''}
            onChange={(e) => onChange({ minHeight: e.target.value })}
            placeholder="0px"
            className="text-xs h-8"
            data-testid="input-min-height"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Max Height</Label>
          <Input
            value={values.maxHeight || ''}
            onChange={(e) => onChange({ maxHeight: e.target.value })}
            placeholder="none"
            className="text-xs h-8"
            data-testid="input-max-height"
          />
        </div>
      </div>

      {/* Aspect Ratio */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Aspect Ratio</Label>
        <Select
          value={values.aspectRatio || 'auto'}
          onValueChange={(value) => onChange({ aspectRatio: value === 'auto' ? '' : value })}
        >
          <SelectTrigger className="text-xs h-8" data-testid="select-aspect-ratio">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {aspectRatioPresets.map((preset) => (
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
