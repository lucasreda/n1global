import { BlockSection } from '@shared/schema';

export interface Template {
  id: string;
  name: string;
  category: 'hero' | 'features' | 'cta' | 'testimonials' | 'pricing' | 'footer' | 'other';
  description: string;
  thumbnail?: string;
  section: BlockSection;
}

export const TEMPLATE_CATEGORIES = [
  { id: 'hero', name: 'Hero Sections' },
  { id: 'features', name: 'Features' },
  { id: 'cta', name: 'Call to Action' },
  { id: 'testimonials', name: 'Testimonials' },
  { id: 'pricing', name: 'Pricing' },
  { id: 'footer', name: 'Footers' },
  { id: 'other', name: 'Other' },
] as const;

export const PREDEFINED_TEMPLATES: Template[] = [
  {
    id: 'hero-centered',
    name: 'Centered Hero',
    category: 'hero',
    description: 'Clean centered hero with heading, description and CTA button',
    section: {
      id: 'template_hero_centered',
      type: 'hero',
      name: 'Centered Hero Section',
      rows: [
        {
          id: 'row_1',
          columns: [
            {
              id: 'col_1',
              width: '12',
              elements: [
                {
                  id: 'heading_1',
                  type: 'heading',
                  props: {},
                  content: { text: 'Build Something Amazing' },
                  styles: {
                    fontSize: '3rem',
                    fontWeight: '700',
                    textAlign: 'center',
                    marginBottom: '1.5rem',
                    color: '#1a1a1a',
                  },
                },
                {
                  id: 'text_1',
                  type: 'text',
                  props: {},
                  content: { text: 'Create beautiful landing pages in minutes with our powerful visual editor' },
                  styles: {
                    fontSize: '1.25rem',
                    textAlign: 'center',
                    marginBottom: '2rem',
                    color: '#666',
                    maxWidth: '600px',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                  },
                },
                {
                  id: 'button_1',
                  type: 'button',
                  props: {},
                  content: { text: 'Get Started' },
                  styles: {
                    backgroundColor: '#3b82f6',
                    color: '#fff',
                    padding: '1rem 2rem',
                    borderRadius: '0.5rem',
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'block',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                  },
                },
              ],
              styles: {},
            },
          ],
          styles: {},
        },
      ],
      styles: {
        padding: '5rem 2rem',
        backgroundColor: '#f9fafb',
      },
      settings: {
        containerWidth: 'container',
      },
    },
  },
  {
    id: 'features-3col',
    name: '3-Column Features',
    category: 'features',
    description: 'Three column layout showcasing key features',
    section: {
      id: 'template_features_3col',
      type: 'content',
      name: '3-Column Features Section',
      rows: [
        {
          id: 'row_heading',
          columns: [
            {
              id: 'col_heading',
              width: '12',
              elements: [
                {
                  id: 'heading_1',
                  type: 'heading',
                  props: {},
                  content: { text: 'Key Features' },
                  styles: {
                    fontSize: '2.5rem',
                    fontWeight: '700',
                    textAlign: 'center',
                    marginBottom: '3rem',
                  },
                },
              ],
              styles: {},
            },
          ],
          styles: {},
        },
        {
          id: 'row_features',
          columns: [
            {
              id: 'col_1',
              width: '4',
              elements: [
                {
                  id: 'heading_2',
                  type: 'heading',
                  props: {},
                  content: { text: 'Fast Performance' },
                  styles: {
                    fontSize: '1.5rem',
                    fontWeight: '600',
                    marginBottom: '1rem',
                  },
                },
                {
                  id: 'text_2',
                  type: 'text',
                  props: {},
                  content: { text: 'Lightning fast load times for the best user experience' },
                  styles: {
                    color: '#666',
                    lineHeight: '1.6',
                  },
                },
              ],
              styles: {
                padding: '1.5rem',
              },
            },
            {
              id: 'col_2',
              width: '4',
              elements: [
                {
                  id: 'heading_3',
                  type: 'heading',
                  props: {},
                  content: { text: 'Easy to Use' },
                  styles: {
                    fontSize: '1.5rem',
                    fontWeight: '600',
                    marginBottom: '1rem',
                  },
                },
                {
                  id: 'text_3',
                  type: 'text',
                  props: {},
                  content: { text: 'Intuitive interface that anyone can master in minutes' },
                  styles: {
                    color: '#666',
                    lineHeight: '1.6',
                  },
                },
              ],
              styles: {
                padding: '1.5rem',
              },
            },
            {
              id: 'col_3',
              width: '4',
              elements: [
                {
                  id: 'heading_4',
                  type: 'heading',
                  props: {},
                  content: { text: 'Secure & Reliable' },
                  styles: {
                    fontSize: '1.5rem',
                    fontWeight: '600',
                    marginBottom: '1rem',
                  },
                },
                {
                  id: 'text_4',
                  type: 'text',
                  props: {},
                  content: { text: 'Enterprise-grade security to protect your data' },
                  styles: {
                    color: '#666',
                    lineHeight: '1.6',
                  },
                },
              ],
              styles: {
                padding: '1.5rem',
              },
            },
          ],
          styles: {
            display: 'flex',
            gap: '2rem',
          },
        },
      ],
      styles: {
        padding: '4rem 2rem',
      },
      settings: {
        containerWidth: 'container',
      },
    },
  },
  {
    id: 'cta-centered',
    name: 'Centered CTA',
    category: 'cta',
    description: 'Bold call to action with centered layout',
    section: {
      id: 'template_cta_centered',
      type: 'cta',
      name: 'Centered CTA Section',
      rows: [
        {
          id: 'row_1',
          columns: [
            {
              id: 'col_1',
              width: '12',
              elements: [
                {
                  id: 'heading_1',
                  type: 'heading',
                  props: {},
                  content: { text: 'Ready to Get Started?' },
                  styles: {
                    fontSize: '2.5rem',
                    fontWeight: '700',
                    textAlign: 'center',
                    marginBottom: '1rem',
                    color: '#fff',
                  },
                },
                {
                  id: 'text_1',
                  type: 'text',
                  props: {},
                  content: { text: 'Join thousands of satisfied customers today' },
                  styles: {
                    fontSize: '1.25rem',
                    textAlign: 'center',
                    marginBottom: '2rem',
                    color: '#e5e7eb',
                  },
                },
                {
                  id: 'button_1',
                  type: 'button',
                  props: {},
                  content: { text: 'Start Free Trial' },
                  styles: {
                    backgroundColor: '#fff',
                    color: '#3b82f6',
                    padding: '1rem 2.5rem',
                    borderRadius: '0.5rem',
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'block',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                  },
                },
              ],
              styles: {},
            },
          ],
          styles: {},
        },
      ],
      styles: {
        padding: '5rem 2rem',
        backgroundColor: '#3b82f6',
        textAlign: 'center',
      },
      settings: {
        containerWidth: 'full',
      },
    },
  },
  {
    id: 'footer-simple',
    name: 'Simple Footer',
    category: 'footer',
    description: 'Clean footer with links and copyright',
    section: {
      id: 'template_footer_simple',
      type: 'custom',
      name: 'Simple Footer Section',
      rows: [
        {
          id: 'row_1',
          columns: [
            {
              id: 'col_1',
              width: '12',
              elements: [
                {
                  id: 'text_1',
                  type: 'text',
                  props: {},
                  content: { text: '© 2024 Your Company. All rights reserved.' },
                  styles: {
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '0.875rem',
                  },
                },
              ],
              styles: {},
            },
          ],
          styles: {},
        },
      ],
      styles: {
        padding: '2rem',
        backgroundColor: '#1f2937',
        borderTop: '1px solid #374151',
      },
      settings: {
        containerWidth: 'full',
      },
    },
  },
];
