import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RotateCcw, AlertCircle } from 'lucide-react';
import { isPropertyOverridden, resetOverride } from '@/lib/componentInstance';
import { PageNodeV4 } from '@shared/schema';

interface OverrideIndicatorProps {
  node: PageNodeV4 | null;
  property: 'styles' | 'attributes' | 'textContent' | 'responsiveAttributes' | 'inlineStyles';
  breakpoint?: 'desktop' | 'tablet' | 'mobile';
  styleKey?: string;
  onReset: () => void;
}

export function OverrideIndicator({
  node,
  property,
  breakpoint,
  styleKey,
  onReset,
}: OverrideIndicatorProps) {
  if (!node) return null;

  const isOverridden = isPropertyOverridden(node, property, breakpoint, styleKey);

  if (!isOverridden) return null;

  return (
    <div className="flex items-center gap-1.5 ml-2">
      <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
        <AlertCircle className="h-2.5 w-2.5 mr-1" />
        Override
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-blue-500/10"
        onClick={onReset}
        title="Resetar para padrão do componente"
        data-testid={`reset-override-${property}-${styleKey || ''}`}
      >
        <RotateCcw className="h-3 w-3" />
      </Button>
    </div>
  );
}



