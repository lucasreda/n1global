import { PageNodeV4 } from '@shared/schema';
import { nanoid } from 'nanoid';
import { LayoutTemplate } from './hero-templates';

export const CTA_TEMPLATES: LayoutTemplate[] = [
  {
    id: 'cta-banner',
    name: 'CTA Banner',
    category: 'Call to Action',
    icon: '🎉',
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
              tag: 'h2',
              type: 'heading',
              textContent: 'Ready to Get Started?',
              classNames: [],
              styles: {
                desktop: {
                  fontSize: '36px',
                  fontWeight: '700',
                  color: '#ffffff',
                  textAlign: 'center',
                  marginBottom: '24px',
                },
                mobile: {
                  fontSize: '28px',
                },
              },
            },
            {
              id: nanoid(),
              tag: 'p',
              type: 'text',
              textContent: 'Join thousands of happy customers today',
              classNames: [],
              styles: {
                desktop: {
                  fontSize: '18px',
                  color: '#e5e7eb',
                  textAlign: 'center',
                  marginBottom: '32px',
                },
              },
            },
            {
              id: nanoid(),
              tag: 'button',
              type: 'button',
              textContent: 'Start Free Trial',
              attributes: { type: 'button' },
              classNames: [],
              styles: {
                desktop: {
                  backgroundColor: '#ffffff',
                  color: '#3b82f6',
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
          backgroundColor: '#3b82f6',
          padding: '80px 0',
        },
      },
    }),
  },
  {
    id: 'cta-split',
    name: 'CTA Split',
    category: 'Call to Action',
    icon: '📣',
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
                  tag: 'h2',
                  type: 'heading',
                  textContent: 'Transform Your Business Today',
                  classNames: [],
                  styles: {
                    desktop: {
                      fontSize: '36px',
                      fontWeight: '700',
                      marginBottom: '16px',
                    },
                  },
                },
                {
                  id: nanoid(),
                  tag: 'p',
                  type: 'text',
                  textContent: 'Get started with our platform and see results in days, not months.',
                  classNames: [],
                  styles: {
                    desktop: {
                      fontSize: '18px',
                      lineHeight: '1.6',
                      color: '#6b7280',
                      marginBottom: '24px',
                    },
                  },
                },
                {
                  id: nanoid(),
                  tag: 'button',
                  type: 'button',
                  textContent: 'Get Started Now',
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
                src: 'https://via.placeholder.com/500x400',
                alt: 'CTA Image',
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
          padding: '80px 0',
        },
      },
    }),
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    category: 'Call to Action',
    icon: '✉️',
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
              tag: 'h2',
              type: 'heading',
              textContent: 'Subscribe to Our Newsletter',
              classNames: [],
              styles: {
                desktop: {
                  fontSize: '32px',
                  fontWeight: '700',
                  textAlign: 'center',
                  marginBottom: '16px',
                },
              },
            },
            {
              id: nanoid(),
              tag: 'p',
              type: 'text',
              textContent: 'Get the latest updates and exclusive offers',
              classNames: [],
              styles: {
                desktop: {
                  fontSize: '16px',
                  color: '#6b7280',
                  textAlign: 'center',
                  marginBottom: '32px',
                },
              },
            },
            {
              id: nanoid(),
              tag: 'form',
              type: 'form',
              children: [
                {
                  id: nanoid(),
                  tag: 'input',
                  type: 'input',
                  attributes: {
                    type: 'email',
                    placeholder: 'Enter your email',
                  },
                  classNames: [],
                  styles: {
                    desktop: {
                      padding: '14px 16px',
                      fontSize: '16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      flex: '1',
                    },
                  },
                },
                {
                  id: nanoid(),
                  tag: 'button',
                  type: 'button',
                  textContent: 'Subscribe',
                  attributes: { type: 'submit' },
                  classNames: [],
                  styles: {
                    desktop: {
                      backgroundColor: '#3b82f6',
                      color: '#ffffff',
                      padding: '14px 32px',
                      borderRadius: '6px',
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
                  display: 'flex',
                  gap: '16px',
                  maxWidth: '600px',
                  margin: '0 auto',
                },
                mobile: {
                  flexDirection: 'column',
                },
              },
            },
          ],
          classNames: [],
          styles: {
            desktop: {
              maxWidth: '800px',
              margin: '0 auto',
              padding: '0 24px',
            },
          },
        },
      ],
      classNames: [],
      styles: {
        desktop: {
          padding: '80px 0',
          backgroundColor: '#f9fafb',
        },
      },
    }),
  },
];
