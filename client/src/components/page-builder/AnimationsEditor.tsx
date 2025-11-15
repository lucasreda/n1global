import { Plus, Trash2, Film, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { AnimationV3, AnimationKeyframeV3 } from '@shared/schema';
import { nanoid } from 'nanoid';

interface AnimationsEditorProps {
  animations: AnimationV3[];
  onChange: (animations: AnimationV3[]) => void;
}

const TIMING_FUNCTIONS = [
  'ease',
  'linear',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'cubic-bezier(0.4, 0, 0.2, 1)',
];

const DIRECTIONS = ['normal', 'reverse', 'alternate', 'alternate-reverse'] as const;
const FILL_MODES = ['none', 'forwards', 'backwards', 'both'] as const;

export function AnimationsEditor({ animations, onChange }: AnimationsEditorProps) {
  const addAnimation = () => {
    const newAnimation: AnimationV3 = {
      name: `animation-${Date.now()}`,
      duration: '1s',
      timingFunction: 'ease',
      keyframes: [
        { offset: 0, styles: {} },
        { offset: 100, styles: {} },
      ],
    };
    onChange([...animations, newAnimation]);
  };

  const updateAnimation = (index: number, updates: Partial<AnimationV3>) => {
    onChange(
      animations.map((anim, i) =>
        i === index ? { ...anim, ...updates } : anim
      )
    );
  };

  const removeAnimation = (index: number) => {
    onChange(animations.filter((_, i) => i !== index));
  };

  const addKeyframe = (animIndex: number) => {
    const animation = animations[animIndex];
    const newKeyframe: AnimationKeyframeV3 = {
      offset: 50,
      styles: {},
    };
    updateAnimation(animIndex, {
      keyframes: [...animation.keyframes, newKeyframe].sort((a, b) => a.offset - b.offset),
    });
  };

  const updateKeyframe = (
    animIndex: number,
    keyframeIndex: number,
    updates: Partial<AnimationKeyframeV3>
  ) => {
    const animation = animations[animIndex];
    const updatedKeyframes = animation.keyframes.map((kf, i) =>
      i === keyframeIndex ? { ...kf, ...updates } : kf
    );
    updateAnimation(animIndex, {
      keyframes: updatedKeyframes.sort((a, b) => a.offset - b.offset),
    });
  };

  const removeKeyframe = (animIndex: number, keyframeIndex: number) => {
    const animation = animations[animIndex];
    if (animation.keyframes.length <= 2) return;
    updateAnimation(animIndex, {
      keyframes: animation.keyframes.filter((_, i) => i !== keyframeIndex),
    });
  };

  const updateKeyframeStyle = (
    animIndex: number,
    keyframeIndex: number,
    property: string,
    value: string
  ) => {
    const animation = animations[animIndex];
    const keyframe = animation.keyframes[keyframeIndex];
    const newStyles = { ...keyframe.styles };
    
    if (value.trim()) {
      newStyles[property] = value;
    } else {
      delete newStyles[property];
    }
    
    updateKeyframe(animIndex, keyframeIndex, { styles: newStyles });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Animations</Label>
        <Button
          size="sm"
          variant="outline"
          onClick={addAnimation}
          data-testid="button-add-animation"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Animation
        </Button>
      </div>

      {animations.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg border-dashed">
          <Film className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p>No animations defined</p>
          <p className="text-xs mt-1">Add animations to bring your elements to life</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[400px] pr-2">
          <div className="space-y-3">
            {animations.map((animation, animIndex) => (
              <Card key={animIndex} className="border-muted">
                <CardHeader className="p-3 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{animation.name}</CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeAnimation(animIndex)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      data-testid={`button-remove-animation-${animIndex}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-2 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Duration</Label>
                      <Input
                        value={animation.duration || ''}
                        onChange={e => updateAnimation(animIndex, { duration: e.target.value })}
                        placeholder="1s"
                        className="h-7 text-xs"
                        data-testid={`input-duration-${animIndex}`}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Timing Function</Label>
                      <Select
                        value={animation.timingFunction || 'ease'}
                        onValueChange={value => updateAnimation(animIndex, { timingFunction: value })}
                      >
                        <SelectTrigger className="h-7 text-xs" data-testid={`select-timing-${animIndex}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMING_FUNCTIONS.map(tf => (
                            <SelectItem key={tf} value={tf}>
                              {tf}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Keyframes</Label>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => addKeyframe(animIndex)}
                        className="h-6 text-xs"
                        data-testid={`button-add-keyframe-${animIndex}`}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>

                    {animation.keyframes.map((keyframe, kfIndex) => (
                      <Card key={kfIndex} className="border-dashed bg-muted/30">
                        <CardContent className="p-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Percent className="w-3 h-3 opacity-50" />
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={keyframe.offset}
                                onChange={e => updateKeyframe(animIndex, kfIndex, { 
                                  offset: parseInt(e.target.value) || 0 
                                })}
                                className="h-6 w-16 text-xs"
                                data-testid={`input-offset-${animIndex}-${kfIndex}`}
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                            </div>
                            {animation.keyframes.length > 2 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeKeyframe(animIndex, kfIndex)}
                                className="h-5 w-5 p-0"
                                data-testid={`button-remove-keyframe-${animIndex}-${kfIndex}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs opacity-70">CSS Properties</Label>
                            {Object.entries(keyframe.styles).map(([prop, value]) => (
                              <div key={prop} className="flex gap-1">
                                <Input
                                  value={prop}
                                  placeholder="property"
                                  className="h-6 text-xs flex-1"
                                  readOnly
                                />
                                <Input
                                  value={value as string}
                                  onChange={e => updateKeyframeStyle(animIndex, kfIndex, prop, e.target.value)}
                                  placeholder="value"
                                  className="h-6 text-xs flex-1"
                                  data-testid={`input-kf-style-${animIndex}-${kfIndex}-${prop}`}
                                />
                              </div>
                            ))}
                            <Input
                              placeholder="Add CSS property (e.g., opacity: 0)"
                              className="h-6 text-xs"
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const value = (e.target as HTMLInputElement).value.trim();
                                  const [prop, val] = value.split(':').map(s => s.trim());
                                  if (prop && val) {
                                    updateKeyframeStyle(animIndex, kfIndex, prop, val);
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }
                              }}
                              data-testid={`input-add-style-${animIndex}-${kfIndex}`}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      <p className="text-xs text-muted-foreground">
        Create custom animations with keyframes. Press Enter to add CSS properties.
      </p>
    </div>
  );
}
