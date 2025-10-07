import { PageNodeV4 } from '@shared/schema';
import { nanoid } from 'nanoid';
import { LayoutTemplate } from './hero-templates';

export const NAVIGATION_TEMPLATES: LayoutTemplate[] = [
  {
    id: 'navbar-simple',
    name: 'Navbar Simple',
    category: 'Navigation',
    icon: '📍',
    createNode: () => ({
      id: nanoid(),
      tag: 'header',
      type: 'container',
      children: [
        {
          id: nanoid(),
          tag: 'div',
          type: 'container',
          children: [
            {
              id: nanoid(),
              tag: 'a',
              type: 'link',
              textContent: 'Logo',
              attributes: { href: '/' },
              classNames: [],
              styles: {
                desktop: {
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#111827',
                  textDecoration: 'none',
                },
              },
            },
            {
              id: nanoid(),
              tag: 'nav',
              type: 'container',
              children: [
                {
                  id: nanoid(),
                  tag: 'ul',
                  type: 'list',
                  children: [
                    {
                      id: nanoid(),
                      tag: 'li',
                      type: 'text',
                      children: [
                        {
                          id: nanoid(),
                          tag: 'a',
                          type: 'link',
                          textContent: 'Home',
                          attributes: { href: '#' },
                          classNames: [],
                          styles: {
                            desktop: {
                              color: '#374151',
                              textDecoration: 'none',
                              fontWeight: '500',
                            },
                          },
                        },
                      ],
                      classNames: [],
                    },
                    {
                      id: nanoid(),
                      tag: 'li',
                      type: 'text',
                      children: [
                        {
                          id: nanoid(),
                          tag: 'a',
                          type: 'link',
                          textContent: 'About',
                          attributes: { href: '#' },
                          classNames: [],
                          styles: {
                            desktop: {
                              color: '#374151',
                              textDecoration: 'none',
                              fontWeight: '500',
                            },
                          },
                        },
                      ],
                      classNames: [],
                    },
                    {
                      id: nanoid(),
                      tag: 'li',
                      type: 'text',
                      children: [
                        {
                          id: nanoid(),
                          tag: 'a',
                          type: 'link',
                          textContent: 'Contact',
                          attributes: { href: '#' },
                          classNames: [],
                          styles: {
                            desktop: {
                              color: '#374151',
                              textDecoration: 'none',
                              fontWeight: '500',
                            },
                          },
                        },
                      ],
                      classNames: [],
                    },
                  ],
                  classNames: [],
                  styles: {
                    desktop: {
                      display: 'flex',
                      gap: '32px',
                      listStyle: 'none',
                      margin: '0',
                      padding: '0',
                    },
                  },
                },
              ],
              classNames: [],
            },
          ],
          classNames: [],
          styles: {
            desktop: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
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
          padding: '20px 0',
          borderBottom: '1px solid #e5e7eb',
        },
      },
    }),
  },
  {
    id: 'navbar-dropdown',
    name: 'Navbar with Dropdown',
    category: 'Navigation',
    icon: '🔽',
    createNode: () => ({
      id: nanoid(),
      tag: 'header',
      type: 'container',
      children: [
        {
          id: nanoid(),
          tag: 'div',
          type: 'container',
          children: [
            {
              id: nanoid(),
              tag: 'a',
              type: 'link',
              textContent: 'Brand',
              attributes: { href: '/' },
              classNames: [],
              styles: {
                desktop: {
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#111827',
                  textDecoration: 'none',
                },
              },
            },
            {
              id: nanoid(),
              tag: 'nav',
              type: 'container',
              children: [
                {
                  id: nanoid(),
                  tag: 'ul',
                  type: 'list',
                  children: [
                    {
                      id: nanoid(),
                      tag: 'li',
                      type: 'text',
                      children: [
                        {
                          id: nanoid(),
                          tag: 'a',
                          type: 'link',
                          textContent: 'Products ▼',
                          attributes: { href: '#' },
                          classNames: [],
                          styles: {
                            desktop: {
                              color: '#374151',
                              textDecoration: 'none',
                              fontWeight: '500',
                            },
                          },
                        },
                      ],
                      classNames: [],
                    },
                    {
                      id: nanoid(),
                      tag: 'li',
                      type: 'text',
                      children: [
                        {
                          id: nanoid(),
                          tag: 'a',
                          type: 'link',
                          textContent: 'Services',
                          attributes: { href: '#' },
                          classNames: [],
                          styles: {
                            desktop: {
                              color: '#374151',
                              textDecoration: 'none',
                              fontWeight: '500',
                            },
                          },
                        },
                      ],
                      classNames: [],
                    },
                  ],
                  classNames: [],
                  styles: {
                    desktop: {
                      display: 'flex',
                      gap: '32px',
                      listStyle: 'none',
                      margin: '0',
                      padding: '0',
                    },
                  },
                },
              ],
              classNames: [],
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
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '14px',
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
              justifyContent: 'space-between',
              alignItems: 'center',
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
          padding: '20px 0',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        },
      },
    }),
  },
  {
    id: 'footer-3col',
    name: 'Footer 3 Columns',
    category: 'Navigation',
    icon: '🦶',
    createNode: () => ({
      id: nanoid(),
      tag: 'footer',
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
                  tag: 'h4',
                  type: 'heading',
                  textContent: 'Company',
                  classNames: [],
                  styles: {
                    desktop: {
                      fontSize: '18px',
                      fontWeight: '600',
                      marginBottom: '16px',
                      color: '#111827',
                    },
                  },
                },
                {
                  id: nanoid(),
                  tag: 'ul',
                  type: 'list',
                  children: [
                    {
                      id: nanoid(),
                      tag: 'li',
                      type: 'text',
                      children: [
                        {
                          id: nanoid(),
                          tag: 'a',
                          type: 'link',
                          textContent: 'About Us',
                          attributes: { href: '#' },
                          classNames: [],
                          styles: {
                            desktop: {
                              color: '#6b7280',
                              textDecoration: 'none',
                            },
                          },
                        },
                      ],
                      classNames: [],
                      styles: {
                        desktop: {
                          marginBottom: '8px',
                        },
                      },
                    },
                    {
                      id: nanoid(),
                      tag: 'li',
                      type: 'text',
                      children: [
                        {
                          id: nanoid(),
                          tag: 'a',
                          type: 'link',
                          textContent: 'Careers',
                          attributes: { href: '#' },
                          classNames: [],
                          styles: {
                            desktop: {
                              color: '#6b7280',
                              textDecoration: 'none',
                            },
                          },
                        },
                      ],
                      classNames: [],
                    },
                  ],
                  classNames: [],
                  styles: {
                    desktop: {
                      listStyle: 'none',
                      padding: '0',
                      margin: '0',
                    },
                  },
                },
              ],
              classNames: [],
            },
            {
              id: nanoid(),
              tag: 'div',
              type: 'container',
              children: [
                {
                  id: nanoid(),
                  tag: 'h4',
                  type: 'heading',
                  textContent: 'Support',
                  classNames: [],
                  styles: {
                    desktop: {
                      fontSize: '18px',
                      fontWeight: '600',
                      marginBottom: '16px',
                      color: '#111827',
                    },
                  },
                },
                {
                  id: nanoid(),
                  tag: 'ul',
                  type: 'list',
                  children: [
                    {
                      id: nanoid(),
                      tag: 'li',
                      type: 'text',
                      children: [
                        {
                          id: nanoid(),
                          tag: 'a',
                          type: 'link',
                          textContent: 'Help Center',
                          attributes: { href: '#' },
                          classNames: [],
                          styles: {
                            desktop: {
                              color: '#6b7280',
                              textDecoration: 'none',
                            },
                          },
                        },
                      ],
                      classNames: [],
                      styles: {
                        desktop: {
                          marginBottom: '8px',
                        },
                      },
                    },
                  ],
                  classNames: [],
                  styles: {
                    desktop: {
                      listStyle: 'none',
                      padding: '0',
                      margin: '0',
                    },
                  },
                },
              ],
              classNames: [],
            },
            {
              id: nanoid(),
              tag: 'div',
              type: 'container',
              children: [
                {
                  id: nanoid(),
                  tag: 'h4',
                  type: 'heading',
                  textContent: 'Legal',
                  classNames: [],
                  styles: {
                    desktop: {
                      fontSize: '18px',
                      fontWeight: '600',
                      marginBottom: '16px',
                      color: '#111827',
                    },
                  },
                },
                {
                  id: nanoid(),
                  tag: 'ul',
                  type: 'list',
                  children: [
                    {
                      id: nanoid(),
                      tag: 'li',
                      type: 'text',
                      children: [
                        {
                          id: nanoid(),
                          tag: 'a',
                          type: 'link',
                          textContent: 'Privacy',
                          attributes: { href: '#' },
                          classNames: [],
                          styles: {
                            desktop: {
                              color: '#6b7280',
                              textDecoration: 'none',
                            },
                          },
                        },
                      ],
                      classNames: [],
                      styles: {
                        desktop: {
                          marginBottom: '8px',
                        },
                      },
                    },
                  ],
                  classNames: [],
                  styles: {
                    desktop: {
                      listStyle: 'none',
                      padding: '0',
                      margin: '0',
                    },
                  },
                },
              ],
              classNames: [],
            },
          ],
          classNames: [],
          styles: {
            desktop: {
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '48px',
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '0 24px 48px',
            },
            mobile: {
              gridTemplateColumns: '1fr',
              gap: '32px',
            },
          },
        },
        {
          id: nanoid(),
          tag: 'div',
          type: 'container',
          children: [
            {
              id: nanoid(),
              tag: 'p',
              type: 'text',
              textContent: '© 2024 Company Name. All rights reserved.',
              classNames: [],
              styles: {
                desktop: {
                  textAlign: 'center',
                  color: '#9ca3af',
                  fontSize: '14px',
                },
              },
            },
          ],
          classNames: [],
          styles: {
            desktop: {
              borderTop: '1px solid #e5e7eb',
              paddingTop: '24px',
            },
          },
        },
      ],
      classNames: [],
      styles: {
        desktop: {
          backgroundColor: '#f9fafb',
          padding: '64px 0 24px',
        },
      },
    }),
  },
];
