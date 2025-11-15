import { useDraggable } from '@dnd-kit/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HERO_TEMPLATES } from './layout-templates/hero-templates';
import { NAVIGATION_TEMPLATES } from './layout-templates/navigation-templates';
import { CONTENT_TEMPLATES } from './layout-templates/content-templates';
import { CTA_TEMPLATES } from './layout-templates/cta-templates';
import { FORM_TEMPLATES } from './layout-templates/form-templates';

function DraggableLayoutTemplate({ template }: { template: any }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `layout-template-${template.id}`,
    data: {
      kind: 'template',
      template: template.createNode(),
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-testid={`template-${template.id}`}
      className={`
        flex items-center gap-3 p-3 rounded-lg border border-border bg-card
        cursor-grab active:cursor-grabbing
        transition-all hover:border-primary hover:shadow-md hover:bg-accent/30
        ${isDragging ? 'opacity-50' : 'opacity-100'}
      `}
    >
      <span className="text-base opacity-70">{template.icon}</span>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-foreground leading-tight">
          {template.name}
        </h4>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          {template.category}
        </p>
      </div>
    </div>
  );
}

export function LayoutsTab() {
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
                <h3 className="mb-3 text-sm flex items-center gap-2 text-foreground">
                  <span className="font-medium">{categoryName}</span>
                  <span className="text-xs text-muted-foreground/60">({templates.length})</span>
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {templates.map((template) => (
                    <DraggableLayoutTemplate key={template.id} template={template} />
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
