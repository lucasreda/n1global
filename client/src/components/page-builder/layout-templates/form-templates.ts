import { PageNodeV4 } from '@shared/schema';
import { nanoid } from 'nanoid';
import { LayoutTemplate } from './hero-templates';

export const FORM_TEMPLATES: LayoutTemplate[] = [
  {
    id: 'contact-form',
    name: 'Contact Form',
    category: 'Forms',
    icon: '📝',
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
              textContent: 'Get In Touch',
              classNames: [],
              styles: {
                desktop: {
                  fontSize: '32px',
                  fontWeight: '700',
                  marginBottom: '32px',
                  textAlign: 'center',
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
                  tag: 'div',
                  type: 'container',
                  children: [
                    {
                      id: nanoid(),
                      tag: 'label',
                      type: 'text',
                      textContent: 'Your Name',
                      classNames: [],
                      styles: {
                        desktop: {
                          fontSize: '14px',
                          fontWeight: '500',
                          marginBottom: '8px',
                          display: 'block',
                        },
                      },
                    },
                    {
                      id: nanoid(),
                      tag: 'input',
                      type: 'input',
                      attributes: {
                        type: 'text',
                        placeholder: 'John Doe',
                      },
                      classNames: [],
                      styles: {
                        desktop: {
                          width: '100%',
                          padding: '12px 16px',
                          fontSize: '16px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                        },
                      },
                    },
                  ],
                  classNames: [],
                  styles: {
                    desktop: {
                      marginBottom: '16px',
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
                      tag: 'label',
                      type: 'text',
                      textContent: 'Email Address',
                      classNames: [],
                      styles: {
                        desktop: {
                          fontSize: '14px',
                          fontWeight: '500',
                          marginBottom: '8px',
                          display: 'block',
                        },
                      },
                    },
                    {
                      id: nanoid(),
                      tag: 'input',
                      type: 'input',
                      attributes: {
                        type: 'email',
                        placeholder: 'john@example.com',
                      },
                      classNames: [],
                      styles: {
                        desktop: {
                          width: '100%',
                          padding: '12px 16px',
                          fontSize: '16px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                        },
                      },
                    },
                  ],
                  classNames: [],
                  styles: {
                    desktop: {
                      marginBottom: '16px',
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
                      tag: 'label',
                      type: 'text',
                      textContent: 'Message',
                      classNames: [],
                      styles: {
                        desktop: {
                          fontSize: '14px',
                          fontWeight: '500',
                          marginBottom: '8px',
                          display: 'block',
                        },
                      },
                    },
                    {
                      id: nanoid(),
                      tag: 'textarea',
                      type: 'input',
                      attributes: {
                        placeholder: 'Your message...',
                        rows: '5',
                      },
                      classNames: [],
                      styles: {
                        desktop: {
                          width: '100%',
                          padding: '12px 16px',
                          fontSize: '16px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                        },
                      },
                    },
                  ],
                  classNames: [],
                  styles: {
                    desktop: {
                      marginBottom: '24px',
                    },
                  },
                },
                {
                  id: nanoid(),
                  tag: 'button',
                  type: 'button',
                  textContent: 'Send Message',
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
                      width: '100%',
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
              maxWidth: '600px',
              margin: '0 auto',
              backgroundColor: '#ffffff',
              padding: '48px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            },
          },
        },
      ],
      classNames: [],
      styles: {
        desktop: {
          padding: '80px 24px',
          backgroundColor: '#f9fafb',
        },
      },
    }),
  },
  {
    id: 'login-form',
    name: 'Login Form',
    category: 'Forms',
    icon: '🔐',
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
              textContent: 'Welcome Back',
              classNames: [],
              styles: {
                desktop: {
                  fontSize: '28px',
                  fontWeight: '700',
                  marginBottom: '8px',
                  textAlign: 'center',
                },
              },
            },
            {
              id: nanoid(),
              tag: 'p',
              type: 'text',
              textContent: 'Sign in to your account',
              classNames: [],
              styles: {
                desktop: {
                  fontSize: '16px',
                  color: '#6b7280',
                  marginBottom: '32px',
                  textAlign: 'center',
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
                  tag: 'div',
                  type: 'container',
                  children: [
                    {
                      id: nanoid(),
                      tag: 'label',
                      type: 'text',
                      textContent: 'Email',
                      classNames: [],
                      styles: {
                        desktop: {
                          fontSize: '14px',
                          fontWeight: '500',
                          marginBottom: '8px',
                          display: 'block',
                        },
                      },
                    },
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
                          width: '100%',
                          padding: '12px 16px',
                          fontSize: '16px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                        },
                      },
                    },
                  ],
                  classNames: [],
                  styles: {
                    desktop: {
                      marginBottom: '16px',
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
                      tag: 'label',
                      type: 'text',
                      textContent: 'Password',
                      classNames: [],
                      styles: {
                        desktop: {
                          fontSize: '14px',
                          fontWeight: '500',
                          marginBottom: '8px',
                          display: 'block',
                        },
                      },
                    },
                    {
                      id: nanoid(),
                      tag: 'input',
                      type: 'input',
                      attributes: {
                        type: 'password',
                        placeholder: 'Enter your password',
                      },
                      classNames: [],
                      styles: {
                        desktop: {
                          width: '100%',
                          padding: '12px 16px',
                          fontSize: '16px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                        },
                      },
                    },
                  ],
                  classNames: [],
                  styles: {
                    desktop: {
                      marginBottom: '24px',
                    },
                  },
                },
                {
                  id: nanoid(),
                  tag: 'button',
                  type: 'button',
                  textContent: 'Sign In',
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
                      width: '100%',
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
              maxWidth: '400px',
              margin: '0 auto',
              backgroundColor: '#ffffff',
              padding: '48px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            },
          },
        },
      ],
      classNames: [],
      styles: {
        desktop: {
          padding: '100px 24px',
          backgroundColor: '#f9fafb',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
    }),
  },
  {
    id: 'signup-form',
    name: 'Signup Form',
    category: 'Forms',
    icon: '📋',
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
              textContent: 'Create Account',
              classNames: [],
              styles: {
                desktop: {
                  fontSize: '28px',
                  fontWeight: '700',
                  marginBottom: '8px',
                  textAlign: 'center',
                },
              },
            },
            {
              id: nanoid(),
              tag: 'p',
              type: 'text',
              textContent: 'Join us today',
              classNames: [],
              styles: {
                desktop: {
                  fontSize: '16px',
                  color: '#6b7280',
                  marginBottom: '32px',
                  textAlign: 'center',
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
                  tag: 'div',
                  type: 'container',
                  children: [
                    {
                      id: nanoid(),
                      tag: 'label',
                      type: 'text',
                      textContent: 'Full Name',
                      classNames: [],
                      styles: {
                        desktop: {
                          fontSize: '14px',
                          fontWeight: '500',
                          marginBottom: '8px',
                          display: 'block',
                        },
                      },
                    },
                    {
                      id: nanoid(),
                      tag: 'input',
                      type: 'input',
                      attributes: {
                        type: 'text',
                        placeholder: 'John Doe',
                      },
                      classNames: [],
                      styles: {
                        desktop: {
                          width: '100%',
                          padding: '12px 16px',
                          fontSize: '16px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                        },
                      },
                    },
                  ],
                  classNames: [],
                  styles: {
                    desktop: {
                      marginBottom: '16px',
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
                      tag: 'label',
                      type: 'text',
                      textContent: 'Email',
                      classNames: [],
                      styles: {
                        desktop: {
                          fontSize: '14px',
                          fontWeight: '500',
                          marginBottom: '8px',
                          display: 'block',
                        },
                      },
                    },
                    {
                      id: nanoid(),
                      tag: 'input',
                      type: 'input',
                      attributes: {
                        type: 'email',
                        placeholder: 'john@example.com',
                      },
                      classNames: [],
                      styles: {
                        desktop: {
                          width: '100%',
                          padding: '12px 16px',
                          fontSize: '16px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                        },
                      },
                    },
                  ],
                  classNames: [],
                  styles: {
                    desktop: {
                      marginBottom: '16px',
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
                      tag: 'label',
                      type: 'text',
                      textContent: 'Password',
                      classNames: [],
                      styles: {
                        desktop: {
                          fontSize: '14px',
                          fontWeight: '500',
                          marginBottom: '8px',
                          display: 'block',
                        },
                      },
                    },
                    {
                      id: nanoid(),
                      tag: 'input',
                      type: 'input',
                      attributes: {
                        type: 'password',
                        placeholder: 'Create a password',
                      },
                      classNames: [],
                      styles: {
                        desktop: {
                          width: '100%',
                          padding: '12px 16px',
                          fontSize: '16px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                        },
                      },
                    },
                  ],
                  classNames: [],
                  styles: {
                    desktop: {
                      marginBottom: '24px',
                    },
                  },
                },
                {
                  id: nanoid(),
                  tag: 'button',
                  type: 'button',
                  textContent: 'Create Account',
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
                      width: '100%',
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
              maxWidth: '400px',
              margin: '0 auto',
              backgroundColor: '#ffffff',
              padding: '48px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            },
          },
        },
      ],
      classNames: [],
      styles: {
        desktop: {
          padding: '100px 24px',
          backgroundColor: '#f9fafb',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
    }),
  },
  {
    id: 'blog-card',
    name: 'Blog Card',
    category: 'Misc',
    icon: '📰',
    createNode: () => ({
      id: nanoid(),
      tag: 'article',
      type: 'container',
      children: [
        {
          id: nanoid(),
          tag: 'img',
          type: 'image',
          attributes: {
            src: 'https://via.placeholder.com/400x250',
            alt: 'Blog post image',
          },
          classNames: [],
          styles: {
            desktop: {
              width: '100%',
              height: 'auto',
              borderRadius: '12px 12px 0 0',
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
              textContent: 'Blog Post Title',
              classNames: [],
              styles: {
                desktop: {
                  fontSize: '24px',
                  fontWeight: '600',
                  marginBottom: '12px',
                },
              },
            },
            {
              id: nanoid(),
              tag: 'p',
              type: 'text',
              textContent: 'A brief excerpt from the blog post that gives readers a preview of the content...',
              classNames: [],
              styles: {
                desktop: {
                  fontSize: '16px',
                  lineHeight: '1.6',
                  color: '#6b7280',
                  marginBottom: '16px',
                },
              },
            },
            {
              id: nanoid(),
              tag: 'a',
              type: 'link',
              textContent: 'Read More →',
              attributes: { href: '#' },
              classNames: [],
              styles: {
                desktop: {
                  color: '#3b82f6',
                  textDecoration: 'none',
                  fontWeight: '500',
                },
              },
            },
          ],
          classNames: [],
          styles: {
            desktop: {
              padding: '24px',
            },
          },
        },
      ],
      classNames: [],
      styles: {
        desktop: {
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          maxWidth: '400px',
        },
      },
    }),
  },
  {
    id: 'team-member',
    name: 'Team Member',
    category: 'Misc',
    icon: '👤',
    createNode: () => ({
      id: nanoid(),
      tag: 'div',
      type: 'container',
      children: [
        {
          id: nanoid(),
          tag: 'img',
          type: 'image',
          attributes: {
            src: 'https://via.placeholder.com/200',
            alt: 'Team member',
          },
          classNames: [],
          styles: {
            desktop: {
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              margin: '0 auto 16px',
              display: 'block',
              objectFit: 'cover',
            },
          },
        },
        {
          id: nanoid(),
          tag: 'h4',
          type: 'heading',
          textContent: 'John Doe',
          classNames: [],
          styles: {
            desktop: {
              fontSize: '20px',
              fontWeight: '600',
              textAlign: 'center',
              marginBottom: '8px',
            },
          },
        },
        {
          id: nanoid(),
          tag: 'p',
          type: 'text',
          textContent: 'Co-Founder & CEO',
          classNames: [],
          styles: {
            desktop: {
              fontSize: '14px',
              color: '#6b7280',
              textAlign: 'center',
            },
          },
        },
      ],
      classNames: [],
      styles: {
        desktop: {
          textAlign: 'center',
          padding: '24px',
        },
      },
    }),
  },
];
