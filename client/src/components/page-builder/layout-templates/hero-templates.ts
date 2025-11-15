import { PageNodeV4 } from '@shared/schema';
import { nanoid } from 'nanoid';

export interface LayoutTemplate {
  id: string;
  name: string;
  category: string;
  icon: string;
  createNode: () => PageNodeV4;
}

export const HERO_TEMPLATES: LayoutTemplate[] = [
  {
    id: 'hero-center',
    name: 'Hero Center',
    category: 'Hero',
    icon: '🎯',
    createNode: () => ({
      id: nanoid(),
      tag: 'section',
      type: 'container',
      children: [
        {
          id: nanoid(),
          tag: 'div',
          type: 'container',
          children: [
            {
              id: nanoid(),
              tag: 'h1',
              type: 'heading',
              textContent: 'Build Amazing Landing Pages',
              classNames: [],
              styles: {
                desktop: {
                  fontSize: '56px',
                  fontWeight: '700',
                  lineHeight: '1.1',
                  textAlign: 'center',
                  marginBottom: '24px',
                },
                mobile: {
                  fontSize: '36px',
                },
              },
            },
            {
              id: nanoid(),
              tag: 'p',
              type: 'text',
              textContent: 'Create stunning pages with our professional visual editor. No coding required.',
              classNames: [],
              styles: {
                desktop: {
                  fontSize: '20px',
                  lineHeight: '1.6',
                  textAlign: 'center',
                  color: '#6b7280',
                  marginBottom: '32px',
                  maxWidth: '600px',
                  margin: '0 auto 32px',
                },
              },
            },
            {
              id: nanoid(),
              tag: 'button',
              type: 'button',
              textContent: 'Get Started',
              attributes: { type: 'button' },
              classNames: [],
              styles: {
                desktop: {
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  padding: '16px 32px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '18px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  margin: '0 auto',
                  display: 'block',
                },
              },
            },
          ],
          classNames: [],
          styles: {
            desktop: {
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '0 24px',
            },
          },
        },
      ],
      classNames: [],
      styles: {
        desktop: {
          padding: '120px 0',
          textAlign: 'center',
        },
        mobile: {
          padding: '60px 0',
        },
      },
    }),
  },
  {
    id: 'hero-split',
    name: 'Hero Split',
    category: 'Hero',
    icon: '📱',
    createNode: () => ({
      id: nanoid(),
      tag: 'section',
      type: 'container',
      children: [
        {
          id: nanoid(),
          tag: 'div',
          type: 'container',
          children: [
            {
              id: nanoid(),
              tag: 'div',
              type: 'container',
              children: [
                {
                  id: nanoid(),
                  tag: 'h1',
                  type: 'heading',
                  textContent: 'Your Product Headline Here',
                  classNames: [],
                  styles: {
                    desktop: {
                      fontSize: '48px',
                      fontWeight: '700',
                      lineHeight: '1.2',
                      marginBottom: '24px',
                    },
                    mobile: {
                      fontSize: '32px',
                    },
                  },
                },
                {
                  id: nanoid(),
                  tag: 'p',
                  type: 'text',
                  textContent: 'Describe your amazing product features and benefits in this section.',
                  classNames: [],
                  styles: {
                    desktop: {
                      fontSize: '18px',
                      lineHeight: '1.6',
                      color: '#6b7280',
                      marginBottom: '32px',
                    },
                  },
                },
                {
                  id: nanoid(),
                  tag: 'button',
                  type: 'button',
                  textContent: 'Learn More',
                  attributes: { type: 'button' },
                  classNames: [],
                  styles: {
                    desktop: {
                      backgroundColor: '#3b82f6',
                      color: '#ffffff',
                      padding: '14px 28px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    },
                  },
                },
              ],
              classNames: [],
              styles: {
                desktop: {
                  flex: '1',
                },
              },
            },
            {
              id: nanoid(),
              tag: 'img',
              type: 'image',
              attributes: {
                src: 'https://via.placeholder.com/600x500',
                alt: 'Product preview',
              },
              classNames: [],
              styles: {
                desktop: {
                  flex: '1',
                  width: '100%',
                  height: 'auto',
                  borderRadius: '12px',
                },
              },
            },
          ],
          classNames: [],
          styles: {
            desktop: {
              display: 'flex',
              gap: '64px',
              alignItems: 'center',
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '0 24px',
            },
            mobile: {
              flexDirection: 'column',
              gap: '32px',
            },
          },
        },
      ],
      classNames: [],
      styles: {
        desktop: {
          padding: '100px 0',
        },
        mobile: {
          padding: '60px 0',
        },
      },
    }),
  },
  {
    id: 'hero-video',
    name: 'Hero Video Background',
    category: 'Hero',
    icon: '🎬',
    createNode: () => ({
      id: nanoid(),
      tag: 'section',
      type: 'container',
      children: [
        {
          id: nanoid(),
          tag: 'div',
          type: 'container',
          children: [
            {
              id: nanoid(),
              tag: 'h1',
              type: 'heading',
              textContent: 'Experience The Future',
              classNames: [],
              styles: {
                desktop: {
                  fontSize: '64px',
                  fontWeight: '700',
                  lineHeight: '1.1',
                  textAlign: 'center',
                  color: '#ffffff',
                  marginBottom: '24px',
                  position: 'relative',
                  zIndex: '2',
                },
                mobile: {
                  fontSize: '36px',
                },
              },
            },
            {
              id: nanoid(),
              tag: 'p',
              type: 'text',
              textContent: 'Discover innovation with our cutting-edge solution',
              classNames: [],
              styles: {
                desktop: {
                  fontSize: '20px',
                  lineHeight: '1.6',
                  textAlign: 'center',
                  color: '#e5e7eb',
                  position: 'relative',
                  zIndex: '2',
                },
              },
            },
          ],
          classNames: [],
          styles: {
            desktop: {
              position: 'relative',
              zIndex: '2',
              maxWidth: '800px',
              margin: '0 auto',
            },
          },
        },
        {
          id: nanoid(),
          tag: 'div',
          type: 'container',
          classNames: [],
          styles: {
            desktop: {
              position: 'absolute',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: '1',
            },
          },
        },
      ],
      classNames: [],
      styles: {
        desktop: {
          position: 'relative',
          minHeight: '600px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '100px 24px',
          backgroundImage: 'url(https://via.placeholder.com/1920x1080)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        },
      },
    }),
  },
  {
    id: 'hero-minimal',
    name: 'Hero Minimal',
    category: 'Hero',
    icon: '✨',
    createNode: () => ({
      id: nanoid(),
      tag: 'section',
      type: 'container',
      children: [
        {
          id: nanoid(),
          tag: 'h1',
          type: 'heading',
          textContent: 'Simple. Powerful. Effective.',
          classNames: [],
          styles: {
            desktop: {
              fontSize: '72px',
              fontWeight: '700',
              lineHeight: '1.1',
              textAlign: 'center',
              marginBottom: '48px',
            },
            mobile: {
              fontSize: '40px',
            },
          },
        },
        {
          id: nanoid(),
          tag: 'button',
          type: 'button',
          textContent: 'Start Now',
          attributes: { type: 'button' },
          classNames: [],
          styles: {
            desktop: {
              backgroundColor: '#111827',
              color: '#ffffff',
              padding: '18px 40px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer',
              margin: '0 auto',
              display: 'block',
            },
          },
        },
      ],
      classNames: [],
      styles: {
        desktop: {
          padding: '140px 24px',
          textAlign: 'center',
        },
        mobile: {
          padding: '80px 24px',
        },
      },
    }),
  },
];
