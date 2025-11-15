import { Plus, Trash2, Settings } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ComponentProp, ComponentPropType } from '@shared/schema';
import { nanoid } from 'nanoid';

interface ComponentPropsEditorProps {
  props: ComponentProp[];
  onChange: (props: ComponentProp[]) => void;
}

const PROP_TYPES: { value: ComponentPropType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'select', label: 'Select' },
  { value: 'color', label: 'Color' },
  { value: 'image', label: 'Image' },
];

export function ComponentPropsEditor({ props, onChange }: ComponentPropsEditorProps) {
  const addProp = () => {
    const newProp: ComponentProp = {
      id: nanoid(),
      name: 'New Property',
      key: 'newProperty',
      type: 'text',
      defaultValue: '',
    };
    onChange([...props, newProp]);
  };

  const updateProp = (id: string, updates: Partial<ComponentProp>) => {
    onChange(
      props.map(prop =>
        prop.id === id ? { ...prop, ...updates } : prop
      )
    );
  };

  const removeProp = (id: string) => {
    onChange(props.filter(prop => prop.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Component Props</Label>
        <Button
          size="sm"
          variant="outline"
          onClick={addProp}
          data-testid="button-add-prop"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Prop
        </Button>
      </div>

      {props.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg border-dashed">
          <Settings className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p>No properties defined</p>
          <p className="text-xs mt-1">Add props to make this component customizable</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[300px] pr-2">
          <div className="space-y-2">
            {props.map(prop => (
              <Card key={prop.id} className="border-muted">
                <CardContent className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor={`prop-name-${prop.id}`} className="text-xs">
                        Display Name
                      </Label>
                      <Input
                        id={`prop-name-${prop.id}`}
                        value={prop.name}
                        onChange={e => updateProp(prop.id, { name: e.target.value })}
                        placeholder="Button Text"
                        className="h-8 text-xs"
                        data-testid={`input-prop-name-${prop.id}`}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`prop-key-${prop.id}`} className="text-xs">
                        Property Key
                      </Label>
                      <Input
                        id={`prop-key-${prop.id}`}
                        value={prop.key}
                        onChange={e => updateProp(prop.id, { key: e.target.value })}
                        placeholder="buttonText"
                        className="h-8 text-xs"
                        data-testid={`input-prop-key-${prop.id}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor={`prop-type-${prop.id}`} className="text-xs">
                        Type
                      </Label>
                      <Select
                        value={prop.type}
                        onValueChange={(value: ComponentPropType) => 
                          updateProp(prop.id, { type: value })
                        }
                      >
                        <SelectTrigger 
                          id={`prop-type-${prop.id}`} 
                          className="h-8 text-xs"
                          data-testid={`select-prop-type-${prop.id}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROP_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`prop-default-${prop.id}`} className="text-xs">
                        Default Value
                      </Label>
                      {prop.type === 'boolean' ? (
                        <Select
                          value={String(prop.defaultValue)}
                          onValueChange={value => 
                            updateProp(prop.id, { defaultValue: value === 'true' })
                          }
                        >
                          <SelectTrigger 
                            id={`prop-default-${prop.id}`} 
                            className="h-8 text-xs"
                            data-testid={`select-prop-default-${prop.id}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">True</SelectItem>
                            <SelectItem value="false">False</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : prop.type === 'number' ? (
                        <Input
                          id={`prop-default-${prop.id}`}
                          type="number"
                          value={prop.defaultValue}
                          onChange={e => updateProp(prop.id, { 
                            defaultValue: parseFloat(e.target.value) || 0 
                          })}
                          className="h-8 text-xs"
                          data-testid={`input-prop-default-${prop.id}`}
                        />
                      ) : (
                        <Input
                          id={`prop-default-${prop.id}`}
                          value={prop.defaultValue}
                          onChange={e => updateProp(prop.id, { defaultValue: e.target.value })}
                          className="h-8 text-xs"
                          data-testid={`input-prop-default-${prop.id}`}
                        />
                      )}
                    </div>
                  </div>

                  {prop.type === 'select' && (
                    <div className="space-y-1">
                      <Label htmlFor={`prop-options-${prop.id}`} className="text-xs">
                        Options (comma-separated)
                      </Label>
                      <Input
                        id={`prop-options-${prop.id}`}
                        value={prop.options?.join(', ') || ''}
                        onChange={e => updateProp(prop.id, { 
                          options: e.target.value.split(',').map(o => o.trim()).filter(Boolean)
                        })}
                        placeholder="Option 1, Option 2, Option 3"
                        className="h-8 text-xs"
                        data-testid={`input-prop-options-${prop.id}`}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-muted">
                    <p className="text-xs text-muted-foreground">
                      {prop.bindTo ? (
                        <span className="text-primary">
                          Bound to: {prop.bindTo.elementId.slice(0, 8)}...
                        </span>
                      ) : (
                        'No binding configured'
                      )}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeProp(prop.id)}
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      data-testid={`button-remove-prop-${prop.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
