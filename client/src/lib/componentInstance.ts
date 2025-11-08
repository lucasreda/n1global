import { PageNodeV4 } from '@shared/schema';

/**
 * Check if a node is a component instance
 */
export function isComponentInstance(node: PageNodeV4 | null): boolean {
  return !!(node?.componentRef);
}

/**
 * Get the effective styles for a component instance, merging base styles with overrides
 */
export function getInstanceStyles(
  node: PageNodeV4,
  baseNode: PageNodeV4 | null,
  breakpoint: 'desktop' | 'tablet' | 'mobile'
): Record<string, any> {
  if (!baseNode || !node.instanceOverrides) {
    return node.styles?.[breakpoint] || {};
  }

  const baseStyles = baseNode.styles?.[breakpoint] || {};
  const overrideStyles = node.instanceOverrides.styles?.[breakpoint] || {};
  
  return {
    ...baseStyles,
    ...overrideStyles,
  };
}

/**
 * Get the effective attributes for a component instance
 */
export function getInstanceAttributes(
  node: PageNodeV4 | null,
  baseNode: PageNodeV4 | null
): Record<string, string> {
  if (!node) return {};
  
  if (!baseNode || !node.instanceOverrides) {
    return node.attributes || {};
  }

  const baseAttributes = baseNode.attributes || {};
  const overrideAttributes = node.instanceOverrides.attributes || {};

  // Filter out undefined values
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(baseAttributes)) {
    if (value !== undefined && value !== null) {
      result[key] = String(value);
    }
  }
  for (const [key, value] of Object.entries(overrideAttributes)) {
    if (value !== undefined && value !== null) {
      result[key] = String(value);
    }
  }
  
  return result;
}

/**
 * Get the effective text content for a component instance
 */
export function getInstanceTextContent(
  node: PageNodeV4 | null,
  baseNode: PageNodeV4 | null
): string | undefined {
  if (!node) return undefined;
  
  if (!baseNode || !node.instanceOverrides?.textContent) {
    return node.textContent;
  }

  return node.instanceOverrides.textContent;
}

/**
 * Add or update an override for a component instance
 */
export function addOverride(
  node: PageNodeV4,
  property: 'styles' | 'attributes' | 'textContent' | 'responsiveAttributes' | 'inlineStyles',
  breakpoint: 'desktop' | 'tablet' | 'mobile' | null,
  value: any
): PageNodeV4 {
  const instanceOverrides = node.instanceOverrides || {};

  if (property === 'styles' && breakpoint) {
  return {
      ...node,
      instanceOverrides: {
        ...instanceOverrides,
        styles: {
          ...instanceOverrides.styles,
          [breakpoint]: {
            ...(instanceOverrides.styles?.[breakpoint] || {}),
            ...value,
          },
        },
      },
    };
  }

  if (property === 'attributes') {
    return {
      ...node,
      instanceOverrides: {
        ...instanceOverrides,
        attributes: {
          ...instanceOverrides.attributes,
          ...value,
        },
      },
    };
  }

  if (property === 'textContent') {
    return {
      ...node,
      instanceOverrides: {
        ...instanceOverrides,
        textContent: value,
      },
    };
  }

  if (property === 'responsiveAttributes') {
    return {
      ...node,
      instanceOverrides: {
        ...instanceOverrides,
        responsiveAttributes: {
          ...instanceOverrides.responsiveAttributes,
          ...value,
        },
      },
    };
  }

  if (property === 'inlineStyles') {
    return {
      ...node,
      instanceOverrides: {
        ...instanceOverrides,
        inlineStyles: {
          ...instanceOverrides.inlineStyles,
          ...value,
        },
      },
    };
  }

  return node;
}

/**
 * Reset an override for a component instance
 */
export function resetOverride(
  node: PageNodeV4,
  property: 'styles' | 'attributes' | 'textContent' | 'responsiveAttributes' | 'inlineStyles',
  breakpoint?: 'desktop' | 'tablet' | 'mobile',
  styleKey?: string
): PageNodeV4 {
  if (!node.instanceOverrides) return node;

  const instanceOverrides = { ...node.instanceOverrides };

  if (property === 'styles' && breakpoint && styleKey) {
    // Remove specific style property override
    const bpOverrides = { ...(instanceOverrides.styles?.[breakpoint] || {}) };
    delete bpOverrides[styleKey];

    return {
      ...node,
      instanceOverrides: {
        ...instanceOverrides,
        styles: {
          ...instanceOverrides.styles,
          [breakpoint]: Object.keys(bpOverrides).length > 0 ? bpOverrides : undefined,
        },
      },
    };
  }

  if (property === 'styles' && breakpoint) {
    // Remove all overrides for this breakpoint
    const styles = { ...instanceOverrides.styles };
    delete styles[breakpoint];

    return {
      ...node,
      instanceOverrides: {
        ...instanceOverrides,
        styles: Object.keys(styles).length > 0 ? styles : undefined,
      },
    };
  }

  if (property === 'attributes' && styleKey) {
    // Remove specific attribute override
    const attributes = { ...(instanceOverrides.attributes || {}) };
    delete attributes[styleKey];

    return {
      ...node,
      instanceOverrides: {
        ...instanceOverrides,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
      },
    };
  }

  if (property === 'textContent') {
    // Remove text content override
    const { textContent, ...rest } = instanceOverrides;
    return {
      ...node,
      instanceOverrides: Object.keys(rest).length > 0 ? rest : undefined,
    };
  }

  // Remove entire override category
  const { [property]: removed, ...rest } = instanceOverrides;
  return {
    ...node,
    instanceOverrides: Object.keys(rest).length > 0 ? rest : undefined,
  };
}

/**
 * Check if a property is overridden
 */
export function isPropertyOverridden(
  node: PageNodeV4,
  property: 'styles' | 'attributes' | 'textContent' | 'responsiveAttributes' | 'inlineStyles',
  breakpoint?: 'desktop' | 'tablet' | 'mobile',
  styleKey?: string
): boolean {
  if (!node.instanceOverrides) return false;

  if (property === 'styles' && breakpoint && styleKey) {
    return !!(node.instanceOverrides.styles?.[breakpoint]?.[styleKey]);
  }

  if (property === 'styles' && breakpoint) {
    return !!(node.instanceOverrides.styles?.[breakpoint]);
  }

  if (property === 'attributes' && styleKey) {
    return !!(node.instanceOverrides.attributes?.[styleKey]);
  }

  return !!(node.instanceOverrides[property]);
}
