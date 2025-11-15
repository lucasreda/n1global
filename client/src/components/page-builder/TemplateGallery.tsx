import { useState } from 'react';
import { Plus, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PREDEFINED_TEMPLATES, TEMPLATE_CATEGORIES, Template } from './templates/predefinedTemplates';

interface TemplateGalleryProps {
  onInsertTemplate: (template: Template) => void;
}

export function TemplateGallery({ onInsertTemplate }: TemplateGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filteredTemplates = filterCategory === 'all'
    ? PREDEFINED_TEMPLATES
    : PREDEFINED_TEMPLATES.filter(t => t.category === filterCategory);

  const handleInsert = (template: Template) => {
    onInsertTemplate(template);
    setIsOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        data-testid="button-open-templates"
      >
        <LayoutTemplate className="w-4 h-4 mr-2" />
        Templates
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]" data-testid="dialog-template-gallery">
          <DialogHeader>
            <DialogTitle>Template Gallery</DialogTitle>
            <DialogDescription>
              Choose a pre-built template to quickly add sections to your page
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-64" data-testid="select-template-category">
                <SelectValue placeholder="All Templates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Templates</SelectItem>
                {TEMPLATE_CATEGORIES.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <ScrollArea className="h-[500px]">
              <div className="grid grid-cols-2 gap-4 pr-4">
                {filteredTemplates.map(template => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:border-primary transition-colors group"
                    onClick={() => handleInsert(template)}
                    data-testid={`template-card-${template.id}`}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="aspect-video bg-muted rounded flex items-center justify-center">
                        {template.thumbnail ? (
                          <img
                            src={template.thumbnail}
                            alt={template.name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <div className="text-center p-4">
                            <LayoutTemplate className="w-12 h-12 mx-auto mb-2 text-muted-foreground/30" />
                            <p className="text-xs text-muted-foreground">
                              {template.category}
                            </p>
                          </div>
                        )}
                      </div>

                      <div>
                        <h3 className="font-semibold text-sm mb-1">{template.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {template.description}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        className="w-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInsert(template);
                        }}
                        data-testid={`button-insert-template-${template.id}`}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Insert Section
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                {filteredTemplates.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-muted-foreground">
                    <LayoutTemplate className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No templates found in this category</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
