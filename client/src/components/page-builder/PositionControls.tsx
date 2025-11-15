import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  Layers,
  Move,
  Pin,
  Anchor
} from 'lucide-react';

interface PositionControlsProps {
  position?: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  zIndex?: string;
  onChange: (updates: Record<string, string>) => void;
  'data-testid'?: string;
}

export function PositionControls({
  position = 'static',
  top = 'auto',
  right = 'auto',
  bottom = 'auto',
  left = 'auto',
  zIndex = 'auto',
  onChange,
  'data-testid': testId = 'position-controls'
}: PositionControlsProps) {
  const positionOptions = [
    { value: 'static', label: 'Static', desc: 'Normal flow' },
    { value: 'relative', label: 'Relative', desc: 'Relative to self' },
    { value: 'absolute', label: 'Absolute', desc: 'Relative to parent' },
    { value: 'fixed', label: 'Fixed', desc: 'Relative to viewport' },
    { value: 'sticky', label: 'Sticky', desc: 'Hybrid scroll' }
  ];

  const isPositioned = position !== 'static';

  // Offset input component that handles 'auto' correctly
  const OffsetInput = ({ label, value, onChange, testId }: { 
    label: string; 
    value: string; 
    onChange: (val: string) => void; 
    testId: string; 
  }) => {
    const isAuto = value === 'auto';
    const parsed = isAuto ? { value: 0, unit: 'auto' } : (() => {
      const match = value.match(/^(-?\d*\.?\d+)(px|%|rem)?$/);
      return {
        value: match ? parseFloat(match[1]) : 0,
        unit: (match?.[2] || 'px') as 'px' | '%' | 'rem' | 'auto'
      };
    })();

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-xs font-medium">{label}</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={isAuto ? '' : parsed.value}
              onChange={(e) => {
                const num = parseFloat(e.target.value) || 0;
                onChange(parsed.unit === 'auto' ? 'auto' : `${num}${parsed.unit}`);
              }}
              placeholder="auto"
              disabled={isAuto}
              className="w-14 h-7 text-xs"
              data-testid={`${testId}-input`}
            />
            <Select 
              value={parsed.unit} 
              onValueChange={(unit) => {
                if (unit === 'auto') {
                  onChange('auto');
                } else {
                  onChange(`${parsed.value}${unit}`);
                }
              }}
            >
              <SelectTrigger className="w-14 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="px">px</SelectItem>
                <SelectItem value="%">%</SelectItem>
                <SelectItem value="rem">rem</SelectItem>
                <SelectItem value="auto">auto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {!isAuto && (
          <Slider
            value={[parsed.value]}
            onValueChange={(v) => onChange(`${v[0]}${parsed.unit}`)}
            min={-500}
            max={500}
            step={1}
            className="w-full"
            data-testid={`${testId}-slider`}
          />
        )}
      </div>
    );
  };

  // Z-index input component (unitless)
  const ZIndexInput = ({ value, onChange, testId }: { 
    value: string; 
    onChange: (val: string) => void; 
    testId: string; 
  }) => {
    const isAuto = value === 'auto';
    const numValue = isAuto ? 0 : parseInt(value) || 0;

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-medium">Z-Index</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={isAuto ? '' : numValue}
              onChange={(e) => {
                const num = parseInt(e.target.value) || 0;
                onChange(String(num));
              }}
              placeholder="auto"
              disabled={isAuto}
              className="w-16 h-8 text-xs"
              data-testid={`${testId}-input`}
            />
            <Button
              variant={isAuto ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange(isAuto ? '0' : 'auto')}
              className="h-8 px-3 text-xs"
              data-testid={`${testId}-auto-toggle`}
            >
              {isAuto ? 'Auto ✓' : 'Auto'}
            </Button>
          </div>
        </div>
        {!isAuto && (
          <Slider
            value={[numValue]}
            onValueChange={(v) => onChange(String(v[0]))}
            min={-10}
            max={100}
            step={1}
            className="w-full"
            data-testid={`${testId}-slider`}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4" data-testid={testId}>
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Pin className="h-4 w-4" />
          Position Type
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {positionOptions.map(({ value, label, desc }) => (
            <Button
              key={value}
              variant={position === value ? 'default' : 'outline'}
              size="sm"
              className="flex flex-col items-start h-auto py-2"
              onClick={() => onChange({ position: value })}
              data-testid={`${testId}-position-${value}`}
            >
              <span className="text-xs font-semibold">{label}</span>
              <span className="text-[10px] text-muted-foreground">{desc}</span>
            </Button>
          ))}
        </div>
      </div>

      {isPositioned && (
        <>
          <div className="bg-muted/50 rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium flex items-center gap-1">
                <Move className="h-3 w-3" />
                Offset Values
              </Label>
              <Badge variant="secondary" className="text-[10px]">
                {position}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-center">
              {/* Visual cross layout for offset controls */}
              <div className="col-span-2">
                <OffsetInput
                  label="Top"
                  value={top}
                  onChange={(value) => onChange({ top: value })}
                  testId={`${testId}-top`}
                />
              </div>
              <div>
                <OffsetInput
                  label="Left"
                  value={left}
                  onChange={(value) => onChange({ left: value })}
                  testId={`${testId}-left`}
                />
              </div>
              <div>
                <OffsetInput
                  label="Right"
                  value={right}
                  onChange={(value) => onChange({ right: value })}
                  testId={`${testId}-right`}
                />
              </div>
              <div className="col-span-2">
                <OffsetInput
                  label="Bottom"
                  value={bottom}
                  onChange={(value) => onChange({ bottom: value })}
                  testId={`${testId}-bottom`}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-4 w-4" />
              <Label className="text-sm font-medium">Stacking Order</Label>
            </div>
            <ZIndexInput
              value={zIndex}
              onChange={(value) => onChange({ zIndex: value })}
              testId={`${testId}-zindex`}
            />
            <p className="text-xs text-muted-foreground">
              Higher values appear on top. auto = inherit from context.
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-md p-3 space-y-1">
            <h4 className="text-xs font-semibold flex items-center gap-1">
              <Anchor className="h-3 w-3" />
              Position Quick Guide:
            </h4>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              <li>• <span className="font-semibold">Relative:</span> Offset from normal position</li>
              <li>• <span className="font-semibold">Absolute:</span> Positioned relative to parent</li>
              <li>• <span className="font-semibold">Fixed:</span> Stays in viewport (scroll-independent)</li>
              <li>• <span className="font-semibold">Sticky:</span> Switches relative→fixed on scroll</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
