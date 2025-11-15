import { Plus, Trash2, FolderOpen, Download, Upload, Search, Tag, X } from 'lucide-react';
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
import { useState, useEffect } from 'react';
import { PageNodeV4 } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { nanoid } from 'nanoid';

interface SavedComponentV4 {
  id: string;
  name: string;
  category: string;
  tags?: string[];
  createdAt: string;
  node: PageNodeV4;
  thumbnail?: string; // Base64 or URL
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
  const [componentTags, setComponentTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Auto-open save dialog when nodeToSave is provided
  useEffect(() => {
    if (selectedNode) {
      setSaveDialogOpen(true);
    }
  }, [selectedNode]);

  const handleSave = () => {
    if (componentName.trim() && selectedNode) {
      const newComponent: SavedComponentV4 = {
        id: nanoid(),
        name: componentName.trim(),
        category: componentCategory,
        tags: componentTags.length > 0 ? componentTags : undefined,
        createdAt: new Date().toISOString(),
        node: selectedNode,
      };
      
      onSaveComponent(newComponent);
      setComponentName('');
      setComponentCategory('Other');
      setComponentTags([]);
      setTagInput('');
      setSaveDialogOpen(false);
      
      toast({
        title: 'Component saved',
        description: `"${componentName}" has been added to your library`,
      });
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim() && !componentTags.includes(tagInput.trim())) {
      e.preventDefault();
      setComponentTags([...componentTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setComponentTags(componentTags.filter(tag => tag !== tagToRemove));
  };

  const handleInsert = (component: SavedComponentV4) => {
    // Generate new ID for inserted component to avoid conflicts
    // Mark as component instance with reference
    const nodeWithNewId: PageNodeV4 = {
      ...component.node,
      id: nanoid(),
      componentRef: component.id, // Mark as instance of this component
      instanceOverrides: undefined, // Start with no overrides
    };
    onInsertComponent(nodeWithNewId);
    
    toast({
      title: 'Componente inserido',
      description: `"${component.name}" foi adicionado à página como instância`,
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

  const filteredComponents = components.filter(c => {
    // Filter by category
    if (filterCategory !== 'all' && c.category !== filterCategory) {
      return false;
    }

    // Filter by search term (name or tags)
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      const matchesName = c.name.toLowerCase().includes(search);
      const matchesTags = c.tags?.some(tag => tag.toLowerCase().includes(search));
      if (!matchesName && !matchesTags) {
        return false;
      }
    }

    return true;
  });

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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou tag..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
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
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
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
                  </div>
                  {component.tags && component.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {component.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-muted rounded-md text-muted-foreground"
                        >
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
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

            <div className="space-y-2">
              <Label htmlFor="component-tags">Tags (opcional)</Label>
              <Input
                id="component-tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Digite uma tag e pressione Enter"
                data-testid="input-component-tags-v4"
              />
              {componentTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {componentTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:bg-primary-foreground/20 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
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
