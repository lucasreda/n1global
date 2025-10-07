import { PageNodeV4 } from '@shared/schema';
import { nanoid } from 'nanoid';
import { Box, Columns, Grid3x3, LayoutGrid, Maximize, RectangleHorizontal, RectangleVertical, Square, Layers, Divide } from 'lucide-react';
import { ElementTemplate } from './text-elements';

export const LAYOUT_ELEMENTS: ElementTemplate[] = [
  {
    id: 'container',
    name: 'Container',
    icon: Box,
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
    id: 'section',
    name: 'Section',
    icon: Square,
    category: 'layout',
    createNode: () => ({
      id: nanoid(),
      type: 'container',
      tag: 'section',
      children: [],
      classNames: [],
      styles: {
        desktop: {
          padding: '64px 24px',
        },
      },
    }),
  },
  {
    id: 'flex-row',
    name: 'Flex Row',
    icon: Columns,
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
        mobile: {
          flexDirection: 'column',
        },
      },
    }),
  },
  {
    id: 'flex-column',
    name: 'Flex Column',
    icon: RectangleVertical,
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
          flexDirection: 'column',
          gap: '16px',
        },
      },
    }),
  },
  {
    id: 'grid-2col',
    name: 'Grid 2-Col',
    icon: LayoutGrid,
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
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px',
        },
        mobile: {
          gridTemplateColumns: '1fr',
        },
      },
    }),
  },
  {
    id: 'grid-3col',
    name: 'Grid 3-Col',
    icon: Grid3x3,
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
          gap: '24px',
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
    id: 'grid-4col',
    name: 'Grid 4-Col',
    icon: Grid3x3,
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
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '24px',
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
    id: 'card',
    name: 'Card',
    icon: RectangleHorizontal,
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
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
        },
      },
    }),
  },
  {
    id: 'centered-container',
    name: 'Centered Container',
    icon: Box,
    category: 'layout',
    createNode: () => ({
      id: nanoid(),
      type: 'container',
      tag: 'div',
      children: [],
      classNames: [],
      styles: {
        desktop: {
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
        },
      },
    }),
  },
  {
    id: 'full-width',
    name: 'Full Width',
    icon: Maximize,
    category: 'layout',
    createNode: () => ({
      id: nanoid(),
      type: 'container',
      tag: 'div',
      children: [],
      classNames: [],
      styles: {
        desktop: {
          width: '100%',
          padding: '48px 24px',
        },
      },
    }),
  },
  {
    id: 'stack-vertical',
    name: 'Stack Vertical',
    icon: RectangleVertical,
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
          flexDirection: 'column',
          gap: '24px',
        },
      },
    }),
  },
  {
    id: 'stack-horizontal',
    name: 'Stack Horizontal',
    icon: RectangleHorizontal,
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
          gap: '24px',
          flexWrap: 'wrap',
        },
      },
    }),
  },
  {
    id: 'sticky-container',
    name: 'Sticky Container',
    icon: Layers,
    category: 'layout',
    createNode: () => ({
      id: nanoid(),
      type: 'container',
      tag: 'div',
      children: [],
      classNames: [],
      styles: {
        desktop: {
          position: 'sticky',
          top: '0',
          padding: '24px',
          backgroundColor: '#ffffff',
          zIndex: '10',
        },
      },
    }),
  },
  {
    id: 'wrapper',
    name: 'Wrapper',
    icon: Box,
    category: 'layout',
    createNode: () => ({
      id: nanoid(),
      type: 'container',
      tag: 'div',
      children: [],
      classNames: [],
    }),
  },
  {
    id: 'divider',
    name: 'Divider',
    icon: Divide,
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
