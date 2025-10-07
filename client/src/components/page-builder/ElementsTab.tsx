import { useDraggable } from '@dnd-kit/core';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { TEXT_ELEMENTS } from './element-templates/text-elements';
import { LAYOUT_ELEMENTS } from './element-templates/layout-elements';
import { MEDIA_ELEMENTS } from './element-templates/media-elements';
import { FORM_ELEMENTS } from './element-templates/form-elements';
import { INTERACTIVE_ELEMENTS } from './element-templates/interactive-elements';

function DraggableElement({ template }: { template: any }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `template-${template.id}`,
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
      data-testid={`element-${template.id}`}
      className={`
        flex items-center gap-3 p-3 rounded-lg border border-border
        cursor-grab active:cursor-grabbing
        transition-all hover:border-primary hover:bg-accent/50
        ${isDragging ? 'opacity-50' : 'opacity-100'}
      `}
    >
      {template.icon && <template.icon className="w-5 h-5 text-muted-foreground" />}
      <span className="text-sm font-medium">{template.name}</span>
    </div>
  );
}

export function ElementsTab() {
  const categories = [
    { 
      id: 'text', 
      label: 'Text & Typography', 
      elements: TEXT_ELEMENTS,
      icon: '📝'
    },
    { 
      id: 'layout', 
      label: 'Layout', 
      elements: LAYOUT_ELEMENTS,
      icon: '📐'
    },
    { 
      id: 'media', 
      label: 'Media', 
      elements: MEDIA_ELEMENTS,
      icon: '🖼️'
    },
    { 
      id: 'form', 
      label: 'Forms', 
      elements: FORM_ELEMENTS,
      icon: '📋'
    },
    { 
      id: 'interactive', 
      label: 'Interactive', 
      elements: INTERACTIVE_ELEMENTS,
      icon: '⚡'
    },
  ];

  return (
    <div className="h-full overflow-y-auto" data-testid="elements-tab">
      <Accordion type="multiple" defaultValue={['text', 'layout', 'media', 'form', 'interactive']} className="w-full">
        {categories.map((category) => (
          <AccordionItem key={category.id} value={category.id} data-testid={`category-${category.id}`}>
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <span className="text-lg">{category.icon}</span>
                <span className="font-semibold">{category.label}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {category.elements.length}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="grid grid-cols-1 gap-2">
                {category.elements.map((element) => (
                  <DraggableElement key={element.id} template={element} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
