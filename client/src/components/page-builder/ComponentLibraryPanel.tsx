import { Plus, Trash2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import type { ComponentDefinitionV3, BlockElementV3, ComponentProp, ComponentSlot } from '@shared/schema';
import { ComponentPropsEditor } from './ComponentPropsEditor';
import { ComponentSlotsEditor } from './ComponentSlotsEditor';

interface ComponentLibraryPanelProps {
  components: ComponentDefinitionV3[];
  selectedElement: BlockElementV3 | null;
  onSaveComponent: (name: string, category: string) => void;
  onDeleteComponent: (componentId: string) => void;
  onInsertComponent: (component: ComponentDefinitionV3) => void;
}

const COMPONENT_CATEGORIES = [
  'Headers',
  'Footers',
  'Hero Sections',
  'Features',
  'CTAs',
  'Forms',
  'Cards',
  'Navigation',
  'Other',
] as const;

export function ComponentLibraryPanel({
  components,
  selectedElement,
  onSaveComponent,
  onDeleteComponent,
  onInsertComponent,
}: ComponentLibraryPanelProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [componentName, setComponentName] = useState('');
  const [componentCategory, setComponentCategory] = useState<string>('Other');
  const [componentProps, setComponentProps] = useState<ComponentProp[]>([]);
  const [componentSlots, setComponentSlots] = useState<ComponentSlot[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const handleSave = () => {
    if (componentName.trim() && selectedElement) {
      onSaveComponent(componentName.trim(), componentCategory);
      setComponentName('');
      setComponentCategory('Other');
      setComponentProps([]);
      setComponentSlots([]);
      setSaveDialogOpen(false);
    }
  };

  const filteredComponents = filterCategory === 'all'
    ? components
    : components.filter(c => c.category === filterCategory);

  const groupedComponents = filteredComponents.reduce((acc, component) => {
    const category = component.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(component);
    return acc;
  }, {} as Record<string, ComponentDefinitionV3[]>);

  return (
    <div className="flex flex-col h-full bg-background border-l">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Component Library</h3>
          <Button
            size="sm"
            onClick={() => setSaveDialogOpen(true)}
            disabled={!selectedElement}
            data-testid="button-save-component"
          >
            <Plus className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full" data-testid="select-filter-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {COMPONENT_CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {components.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No saved components</p>
              <p className="text-xs mt-1">Select an element and click Save to create one</p>
            </div>
          ) : (
            Object.entries(groupedComponents).map(([category, comps]) => (
              <div key={category} className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {category}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {comps.map(component => (
                    <Card
                      key={component.id}
                      className="cursor-pointer hover:border-primary transition-colors group"
                      onClick={() => onInsertComponent(component)}
                      data-testid={`component-card-${component.id}`}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="aspect-video bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                          {component.thumbnail ? (
                            <img
                              src={component.thumbnail}
                              alt={component.name}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <span>{component.element.type}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium truncate flex-1">
                            {component.name}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteComponent(component.id);
                            }}
                            data-testid={`button-delete-component-${component.id}`}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]" data-testid="dialog-save-component">
          <DialogHeader>
            <DialogTitle>Save as Component</DialogTitle>
            <DialogDescription>
              Save the selected element as a reusable component with customizable properties.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="py-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="props">Props</TabsTrigger>
              <TabsTrigger value="slots">Slots</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="component-name">Component Name</Label>
                <Input
                  id="component-name"
                  placeholder="My Component"
                  value={componentName}
                  onChange={(e) => setComponentName(e.target.value)}
                  data-testid="input-component-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="component-category">Category</Label>
                <Select value={componentCategory} onValueChange={setComponentCategory}>
                  <SelectTrigger id="component-category" data-testid="select-component-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPONENT_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="props" className="pt-4">
              <ComponentPropsEditor
                props={componentProps}
                onChange={setComponentProps}
              />
            </TabsContent>

            <TabsContent value="slots" className="pt-4">
              <ComponentSlotsEditor
                slots={componentSlots}
                onChange={setComponentSlots}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              data-testid="button-cancel-save"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!componentName.trim()}
              data-testid="button-confirm-save"
            >
              Save Component
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
