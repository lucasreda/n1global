import { useState } from 'react';
import { PageNodeV4 } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, Tablet, Smartphone } from 'lucide-react';

interface PropertiesPanelV4Props {
  node: PageNodeV4 | null;
  onUpdateNode?: (updates: Partial<PageNodeV4>) => void;
}

export function PropertiesPanelV4({ node, onUpdateNode }: PropertiesPanelV4Props) {
  const [breakpoint, setBreakpoint] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  if (!node) {
    return (
      <div className="p-4">
        <div className="text-sm text-muted-foreground text-center py-8">
          Selecione um elemento para editar suas propriedades
        </div>
      </div>
    );
  }

  const handleTextContentChange = (value: string) => {
    if (onUpdateNode) {
      onUpdateNode({ textContent: value });
    }
  };

  const handleAttributeChange = (key: string, value: string) => {
    if (onUpdateNode) {
      const newAttributes = { ...node.attributes, [key]: value };
      onUpdateNode({ attributes: newAttributes });
    }
  };

  const handleStyleChange = (styleKey: string, styleValue: string) => {
    if (onUpdateNode) {
      const currentStyles = node.styles?.[breakpoint] || {};
      const newStyles = {
        ...node.styles,
        [breakpoint]: {
          ...currentStyles,
          [styleKey]: styleValue,
        },
      };
      onUpdateNode({ styles: newStyles });
    }
  };

  return (
    <div className="properties-panel-v4 p-4 space-y-6 overflow-auto">
      <div>
        <h3 className="font-semibold mb-4">Propriedades</h3>
      </div>

      {/* Breakpoint Selector */}
      <div className="space-y-2">
        <Label className="text-xs uppercase text-muted-foreground">Breakpoint</Label>
        <div className="flex gap-1">
          <Button
            variant={breakpoint === 'desktop' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBreakpoint('desktop')}
            className="flex-1"
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant={breakpoint === 'tablet' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBreakpoint('tablet')}
            className="flex-1"
          >
            <Tablet className="h-4 w-4" />
          </Button>
          <Button
            variant={breakpoint === 'mobile' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBreakpoint('mobile')}
            className="flex-1"
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tag HTML */}
      <div className="space-y-2">
        <Label className="text-xs uppercase text-muted-foreground">Tag HTML</Label>
        <div className="text-sm font-mono bg-accent/50 px-3 py-2 rounded">
          &lt;{node.tag}&gt;
        </div>
      </div>

      {/* ID */}
      <div className="space-y-2">
        <Label className="text-xs uppercase text-muted-foreground">ID do Elemento</Label>
        <div className="text-xs font-mono text-muted-foreground">
          {node.id}
        </div>
      </div>

      {/* Text Content Editor */}
      {node.textContent !== undefined && (
        <div className="space-y-2">
          <Label htmlFor="text-content">Conteúdo de Texto</Label>
          <Textarea
            id="text-content"
            value={node.textContent}
            onChange={(e) => handleTextContentChange(e.target.value)}
            placeholder="Digite o conteúdo do texto..."
            rows={3}
          />
        </div>
      )}

      {/* Attributes Editor */}
      <div className="space-y-2">
        <Label className="text-xs uppercase text-muted-foreground">Atributos HTML</Label>
        {node.attributes && Object.keys(node.attributes).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(node.attributes).map(([key, value]) => (
              <div key={key} className="flex gap-2 items-center">
                <Input
                  value={key}
                  disabled
                  className="w-24 text-xs"
                />
                <Input
                  value={value}
                  onChange={(e) => handleAttributeChange(key, e.target.value)}
                  placeholder="Valor"
                  className="flex-1 text-xs"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic">
            Nenhum atributo definido
          </div>
        )}
      </div>

      {/* Styles Editor */}
      <div className="space-y-2">
        <Label className="text-xs uppercase text-muted-foreground">
          Estilos ({breakpoint})
        </Label>
        {node.styles?.[breakpoint] && Object.keys(node.styles[breakpoint]).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(node.styles[breakpoint]).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`style-${key}`} className="text-xs">
                  {key}
                </Label>
                <Input
                  id={`style-${key}`}
                  value={value as string}
                  onChange={(e) => handleStyleChange(key, e.target.value)}
                  placeholder="Valor do estilo"
                  className="text-xs font-mono"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic">
            Nenhum estilo definido para {breakpoint}
          </div>
        )}
      </div>

      {/* Classes CSS */}
      {node.classNames && node.classNames.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Classes CSS</Label>
          <div className="flex flex-wrap gap-1">
            {node.classNames.map((className, index) => (
              <span
                key={index}
                className="text-xs bg-accent px-2 py-1 rounded font-mono"
              >
                {className}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
