import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface TransitionBuilderProps {
  value: string;
  onChange: (value: string) => void;
}

interface Transition {
  property: string;
  duration: string;
  timingFunction: string;
  delay: string;
}

const timingFunctions = [
  { value: 'ease', label: 'Ease' },
  { value: 'linear', label: 'Linear' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In-Out' },
  { value: 'cubic-bezier(0.4, 0, 0.2, 1)', label: 'Custom Cubic' },
];

const commonProperties = [
  { value: 'all', label: 'All Properties' },
  { value: 'opacity', label: 'Opacity' },
  { value: 'transform', label: 'Transform' },
  { value: 'background-color', label: 'Background' },
  { value: 'color', label: 'Color' },
  { value: 'border-color', label: 'Border Color' },
  { value: 'box-shadow', label: 'Shadow' },
  { value: 'width', label: 'Width' },
  { value: 'height', label: 'Height' },
];

function parseTransitions(cssValue: string): Transition[] {
  if (!cssValue || cssValue === 'none' || cssValue.trim() === '') {
    return [{ property: 'all', duration: '0.3s', timingFunction: 'ease', delay: '0s' }];
  }

  const transitionParts = cssValue.split(',').map(t => t.trim());
  return transitionParts.map(part => {
    // Parse robustly: handle cubic-bezier() and other parenthesized functions
    const tokens: string[] = [];
    let current = '';
    let depth = 0;
    
    for (let i = 0; i < part.length; i++) {
      const char = part[i];
      if (char === '(') depth++;
      if (char === ')') depth--;
      
      if (char === ' ' && depth === 0) {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }
      } else {
        current += char;
      }
    }
    if (current.trim()) tokens.push(current.trim());

    // Identify tokens: check if first token is time value or property
    let property = 'all';
    let duration = '0.3s';
    let timingFunction = 'ease';
    let delay = '0s';
    
    let timeValuesSeen = 0;
    
    // Check if first token is a time value (duration) or property
    if (tokens.length > 0) {
      const firstToken = tokens[0];
      if (/^[0-9.]+m?s$/.test(firstToken)) {
        // First token is duration, property defaults to 'all'
        property = 'all';
        duration = firstToken;
        timeValuesSeen = 1;
      } else {
        // First token is property
        property = firstToken;
      }
    }

    // Process remaining tokens (skip first which we already processed)
    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.includes('(')) {
        // Function like cubic-bezier() - timing function
        timingFunction = token;
      } else if (/^[0-9.]+m?s$/.test(token)) {
        // Time value - assign based on how many we've seen
        if (timeValuesSeen === 0) {
          // First time value is duration
          duration = token;
          timeValuesSeen = 1;
        } else {
          // Second time value is delay
          delay = token;
          timeValuesSeen = 2;
        }
      } else {
        // Named timing function
        timingFunction = token;
      }
    }

    return { property, duration, timingFunction, delay };
  });
}

function serializeTransitions(transitions: Transition[]): string {
  return transitions
    .map(t => `${t.property} ${t.duration} ${t.timingFunction} ${t.delay}`.trim())
    .join(', ');
}

export function TransitionBuilder({ value, onChange }: TransitionBuilderProps) {
  const [transitions, setTransitions] = useState<Transition[]>(parseTransitions(value));

  useEffect(() => {
    setTransitions(parseTransitions(value));
  }, [value]);

  const handleTransitionChange = (index: number, field: keyof Transition, newValue: string) => {
    const updated = [...transitions];
    updated[index] = { ...updated[index], [field]: newValue };
    setTransitions(updated);
    onChange(serializeTransitions(updated));
  };

  const addTransition = () => {
    const updated = [...transitions, { property: 'all', duration: '0.3s', timingFunction: 'ease', delay: '0s' }];
    setTransitions(updated);
    onChange(serializeTransitions(updated));
  };

  const removeTransition = (index: number) => {
    const updated = transitions.filter((_, i) => i !== index);
    setTransitions(updated);
    onChange(serializeTransitions(updated));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-foreground">Transitions</Label>
        <Button
          size="sm"
          variant="outline"
          onClick={addTransition}
          className="h-7 px-2"
          data-testid="add-transition"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      {transitions.map((transition, index) => (
        <div key={index} className="border border-border rounded-lg p-3 space-y-3 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Transition {index + 1}</span>
            {transitions.length > 1 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeTransition(index)}
                className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                data-testid={`remove-transition-${index}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Property</Label>
              <Select
                value={transition.property}
                onValueChange={(v) => handleTransitionChange(index, 'property', v)}
              >
                <SelectTrigger className="h-8 text-xs" data-testid={`transition-property-${index}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {commonProperties.map((prop) => (
                    <SelectItem key={prop.value} value={prop.value} className="text-xs">
                      {prop.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Duration</Label>
              <Input
                value={transition.duration}
                onChange={(e) => handleTransitionChange(index, 'duration', e.target.value)}
                placeholder="0.3s"
                className="h-8 text-xs"
                data-testid={`transition-duration-${index}`}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Timing</Label>
              <Select
                value={transition.timingFunction}
                onValueChange={(v) => handleTransitionChange(index, 'timingFunction', v)}
              >
                <SelectTrigger className="h-8 text-xs" data-testid={`transition-timing-${index}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timingFunctions.map((fn) => (
                    <SelectItem key={fn.value} value={fn.value} className="text-xs">
                      {fn.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Delay</Label>
              <Input
                value={transition.delay}
                onChange={(e) => handleTransitionChange(index, 'delay', e.target.value)}
                placeholder="0s"
                className="h-8 text-xs"
                data-testid={`transition-delay-${index}`}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
