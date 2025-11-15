import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Grid3x3,
  LayoutGrid,
  ArrowRight,
  ArrowDown,
  Columns,
  Rows
} from 'lucide-react';
import { UnitSliderInput } from './AdvancedControls';

interface GridLayoutControlsProps {
  display?: string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gap?: string;
  gridAutoFlow?: string;
  gridAutoColumns?: string;
  gridAutoRows?: string;
  onChange: (updates: Record<string, string>) => void;
  'data-testid'?: string;
}

export function GridLayoutControls({
  display = 'block',
  gridTemplateColumns = 'none',
  gridTemplateRows = 'none',
  gap = '0px',
  gridAutoFlow = 'row',
  gridAutoColumns = 'auto',
  gridAutoRows = 'auto',
  onChange,
  'data-testid': testId = 'grid-layout-controls'
}: GridLayoutControlsProps) {
  const isGridActive = display === 'grid';

  const handleDisplayToggle = () => {
    if (isGridActive) {
      onChange({ display: 'block' });
    } else {
      // Coerce 'none' and empty values to a valid default
      const validColumns = (!gridTemplateColumns || gridTemplateColumns === 'none') 
        ? 'repeat(2, 1fr)' 
        : gridTemplateColumns;
      const validRows = (!gridTemplateRows || gridTemplateRows === 'none')
        ? 'auto'
        : gridTemplateRows;
      
      onChange({ 
        display: 'grid',
        gridTemplateColumns: validColumns,
        gridTemplateRows: validRows,
        gap: gap || '16px'
      });
    }
  };

  const columnPresets = [
    { value: 'none', label: 'None (Auto)', icon: '·' },
    { value: '1fr', label: '1 Column', icon: '|' },
    { value: 'repeat(2, 1fr)', label: '2 Equal', icon: '||' },
    { value: 'repeat(3, 1fr)', label: '3 Equal', icon: '|||' },
    { value: 'repeat(4, 1fr)', label: '4 Equal', icon: '||||' },
    { value: '2fr 1fr', label: '2:1', icon: '||·' },
    { value: '1fr 2fr', label: '1:2', icon: '·||' },
    { value: '1fr 1fr 1fr', label: '1:1:1', icon: '|||' },
    { value: 'repeat(12, 1fr)', label: '12 Columns', icon: '12' },
    { value: '250px 1fr', label: 'Sidebar L', icon: '▌█' },
    { value: '1fr 250px', label: 'Sidebar R', icon: '█▐' },
    { value: 'minmax(200px, 1fr) 2fr', label: 'Flexible', icon: '▌██' },
    { value: 'repeat(auto-fit, minmax(200px, 1fr))', label: 'Auto Fit', icon: '▌▌▌' }
  ];

  const rowPresets = [
    { value: 'none', label: 'None (Auto)' },
    { value: 'auto', label: 'Auto' },
    { value: 'repeat(2, 1fr)', label: '2 Equal' },
    { value: 'repeat(3, 1fr)', label: '3 Equal' },
    { value: 'auto 1fr auto', label: 'Header/Body/Footer' },
    { value: '100px 1fr', label: 'Fixed + Flex' },
    { value: 'minmax(100px, auto) 1fr', label: 'Flexible' }
  ];

  const autoFlowOptions = [
    { value: 'row', label: 'Row', icon: ArrowRight },
    { value: 'column', label: 'Column', icon: ArrowDown },
    { value: 'row dense', label: 'Row Dense', icon: ArrowRight },
    { value: 'column dense', label: 'Column Dense', icon: ArrowDown }
  ];

  return (
    <div className="space-y-4" data-testid={testId}>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Display</Label>
        <Button
          variant={isGridActive ? 'default' : 'outline'}
          className="w-full"
          onClick={handleDisplayToggle}
          data-testid={`${testId}-toggle-grid`}
        >
          {isGridActive ? '✓ Grid Active' : 'Enable Grid'}
        </Button>
      </div>

      {isGridActive && (
        <>
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Columns className="h-4 w-4" />
              Grid Template Columns
            </Label>
            <Select
              value={gridTemplateColumns}
              onValueChange={(value) => onChange({ gridTemplateColumns: value })}
            >
              <SelectTrigger data-testid={`${testId}-columns-preset`} className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columnPresets.map(({ value, label, icon }) => (
                  <SelectItem key={value} value={value} className="text-xs">
                    <span className="font-mono mr-2">{icon}</span>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={gridTemplateColumns}
              onChange={(e) => onChange({ gridTemplateColumns: e.target.value })}
              placeholder="e.g., repeat(3, 1fr)"
              className="text-xs font-mono"
              data-testid={`${testId}-columns-input`}
            />
            <p className="text-xs text-muted-foreground">
              Use: 1fr, 200px, minmax(200px, 1fr), repeat(3, 1fr)
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Rows className="h-4 w-4" />
              Grid Template Rows
            </Label>
            <Select
              value={gridTemplateRows}
              onValueChange={(value) => onChange({ gridTemplateRows: value })}
            >
              <SelectTrigger data-testid={`${testId}-rows-preset`} className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rowPresets.map(({ value, label }) => (
                  <SelectItem key={value} value={value} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={gridTemplateRows}
              onChange={(e) => onChange({ gridTemplateRows: e.target.value })}
              placeholder="e.g., auto 1fr auto"
              className="text-xs font-mono"
              data-testid={`${testId}-rows-input`}
            />
          </div>

          <UnitSliderInput
            label="Grid Gap"
            value={gap || '0px'}
            onChange={(value) => onChange({ gap: value })}
            max={100}
            units={['px', 'rem']}
            data-testid={`${testId}-gap`}
          />

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Grid Auto Flow
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {autoFlowOptions.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  variant={gridAutoFlow === value ? 'default' : 'outline'}
                  size="sm"
                  className="flex items-center gap-2 text-xs"
                  onClick={() => onChange({ gridAutoFlow: value })}
                  data-testid={`${testId}-autoflow-${value.replace(' ', '-')}`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Auto Columns</Label>
              <Input
                value={gridAutoColumns}
                onChange={(e) => onChange({ gridAutoColumns: e.target.value })}
                placeholder="auto"
                className="text-xs h-8"
                data-testid={`${testId}-autocols`}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Auto Rows</Label>
              <Input
                value={gridAutoRows}
                onChange={(e) => onChange({ gridAutoRows: e.target.value })}
                placeholder="auto"
                className="text-xs h-8"
                data-testid={`${testId}-autorows`}
              />
            </div>
          </div>

          <div className="bg-muted/50 rounded-md p-3 space-y-1">
            <h4 className="text-xs font-semibold">Grid Quick Guide:</h4>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              <li>• <span className="font-mono">1fr</span> = flexible unit</li>
              <li>• <span className="font-mono">repeat(3, 1fr)</span> = 3 equal columns</li>
              <li>• <span className="font-mono">minmax(200px, 1fr)</span> = responsive</li>
              <li>• <span className="font-mono">auto-fit</span> = auto wrap columns</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
