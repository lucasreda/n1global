import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Palette, Type, RulerIcon, Plus, Trash2 } from 'lucide-react';
import { DesignTokensV3 } from '@shared/schema';

interface DesignTokensDialogProps {
  tokens?: DesignTokensV3;
  onUpdate: (tokens: DesignTokensV3) => void;
  trigger?: React.ReactNode;
  'data-testid'?: string;
}

export function DesignTokensDialog({ 
  tokens = {}, 
  onUpdate, 
  trigger,
  'data-testid': testId = 'design-tokens-dialog'
}: DesignTokensDialogProps) {
  const [localTokens, setLocalTokens] = useState<DesignTokensV3>(tokens);
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    onUpdate(localTokens);
    setOpen(false);
  };

  const updateColorToken = (category: string, key: string, value: string) => {
    setLocalTokens(prev => {
      const prevColors = prev.colors ?? {};
      return {
        ...prev,
        colors: {
          ...prevColors,
          [category]: {
            ...((prevColors as any)?.[category] || {}),
            [key]: value
          }
        }
      };
    });
  };

  const addColorToken = (category: string) => {
    const key = prompt('Nome da cor (ex: 50, 100, 500):');
    if (key) {
      updateColorToken(category, key, '#000000');
    }
  };

  const removeColorToken = (category: string, key: string) => {
    setLocalTokens(prev => {
      const prevColors = prev.colors ?? {};
      const newColors = { ...prevColors };
      if ((newColors as any)[category]) {
        delete (newColors as any)[category][key];
      }
      return { ...prev, colors: newColors };
    });
  };

  const updateTypographyToken = (category: string, key: string, value: string) => {
    setLocalTokens(prev => ({
      ...prev,
      typography: {
        ...(prev.typography || {}),
        [category]: {
          ...((prev.typography as any)?.[category] || {}),
          [key]: value
        }
      }
    }));
  };

  const updateSpacingToken = (key: string, value: string) => {
    setLocalTokens(prev => ({
      ...prev,
      spacing: {
        ...(prev.spacing || {}),
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
            Gerencie as variáveis globais de design (cores, tipografia, espaçamento)
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="colors" data-testid={`${testId}-tab-colors`}>
              <Palette className="h-4 w-4 mr-2" />
              Cores
            </TabsTrigger>
            <TabsTrigger value="typography" data-testid={`${testId}-tab-typography`}>
              <Type className="h-4 w-4 mr-2" />
              Tipografia
            </TabsTrigger>
            <TabsTrigger value="spacing" data-testid={`${testId}-tab-spacing`}>
              <RulerIcon className="h-4 w-4 mr-2" />
              Espaçamento
            </TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-4 mt-4">
            {(['primary', 'secondary', 'neutral'] as const).map(category => (
              <Card key={category}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold capitalize">{category}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addColorToken(category)}
                      className="h-7 gap-1"
                      data-testid={`${testId}-add-${category}-color`}
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </Button>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries((localTokens.colors as any)?.[category] || {}).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">{key}</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeColorToken(category, key)}
                            className="h-5 w-5 p-0"
                            data-testid={`${testId}-remove-${category}-${key}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={value as string}
                            onChange={(e) => updateColorToken(category, key, e.target.value)}
                            className="w-16 h-9 p-1 cursor-pointer"
                            data-testid={`${testId}-color-${category}-${key}`}
                          />
                          <Input
                            type="text"
                            value={value as string}
                            onChange={(e) => updateColorToken(category, key, e.target.value)}
                            className="flex-1 h-9 font-mono text-xs"
                            placeholder="#000000"
                            data-testid={`${testId}-color-input-${category}-${key}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardContent className="pt-6 space-y-3">
                <h3 className="text-sm font-semibold">Cores Semânticas</h3>
                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  {(['success', 'warning', 'error', 'info'] as const).map(key => (
                    <div key={key} className="space-y-2">
                      <Label className="text-xs capitalize">{key}</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={localTokens.colors?.semantic?.[key] || '#000000'}
                          onChange={(e) => {
                            setLocalTokens(prev => {
                              const prevColors = prev.colors ?? {};
                              return {
                                ...prev,
                                colors: {
                                  ...prevColors,
                                  semantic: {
                                    ...(prevColors.semantic || {}),
                                    [key]: e.target.value
                                  }
                                }
                              };
                            });
                          }}
                          className="w-16 h-9 p-1 cursor-pointer"
                          data-testid={`${testId}-semantic-${key}-color`}
                        />
                        <Input
                          type="text"
                          value={localTokens.colors?.semantic?.[key] || ''}
                          onChange={(e) => {
                            setLocalTokens(prev => {
                              const prevColors = prev.colors ?? {};
                              return {
                                ...prev,
                                colors: {
                                  ...prevColors,
                                  semantic: {
                                    ...(prevColors.semantic || {}),
                                    [key]: e.target.value
                                  }
                                }
                              };
                            });
                          }}
                          className="flex-1 h-9 font-mono text-xs"
                          placeholder="#000000"
                          data-testid={`${testId}-semantic-${key}-input`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="typography" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-6 space-y-3">
                <h3 className="text-sm font-semibold">Font Families</h3>
                <Separator />
                {(['primary', 'secondary', 'monospace'] as const).map(key => (
                  <div key={key} className="space-y-2">
                    <Label className="text-xs capitalize">{key}</Label>
                    <Input
                      type="text"
                      value={(localTokens.typography?.fontFamilies as any)?.[key] || ''}
                      onChange={(e) => updateTypographyToken('fontFamilies', key, e.target.value)}
                      placeholder="Inter, system-ui, sans-serif"
                      data-testid={`${testId}-font-family-${key}`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-3">
                <h3 className="text-sm font-semibold">Font Sizes</h3>
                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  {(['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'] as const).map(key => (
                    <div key={key} className="space-y-2">
                      <Label className="text-xs">{key}</Label>
                      <Input
                        type="text"
                        value={(localTokens.typography?.fontSizes as any)?.[key] || ''}
                        onChange={(e) => updateTypographyToken('fontSizes', key, e.target.value)}
                        placeholder="1rem"
                        data-testid={`${testId}-font-size-${key}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="spacing" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-6 space-y-3">
                <h3 className="text-sm font-semibold">Spacing Scale</h3>
                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  {(['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] as const).map(key => (
                    <div key={key} className="space-y-2">
                      <Label className="text-xs">{key}</Label>
                      <Input
                        type="text"
                        value={localTokens.spacing?.[key] || ''}
                        onChange={(e) => updateSpacingToken(key, e.target.value)}
                        placeholder="0.5rem"
                        data-testid={`${testId}-spacing-${key}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)} data-testid={`${testId}-cancel`}>
            Cancelar
          </Button>
          <Button onClick={handleSave} data-testid={`${testId}-save`}>
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
