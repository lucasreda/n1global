import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HERO_TEMPLATES } from './layout-templates/hero-templates';
import { NAVIGATION_TEMPLATES } from './layout-templates/navigation-templates';
import { CONTENT_TEMPLATES } from './layout-templates/content-templates';
import { CTA_TEMPLATES } from './layout-templates/cta-templates';
import { FORM_TEMPLATES } from './layout-templates/form-templates';
import { PageNodeV4 } from '@shared/schema';
import { Plus } from 'lucide-react';

interface LayoutsTabProps {
  onInsertLayout: (node: PageNodeV4) => void;
}

export function LayoutsTab({ onInsertLayout }: LayoutsTabProps) {
  const allTemplates = [
    ...HERO_TEMPLATES,
    ...NAVIGATION_TEMPLATES,
    ...CONTENT_TEMPLATES,
    ...CTA_TEMPLATES,
    ...FORM_TEMPLATES,
  ];

  const categories = [
    { name: 'Hero', count: HERO_TEMPLATES.length },
    { name: 'Navigation', count: NAVIGATION_TEMPLATES.length },
    { name: 'Content', count: CONTENT_TEMPLATES.length },
    { name: 'Call to Action', count: CTA_TEMPLATES.length },
    { name: 'Forms', count: FORM_TEMPLATES.length },
    { name: 'Misc', count: FORM_TEMPLATES.filter(t => t.category === 'Misc').length },
  ];

  return (
    <div className="h-full flex flex-col" data-testid="layouts-tab">
      {/* Category summary */}
      <div className="p-4 border-b bg-muted/30">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {categories.map((cat) => (
            <div key={cat.name} className="flex justify-between items-center">
              <span className="text-muted-foreground">{cat.name}</span>
              <span className="font-semibold text-foreground">{cat.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Templates grid */}
      <ScrollArea className="flex-1 sidebar-scroll">
        <div className="p-4 space-y-6">
          {/* Group by category */}
          {['Hero', 'Navigation', 'Content', 'Call to Action', 'Forms', 'Misc'].map((categoryName) => {
            const templates = allTemplates.filter(t => t.category === categoryName);
            if (templates.length === 0) return null;

            return (
              <div key={categoryName} data-testid={`category-${categoryName.toLowerCase().replace(/\s+/g, '-')}`}>
                <h3 className="font-semibold mb-3 text-sm flex items-center gap-2 text-foreground">
                  <span>{categoryName}</span>
                  <span className="text-xs text-muted-foreground">({templates.length})</span>
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {templates.map((template) => (
                    <Card
                      key={template.id}
                      className="overflow-hidden hover:shadow-md transition-shadow"
                      data-testid={`template-${template.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl">{template.icon}</span>
                              <h4 className="font-semibold text-sm truncate text-foreground">
                                {template.name}
                              </h4>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {template.category}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => onInsertLayout(template.createNode())}
                            className="shrink-0"
                            data-testid={`insert-${template.id}`}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Insert
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
