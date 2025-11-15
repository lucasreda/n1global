import { useState } from 'react';
import { PageNodeV4, ResponsiveStylesV4 } from '@shared/schema';
import { FlexLayoutControls } from '../FlexLayoutControls';
import { GridLayoutControls } from '../GridLayoutControls';
import { PositionControls } from '../PositionControls';
import { FlexControlsAdvanced } from '../inspector/FlexControlsAdvanced';
import { GridTemplateEditor } from '../inspector/GridTemplateEditor';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { ChevronDown } from 'lucide-react';

interface LayoutControlsV4Props {
  node: PageNodeV4 | null;
  breakpoint: 'desktop' | 'tablet' | 'mobile';
  onUpdateNode: (updates: Partial<PageNodeV4>) => void;
}

export function LayoutControlsV4({ node, breakpoint, onUpdateNode }: LayoutControlsV4Props) {
  if (!node) return null;

  const [isFlexAdvancedOpen, setIsFlexAdvancedOpen] = useState(false);
  const [isGridAdvancedOpen, setIsGridAdvancedOpen] = useState(false);

  // Merge responsive styles with inline styles (inline has precedence)
  const currentStyles = {
    ...(node.styles?.[breakpoint] || {}),
    ...(node.inlineStyles || {}),
  };

  const handleStyleChange = (updates: Record<string, string>) => {
    const updatedStyles: ResponsiveStylesV4 = {
      desktop: { ...(node.styles?.desktop || {}) },
      tablet: { ...(node.styles?.tablet || {}) },
      mobile: { ...(node.styles?.mobile || {}) },
      [breakpoint]: {
        ...currentStyles,
        ...updates,
      },
    };

    onUpdateNode({
      styles: updatedStyles,
    });
  };

  const display = currentStyles.display || 'block';
  const isFlex = display === 'flex';
  const isGrid = display === 'grid';

  return (
    <div className="space-y-6">
      {/* Flex Controls */}
      <FlexLayoutControls
        display={display}
        flexDirection={currentStyles.flexDirection}
        justifyContent={currentStyles.justifyContent}
        alignItems={currentStyles.alignItems}
        gap={currentStyles.gap}
        flexWrap={currentStyles.flexWrap}
        onChange={handleStyleChange}
        data-testid="flex-controls-v4"
      />

      {/* Flex Advanced */}
      {isFlex && (
        <Collapsible open={isFlexAdvancedOpen} onOpenChange={setIsFlexAdvancedOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-accent/50 rounded-md px-2 transition-colors">
            <Label className="text-sm font-medium text-foreground cursor-pointer">Flex Advanced</Label>
            <ChevronDown className={`h-4 w-4 transition-transform ${isFlexAdvancedOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <FlexControlsAdvanced
              values={{
                flexDirection: currentStyles.flexDirection,
                flexWrap: currentStyles.flexWrap,
                justifyContent: currentStyles.justifyContent,
                alignItems: currentStyles.alignItems,
                alignContent: currentStyles.alignContent,
                gap: currentStyles.gap,
                flexGrow: currentStyles.flexGrow,
                flexShrink: currentStyles.flexShrink,
                flexBasis: currentStyles.flexBasis,
              }}
              onChange={handleStyleChange}
            />
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Grid Controls */}
      {!isFlex && (
        <GridLayoutControls
          display={display}
          gridTemplateColumns={currentStyles.gridTemplateColumns}
          gridTemplateRows={currentStyles.gridTemplateRows}
          gap={currentStyles.gap}
          gridAutoFlow={currentStyles.gridAutoFlow}
          gridAutoColumns={currentStyles.gridAutoColumns}
          gridAutoRows={currentStyles.gridAutoRows}
          onChange={handleStyleChange}
          data-testid="grid-controls-v4"
        />
      )}

      {/* Grid Advanced */}
      {isGrid && (
        <Collapsible open={isGridAdvancedOpen} onOpenChange={setIsGridAdvancedOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-accent/50 rounded-md px-2 transition-colors">
            <Label className="text-sm font-medium text-foreground cursor-pointer">Grid Advanced</Label>
            <ChevronDown className={`h-4 w-4 transition-transform ${isGridAdvancedOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <GridTemplateEditor
              values={{
                gridTemplateColumns: currentStyles.gridTemplateColumns,
                gridTemplateRows: currentStyles.gridTemplateRows,
                gridAutoFlow: currentStyles.gridAutoFlow,
                gridAutoColumns: currentStyles.gridAutoColumns,
                gridAutoRows: currentStyles.gridAutoRows,
                gap: currentStyles.gap,
                columnGap: currentStyles.columnGap,
                rowGap: currentStyles.rowGap,
              }}
              onChange={handleStyleChange}
            />
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Position Controls */}
      <PositionControls
        position={currentStyles.position}
        top={currentStyles.top}
        right={currentStyles.right}
        bottom={currentStyles.bottom}
        left={currentStyles.left}
        zIndex={currentStyles.zIndex}
        onChange={handleStyleChange}
        data-testid="position-controls-v4"
      />
    </div>
  );
}
