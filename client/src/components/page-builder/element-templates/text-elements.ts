import { PageNodeV4 } from '@shared/schema';
import { nanoid } from 'nanoid';
import { Type, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6, Quote, Code, Sparkles, Tag } from 'lucide-react';

export interface ElementTemplate {
  id: string;
  name: string;
  icon: any;
  category: string;
  createNode: () => PageNodeV4;
}

export const TEXT_ELEMENTS: ElementTemplate[] = [
  {
    id: 'text',
    name: 'Text',
    icon: Type,
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
          lineHeight: '1.6',
          color: '#374151',
        },
      },
    }),
  },
  {
    id: 'heading1',
    name: 'Heading 1',
    icon: Heading1,
    category: 'text',
    createNode: () => ({
      id: nanoid(),
      type: 'heading',
      tag: 'h1',
      textContent: 'Heading 1',
      classNames: [],
      styles: {
        desktop: {
          fontSize: '48px',
          fontWeight: '700',
          lineHeight: '1.2',
          color: '#111827',
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
    icon: Heading2,
    category: 'text',
    createNode: () => ({
      id: nanoid(),
      type: 'heading',
      tag: 'h2',
      textContent: 'Heading 2',
      classNames: [],
      styles: {
        desktop: {
          fontSize: '36px',
          fontWeight: '700',
          lineHeight: '1.3',
          color: '#111827',
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
    icon: Heading3,
    category: 'text',
    createNode: () => ({
      id: nanoid(),
      type: 'heading',
      tag: 'h3',
      textContent: 'Heading 3',
      classNames: [],
      styles: {
        desktop: {
          fontSize: '28px',
          fontWeight: '600',
          lineHeight: '1.4',
          color: '#111827',
        },
        tablet: {
          fontSize: '24px',
        },
        mobile: {
          fontSize: '20px',
        },
      },
    }),
  },
  {
    id: 'heading4',
    name: 'Heading 4',
    icon: Heading4,
    category: 'text',
    createNode: () => ({
      id: nanoid(),
      type: 'heading',
      tag: 'h4',
      textContent: 'Heading 4',
      classNames: [],
      styles: {
        desktop: {
          fontSize: '24px',
          fontWeight: '600',
          lineHeight: '1.4',
          color: '#111827',
        },
        mobile: {
          fontSize: '18px',
        },
      },
    }),
  },
  {
    id: 'heading5',
    name: 'Heading 5',
    icon: Heading5,
    category: 'text',
    createNode: () => ({
      id: nanoid(),
      type: 'heading',
      tag: 'h5',
      textContent: 'Heading 5',
      classNames: [],
      styles: {
        desktop: {
          fontSize: '20px',
          fontWeight: '600',
          lineHeight: '1.5',
          color: '#111827',
        },
      },
    }),
  },
  {
    id: 'heading6',
    name: 'Heading 6',
    icon: Heading6,
    category: 'text',
    createNode: () => ({
      id: nanoid(),
      type: 'heading',
      tag: 'h6',
      textContent: 'Heading 6',
      classNames: [],
      styles: {
        desktop: {
          fontSize: '18px',
          fontWeight: '600',
          lineHeight: '1.5',
          color: '#111827',
        },
      },
    }),
  },
  {
    id: 'blockquote',
    name: 'Blockquote',
    icon: Quote,
    category: 'text',
    createNode: () => ({
      id: nanoid(),
      type: 'text',
      tag: 'blockquote',
      textContent: 'This is a quote',
      classNames: [],
      styles: {
        desktop: {
          fontSize: '20px',
          fontStyle: 'italic',
          borderLeft: '4px solid #3b82f6',
          paddingLeft: '24px',
          margin: '24px 0',
          color: '#6b7280',
        },
      },
    }),
  },
  {
    id: 'code',
    name: 'Code Block',
    icon: Code,
    category: 'text',
    createNode: () => ({
      id: nanoid(),
      type: 'text',
      tag: 'code',
      textContent: 'const hello = "world";',
      classNames: [],
      styles: {
        desktop: {
          fontFamily: 'monospace',
          fontSize: '14px',
          backgroundColor: '#1f2937',
          color: '#10b981',
          padding: '16px',
          borderRadius: '8px',
          display: 'block',
          overflowX: 'auto',
        },
      },
    }),
  },
  {
    id: 'span',
    name: 'Span',
    icon: Sparkles,
    category: 'text',
    createNode: () => ({
      id: nanoid(),
      type: 'text',
      tag: 'span',
      textContent: 'Inline text',
      classNames: [],
      styles: {
        desktop: {
          fontSize: '16px',
        },
      },
    }),
  },
  {
    id: 'label',
    name: 'Label',
    icon: Tag,
    category: 'text',
    createNode: () => ({
      id: nanoid(),
      type: 'text',
      tag: 'label',
      textContent: 'Label text',
      classNames: [],
      styles: {
        desktop: {
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          display: 'block',
          marginBottom: '8px',
        },
      },
    }),
  },
];
