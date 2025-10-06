import { PageNodeV4 } from '@shared/schema';
import { AnimationsEditor } from '../AnimationsEditor';
import { CustomCSSEditor } from '../CustomCSSEditor';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useState } from 'react';

interface AdvancedControlsV4Props {
  node: PageNodeV4 | null;
  onUpdateNode: (updates: Partial<PageNodeV4>) => void;
}

export function AdvancedControlsV4({ node, onUpdateNode }: AdvancedControlsV4Props) {
  if (!node) return null;

  return (
    <div className="space-y-6">
      {/* Animations */}
      <AnimationsEditor
        animations={node.animations || []}
        onChange={(animations) => onUpdateNode({ animations })}
      />

      {/* Custom CSS */}
      <CustomCSSEditor
        css={node.customCSS || ''}
        onChange={(css) => onUpdateNode({ customCSS: css })}
      />
    </div>
  );
}

interface PseudoClassEditorV4Props {
  node: PageNodeV4 | null;
  breakpoint: 'desktop' | 'tablet' | 'mobile';
  onUpdateNode: (updates: Partial<PageNodeV4>) => void;
}

type PseudoClass = 'default' | 'hover' | 'focus' | 'active';

export function PseudoClassEditorV4({ node, breakpoint, onUpdateNode }: PseudoClassEditorV4Props) {
  const [activeState, setActiveState] = useState<PseudoClass>('default');

  if (!node) return null;

  const currentStateStyles = node.states?.[activeState]?.[breakpoint] || {};

  const handleStateStyleChange = (updates: Record<string, string>) => {
    const updatedStates = {
      ...node.states,
      [activeState]: {
        ...node.states?.[activeState],
        [breakpoint]: {
          ...currentStateStyles,
          ...updates,
        },
      },
    };

    onUpdateNode({ states: updatedStates });
  };

  const pseudoClassOptions: { value: PseudoClass; label: string; desc: string }[] = [
    { value: 'default', label: 'Default', desc: 'Normal state' },
    { value: 'hover', label: 'Hover', desc: 'Mouse over' },
    { value: 'focus', label: 'Focus', desc: 'Keyboard/input focus' },
    { value: 'active', label: 'Active', desc: 'Being clicked' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-2 block">Element State</Label>
        <div className="grid grid-cols-2 gap-2">
          {pseudoClassOptions.map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => setActiveState(value)}
              className={`px-3 py-2 text-left rounded-lg border transition-colors ${
                activeState === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted border-input'
              }`}
              data-testid={`pseudo-class-${value}`}
            >
              <div className="text-sm font-medium">{label}</div>
              <div className="text-xs opacity-70">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {activeState !== 'default' && (
        <div className="bg-muted/50 rounded-lg p-3 space-y-3">
          <div className="text-xs text-muted-foreground">
            Define styles for <span className="font-semibold">:{activeState}</span> state
          </div>

          {/* Common interactive properties */}
          <div className="space-y-2">
            <Label className="text-xs">Background Color</Label>
            <input
              type="color"
              value={currentStateStyles.backgroundColor || '#ffffff'}
              onChange={(e) => handleStateStyleChange({ backgroundColor: e.target.value })}
              className="w-full h-8 rounded border cursor-pointer"
              data-testid={`state-bg-color-${activeState}`}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Text Color</Label>
            <input
              type="color"
              value={currentStateStyles.color || '#000000'}
              onChange={(e) => handleStateStyleChange({ color: e.target.value })}
              className="w-full h-8 rounded border cursor-pointer"
              data-testid={`state-text-color-${activeState}`}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Transform</Label>
            <input
              type="text"
              value={currentStateStyles.transform || ''}
              onChange={(e) => handleStateStyleChange({ transform: e.target.value })}
              placeholder="scale(1.1) or translateY(-2px)"
              className="w-full h-8 px-2 text-xs rounded border"
              data-testid={`state-transform-${activeState}`}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Transition</Label>
            <input
              type="text"
              value={currentStateStyles.transition || ''}
              onChange={(e) => handleStateStyleChange({ transition: e.target.value })}
              placeholder="all 0.3s ease"
              className="w-full h-8 px-2 text-xs rounded border"
              data-testid={`state-transition-${activeState}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
