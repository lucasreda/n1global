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
import { PageNodeV4 } from '@shared/schema';
import { nanoid } from 'nanoid';

interface TemplateV4 {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  nodes: PageNodeV4[];
}

const TEMPLATE_CATEGORIES_V4 = [
  { id: 'hero', name: 'Hero Sections' },
  { id: 'features', name: 'Features' },
  { id: 'cta', name: 'Call to Action' },
  { id: 'testimonials', name: 'Testimonials' },
  { id: 'pricing', name: 'Pricing' },
  { id: 'faq', name: 'FAQ' },
  { id: 'footer', name: 'Footer' },
] as const;

const PREDEFINED_TEMPLATES_V4: TemplateV4[] = [
  {
    id: 'hero-simple',
    name: 'Simple Hero',
    description: 'Clean hero section with heading, subheading and CTA button',
    category: 'hero',
    nodes: [
      {
        id: nanoid(),
        type: 'container',
        tag: 'section',
        classNames: [],
        children: [
          {
            id: nanoid(),
            type: 'text',
            tag: 'h1',
            textContent: 'Welcome to Our Platform',
            classNames: [],
            styles: {
              desktop: {
                fontSize: '48px',
                fontWeight: '700',
                textAlign: 'center',
                marginBottom: '24px',
              },
              tablet: {
                fontSize: '36px',
              },
              mobile: {
                fontSize: '28px',
              },
            },
          },
          {
            id: nanoid(),
            type: 'text',
            tag: 'p',
            textContent: 'Build amazing landing pages with our visual editor',
            classNames: [],
            styles: {
              desktop: {
                fontSize: '18px',
                textAlign: 'center',
                color: '#666666',
                marginBottom: '32px',
              },
            },
          },
          {
            id: nanoid(),
            type: 'button',
            tag: 'button',
            textContent: 'Get Started',
            attributes: { href: '#' },
            classNames: [],
            styles: {
              desktop: {
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                padding: '12px 32px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
              },
            },
          },
        ],
        styles: {
          desktop: {
            padding: '80px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          },
        },
      },
    ],
  },
  {
    id: 'cta-centered',
    name: 'Centered CTA',
    description: 'Call-to-action section with centered content',
    category: 'cta',
    nodes: [
      {
        id: nanoid(),
        type: 'container',
        tag: 'section',
        classNames: [],
        children: [
          {
            id: nanoid(),
            type: 'text',
            tag: 'h2',
            textContent: 'Ready to get started?',
            classNames: [],
            styles: {
              desktop: {
                fontSize: '36px',
                fontWeight: '700',
                textAlign: 'center',
                marginBottom: '16px',
                color: '#ffffff',
              },
            },
          },
          {
            id: nanoid(),
            type: 'text',
            tag: 'p',
            textContent: 'Join thousands of satisfied customers today',
            classNames: [],
            styles: {
              desktop: {
                fontSize: '18px',
                textAlign: 'center',
                marginBottom: '32px',
                color: '#e5e7eb',
              },
            },
          },
          {
            id: nanoid(),
            type: 'button',
            tag: 'button',
            textContent: 'Start Free Trial',
            classNames: [],
            styles: {
              desktop: {
                backgroundColor: '#ffffff',
                color: '#3b82f6',
                padding: '14px 40px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
              },
            },
          },
        ],
        styles: {
          desktop: {
            backgroundColor: '#3b82f6',
            padding: '64px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          },
        },
      },
    ],
  },
];

interface TemplateGalleryV4Props {
  onInsertTemplate: (nodes: PageNodeV4[]) => void;
}

export function TemplateGalleryV4({ onInsertTemplate }: TemplateGalleryV4Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filteredTemplates = filterCategory === 'all'
    ? PREDEFINED_TEMPLATES_V4
    : PREDEFINED_TEMPLATES_V4.filter(t => t.category === filterCategory);

  const handleInsert = (template: TemplateV4) => {
    // Generate new IDs for all nodes to avoid duplicates
    const generateNewIds = (nodes: PageNodeV4[]): PageNodeV4[] => {
      return nodes.map(node => ({
        ...node,
        id: nanoid(),
        children: node.children ? generateNewIds(node.children) : undefined,
      }));
    };

    onInsertTemplate(generateNewIds(template.nodes));
    setIsOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        data-testid="button-open-templates-v4"
      >
        <LayoutTemplate className="w-4 h-4 mr-2" />
        Templates
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]" data-testid="dialog-template-gallery-v4">
          <DialogHeader>
            <DialogTitle>Template Gallery</DialogTitle>
            <DialogDescription>
              Choose a pre-built template to quickly add sections to your page
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-64" data-testid="select-template-category-v4">
                <SelectValue placeholder="All Templates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Templates</SelectItem>
                {TEMPLATE_CATEGORIES_V4.map(cat => (
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
                    data-testid={`template-card-v4-${template.id}`}
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
                        data-testid={`button-insert-template-v4-${template.id}`}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Insert Section
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                {filteredTemplates.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-muted-foreground">
                    No templates found in this category
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
