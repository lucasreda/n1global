import { PageNodeV4, ResponsiveStylesV4 } from '@shared/schema';
import { FlexLayoutControls } from '../FlexLayoutControls';
import { GridLayoutControls } from '../GridLayoutControls';
import { PositionControls } from '../PositionControls';

interface LayoutControlsV4Props {
  node: PageNodeV4 | null;
  breakpoint: 'desktop' | 'tablet' | 'mobile';
  onUpdateNode: (updates: Partial<PageNodeV4>) => void;
}

export function LayoutControlsV4({ node, breakpoint, onUpdateNode }: LayoutControlsV4Props) {
  if (!node) return null;

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
