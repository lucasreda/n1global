import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OverflowControlsProps {
  values: {
    overflow?: string;
    overflowX?: string;
    overflowY?: string;
  };
  onChange: (updates: Record<string, string>) => void;
}

const overflowOptions = [
  { value: 'visible', label: 'Visible' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'scroll', label: 'Scroll' },
  { value: 'auto', label: 'Auto' },
];

export function OverflowControls({ values, onChange }: OverflowControlsProps) {
  return (
    <div className="space-y-4">
      {/* Overflow (Both Axes) */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Overflow</Label>
        <Select
          value={values.overflow || 'visible'}
          onValueChange={(value) => onChange({ overflow: value, overflowX: '', overflowY: '' })}
        >
          <SelectTrigger className="text-xs h-8" data-testid="select-overflow">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {overflowOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Overflow X */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Overflow X</Label>
        <Select
          value={values.overflowX || 'visible'}
          onValueChange={(value) => onChange({ overflowX: value, overflow: '' })}
        >
          <SelectTrigger className="text-xs h-8" data-testid="select-overflow-x">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {overflowOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Overflow Y */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Overflow Y</Label>
        <Select
          value={values.overflowY || 'visible'}
          onValueChange={(value) => onChange({ overflowY: value, overflow: '' })}
        >
          <SelectTrigger className="text-xs h-8" data-testid="select-overflow-y">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {overflowOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
