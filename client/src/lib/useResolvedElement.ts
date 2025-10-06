import { useMemo } from 'react';
import type { BlockElement, ComponentDefinitionV3 } from '@shared/schema';
import { 
  resolveComponentInstance, 
  resolveComponentInstanceWithPropsAndVariants,
  isComponentInstance 
} from './componentInstance';

/**
 * Hook to resolve component instances at render time
 * Returns the resolved element tree with overrides applied
 * Falls back to original element if not an instance
 * 
 * Implements memoization for performance - only re-resolves when dependencies change
 */
export function useResolvedElement(
  element: BlockElement | null,
  components: ComponentDefinitionV3[]
): BlockElement | null {
  return useMemo(() => {
    if (!element) return null;
    
    // If it's a component instance, resolve it (with props & variants support)
    if (isComponentInstance(element as any)) {
      const resolved = resolveComponentInstanceWithPropsAndVariants(element as any, components);
      if (resolved) {
        // Preserve the original element ID for selection tracking
        resolved.id = element.id;
        // Keep instanceData for property editing awareness
        resolved.instanceData = element.instanceData;
        return resolved as BlockElement;
      }
      // If resolution fails, log warning and fall back to original
      console.warn(`Failed to resolve component instance: ${element.id}`);
      return element;
    }
    
    // Not an instance, return as-is
    return element;
  }, [element, components]);
}

/**
 * Resolve all component instances in an array of elements
 * Used for rendering lists of elements (columns, children, etc.)
 */
export function useResolvedElements(
  elements: BlockElement[] | undefined,
  components: ComponentDefinitionV3[]
): BlockElement[] {
  return useMemo(() => {
    if (!elements) return [];
    
    return elements.map(element => {
      if (isComponentInstance(element as any)) {
        const resolved = resolveComponentInstanceWithPropsAndVariants(element as any, components);
        if (resolved) {
          // Preserve original ID and instanceData
          resolved.id = element.id;
          resolved.instanceData = element.instanceData;
          return resolved as BlockElement;
        }
        console.warn(`Failed to resolve component instance: ${element.id}`);
        return element;
      }
      return element;
    });
  }, [elements, components]);
}

/**
 * Check if an element or its children contain unresolved instances
 * Useful for debugging and validation
 */
export function hasUnresolvedInstances(
  element: BlockElement,
  components: ComponentDefinitionV3[]
): boolean {
  if (isComponentInstance(element as any)) {
    const resolved = resolveComponentInstanceWithPropsAndVariants(element as any, components);
    if (!resolved) return true;
  }
  
  if (element.children) {
    return element.children.some(child => 
      hasUnresolvedInstances(child, components)
    );
  }
  
  return false;
}
