import { PageNodeV4 } from '@shared/schema';
import { nanoid } from 'nanoid';
import { LayoutTemplate } from './hero-templates';

export const CONTENT_TEMPLATES: LayoutTemplate[] = [
  {
    id: 'features-grid',
    name: 'Features Grid',
    category: 'Content',
    icon: '✨',
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
              textContent: 'Amazing Features',
              classNames: [],
              styles: {
                desktop: {
                  fontSize: '36px',
                  fontWeight: '700',
                  textAlign: 'center',
                  marginBottom: '48px',
                },
              },
            },
            {
              id: nanoid(),
              tag: 'div',
              type: 'container',
              children: Array.from({ length: 3 }, () => ({
                id: nanoid(),
                tag: 'div',
                type: 'container',
                children: [
                  {
                    id: nanoid(),
                    tag: 'div',
                    type: 'container',
                    textContent: '🚀',
                    classNames: [],
                    styles: {
                      desktop: {
                        fontSize: '48px',
                        marginBottom: '16px',
                      },
                    },
                  },
                  {
                    id: nanoid(),
                    tag: 'h3',
                    type: 'heading',
                    textContent: 'Feature Title',
                    classNames: [],
                    styles: {
                      desktop: {
                        fontSize: '20px',
                        fontWeight: '600',
                        marginBottom: '12px',
                      },
                    },
                  },
                  {
                    id: nanoid(),
                    tag: 'p',
                    type: 'text',
                    textContent: 'Description of this amazing feature goes here.',
                    classNames: [],
                    styles: {
                      desktop: {
                        fontSize: '16px',
                        lineHeight: '1.6',
                        color: '#6b7280',
                      },
                    },
                  },
                ],
                classNames: [],
                styles: {
                  desktop: {
                    textAlign: 'center',
                  },
                },
              })),
              classNames: [],
              styles: {
                desktop: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '48px',
                },
                tablet: {
                  gridTemplateColumns: 'repeat(2, 1fr)',
                },
                mobile: {
                  gridTemplateColumns: '1fr',
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
          padding: '80px 0',
        },
      },
    }),
  },
  {
    id: 'testimonials',
    name: 'Testimonials',
    category: 'Content',
    icon: '💬',
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
              textContent: 'What Our Customers Say',
              classNames: [],
              styles: {
                desktop: {
                  fontSize: '36px',
                  fontWeight: '700',
                  textAlign: 'center',
                  marginBottom: '48px',
                },
              },
            },
            {
              id: nanoid(),
              tag: 'div',
              type: 'container',
              children: Array.from({ length: 3 }, () => ({
                id: nanoid(),
                tag: 'div',
                type: 'container',
                children: [
                  {
                    id: nanoid(),
                    tag: 'p',
                    type: 'text',
                    textContent: '"This product changed my life! Highly recommended."',
                    classNames: [],
                    styles: {
                      desktop: {
                        fontSize: '16px',
                        lineHeight: '1.6',
                        marginBottom: '16px',
                        fontStyle: 'italic',
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
                        tag: 'img',
                        type: 'image',
                        attributes: {
                          src: 'https://via.placeholder.com/50',
                          alt: 'Customer',
                        },
                        classNames: [],
                        styles: {
                          desktop: {
                            width: '50px',
                            height: '50px',
                            borderRadius: '50%',
                            marginRight: '16px',
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
                            tag: 'h4',
                            type: 'heading',
                            textContent: 'John Doe',
                            classNames: [],
                            styles: {
                              desktop: {
                                fontSize: '16px',
                                fontWeight: '600',
                              },
                            },
                          },
                          {
                            id: nanoid(),
                            tag: 'p',
                            type: 'text',
                            textContent: 'CEO at Company',
                            classNames: [],
                            styles: {
                              desktop: {
                                fontSize: '14px',
                                color: '#6b7280',
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
                        alignItems: 'center',
                      },
                    },
                  },
                ],
                classNames: [],
                styles: {
                  desktop: {
                    backgroundColor: '#ffffff',
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  },
                },
              })),
              classNames: [],
              styles: {
                desktop: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '24px',
                },
                mobile: {
                  gridTemplateColumns: '1fr',
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
          padding: '80px 0',
          backgroundColor: '#f9fafb',
        },
      },
    }),
  },
  {
    id: 'pricing-table',
    name: 'Pricing Table',
    category: 'Content',
    icon: '💰',
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
              textContent: 'Choose Your Plan',
              classNames: [],
              styles: {
                desktop: {
                  fontSize: '36px',
                  fontWeight: '700',
                  textAlign: 'center',
                  marginBottom: '48px',
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
                  tag: 'div',
                  type: 'container',
                  children: [
                    {
                      id: nanoid(),
                      tag: 'h3',
                      type: 'heading',
                      textContent: 'Starter',
                      classNames: [],
                      styles: {
                        desktop: {
                          fontSize: '24px',
                          fontWeight: '600',
                          marginBottom: '16px',
                        },
                      },
                    },
                    {
                      id: nanoid(),
                      tag: 'p',
                      type: 'text',
                      textContent: '$9',
                      classNames: [],
                      styles: {
                        desktop: {
                          fontSize: '48px',
                          fontWeight: '700',
                          marginBottom: '24px',
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
                          padding: '12px 24px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '16px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          width: '100%',
                        },
                      },
                    },
                  ],
                  classNames: [],
                  styles: {
                    desktop: {
                      backgroundColor: '#ffffff',
                      padding: '32px',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      textAlign: 'center',
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
                      tag: 'h3',
                      type: 'heading',
                      textContent: 'Pro',
                      classNames: [],
                      styles: {
                        desktop: {
                          fontSize: '24px',
                          fontWeight: '600',
                          marginBottom: '16px',
                        },
                      },
                    },
                    {
                      id: nanoid(),
                      tag: 'p',
                      type: 'text',
                      textContent: '$29',
                      classNames: [],
                      styles: {
                        desktop: {
                          fontSize: '48px',
                          fontWeight: '700',
                          marginBottom: '24px',
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
                          padding: '12px 24px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '16px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          width: '100%',
                        },
                      },
                    },
                  ],
                  classNames: [],
                  styles: {
                    desktop: {
                      backgroundColor: '#ffffff',
                      padding: '32px',
                      borderRadius: '12px',
                      border: '2px solid #3b82f6',
                      textAlign: 'center',
                      transform: 'scale(1.05)',
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
                      tag: 'h3',
                      type: 'heading',
                      textContent: 'Enterprise',
                      classNames: [],
                      styles: {
                        desktop: {
                          fontSize: '24px',
                          fontWeight: '600',
                          marginBottom: '16px',
                        },
                      },
                    },
                    {
                      id: nanoid(),
                      tag: 'p',
                      type: 'text',
                      textContent: '$99',
                      classNames: [],
                      styles: {
                        desktop: {
                          fontSize: '48px',
                          fontWeight: '700',
                          marginBottom: '24px',
                        },
                      },
                    },
                    {
                      id: nanoid(),
                      tag: 'button',
                      type: 'button',
                      textContent: 'Contact Sales',
                      attributes: { type: 'button' },
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
                          width: '100%',
                        },
                      },
                    },
                  ],
                  classNames: [],
                  styles: {
                    desktop: {
                      backgroundColor: '#ffffff',
                      padding: '32px',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      textAlign: 'center',
                    },
                  },
                },
              ],
              classNames: [],
              styles: {
                desktop: {
                  display: 'flex',
                  gap: '24px',
                  justifyContent: 'center',
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
          padding: '80px 0',
        },
      },
    }),
  },
  {
    id: 'faq-accordion',
    name: 'FAQ Accordion',
    category: 'Content',
    icon: '❓',
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
              textContent: 'Frequently Asked Questions',
              classNames: [],
              styles: {
                desktop: {
                  fontSize: '36px',
                  fontWeight: '700',
                  textAlign: 'center',
                  marginBottom: '48px',
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
                  tag: 'div',
                  type: 'container',
                  children: [
                    {
                      id: nanoid(),
                      tag: 'h3',
                      type: 'heading',
                      textContent: 'Question 1?',
                      classNames: [],
                      styles: {
                        desktop: {
                          fontSize: '20px',
                          fontWeight: '600',
                          marginBottom: '12px',
                        },
                      },
                    },
                    {
                      id: nanoid(),
                      tag: 'p',
                      type: 'text',
                      textContent: 'Answer to question 1 goes here.',
                      classNames: [],
                      styles: {
                        desktop: {
                          fontSize: '16px',
                          lineHeight: '1.6',
                          color: '#6b7280',
                        },
                      },
                    },
                  ],
                  classNames: [],
                  styles: {
                    desktop: {
                      padding: '24px',
                      borderBottom: '1px solid #e5e7eb',
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
                      tag: 'h3',
                      type: 'heading',
                      textContent: 'Question 2?',
                      classNames: [],
                      styles: {
                        desktop: {
                          fontSize: '20px',
                          fontWeight: '600',
                          marginBottom: '12px',
                        },
                      },
                    },
                    {
                      id: nanoid(),
                      tag: 'p',
                      type: 'text',
                      textContent: 'Answer to question 2 goes here.',
                      classNames: [],
                      styles: {
                        desktop: {
                          fontSize: '16px',
                          lineHeight: '1.6',
                          color: '#6b7280',
                        },
                      },
                    },
                  ],
                  classNames: [],
                  styles: {
                    desktop: {
                      padding: '24px',
                      borderBottom: '1px solid #e5e7eb',
                    },
                  },
                },
              ],
              classNames: [],
              styles: {
                desktop: {
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
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
  {
    id: 'stats-counter',
    name: 'Stats Counter',
    category: 'Content',
    icon: '📊',
    createNode: () => ({
      id: nanoid(),
      tag: 'section',
      type: 'container',
      children: [
        {
          id: nanoid(),
          tag: 'div',
          type: 'container',
          children: Array.from({ length: 4 }, (_, i) => ({
            id: nanoid(),
            tag: 'div',
            type: 'container',
            children: [
              {
                id: nanoid(),
                tag: 'p',
                type: 'text',
                textContent: ['1000+', '50K+', '99%', '24/7'][i],
                classNames: [],
                styles: {
                  desktop: {
                    fontSize: '48px',
                    fontWeight: '700',
                    marginBottom: '8px',
                    color: '#3b82f6',
                  },
                },
              },
              {
                id: nanoid(),
                tag: 'p',
                type: 'text',
                textContent: ['Happy Customers', 'Projects Done', 'Satisfaction', 'Support'][i],
                classNames: [],
                styles: {
                  desktop: {
                    fontSize: '16px',
                    color: '#6b7280',
                  },
                },
              },
            ],
            classNames: [],
            styles: {
              desktop: {
                textAlign: 'center',
              },
            },
          })),
          classNames: [],
          styles: {
            desktop: {
              display: 'flex',
              gap: '48px',
              justifyContent: 'space-around',
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
          backgroundColor: '#f9fafb',
        },
      },
    }),
  },
];
