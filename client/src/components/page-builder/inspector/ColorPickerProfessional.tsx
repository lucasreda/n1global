import { useState, useCallback, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Pipette, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ColorPickerProfessionalProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  'data-testid'?: string;
}

const RECENT_COLORS_KEY = 'colorPickerRecentColors';
const MAX_RECENT_COLORS = 12;

const PRESET_COLORS = [
  // Grayscale
  '#000000', '#404040', '#808080', '#C0C0C0', '#E0E0E0', '#FFFFFF',
  // Primary Colors
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  // Common UI Colors
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b'
];

// Color conversion helpers
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }
  
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

export function ColorPickerProfessional({ 
  label, 
  value = '#000000', 
  onChange,
  'data-testid': testId = 'color-picker-professional'
}: ColorPickerProfessionalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const { toast } = useToast();
  
  // Load recent colors from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_COLORS_KEY);
      if (stored) {
        setRecentColors(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load recent colors:', e);
    }
  }, []);
  
  // Add color to recent colors
  const addToRecent = useCallback((color: string) => {
    setRecentColors(prev => {
      const filtered = prev.filter(c => c.toLowerCase() !== color.toLowerCase());
      const updated = [color, ...filtered].slice(0, MAX_RECENT_COLORS);
      try {
        localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save recent colors:', e);
      }
      return updated;
    });
  }, []);
  
  const handleColorChange = useCallback((newColor: string) => {
    onChange(newColor);
    addToRecent(newColor);
  }, [onChange, addToRecent]);
  
  const handleHexChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    if (hex.match(/^#[0-9A-Fa-f]{0,6}$/)) {
      onChange(hex);
      if (hex.length === 7) {
        addToRecent(hex);
      }
    }
  }, [onChange, addToRecent]);
  
  const handleRgbChange = useCallback((component: 'r' | 'g' | 'b', val: number) => {
    const rgb = hexToRgb(value);
    if (!rgb) return;
    
    const updated = { ...rgb, [component]: Math.max(0, Math.min(255, val)) };
    const hex = rgbToHex(updated.r, updated.g, updated.b);
    onChange(hex);
    addToRecent(hex);
  }, [value, onChange, addToRecent]);
  
  const handleHslChange = useCallback((component: 'h' | 's' | 'l', val: number) => {
    const hsl = hexToHsl(value);
    if (!hsl) return;
    
    const updated = { ...hsl, [component]: val };
    if (component === 'h') updated.h = Math.max(0, Math.min(360, val));
    if (component === 's' || component === 'l') updated[component] = Math.max(0, Math.min(100, val));
    
    const hex = hslToHex(updated.h, updated.s, updated.l);
    onChange(hex);
    addToRecent(hex);
  }, [value, onChange, addToRecent]);
  
  // Eyedropper API
  const handleEyedropper = useCallback(async () => {
    if (!('EyeDropper' in window)) {
      toast({
        title: 'Eyedropper not supported',
        description: 'Your browser does not support the Eyedropper API. Try Chrome 95+ or Edge 95+.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      handleColorChange(result.sRGBHex);
      toast({
        title: 'Color picked',
        description: `Selected: ${result.sRGBHex}`
      });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.error('Eyedropper error:', e);
      }
    }
  }, [handleColorChange, toast]);
  
  const rgb = hexToRgb(value) || { r: 0, g: 0, b: 0 };
  const hsl = hexToHsl(value) || { h: 0, s: 0, l: 0 };
  
  return (
    <div className="space-y-2" data-testid={testId}>
      <Label className="text-sm font-medium">{label}</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full h-10 p-1 justify-start"
            data-testid={`${testId}-trigger`}
          >
            <div 
              className="w-6 h-6 rounded border mr-2"
              style={{ backgroundColor: value }}
            />
            <span className="text-sm font-mono">{value}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start">
          <div className="space-y-3">
            {/* Color Preview & Native Picker */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={value}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-16 h-16 border rounded cursor-pointer"
                data-testid={`${testId}-native-picker`}
              />
              <div className="flex-1 space-y-2">
                <Button
                  onClick={handleEyedropper}
                  variant="outline"
                  size="sm"
                  className="w-full"
                  data-testid={`${testId}-eyedropper`}
                >
                  <Pipette className="w-4 h-4 mr-2" />
                  Pick from Screen
                </Button>
                <div className="text-xs text-muted-foreground text-center">
                  Click color preview or use eyedropper
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Color Format Tabs */}
            <Tabs defaultValue="hex" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="hex" data-testid={`${testId}-tab-hex`}>HEX</TabsTrigger>
                <TabsTrigger value="rgb" data-testid={`${testId}-tab-rgb`}>RGB</TabsTrigger>
                <TabsTrigger value="hsl" data-testid={`${testId}-tab-hsl`}>HSL</TabsTrigger>
              </TabsList>
              
              <TabsContent value="hex" className="space-y-2 mt-3">
                <Label className="text-xs text-muted-foreground">Hex Color</Label>
                <Input
                  value={value}
                  onChange={handleHexChange}
                  placeholder="#000000"
                  className="font-mono text-sm"
                  data-testid={`${testId}-hex-input`}
                />
              </TabsContent>
              
              <TabsContent value="rgb" className="space-y-2 mt-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">R</Label>
                    <Input
                      type="number"
                      min="0"
                      max="255"
                      value={rgb.r}
                      onChange={(e) => handleRgbChange('r', parseInt(e.target.value) || 0)}
                      className="text-sm"
                      data-testid={`${testId}-rgb-r`}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">G</Label>
                    <Input
                      type="number"
                      min="0"
                      max="255"
                      value={rgb.g}
                      onChange={(e) => handleRgbChange('g', parseInt(e.target.value) || 0)}
                      className="text-sm"
                      data-testid={`${testId}-rgb-g`}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">B</Label>
                    <Input
                      type="number"
                      min="0"
                      max="255"
                      value={rgb.b}
                      onChange={(e) => handleRgbChange('b', parseInt(e.target.value) || 0)}
                      className="text-sm"
                      data-testid={`${testId}-rgb-b`}
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="hsl" className="space-y-2 mt-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">H</Label>
                    <Input
                      type="number"
                      min="0"
                      max="360"
                      value={hsl.h}
                      onChange={(e) => handleHslChange('h', parseInt(e.target.value) || 0)}
                      className="text-sm"
                      data-testid={`${testId}-hsl-h`}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">S%</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={hsl.s}
                      onChange={(e) => handleHslChange('s', parseInt(e.target.value) || 0)}
                      className="text-sm"
                      data-testid={`${testId}-hsl-s`}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">L%</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={hsl.l}
                      onChange={(e) => handleHslChange('l', parseInt(e.target.value) || 0)}
                      className="text-sm"
                      data-testid={`${testId}-hsl-l`}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <Separator />
            
            {/* Recent Colors */}
            {recentColors.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">Recent</Label>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {recentColors.map((color, idx) => (
                    <button
                      key={`${color}-${idx}`}
                      onClick={() => handleColorChange(color)}
                      className="w-8 h-8 rounded border hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                      data-testid={`${testId}-recent-${idx}`}
                    />
                  ))}
                </div>
              </div>
            )}
            
            <Separator />
            
            {/* Preset Colors */}
            <div>
              <Label className="text-xs text-muted-foreground">Presets</Label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {PRESET_COLORS.map((preset, idx) => (
                  <button
                    key={preset}
                    onClick={() => handleColorChange(preset)}
                    className="w-8 h-8 rounded border hover:scale-110 transition-transform"
                    style={{ backgroundColor: preset }}
                    title={preset}
                    data-testid={`${testId}-preset-${idx}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
