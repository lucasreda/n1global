import { Plus, Trash2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ComponentSlot } from '@shared/schema';
import { nanoid } from 'nanoid';

interface ComponentSlotsEditorProps {
  slots: ComponentSlot[];
  onChange: (slots: ComponentSlot[]) => void;
}

export function ComponentSlotsEditor({ slots, onChange }: ComponentSlotsEditorProps) {
  const addSlot = () => {
    const newSlot: ComponentSlot = {
      id: nanoid(),
      name: 'New Slot',
      slotName: 'newSlot',
      description: '',
      defaultContent: [],
    };
    onChange([...slots, newSlot]);
  };

  const updateSlot = (id: string, updates: Partial<ComponentSlot>) => {
    onChange(
      slots.map(slot =>
        slot.id === id ? { ...slot, ...updates } : slot
      )
    );
  };

  const removeSlot = (id: string) => {
    onChange(slots.filter(slot => slot.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Component Slots</Label>
        <Button
          size="sm"
          variant="outline"
          onClick={addSlot}
          data-testid="button-add-slot"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Slot
        </Button>
      </div>

      {slots.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg border-dashed">
          <Layers className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p>No slots defined</p>
          <p className="text-xs mt-1">Add slots to allow nested content</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[300px] pr-2">
          <div className="space-y-2">
            {slots.map(slot => (
              <Card key={slot.id} className="border-muted">
                <CardContent className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor={`slot-name-${slot.id}`} className="text-xs">
                        Display Name
                      </Label>
                      <Input
                        id={`slot-name-${slot.id}`}
                        value={slot.name}
                        onChange={e => updateSlot(slot.id, { name: e.target.value })}
                        placeholder="Header"
                        className="h-8 text-xs"
                        data-testid={`input-slot-name-${slot.id}`}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`slot-key-${slot.id}`} className="text-xs">
                        Slot Key
                      </Label>
                      <Input
                        id={`slot-key-${slot.id}`}
                        value={slot.slotName}
                        onChange={e => updateSlot(slot.id, { slotName: e.target.value })}
                        placeholder="header"
                        className="h-8 text-xs"
                        data-testid={`input-slot-key-${slot.id}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`slot-desc-${slot.id}`} className="text-xs">
                      Description (Optional)
                    </Label>
                    <Textarea
                      id={`slot-desc-${slot.id}`}
                      value={slot.description || ''}
                      onChange={e => updateSlot(slot.id, { description: e.target.value })}
                      placeholder="Describe what content goes here..."
                      className="h-16 text-xs resize-none"
                      data-testid={`input-slot-desc-${slot.id}`}
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeSlot(slot.id)}
                      className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      data-testid={`button-remove-slot-${slot.id}`}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      <p className="text-xs text-muted-foreground">
        Slots are placeholders for nested content that can be customized in each instance.
      </p>
    </div>
  );
}
