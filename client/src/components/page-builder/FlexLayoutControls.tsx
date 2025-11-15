import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  ArrowDown,
  ArrowUp, 
  ArrowRight, 
  ArrowLeft,
  AlignVerticalSpaceAround,
  AlignVerticalSpaceBetween,
  AlignHorizontalSpaceAround,
  AlignHorizontalSpaceBetween,
  AlignCenterVertical,
  AlignCenterHorizontal,
  AlignStartVertical,
  AlignStartHorizontal,
  AlignEndVertical,
  AlignEndHorizontal,
  WrapText
} from 'lucide-react';
import { UnitSliderInput } from './AdvancedControls';

interface FlexLayoutControlsProps {
  display?: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  gap?: string;
  flexWrap?: string;
  onChange: (updates: Record<string, string>) => void;
  'data-testid'?: string;
}

export function FlexLayoutControls({
  display = 'block',
  flexDirection = 'row',
  justifyContent = 'flex-start',
  alignItems = 'stretch',
  gap = '0px',
  flexWrap = 'nowrap',
  onChange,
  'data-testid': testId = 'flex-layout-controls'
}: FlexLayoutControlsProps) {
  const isFlexActive = display === 'flex';

  const handleDisplayToggle = () => {
    if (isFlexActive) {
      onChange({ display: 'block' });
    } else {
      onChange({ 
        display: 'flex',
        flexDirection: flexDirection || 'row',
        justifyContent: justifyContent || 'flex-start',
        alignItems: alignItems || 'stretch'
      });
    }
  };

  const flexDirections = [
    { value: 'row', label: 'Row', icon: ArrowRight },
    { value: 'row-reverse', label: 'Row Reverse', icon: ArrowLeft },
    { value: 'column', label: 'Column', icon: ArrowDown },
    { value: 'column-reverse', label: 'Column Reverse', icon: ArrowUp }
  ];

  const justifyOptions = flexDirection?.includes('row') ? [
    { value: 'flex-start', label: 'Start', icon: AlignStartHorizontal },
    { value: 'center', label: 'Center', icon: AlignCenterHorizontal },
    { value: 'flex-end', label: 'End', icon: AlignEndHorizontal },
    { value: 'space-between', label: 'Space Between', icon: AlignHorizontalSpaceBetween },
    { value: 'space-around', label: 'Space Around', icon: AlignHorizontalSpaceAround },
    { value: 'space-evenly', label: 'Space Evenly', icon: AlignHorizontalSpaceAround }
  ] : [
    { value: 'flex-start', label: 'Start', icon: AlignStartVertical },
    { value: 'center', label: 'Center', icon: AlignCenterVertical },
    { value: 'flex-end', label: 'End', icon: AlignEndVertical },
    { value: 'space-between', label: 'Space Between', icon: AlignVerticalSpaceBetween },
    { value: 'space-around', label: 'Space Around', icon: AlignVerticalSpaceAround },
    { value: 'space-evenly', label: 'Space Evenly', icon: AlignVerticalSpaceAround }
  ];

  const alignOptions = flexDirection?.includes('row') ? [
    { value: 'flex-start', label: 'Start', icon: AlignStartVertical },
    { value: 'center', label: 'Center', icon: AlignCenterVertical },
    { value: 'flex-end', label: 'End', icon: AlignEndVertical },
    { value: 'stretch', label: 'Stretch', icon: AlignCenterVertical },
    { value: 'baseline', label: 'Baseline', icon: AlignCenterVertical }
  ] : [
    { value: 'flex-start', label: 'Start', icon: AlignStartHorizontal },
    { value: 'center', label: 'Center', icon: AlignCenterHorizontal },
    { value: 'flex-end', label: 'End', icon: AlignEndHorizontal },
    { value: 'stretch', label: 'Stretch', icon: AlignCenterHorizontal },
    { value: 'baseline', label: 'Baseline', icon: AlignCenterHorizontal }
  ];

  const wrapOptions = [
    { value: 'nowrap', label: 'No Wrap' },
    { value: 'wrap', label: 'Wrap' },
    { value: 'wrap-reverse', label: 'Wrap Reverse' }
  ];

  return (
    <div className="space-y-4" data-testid={testId}>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Display</Label>
        <Button
          variant={isFlexActive ? 'default' : 'outline'}
          className="w-full"
          onClick={handleDisplayToggle}
          data-testid={`${testId}-toggle-flex`}
        >
          {isFlexActive ? '✓ Flexbox Active' : 'Enable Flexbox'}
        </Button>
      </div>

      {isFlexActive && (
        <>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Flex Direction</Label>
            <div className="grid grid-cols-2 gap-2">
              {flexDirections.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  variant={flexDirection === value ? 'default' : 'outline'}
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => onChange({ flexDirection: value })}
                  data-testid={`${testId}-direction-${value}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Justify Content {flexDirection?.includes('row') ? '(Horizontal)' : '(Vertical)'}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {justifyOptions.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  variant={justifyContent === value ? 'default' : 'outline'}
                  size="sm"
                  className="flex items-center gap-1 text-xs"
                  onClick={() => onChange({ justifyContent: value })}
                  data-testid={`${testId}-justify-${value}`}
                >
                  <Icon className="h-3 w-3" />
                  <span className="truncate">{label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Align Items {flexDirection?.includes('row') ? '(Vertical)' : '(Horizontal)'}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {alignOptions.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  variant={alignItems === value ? 'default' : 'outline'}
                  size="sm"
                  className="flex items-center gap-1 text-xs"
                  onClick={() => onChange({ alignItems: value })}
                  data-testid={`${testId}-align-${value}`}
                >
                  <Icon className="h-3 w-3" />
                  <span className="truncate">{label}</span>
                </Button>
              ))}
            </div>
          </div>

          <UnitSliderInput
            label="Gap"
            value={gap || '0px'}
            onChange={(value) => onChange({ gap: value })}
            max={100}
            units={['px', 'rem']}
            data-testid={`${testId}-gap`}
          />

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <WrapText className="h-4 w-4" />
              Flex Wrap
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {wrapOptions.map(({ value, label }) => (
                <Button
                  key={value}
                  variant={flexWrap === value ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => onChange({ flexWrap: value })}
                  data-testid={`${testId}-wrap-${value}`}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
