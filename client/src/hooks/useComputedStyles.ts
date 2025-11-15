import { useState, useEffect } from 'react';
import { PageNodeV4 } from '@shared/schema';

export interface ComputedStylesMap {
  [property: string]: string;
}

export interface ComputedStylesResult {
  computedStyles: ComputedStylesMap;
  hasOverrides: { [property: string]: boolean };
  isFromClasses: boolean;
}

const STYLE_PROPERTIES = [
  'backgroundColor',
  'color',
  'fontSize',
  'fontWeight',
  'fontFamily',
  'lineHeight',
  'textAlign',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'border',
  'borderRadius',
  'width',
  'height',
  'display',
  'flexDirection',
  'justifyContent',
  'alignItems',
  'gap',
  'gridTemplateColumns',
  'gridTemplateRows',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'zIndex',
  'opacity',
  'boxShadow',
  'textDecoration',
  'textTransform',
  'letterSpacing',
] as const;

export function useComputedStyles(
  selectedNode: PageNodeV4 | null,
  breakpoint: 'desktop' | 'tablet' | 'mobile'
): ComputedStylesResult {
  const [computedStyles, setComputedStyles] = useState<ComputedStylesMap>({});
  const [hasOverrides, setHasOverrides] = useState<{ [property: string]: boolean }>({});

  useEffect(() => {
    if (!selectedNode) {
      setComputedStyles({});
      setHasOverrides({});
      return;
    }

    // Small delay to ensure DOM is updated with latest styles
    const timeoutId = setTimeout(() => {
      // Find the DOM element by data-node-id
      const element = document.querySelector(`[data-node-id="${selectedNode.id}"]`) as HTMLElement;
      if (!element) {
        console.warn(`Element not found for node ${selectedNode.id}`);
        setComputedStyles({});
        setHasOverrides({});
        return;
      }

      // Get computed styles from the rendered element
      const computed = window.getComputedStyle(element);
      const styles: ComputedStylesMap = {};
      const overrides: { [property: string]: boolean } = {};

      // Extract relevant style properties
      STYLE_PROPERTIES.forEach(prop => {
        const cssProperty = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        const value = computed.getPropertyValue(cssProperty);
        
        // Include all non-empty values
        if (value && value !== '') {
          styles[prop] = value;
        }

        // Check if this property has an override in node.styles
        const nodeStyles = selectedNode.styles?.[breakpoint];
        if (nodeStyles && nodeStyles[prop] !== undefined) {
          overrides[prop] = true;
        }
      });

      setComputedStyles(styles);
      setHasOverrides(overrides);
    }, 100); // Small delay to ensure CSS is applied

    return () => clearTimeout(timeoutId);
  }, [selectedNode, breakpoint]);

  const isFromClasses = selectedNode 
    ? !!(selectedNode.classNames && selectedNode.classNames.length > 0)
    : false;

  return {
    computedStyles,
    hasOverrides,
    isFromClasses,
  };
}
