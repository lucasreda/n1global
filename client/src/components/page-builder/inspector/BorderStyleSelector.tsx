import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ColorPickerProfessional } from './ColorPickerProfessional';

interface BorderStyleSelectorProps {
  values: {
    borderStyle?: string;
    borderWidth?: string;
    borderColor?: string;
    borderTopStyle?: string;
    borderTopWidth?: string;
    borderTopColor?: string;
    borderRightStyle?: string;
    borderRightWidth?: string;
    borderRightColor?: string;
    borderBottomStyle?: string;
    borderBottomWidth?: string;
    borderBottomColor?: string;
    borderLeftStyle?: string;
    borderLeftWidth?: string;
    borderLeftColor?: string;
  };
  onChange: (updates: Record<string, string>) => void;
}

const borderStyles = [
  { value: 'none', label: 'None', preview: 'none' },
  { value: 'solid', label: 'Solid', preview: 'solid' },
  { value: 'dashed', label: 'Dashed', preview: 'dashed' },
  { value: 'dotted', label: 'Dotted', preview: 'dotted' },
  { value: 'double', label: 'Double', preview: 'double' },
  { value: 'groove', label: 'Groove', preview: 'groove' },
  { value: 'ridge', label: 'Ridge', preview: 'ridge' },
  { value: 'inset', label: 'Inset', preview: 'inset' },
  { value: 'outset', label: 'Outset', preview: 'outset' },
];

export function BorderStyleSelector({ values, onChange }: BorderStyleSelectorProps) {
  const handleUnifiedChange = (property: string, value: string) => {
    // When changing unified border, clear individual sides
    onChange({
      [property]: value,
      [`${property.replace('border', 'borderTop')}`]: '',
      [`${property.replace('border', 'borderRight')}`]: '',
      [`${property.replace('border', 'borderBottom')}`]: '',
      [`${property.replace('border', 'borderLeft')}`]: '',
    });
  };

  const handleSideChange = (property: string, value: string) => {
    // When changing individual side, clear ALL unified border properties
    onChange({
      [property]: value,
      borderStyle: '',
      borderWidth: '',
      borderColor: '',
    });
  };

  return (
    <div className="space-y-4">
      {/* Unified Border Controls */}
      <div className="space-y-3 p-3 bg-accent/20 rounded-lg">
        <Label className="text-xs font-medium text-muted-foreground">All Sides</Label>
        
        <div className="space-y-2">
          <Label className="text-xs">Style</Label>
          <Select
            value={values.borderStyle || 'none'}
            onValueChange={(value) => handleUnifiedChange('borderStyle', value)}
          >
            <SelectTrigger className="text-xs h-8" data-testid="select-border-style">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {borderStyles.map((style) => (
                <SelectItem key={style.value} value={style.value} className="text-xs">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-0.5" 
                      style={{ 
                        borderTop: `2px ${style.preview} currentColor`,
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

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className="text-xs">Width</Label>
            <Input
              value={values.borderWidth || ''}
              onChange={(e) => handleUnifiedChange('borderWidth', e.target.value)}
              placeholder="1px"
              className="text-xs h-8"
              data-testid="input-border-width"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Color</Label>
            <ColorPickerProfessional
              label=""
              value={values.borderColor || '#000000'}
              onChange={(value) => handleUnifiedChange('borderColor', value)}
              data-testid="color-border"
            />
          </div>
        </div>
      </div>

      {/* Individual Side Controls */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">Individual Sides</Label>
        
        {/* Top */}
        <div className="space-y-2 p-2 bg-accent/10 rounded">
          <Label className="text-xs font-medium">Top</Label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={values.borderTopStyle || 'none'}
              onValueChange={(value) => handleSideChange('borderTopStyle', value)}
            >
              <SelectTrigger className="text-xs h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {borderStyles.map((style) => (
                  <SelectItem key={style.value} value={style.value} className="text-xs">
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={values.borderTopWidth || ''}
              onChange={(e) => handleSideChange('borderTopWidth', e.target.value)}
              placeholder="1px"
              className="text-xs h-7"
            />
            <ColorPickerProfessional
              label=""
              value={values.borderTopColor || '#000000'}
              onChange={(value) => handleSideChange('borderTopColor', value)}
            />
          </div>
        </div>

        {/* Right */}
        <div className="space-y-2 p-2 bg-accent/10 rounded">
          <Label className="text-xs font-medium">Right</Label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={values.borderRightStyle || 'none'}
              onValueChange={(value) => handleSideChange('borderRightStyle', value)}
            >
              <SelectTrigger className="text-xs h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {borderStyles.map((style) => (
                  <SelectItem key={style.value} value={style.value} className="text-xs">
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={values.borderRightWidth || ''}
              onChange={(e) => handleSideChange('borderRightWidth', e.target.value)}
              placeholder="1px"
              className="text-xs h-7"
            />
            <ColorPickerProfessional
              label=""
              value={values.borderRightColor || '#000000'}
              onChange={(value) => handleSideChange('borderRightColor', value)}
            />
          </div>
        </div>

        {/* Bottom */}
        <div className="space-y-2 p-2 bg-accent/10 rounded">
          <Label className="text-xs font-medium">Bottom</Label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={values.borderBottomStyle || 'none'}
              onValueChange={(value) => handleSideChange('borderBottomStyle', value)}
            >
              <SelectTrigger className="text-xs h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {borderStyles.map((style) => (
                  <SelectItem key={style.value} value={style.value} className="text-xs">
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={values.borderBottomWidth || ''}
              onChange={(e) => handleSideChange('borderBottomWidth', e.target.value)}
              placeholder="1px"
              className="text-xs h-7"
            />
            <ColorPickerProfessional
              label=""
              value={values.borderBottomColor || '#000000'}
              onChange={(value) => handleSideChange('borderBottomColor', value)}
            />
          </div>
        </div>

        {/* Left */}
        <div className="space-y-2 p-2 bg-accent/10 rounded">
          <Label className="text-xs font-medium">Left</Label>
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={values.borderLeftStyle || 'none'}
              onValueChange={(value) => handleSideChange('borderLeftStyle', value)}
            >
              <SelectTrigger className="text-xs h-7">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {borderStyles.map((style) => (
                  <SelectItem key={style.value} value={style.value} className="text-xs">
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={values.borderLeftWidth || ''}
              onChange={(e) => handleSideChange('borderLeftWidth', e.target.value)}
              placeholder="1px"
              className="text-xs h-7"
            />
            <ColorPickerProfessional
              label=""
              value={values.borderLeftColor || '#000000'}
              onChange={(value) => handleSideChange('borderLeftColor', value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
