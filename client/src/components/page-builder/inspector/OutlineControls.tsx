import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ColorPickerProfessional } from './ColorPickerProfessional';

interface OutlineControlsProps {
  values: {
    outline?: string;
    outlineStyle?: string;
    outlineWidth?: string;
    outlineColor?: string;
    outlineOffset?: string;
  };
  onChange: (updates: Record<string, string>) => void;
}

const outlineStyles = [
  { value: 'none', label: 'None' },
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'double', label: 'Double' },
  { value: 'groove', label: 'Groove' },
  { value: 'ridge', label: 'Ridge' },
  { value: 'inset', label: 'Inset' },
  { value: 'outset', label: 'Outset' },
];

export function OutlineControls({ values, onChange }: OutlineControlsProps) {
  return (
    <div className="space-y-4">
      {/* Outline Style */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Outline Style</Label>
        <Select
          value={values.outlineStyle || 'none'}
          onValueChange={(value) => onChange({ outlineStyle: value })}
        >
          <SelectTrigger className="text-xs h-8" data-testid="select-outline-style">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {outlineStyles.map((style) => (
              <SelectItem key={style.value} value={style.value} className="text-xs">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-0.5" 
                    style={{ 
                      borderTop: `2px ${style.value === 'none' ? 'solid' : style.value} currentColor`,
                      opacity: style.value === 'none' ? 0.3 : 1 
                    }}
                  />
                  {style.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Outline Width */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Outline Width</Label>
        <Input
          value={values.outlineWidth || ''}
          onChange={(e) => onChange({ outlineWidth: e.target.value })}
          placeholder="2px"
          className="text-xs h-8"
          data-testid="input-outline-width"
        />
      </div>

      {/* Outline Color */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Outline Color</Label>
        <ColorPickerProfessional
          label=""
          value={values.outlineColor || '#000000'}
          onChange={(value) => onChange({ outlineColor: value })}
          data-testid="color-outline"
        />
      </div>

      {/* Outline Offset */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Outline Offset</Label>
        <Input
          value={values.outlineOffset || ''}
          onChange={(e) => onChange({ outlineOffset: e.target.value })}
          placeholder="0px"
          className="text-xs h-8"
          data-testid="input-outline-offset"
        />
        <p className="text-[10px] text-muted-foreground">
          Distance between outline and border edge
        </p>
      </div>
    </div>
  );
}
