import { Plus, Trash2, FolderOpen, Download, Upload } from 'lucide-react';
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
import { useState } from 'react';
import { PageNodeV4 } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { nanoid } from 'nanoid';

interface SavedComponentV4 {
  id: string;
  name: string;
  category: string;
  createdAt: string;
  node: PageNodeV4;
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

interface ComponentLibraryV4Props {
  components: SavedComponentV4[];
  selectedNode: PageNodeV4 | null;
  onSaveComponent: (component: SavedComponentV4) => void;
  onDeleteComponent: (componentId: string) => void;
  onInsertComponent: (node: PageNodeV4) => void;
}

export function ComponentLibraryV4({
  components,
  selectedNode,
  onSaveComponent,
  onDeleteComponent,
  onInsertComponent,
}: ComponentLibraryV4Props) {
  const { toast } = useToast();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [componentName, setComponentName] = useState('');
  const [componentCategory, setComponentCategory] = useState<string>('Other');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const handleSave = () => {
    if (componentName.trim() && selectedNode) {
      const newComponent: SavedComponentV4 = {
        id: nanoid(),
        name: componentName.trim(),
        category: componentCategory,
        createdAt: new Date().toISOString(),
        node: selectedNode,
      };
      
      onSaveComponent(newComponent);
      setComponentName('');
      setComponentCategory('Other');
      setSaveDialogOpen(false);
      
      toast({
        title: 'Component saved',
        description: `"${componentName}" has been added to your library`,
      });
    }
  };

  const handleInsert = (component: SavedComponentV4) => {
    // Generate new ID for inserted component to avoid conflicts
    const nodeWithNewId: PageNodeV4 = {
      ...component.node,
      id: nanoid(),
    };
    onInsertComponent(nodeWithNewId);
    
    toast({
      title: 'Component inserted',
      description: `"${component.name}" has been added to your page`,
    });
  };

  const handleExport = () => {
    if (components.length === 0) {
      toast({
        title: 'No components to export',
        description: 'Save some components first before exporting.',
        variant: 'destructive',
      });
      return;
    }
    
    const dataStr = JSON.stringify(components, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `components-v4-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Export successful',
      description: `Exported ${components.length} component${components.length !== 1 ? 's' : ''}`,
    });
  };

  const filteredComponents = filterCategory === 'all'
    ? components
    : components.filter(c => c.category === filterCategory);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Component Library</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={components.length === 0}
            data-testid="button-export-components-v4"
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSaveDialogOpen(true)}
            disabled={!selectedNode}
            data-testid="button-save-component-v4"
          >
            <Plus className="w-4 h-4 mr-1" />
            Save Component
          </Button>
        </div>
      </div>

      <Select value={filterCategory} onValueChange={setFilterCategory}>
        <SelectTrigger data-testid="select-component-category-v4">
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

      <ScrollArea className="h-[400px]">
        {filteredComponents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No components saved yet</p>
            <p className="text-xs mt-1">Select an element and save it as a component</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredComponents.map(component => (
              <Card
                key={component.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleInsert(component)}
                data-testid={`component-card-v4-${component.id}`}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{component.name}</h4>
                    <p className="text-xs text-muted-foreground">{component.category}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteComponent(component.id);
                      toast({
                        title: 'Component deleted',
                        description: `"${component.name}" has been removed`,
                      });
                    }}
                    className="h-8 w-8 p-0 text-destructive"
                    data-testid={`button-delete-component-v4-${component.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Save Component Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent data-testid="dialog-save-component-v4">
          <DialogHeader>
            <DialogTitle>Save Component</DialogTitle>
            <DialogDescription>
              Save the selected element as a reusable component
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="component-name">Component Name</Label>
              <Input
                id="component-name"
                value={componentName}
                onChange={(e) => setComponentName(e.target.value)}
                placeholder="e.g., Hero Section"
                data-testid="input-component-name-v4"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="component-category">Category</Label>
              <Select value={componentCategory} onValueChange={setComponentCategory}>
                <SelectTrigger id="component-category" data-testid="select-category-v4">
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!componentName.trim()} data-testid="button-confirm-save-v4">
              Save Component
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
