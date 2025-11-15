import { describe, it, expect } from '@jest/globals';
import {
  isPageModelV2,
  isPageModelV3,
  convertV2toV3,
  convertV3toV2,
  ensurePageModelV3
} from '../pageModelAdapter';
import { PageModelV2, PageModelV3 } from '../schema';

describe('PageModel Adapter - V2 ↔ V3 Conversion', () => {
  const sampleV2: PageModelV2 = {
    version: 2,
    layout: 'single_page',
    sections: [
      {
        id: 'section_1',
        type: 'hero',
        name: 'Hero Section',
        rows: [
          {
            id: 'row_1',
            columns: [
              {
                id: 'col_1',
                width: 'full',
                elements: [
                  {
                    id: 'el_1',
                    type: 'heading',
                    props: { level: 1 },
                    content: { text: 'Welcome' },
                    styles: {
                      fontSize: '3rem',
                      fontWeight: 'bold',
                      color: '#333'
                    },
                    config: {}
                  }
                ],
                styles: {}
              }
            ],
            styles: {}
          }
        ],
        styles: { padding: '4rem 0' },
        settings: { containerWidth: 'container' }
      }
    ],
    theme: {
      colors: {
        primary: '#0066ff',
        secondary: '#6c757d',
        accent: '#ff6b6b',
        background: '#ffffff',
        text: '#212529',
        muted: '#999'
      },
      typography: {
        headingFont: 'Inter, sans-serif',
        bodyFont: 'Inter, sans-serif',
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
          '4xl': '2.25rem'
        }
      },
      spacing: {
        xs: '0.5rem',
        sm: '1rem',
        md: '1.5rem',
        lg: '2rem',
        xl: '3rem',
        '2xl': '4rem'
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.5rem',
        lg: '1rem'
      }
    },
    seo: {
      title: 'Test Page',
      description: 'Test description'
    },
    settings: {
      containerMaxWidth: '1200px',
      enableAnimations: true
    }
  };

  it('should detect PageModelV2 correctly', () => {
    expect(isPageModelV2(sampleV2)).toBe(true);
    expect(isPageModelV3(sampleV2)).toBe(false);
  });

  it('should convert V2 to V3 correctly', () => {
    const v3 = convertV2toV3(sampleV2);
    
    expect(v3.version).toBe('3.0');
    expect(v3.meta.title).toBe('Test Page');
    expect(v3.meta.description).toBe('Test description');
    expect(v3.sections).toHaveLength(1);
    expect(v3.sections[0].id).toBe('section_1');
    expect(v3.designTokens).toBeDefined();
    expect(v3.designTokens?.colors?.primary?.['500']).toBe('#0066ff');
  });

  it('should convert V3 to V2 correctly', () => {
    const v3 = convertV2toV3(sampleV2);
    const v2 = convertV3toV2(v3);
    
    expect(v2.version).toBe(2);
    expect(v2.seo.title).toBe('Test Page');
    expect(v2.seo.description).toBe('Test description');
    expect(v2.sections).toHaveLength(1);
    expect(v2.sections[0].id).toBe('section_1');
    expect(v2.theme.colors.primary).toBe('#0066ff');
  });

  it('should preserve section structure in V2→V3 conversion', () => {
    const v3 = convertV2toV3(sampleV2);
    
    expect(v3.sections[0].rows).toHaveLength(1);
    expect(v3.sections[0].rows[0].columns).toHaveLength(1);
    expect(v3.sections[0].rows[0].columns[0].elements).toHaveLength(1);
    
    const element = v3.sections[0].rows[0].columns[0].elements[0];
    expect(element.id).toBe('el_1');
    expect(element.type).toBe('heading');
    expect(element.styles?.desktop?.fontSize).toBe('3rem');
  });

  it('should preserve section structure in V3→V2 conversion', () => {
    const v3 = convertV2toV3(sampleV2);
    const v2 = convertV3toV2(v3);
    
    expect(v2.sections[0].rows).toHaveLength(1);
    expect(v2.sections[0].rows[0].columns).toHaveLength(1);
    expect(v2.sections[0].rows[0].columns[0].elements).toHaveLength(1);
    
    const element = v2.sections[0].rows[0].columns[0].elements[0];
    expect(element.id).toBe('el_1');
    expect(element.type).toBe('heading');
    expect(element.styles.fontSize).toBe('3rem');
  });

  it('should handle responsive styles in V3', () => {
    const v3 = convertV2toV3(sampleV2);
    const element = v3.sections[0].rows[0].columns[0].elements[0];
    
    expect(element.styles).toBeDefined();
    expect(element.styles?.desktop).toBeDefined();
    expect(element.styles?.desktop?.fontSize).toBe('3rem');
  });

  it('should auto-convert via ensurePageModelV3', () => {
    const v3 = ensurePageModelV3(sampleV2);
    
    expect(isPageModelV3(v3)).toBe(true);
    expect(v3.version).toBe('3.0');
    expect(v3.meta.title).toBe('Test Page');
  });

  it('should detect PageModelV3 correctly', () => {
    const v3 = convertV2toV3(sampleV2);
    
    expect(isPageModelV3(v3)).toBe(true);
    expect(isPageModelV2(v3)).toBe(false);
  });

  it('should be idempotent for V3→V2→V3', () => {
    const v3_1 = convertV2toV3(sampleV2);
    const v2 = convertV3toV2(v3_1);
    const v3_2 = convertV2toV3(v2);
    
    expect(v3_1.sections[0].id).toBe(v3_2.sections[0].id);
    expect(v3_1.meta.title).toBe(v3_2.meta.title);
  });

  // REGRESSION TESTS for content preservation
  describe('Content Preservation', () => {
    it('should preserve heading text in V3→V2 conversion', () => {
      const v3 = convertV2toV3(sampleV2);
      const v2 = convertV3toV2(v3);
      
      const element = v2.sections[0].rows[0].columns[0].elements[0];
      expect(element.content.text).toBe('Welcome');
    });

    it('should preserve button labels in V3→V2 conversion', () => {
      const v2WithButton: PageModelV2 = {
        ...sampleV2,
        sections: [{
          ...sampleV2.sections[0],
          rows: [{
            ...sampleV2.sections[0].rows[0],
            columns: [{
              ...sampleV2.sections[0].rows[0].columns[0],
              elements: [{
                id: 'btn_1',
                type: 'button',
                props: { href: '/contact' },
                content: { label: 'Contact Us' },
                styles: {},
                config: {}
              }]
            }]
          }]
        }]
      };
      
      const v3 = convertV2toV3(v2WithButton);
      const v2Back = convertV3toV2(v3);
      
      const button = v2Back.sections[0].rows[0].columns[0].elements[0];
      expect(button.content.label).toBe('Contact Us');
      expect(button.content.href).toBe('/contact');
    });

    it('should preserve image src/alt in V3→V2 conversion', () => {
      const v2WithImage: PageModelV2 = {
        ...sampleV2,
        sections: [{
          ...sampleV2.sections[0],
          rows: [{
            ...sampleV2.sections[0].rows[0],
            columns: [{
              ...sampleV2.sections[0].rows[0].columns[0],
              elements: [{
                id: 'img_1',
                type: 'image',
                props: {},
                content: { 
                  src: '/images/hero.jpg',
                  alt: 'Hero image'
                },
                styles: {},
                config: {}
              }]
            }]
          }]
        }]
      };
      
      const v3 = convertV2toV3(v2WithImage);
      const v2Back = convertV3toV2(v3);
      
      const image = v2Back.sections[0].rows[0].columns[0].elements[0];
      expect(image.content.src).toBe('/images/hero.jpg');
      expect(image.content.alt).toBe('Hero image');
    });

    it('should preserve all content fields through bidirectional conversion', () => {
      // Test with multiple content types
      const v2WithMultiple: PageModelV2 = {
        ...sampleV2,
        sections: [{
          ...sampleV2.sections[0],
          rows: [{
            ...sampleV2.sections[0].rows[0],
            columns: [{
              ...sampleV2.sections[0].rows[0].columns[0],
              elements: [
                {
                  id: 'heading_1',
                  type: 'heading',
                  props: { level: 1 },
                  content: { text: 'Main Title' },
                  styles: {},
                  config: {}
                },
                {
                  id: 'text_1',
                  type: 'text',
                  props: {},
                  content: { text: 'Description paragraph' },
                  styles: {},
                  config: {}
                },
                {
                  id: 'button_1',
                  type: 'button',
                  props: { href: '/action' },
                  content: { label: 'Click Here' },
                  styles: {},
                  config: {}
                }
              ]
            }]
          }]
        }]
      };
      
      const v3 = convertV2toV3(v2WithMultiple);
      const v2Back = convertV3toV2(v3);
      
      const elements = v2Back.sections[0].rows[0].columns[0].elements;
      expect(elements[0].content.text).toBe('Main Title');
      expect(elements[1].content.text).toBe('Description paragraph');
      expect(elements[2].content.label).toBe('Click Here');
      expect(elements[2].content.href).toBe('/action');
    });
  });
});

console.log('✅ PageModel Adapter Tests - Ready to run');
console.log('Run with: npm test shared/__tests__/pageModelAdapter.test.ts');
