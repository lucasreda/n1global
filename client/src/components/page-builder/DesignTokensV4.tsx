import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Palette, Type, RulerIcon } from 'lucide-react';
import { PageNodeV4 } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface DesignTokensV4 {
  colors?: {
    primary?: Record<string, string>;
    secondary?: Record<string, string>;
    neutral?: Record<string, string>;
  };
  typography?: {
    fontFamily?: Record<string, string>;
    fontSize?: Record<string, string>;
    fontWeight?: Record<string, string>;
  };
  spacing?: Record<string, string>;
}

interface DesignTokensV4DialogProps {
  tokens?: DesignTokensV4;
  onUpdate: (tokens: DesignTokensV4) => void;
  onApplyToNode?: (node: PageNodeV4, tokenPath: string, breakpoint: 'desktop' | 'tablet' | 'mobile') => void;
  trigger?: React.ReactNode;
  'data-testid'?: string;
}

const DEFAULT_TOKENS: DesignTokensV4 = {
  colors: {
    primary: {
      '500': '#3b82f6',
      '600': '#2563eb',
      '700': '#1d4ed8',
    },
    secondary: {
      '500': '#8b5cf6',
      '600': '#7c3aed',
    },
    neutral: {
      '50': '#fafafa',
      '100': '#f4f4f5',
      '500': '#71717a',
      '900': '#18181b',
    },
  },
  typography: {
    fontFamily: {
      sans: 'system-ui, -apple-system, sans-serif',
      serif: 'Georgia, serif',
      mono: 'monospace',
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px',
    },
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
  },
};

export function DesignTokensV4Dialog({ 
  tokens = DEFAULT_TOKENS, 
  onUpdate, 
  trigger,
  'data-testid': testId = 'design-tokens-dialog-v4'
}: DesignTokensV4DialogProps) {
  const [localTokens, setLocalTokens] = useState<DesignTokensV4>(tokens);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    onUpdate(localTokens);
    setOpen(false);
    toast({
      title: 'Design tokens updated',
      description: 'Your design system has been updated successfully',
    });
  };

  const updateColorToken = (category: string, key: string, value: string) => {
    setLocalTokens(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [category]: {
          ...(prev.colors?.[category as keyof typeof prev.colors] || {}),
          [key]: value
        }
      }
    }));
  };

  const updateTypographyToken = (category: string, key: string, value: string) => {
    setLocalTokens(prev => ({
      ...prev,
      typography: {
        ...prev.typography,
        [category]: {
          ...(prev.typography?.[category as keyof typeof prev.typography] || {}),
          [key]: value
        }
      }
    }));
  };

  const updateSpacingToken = (key: string, value: string) => {
    setLocalTokens(prev => ({
      ...prev,
      spacing: {
        ...prev.spacing,
        [key]: value
      }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" data-testid={`${testId}-trigger`}>
            <Palette className="h-4 w-4 mr-2" />
            Design Tokens
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid={testId}>
        <DialogHeader>
          <DialogTitle>Design Tokens</DialogTitle>
          <DialogDescription>
            Manage global design variables (colors, typography, spacing)
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="colors" data-testid={`${testId}-tab-colors`}>
              <Palette className="h-4 w-4 mr-2" />
              Colors
            </TabsTrigger>
            <TabsTrigger value="typography" data-testid={`${testId}-tab-typography`}>
              <Type className="h-4 w-4 mr-2" />
              Typography
            </TabsTrigger>
            <TabsTrigger value="spacing" data-testid={`${testId}-tab-spacing`}>
              <RulerIcon className="h-4 w-4 mr-2" />
              Spacing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-4 mt-4">
            {(['primary', 'secondary', 'neutral'] as const).map(category => (
              <Card key={category}>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3 capitalize">{category} Colors</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(localTokens.colors?.[category] || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Label className="text-xs w-16">{key}</Label>
                        <Input
                          type="color"
                          value={value}
                          onChange={(e) => updateColorToken(category, key, e.target.value)}
                          className="w-20 h-8 p-1"
                          data-testid={`color-${category}-${key}`}
                        />
                        <Input
                          type="text"
                          value={value}
                          onChange={(e) => updateColorToken(category, key, e.target.value)}
                          className="flex-1 h-8 text-xs font-mono"
                          data-testid={`color-hex-${category}-${key}`}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="typography" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Font Family</h3>
                <div className="space-y-2">
                  {Object.entries(localTokens.typography?.fontFamily || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Label className="text-xs w-20">{key}</Label>
                      <Input
                        type="text"
                        value={value}
                        onChange={(e) => updateTypographyToken('fontFamily', key, e.target.value)}
                        className="flex-1 h-8 text-xs font-mono"
                        data-testid={`font-family-${key}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Font Size</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(localTokens.typography?.fontSize || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Label className="text-xs w-16">{key}</Label>
                      <Input
                        type="text"
                        value={value}
                        onChange={(e) => updateTypographyToken('fontSize', key, e.target.value)}
                        className="flex-1 h-8 text-xs font-mono"
                        data-testid={`font-size-${key}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Font Weight</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(localTokens.typography?.fontWeight || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Label className="text-xs w-20">{key}</Label>
                      <Input
                        type="text"
                        value={value}
                        onChange={(e) => updateTypographyToken('fontWeight', key, e.target.value)}
                        className="flex-1 h-8 text-xs font-mono"
                        data-testid={`font-weight-${key}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="spacing" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Spacing Scale</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(localTokens.spacing || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Label className="text-xs w-16">{key}</Label>
                      <Input
                        type="text"
                        value={value}
                        onChange={(e) => updateSpacingToken(key, e.target.value)}
                        className="flex-1 h-8 text-xs font-mono"
                        data-testid={`spacing-${key}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid={`${testId}-save`}>
            Save Tokens
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
