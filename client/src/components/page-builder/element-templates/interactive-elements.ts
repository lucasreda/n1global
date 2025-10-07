import { PageNodeV4 } from '@shared/schema';
import { nanoid } from 'nanoid';
import { MousePointer2, Link as LinkIcon, ExternalLink, CircleDot, Tag, Pill, Info, BarChart3 } from 'lucide-react';
import { ElementTemplate } from './text-elements';

export const INTERACTIVE_ELEMENTS: ElementTemplate[] = [
  {
    id: 'button',
    name: 'Button',
    icon: MousePointer2,
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
    icon: LinkIcon,
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
          cursor: 'pointer',
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
    id: 'link-button',
    name: 'Link Button',
    icon: ExternalLink,
    category: 'interactive',
    createNode: () => ({
      id: nanoid(),
      type: 'link',
      tag: 'a',
      textContent: 'Link Button',
      attributes: {
        href: '#',
      },
      classNames: [],
      styles: {
        desktop: {
          display: 'inline-block',
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '6px',
          fontSize: '16px',
          fontWeight: '600',
          textDecoration: 'none',
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
    id: 'icon-button',
    name: 'Icon Button',
    icon: CircleDot,
    category: 'interactive',
    createNode: () => ({
      id: nanoid(),
      type: 'button',
      tag: 'button',
      textContent: '⚡',
      attributes: {
        type: 'button',
      },
      classNames: [],
      styles: {
        desktop: {
          width: '48px',
          height: '48px',
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          borderRadius: '50%',
          border: 'none',
          fontSize: '20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
    id: 'badge',
    name: 'Badge',
    icon: Tag,
    category: 'interactive',
    createNode: () => ({
      id: nanoid(),
      type: 'text',
      tag: 'span',
      textContent: 'Badge',
      classNames: [],
      styles: {
        desktop: {
          display: 'inline-block',
          backgroundColor: '#dbeafe',
          color: '#1e40af',
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '500',
        },
      },
    }),
  },
  {
    id: 'pill',
    name: 'Pill',
    icon: Pill,
    category: 'interactive',
    createNode: () => ({
      id: nanoid(),
      type: 'text',
      tag: 'span',
      textContent: 'Pill',
      classNames: [],
      styles: {
        desktop: {
          display: 'inline-block',
          backgroundColor: '#10b981',
          color: '#ffffff',
          padding: '6px 16px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '500',
        },
      },
    }),
  },
  {
    id: 'tooltip',
    name: 'Tooltip',
    icon: Info,
    category: 'interactive',
    createNode: () => ({
      id: nanoid(),
      type: 'container',
      tag: 'div',
      children: [
        {
          id: nanoid(),
          type: 'text',
          tag: 'span',
          textContent: 'Hover me',
          classNames: [],
          styles: {
            desktop: {
              cursor: 'help',
              borderBottom: '1px dotted #6b7280',
            },
          },
        },
      ],
      classNames: [],
      styles: {
        desktop: {
          position: 'relative',
          display: 'inline-block',
        },
      },
    }),
  },
  {
    id: 'progress-bar',
    name: 'Progress Bar',
    icon: BarChart3,
    category: 'interactive',
    createNode: () => ({
      id: nanoid(),
      type: 'container',
      tag: 'div',
      children: [
        {
          id: nanoid(),
          type: 'container',
          tag: 'div',
          classNames: [],
          styles: {
            desktop: {
              width: '60%',
              height: '100%',
              backgroundColor: '#3b82f6',
              borderRadius: '4px',
            },
          },
        },
      ],
      classNames: [],
      styles: {
        desktop: {
          width: '100%',
          height: '8px',
          backgroundColor: '#e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden',
        },
      },
    }),
  },
];
