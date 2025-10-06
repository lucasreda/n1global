import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Monitor,
  Tablet,
  Smartphone
} from 'lucide-react';

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

interface BreakpointSelectorProps {
  activeBreakpoint: Breakpoint;
  onChange: (breakpoint: Breakpoint) => void;
  'data-testid'?: string;
}

const breakpointConfig = {
  desktop: {
    label: 'Desktop',
    icon: Monitor,
    width: '1440px',
    minWidth: 1024,
    description: '≥1024px'
  },
  tablet: {
    label: 'Tablet',
    icon: Tablet,
    width: '768px',
    minWidth: 768,
    description: '768px - 1023px'
  },
  mobile: {
    label: 'Mobile',
    icon: Smartphone,
    width: '375px',
    minWidth: 375,
    description: '<768px'
  }
} as const;

export function BreakpointSelector({
  activeBreakpoint,
  onChange,
  'data-testid': testId = 'breakpoint-selector'
}: BreakpointSelectorProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg" data-testid={testId}>
      <div className="flex items-center gap-1">
        {(Object.keys(breakpointConfig) as Breakpoint[]).map((bp) => {
          const config = breakpointConfig[bp];
          const Icon = config.icon;
          const isActive = activeBreakpoint === bp;

          return (
            <Button
              key={bp}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              className="flex items-center gap-1.5 h-8"
              onClick={() => onChange(bp)}
              data-testid={`${testId}-${bp}`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium">{config.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export { breakpointConfig };
