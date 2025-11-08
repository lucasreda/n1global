import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Monitor,
  Tablet,
  Smartphone,
  ZoomIn,
  ZoomOut,
  Focus,
  ChevronDown,
  Grid3x3,
  Magnet
} from 'lucide-react';

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

interface BreakpointSelectorProps {
  activeBreakpoint: Breakpoint;
  onChange: (breakpoint: Breakpoint) => void;
  'data-testid'?: string;
  zoomLevel?: number;
  onZoomChange?: (zoom: number) => void;
  showGrid?: boolean;
  onGridToggle?: (show: boolean) => void;
  snapToGrid?: boolean;
  onSnapToggle?: (snap: boolean) => void;
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

const zoomPresets = [25, 50, 75, 100, 125, 150, 200];

export function BreakpointSelector({
  activeBreakpoint,
  onChange,
  'data-testid': testId = 'breakpoint-selector',
  zoomLevel = 100,
  onZoomChange,
  showGrid = false,
  onGridToggle,
  snapToGrid = false,
  onSnapToggle
}: BreakpointSelectorProps) {
  const [internalZoom, setInternalZoom] = useState(100);
  const [internalShowGrid, setInternalShowGrid] = useState(false);
  const [internalSnapToGrid, setInternalSnapToGrid] = useState(false);
  const activeZoom = onZoomChange ? zoomLevel : internalZoom;
  const activeShowGrid = onGridToggle ? showGrid : internalShowGrid;
  const activeSnapToGrid = onSnapToggle ? snapToGrid : internalSnapToGrid;
  
  const handleZoomChange = (newZoom: number) => {
    if (onZoomChange) {
      onZoomChange(newZoom);
    } else {
      setInternalZoom(newZoom);
    }
  };

  const currentConfig = breakpointConfig[activeBreakpoint];

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg" data-testid={testId}>
      {/* Device Presets */}
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
              <span className={`text-xs font-medium ${isActive ? 'text-primary-foreground' : 'text-foreground dark:text-gray-200'}`}>{config.label}</span>
            </Button>
          );
        })}
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => handleZoomChange(Math.max(25, activeZoom - 25))}
          disabled={activeZoom <= 25}
          title="Diminuir zoom"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1"
              title="Alterar zoom"
            >
              <Focus className="h-4 w-4" />
              <span className="text-xs font-medium w-10 text-center">{activeZoom}%</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {zoomPresets.map((preset) => (
              <DropdownMenuItem
                key={preset}
                onClick={() => handleZoomChange(preset)}
                className={activeZoom === preset ? 'bg-accent' : ''}
              >
                {preset}%
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => handleZoomChange(Math.min(200, activeZoom + 25))}
          disabled={activeZoom >= 200}
          title="Aumentar zoom"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {/* Current Viewport Info */}
      <div className="flex items-center gap-2 ml-2 px-2 py-1 bg-background rounded border border-border">
        <span className="text-xs text-muted-foreground">{currentConfig.width}</span>
      </div>

      {/* Grid Toggle */}
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        variant={activeShowGrid ? "default" : "ghost"}
        size="sm"
        className="h-8 px-2"
        onClick={() => {
          if (onGridToggle) {
            onGridToggle(!activeShowGrid);
          } else {
            setInternalShowGrid(!activeShowGrid);
          }
        }}
        title="Mostrar/Ocultar Grid"
      >
        <Grid3x3 className="h-4 w-4" />
      </Button>

      {/* Snap to Grid Toggle */}
      {activeShowGrid && (
        <>
          <div className="w-px h-6 bg-border mx-1" />
          <Button
            variant={activeSnapToGrid ? "default" : "ghost"}
            size="sm"
            className="h-8 px-2"
            onClick={() => {
              if (onSnapToggle) {
                onSnapToggle(!activeSnapToGrid);
              } else {
                setInternalSnapToGrid(!activeSnapToGrid);
              }
            }}
            title="Snap to Grid"
          >
            <Magnet className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}

export { breakpointConfig };
