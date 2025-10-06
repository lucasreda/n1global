import React, { useState } from 'react';
import { PageNodeV4 } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Type, 
  Heading1, 
  Heading2, 
  Heading3,
  MousePointer2,
  Image as ImageIcon,
  Video,
  Box,
  Columns,
  Grid3x3,
  List,
  Link as LinkIcon,
  Divide
} from 'lucide-react';
import { nanoid } from 'nanoid';

interface ElementsToolbarV4Props {
  onInsertElement: (node: PageNodeV4) => void;
}

interface ElementTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  category: 'text' | 'media' | 'layout' | 'interactive';
  createNode: () => PageNodeV4;
}

const ELEMENT_TEMPLATES: ElementTemplate[] = [
  {
    id: 'text',
    name: 'Text',
    icon: <Type className="w-4 h-4" />,
    category: 'text',
    createNode: () => ({
      id: nanoid(),
      type: 'text',
      tag: 'p',
      textContent: 'Edit this text',
      classNames: [],
      styles: {
        desktop: {
          fontSize: '16px',
          lineHeight: '1.5',
        },
      },
    }),
  },
  {
    id: 'heading1',
    name: 'Heading 1',
    icon: <Heading1 className="w-4 h-4" />,
    category: 'text',
    createNode: () => ({
      id: nanoid(),
      type: 'text',
      tag: 'h1',
      textContent: 'Heading 1',
      classNames: [],
      styles: {
        desktop: {
          fontSize: '48px',
          fontWeight: '700',
          lineHeight: '1.2',
        },
        tablet: {
          fontSize: '36px',
        },
        mobile: {
          fontSize: '28px',
        },
      },
    }),
  },
  {
    id: 'heading2',
    name: 'Heading 2',
    icon: <Heading2 className="w-4 h-4" />,
    category: 'text',
    createNode: () => ({
      id: nanoid(),
      type: 'text',
      tag: 'h2',
      textContent: 'Heading 2',
      classNames: [],
      styles: {
        desktop: {
          fontSize: '36px',
          fontWeight: '700',
          lineHeight: '1.3',
        },
        tablet: {
          fontSize: '28px',
        },
        mobile: {
          fontSize: '24px',
        },
      },
    }),
  },
  {
    id: 'heading3',
    name: 'Heading 3',
    icon: <Heading3 className="w-4 h-4" />,
    category: 'text',
    createNode: () => ({
      id: nanoid(),
      type: 'text',
      tag: 'h3',
      textContent: 'Heading 3',
      classNames: [],
      styles: {
        desktop: {
          fontSize: '24px',
          fontWeight: '600',
          lineHeight: '1.4',
        },
      },
    }),
  },
  {
    id: 'button',
    name: 'Button',
    icon: <MousePointer2 className="w-4 h-4" />,
    category: 'interactive',
    createNode: () => ({
      id: nanoid(),
      type: 'button',
      tag: 'button',
      textContent: 'Click me',
      attributes: {
        type: 'button',
      },
      classNames: [],
      styles: {
        desktop: {
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '6px',
          border: 'none',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
        },
      },
      states: {
        hover: {
          desktop: {
            backgroundColor: '#2563eb',
          },
        },
      },
    }),
  },
  {
    id: 'link',
    name: 'Link',
    icon: <LinkIcon className="w-4 h-4" />,
    category: 'interactive',
    createNode: () => ({
      id: nanoid(),
      type: 'link',
      tag: 'a',
      textContent: 'Link text',
      attributes: {
        href: '#',
      },
      classNames: [],
      styles: {
        desktop: {
          color: '#3b82f6',
          textDecoration: 'underline',
        },
      },
      states: {
        hover: {
          desktop: {
            color: '#2563eb',
          },
        },
      },
    }),
  },
  {
    id: 'image',
    name: 'Image',
    icon: <ImageIcon className="w-4 h-4" />,
    category: 'media',
    createNode: () => ({
      id: nanoid(),
      type: 'image',
      tag: 'img',
      attributes: {
        src: 'https://via.placeholder.com/400x300',
        alt: 'Placeholder image',
      },
      classNames: [],
      styles: {
        desktop: {
          width: '100%',
          height: 'auto',
          borderRadius: '8px',
        },
      },
    }),
  },
  {
    id: 'video',
    name: 'Video',
    icon: <Video className="w-4 h-4" />,
    category: 'media',
    createNode: () => ({
      id: nanoid(),
      type: 'video',
      tag: 'video',
      attributes: {
        src: '',
        controls: 'true',
      },
      classNames: [],
      styles: {
        desktop: {
          width: '100%',
          borderRadius: '8px',
        },
      },
    }),
  },
  {
    id: 'container',
    name: 'Container',
    icon: <Box className="w-4 h-4" />,
    category: 'layout',
    createNode: () => ({
      id: nanoid(),
      type: 'container',
      tag: 'div',
      children: [],
      classNames: [],
      styles: {
        desktop: {
          padding: '24px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
        },
      },
    }),
  },
  {
    id: 'flex-container',
    name: 'Flex Row',
    icon: <Columns className="w-4 h-4" />,
    category: 'layout',
    createNode: () => ({
      id: nanoid(),
      type: 'container',
      tag: 'div',
      children: [],
      classNames: [],
      styles: {
        desktop: {
          display: 'flex',
          flexDirection: 'row',
          gap: '16px',
          alignItems: 'center',
        },
      },
    }),
  },
  {
    id: 'grid-container',
    name: 'Grid',
    icon: <Grid3x3 className="w-4 h-4" />,
    category: 'layout',
    createNode: () => ({
      id: nanoid(),
      type: 'container',
      tag: 'div',
      children: [],
      classNames: [],
      styles: {
        desktop: {
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
        },
        tablet: {
          gridTemplateColumns: 'repeat(2, 1fr)',
        },
        mobile: {
          gridTemplateColumns: '1fr',
        },
      },
    }),
  },
  {
    id: 'list',
    name: 'List',
    icon: <List className="w-4 h-4" />,
    category: 'text',
    createNode: () => ({
      id: nanoid(),
      type: 'list',
      tag: 'ul',
      children: [
        {
          id: nanoid(),
          type: 'text',
          tag: 'li',
          textContent: 'List item 1',
          classNames: [],
        },
        {
          id: nanoid(),
          type: 'text',
          tag: 'li',
          textContent: 'List item 2',
          classNames: [],
        },
        {
          id: nanoid(),
          type: 'text',
          tag: 'li',
          textContent: 'List item 3',
          classNames: [],
        },
      ],
      classNames: [],
      styles: {
        desktop: {
          paddingLeft: '24px',
        },
      },
    }),
  },
  {
    id: 'divider',
    name: 'Divider',
    icon: <Divide className="w-4 h-4" />,
    category: 'layout',
    createNode: () => ({
      id: nanoid(),
      type: 'container',
      tag: 'hr',
      classNames: [],
      styles: {
        desktop: {
          border: 'none',
          borderTop: '1px solid #e5e7eb',
          margin: '24px 0',
        },
      },
    }),
  },
];

const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'text', name: 'Text' },
  { id: 'media', name: 'Media' },
  { id: 'layout', name: 'Layout' },
  { id: 'interactive', name: 'Interactive' },
] as const;

export function ElementsToolbarV4({ onInsertElement }: ElementsToolbarV4Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredElements = selectedCategory === 'all'
    ? ELEMENT_TEMPLATES
    : ELEMENT_TEMPLATES.filter(el => el.category === selectedCategory);

  const handleInsert = (template: ElementTemplate) => {
    const newNode = template.createNode();
    onInsertElement(newNode);
  };

  return (
    <div className="w-full h-full flex flex-col bg-background border-r">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm mb-3">Elements</h3>
        
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
              data-testid={`category-${cat.id}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredElements.map(template => (
            <Button
              key={template.id}
              variant="ghost"
              size="sm"
              onClick={() => handleInsert(template)}
              className="w-full justify-start h-auto py-2 px-3"
              data-testid={`element-${template.id}`}
            >
              <div className="flex items-center gap-2 w-full">
                <div className="text-muted-foreground">{template.icon}</div>
                <span className="text-sm">{template.name}</span>
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
