import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react';

interface FlexControlsAdvancedProps {
  values: {
    flexDirection?: string;
    flexWrap?: string;
    justifyContent?: string;
    alignItems?: string;
    alignContent?: string;
    gap?: string;
    flexGrow?: string;
    flexShrink?: string;
    flexBasis?: string;
  };
  onChange: (updates: Record<string, string>) => void;
}

const flexDirectionOptions = [
  { value: 'row', label: 'Row', icon: ArrowRight },
  { value: 'row-reverse', label: 'Row Reverse', icon: ArrowLeft },
  { value: 'column', label: 'Column', icon: ArrowDown },
  { value: 'column-reverse', label: 'Column Reverse', icon: ArrowUp },
];

const flexWrapOptions = [
  { value: 'nowrap', label: 'No Wrap' },
  { value: 'wrap', label: 'Wrap' },
  { value: 'wrap-reverse', label: 'Wrap Reverse' },
];

const justifyContentOptions = [
  { value: 'flex-start', label: 'Start' },
  { value: 'flex-end', label: 'End' },
  { value: 'center', label: 'Center' },
  { value: 'space-between', label: 'Space Between' },
  { value: 'space-around', label: 'Space Around' },
  { value: 'space-evenly', label: 'Space Evenly' },
];

const alignItemsOptions = [
  { value: 'flex-start', label: 'Start' },
  { value: 'flex-end', label: 'End' },
  { value: 'center', label: 'Center' },
  { value: 'baseline', label: 'Baseline' },
  { value: 'stretch', label: 'Stretch' },
];

const alignContentOptions = [
  { value: 'flex-start', label: 'Start' },
  { value: 'flex-end', label: 'End' },
  { value: 'center', label: 'Center' },
  { value: 'space-between', label: 'Space Between' },
  { value: 'space-around', label: 'Space Around' },
  { value: 'stretch', label: 'Stretch' },
];

export function FlexControlsAdvanced({ values, onChange }: FlexControlsAdvancedProps) {
  return (
    <div className="space-y-4">
      {/* Flex Direction */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Flex Direction</Label>
        <Select
          value={values.flexDirection || 'row'}
          onValueChange={(value) => onChange({ flexDirection: value })}
        >
          <SelectTrigger className="text-xs h-8" data-testid="select-flex-direction">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {flexDirectionOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3 h-3" />
                    {opt.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Flex Wrap */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Flex Wrap</Label>
        <Select
          value={values.flexWrap || 'nowrap'}
          onValueChange={(value) => onChange({ flexWrap: value })}
        >
          <SelectTrigger className="text-xs h-8" data-testid="select-flex-wrap">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {flexWrapOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Justify Content */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Justify Content</Label>
        <Select
          value={values.justifyContent || 'flex-start'}
          onValueChange={(value) => onChange({ justifyContent: value })}
        >
          <SelectTrigger className="text-xs h-8" data-testid="select-justify-content">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {justifyContentOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Align Items */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Align Items</Label>
        <Select
          value={values.alignItems || 'flex-start'}
          onValueChange={(value) => onChange({ alignItems: value })}
        >
          <SelectTrigger className="text-xs h-8" data-testid="select-align-items">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {alignItemsOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Align Content */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Align Content</Label>
        <Select
          value={values.alignContent || 'flex-start'}
          onValueChange={(value) => onChange({ alignContent: value })}
        >
          <SelectTrigger className="text-xs h-8" data-testid="select-align-content">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {alignContentOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Gap */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Gap</Label>
        <Input
          value={values.gap || ''}
          onChange={(e) => onChange({ gap: e.target.value })}
          placeholder="e.g. 1rem"
          className="text-xs h-8"
          data-testid="input-flex-gap"
        />
      </div>

      {/* Flex Child Properties */}
      <div className="space-y-3 p-3 bg-accent/20 rounded-lg">
        <Label className="text-xs font-medium text-muted-foreground">Flex Child Properties</Label>
        
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px]">Grow</Label>
            <Input
              value={values.flexGrow || ''}
              onChange={(e) => onChange({ flexGrow: e.target.value })}
              placeholder="0"
              className="text-xs h-7"
              data-testid="input-flex-grow"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Shrink</Label>
            <Input
              value={values.flexShrink || ''}
              onChange={(e) => onChange({ flexShrink: e.target.value })}
              placeholder="1"
              className="text-xs h-7"
              data-testid="input-flex-shrink"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Basis</Label>
            <Input
              value={values.flexBasis || ''}
              onChange={(e) => onChange({ flexBasis: e.target.value })}
              placeholder="auto"
              className="text-xs h-7"
              data-testid="input-flex-basis"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
