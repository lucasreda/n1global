import { nanoid } from 'nanoid';
import type {
  BlockElementV3,
  ComponentDefinitionV3,
  ComponentInstanceData,
  ElementOverrides,
  InstanceOverridesMap,
  ValueOverride,
} from '@shared/schema';

/**
 * Component Instance Utilities
 * Implements instance resolution, override management, and sync logic
 * Following Architect plan for FASE 3.1.1
 */

// ============================================================================
// Instance Resolution - Clone base + apply overrides
// ============================================================================

/**
 * Resolves a component instance by cloning the base element and applying overrides
 * @param instanceElement - The instance element (type === 'componentInstance')
 * @param components - Available component definitions
 * @returns Resolved element tree with overrides applied
 */
export function resolveComponentInstance(
  instanceElement: BlockElementV3,
  components: ComponentDefinitionV3[]
): BlockElementV3 | null {
  if (!instanceElement.instanceData) {
    console.warn('resolveComponentInstance: element has no instanceData');
    return null;
  }

  const { componentId, overrides } = instanceElement.instanceData;
  
  // Find base component
  const baseComponent = components.find(c => c.id === componentId);
  if (!baseComponent) {
    console.warn(`resolveComponentInstance: component not found: ${componentId}`);
    return null;
  }

  // Deep clone base element
  const resolved = deepCloneElement(baseComponent.element);
  
  // Apply overrides recursively
  applyOverridesToTree(resolved, overrides);
  
  return resolved;
}

/**
 * Deep clone an element tree (prevents mutation of base component)
 */
function deepCloneElement(element: BlockElementV3): BlockElementV3 {
  return JSON.parse(JSON.stringify(element));
}

/**
 * Recursively apply overrides to an element tree
 */
function applyOverridesToTree(
  element: BlockElementV3,
  overrides: InstanceOverridesMap
): void {
  const elementOverrides = overrides[element.id];
  
  if (elementOverrides) {
    // Apply prop overrides
    if (elementOverrides.props && element.props) {
      for (const [key, override] of Object.entries(elementOverrides.props)) {
        if (override.isOverridden) {
          element.props[key] = override.value;
        }
      }
    }
    
    // Apply style overrides (responsive)
    if (elementOverrides.styles && element.styles) {
      applyResponsiveOverrides(element.styles, elementOverrides.styles);
    }
    
    // Apply state overrides
    if (elementOverrides.states && element.states) {
      applyStateOverrides(element.states, elementOverrides.states);
    }
    
    // Apply content override
    if (elementOverrides.content?.isOverridden && element.props) {
      element.props.content = elementOverrides.content.value;
    }
    
    // Apply visibility override
    if (elementOverrides.visible?.isOverridden && element.settings) {
      element.settings.visible = elementOverrides.visible.value;
    }
  }
  
  // Recursively apply to children
  if (element.children) {
    for (const child of element.children) {
      applyOverridesToTree(child, overrides);
    }
  }
}

/**
 * Apply responsive style overrides
 */
function applyResponsiveOverrides(
  baseStyles: any,
  overrideStyles: ElementOverrides['styles']
): void {
  if (!overrideStyles) return;
  
  const breakpoints = ['desktop', 'tablet', 'mobile'] as const;
  
  for (const breakpoint of breakpoints) {
    const bpOverrides = overrideStyles[breakpoint];
    if (!bpOverrides) continue;
    
    if (!baseStyles[breakpoint]) {
      baseStyles[breakpoint] = {};
    }
    
    for (const [key, override] of Object.entries(bpOverrides)) {
      if (override.isOverridden) {
        baseStyles[breakpoint][key] = override.value;
      }
    }
  }
}

/**
 * Apply state style overrides
 */
function applyStateOverrides(
  baseStates: any,
  overrideStates: ElementOverrides['states']
): void {
  if (!overrideStates) return;
  
  const states = ['default', 'hover', 'focus', 'active', 'disabled'] as const;
  
  for (const state of states) {
    const stateOverrides = overrideStates[state];
    if (!stateOverrides) continue;
    
    if (!baseStates[state]) {
      baseStates[state] = {};
    }
    
    for (const [key, override] of Object.entries(stateOverrides)) {
      if (override.isOverridden) {
        baseStates[state][key] = override.value;
      }
    }
  }
}

// ============================================================================
// Instance Creation
// ============================================================================

/**
 * Create a new component instance from a component definition
 * @param component - The base component definition
 * @returns Instance element with instanceData
 */
export function createComponentInstance(
  component: ComponentDefinitionV3
): BlockElementV3 {
  const instanceId = nanoid();
  
  return {
    id: nanoid(),
    type: 'componentInstance',
    instanceData: {
      componentId: component.id,
      instanceId,
      overrides: {},
      lastSyncedAt: new Date().toISOString(),
    },
  };
}

// ============================================================================
// Override Management
// ============================================================================

/**
 * Apply element updates as overrides to an instance
 * Converts Partial<BlockElement> updates into override structure
 */
export function setOverridesFromElementUpdates(
  element: BlockElement | BlockElementV3,
  updates: Partial<BlockElement>
): BlockElement | BlockElementV3 {
  if (!element.instanceData) {
    // Not an instance - return element with updates directly merged
    return { ...element, ...updates };
  }
  
  const instanceData = { ...element.instanceData };
  const elementId = element.id;
  
  // Initialize overrides if needed
  if (!instanceData.overrides[elementId]) {
    instanceData.overrides[elementId] = {};
  }
  
  const elementOverrides = { ...instanceData.overrides[elementId] };
  
  // Handle styles updates
  if (updates.styles) {
    if (!elementOverrides.styles) {
      elementOverrides.styles = {};
    }
    
    const stylesOverrides = { ...elementOverrides.styles };
    
    // Check if responsive or flat styles
    const hasBreakpoints = Object.keys(updates.styles).some(k => 
      ['desktop', 'tablet', 'mobile'].includes(k)
    );
    
    if (hasBreakpoints) {
      // Responsive styles
      for (const [breakpoint, bpStyles] of Object.entries(updates.styles)) {
        if (['desktop', 'tablet', 'mobile'].includes(breakpoint) && bpStyles) {
          if (!stylesOverrides[breakpoint]) {
            stylesOverrides[breakpoint] = {};
          }
          
          for (const [key, value] of Object.entries(bpStyles)) {
            stylesOverrides[breakpoint][key] = { value, isOverridden: true };
          }
        }
      }
    } else {
      // Flat styles - assume desktop
      if (!stylesOverrides.desktop) {
        stylesOverrides.desktop = {};
      }
      
      for (const [key, value] of Object.entries(updates.styles)) {
        stylesOverrides.desktop[key] = { value, isOverridden: true };
      }
    }
    
    elementOverrides.styles = stylesOverrides;
  }
  
  // Handle props updates
  if (updates.props) {
    if (!elementOverrides.props) {
      elementOverrides.props = {};
    }
    
    for (const [key, value] of Object.entries(updates.props)) {
      elementOverrides.props[key] = { value, isOverridden: true };
    }
  }
  
  // Update instance data
  instanceData.overrides[elementId] = elementOverrides;
  
  return {
    ...element,
    instanceData,
  };
}

/**
 * Set an override on a specific element within an instance
 */
export function setOverride(
  instanceData: ComponentInstanceData,
  elementId: string,
  category: keyof ElementOverrides,
  key: string,
  value: any
): ComponentInstanceData {
  const overrides = { ...instanceData.overrides };
  
  if (!overrides[elementId]) {
    overrides[elementId] = {};
  }
  
  const elementOverrides = { ...overrides[elementId] };
  
  if (category === 'props' || category === 'content' || category === 'visible') {
    // Simple value override
    elementOverrides[category] = { value, isOverridden: true } as any;
  } else if (category === 'styles' || category === 'states') {
    // Nested override (breakpoint or state)
    const parts = key.split('.');
    if (parts.length === 2) {
      const [breakpointOrState, property] = parts;
      
      if (!elementOverrides[category]) {
        elementOverrides[category] = {};
      }
      
      const nested = { ...(elementOverrides[category] as any) };
      if (!nested[breakpointOrState]) {
        nested[breakpointOrState] = {};
      }
      
      nested[breakpointOrState][property] = { value, isOverridden: true };
      (elementOverrides[category] as any) = nested;
    }
  }
  
  overrides[elementId] = elementOverrides;
  
  return {
    ...instanceData,
    overrides,
  };
}

/**
 * Reset an override (remove it, revert to base component value)
 */
export function resetOverride(
  instanceData: ComponentInstanceData,
  elementId: string,
  category: keyof ElementOverrides,
  key?: string
): ComponentInstanceData {
  const overrides = { ...instanceData.overrides };
  
  if (!overrides[elementId]) {
    return instanceData;
  }
  
  const elementOverrides = { ...overrides[elementId] };
  
  if (!key) {
    // Reset entire category
    delete elementOverrides[category];
  } else {
    // Reset specific key
    if (category === 'styles' || category === 'states') {
      const parts = key.split('.');
      if (parts.length === 2) {
        const [breakpointOrState, property] = parts;
        const nested = { ...(elementOverrides[category] as any) };
        
        if (nested[breakpointOrState]) {
          const breakpointObj = { ...nested[breakpointOrState] };
          delete breakpointObj[property];
          
          if (Object.keys(breakpointObj).length === 0) {
            delete nested[breakpointOrState];
          } else {
            nested[breakpointOrState] = breakpointObj;
          }
        }
        
        (elementOverrides[category] as any) = nested;
      }
    } else {
      delete (elementOverrides as any)[key];
    }
  }
  
  // Clean up empty override object
  if (Object.keys(elementOverrides).length === 0) {
    delete overrides[elementId];
  } else {
    overrides[elementId] = elementOverrides;
  }
  
  return {
    ...instanceData,
    overrides,
  };
}

/**
 * Reset all overrides for an element
 */
export function resetAllOverrides(
  instanceData: ComponentInstanceData,
  elementId: string
): ComponentInstanceData {
  const overrides = { ...instanceData.overrides };
  delete overrides[elementId];
  
  return {
    ...instanceData,
    overrides,
  };
}

/**
 * Detach instance from component (convert to standalone element)
 * Returns the resolved element tree without instance metadata
 */
export function detachInstance(
  instanceElement: BlockElementV3,
  components: ComponentDefinitionV3[]
): BlockElementV3 | null {
  const resolved = resolveComponentInstance(instanceElement, components);
  
  if (!resolved) {
    return null;
  }
  
  // Remove instance metadata
  delete resolved.instanceData;
  
  // Regenerate all IDs to avoid conflicts
  regenerateIds(resolved);
  
  return resolved;
}

/**
 * Regenerate all IDs in an element tree
 */
function regenerateIds(element: BlockElementV3): void {
  element.id = nanoid();
  
  if (element.children) {
    for (const child of element.children) {
      regenerateIds(child);
    }
  }
}

// ============================================================================
// Instance Detection & Helpers
// ============================================================================

/**
 * Check if an element is a component instance
 */
export function isComponentInstance(element: BlockElementV3): boolean {
  return element.type === 'componentInstance' && !!element.instanceData;
}

/**
 * Get all instances of a specific component in a page model
 */
export function findComponentInstances(
  sections: any[],
  componentId: string
): BlockElementV3[] {
  const instances: BlockElementV3[] = [];
  
  function traverse(element: BlockElementV3) {
    if (isComponentInstance(element) && element.instanceData?.componentId === componentId) {
      instances.push(element);
    }
    
    if (element.children) {
      for (const child of element.children) {
        traverse(child);
      }
    }
  }
  
  // Traverse all sections
  for (const section of sections) {
    if (section.rows) {
      for (const row of section.rows) {
        if (row.columns) {
          for (const column of row.columns) {
            if (column.elements) {
              for (const element of column.elements) {
                traverse(element);
              }
            }
          }
        }
      }
    }
  }
  
  return instances;
}

/**
 * Check if an override exists for a specific property
 */
export function hasOverride(
  instanceData: ComponentInstanceData,
  elementId: string,
  category: keyof ElementOverrides,
  key?: string
): boolean {
  const elementOverrides = instanceData.overrides[elementId];
  if (!elementOverrides) return false;
  
  if (!key) {
    return !!elementOverrides[category];
  }
  
  if (category === 'styles' || category === 'states') {
    const parts = key.split('.');
    if (parts.length === 2) {
      const [breakpointOrState, property] = parts;
      const nested = (elementOverrides[category] as any)?.[breakpointOrState];
      return nested?.[property]?.isOverridden === true;
    }
  }
  
  return (elementOverrides as any)[key]?.isOverridden === true;
}

// ============================================================================
// Props & Variants System
// ============================================================================

/**
 * Get prop value with fallback to default
 */
export function getPropValue(
  componentDef: ComponentDefinitionV3,
  instanceData: ComponentInstanceData | undefined,
  propKey: string
): any {
  // First check instance's propValues
  if (instanceData?.propValues?.[propKey] !== undefined) {
    return instanceData.propValues[propKey];
  }
  
  // Fallback to component's default value
  const prop = componentDef.props?.find(p => p.key === propKey);
  return prop?.defaultValue;
}

/**
 * Apply custom prop values to a resolved element tree
 * This applies prop bindings defined in component definition
 */
export function applyPropsToElement(
  element: BlockElementV3,
  componentDef: ComponentDefinitionV3,
  instanceData: ComponentInstanceData | undefined
): void {
  if (!componentDef.props) return;
  
  for (const prop of componentDef.props) {
    if (!prop.bindTo) continue;
    
    const value = getPropValue(componentDef, instanceData, prop.key);
    if (value === undefined) continue;
    
    const { elementId, property } = prop.bindTo;
    
    // Apply to element tree recursively
    function applyToTree(el: BlockElementV3): void {
      if (el.id === elementId) {
        // Parse property path (e.g., "props.content", "styles.desktop.backgroundColor")
        const parts = property.split('.');
        let target: any = el;
        
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!target[part]) {
            target[part] = {};
          }
          target = target[part];
        }
        
        const lastPart = parts[parts.length - 1];
        target[lastPart] = value;
      }
      
      if (el.children) {
        for (const child of el.children) {
          applyToTree(child);
        }
      }
    }
    
    applyToTree(element);
  }
}

/**
 * Resolve the variant element based on selected variant
 * Returns the variant element if a match is found, otherwise returns base element
 */
export function resolveVariantElement(
  componentDef: ComponentDefinitionV3,
  instanceData: ComponentInstanceData | undefined
): BlockElementV3 {
  // No variant selected or no variants defined
  if (!instanceData?.selectedVariant || !componentDef.variants || componentDef.variants.length === 0) {
    return componentDef.element;
  }
  
  // Find matching variant combination
  const selectedProps = instanceData.selectedVariant;
  const matchingVariant = componentDef.variants.find(v => {
    // Check if all properties match
    for (const [key, value] of Object.entries(selectedProps)) {
      if (v.properties[key] !== value) {
        return false;
      }
    }
    return true;
  });
  
  return matchingVariant ? matchingVariant.element : componentDef.element;
}

/**
 * Inject slot content into the element tree
 * Replaces elements with type='slot' with custom or default content
 */
function injectSlotContent(
  element: BlockElementV3,
  componentDef: ComponentDefinitionV3,
  instanceData: ComponentInstanceData
): void {
  if (!element.children) return;

  // Process children to replace slot elements
  const processedChildren: BlockElementV3[] = [];
  
  for (const child of element.children) {
    // Check if this is a slot element
    if (child.type === 'slot' && child.slotName) {
      const slotName = child.slotName;
      
      // Find custom slot content from instance
      const customContent = instanceData.slotContents?.find(
        sc => sc.slotName === slotName
      );
      
      if (customContent && customContent.elements.length > 0) {
        // Use custom content
        processedChildren.push(...customContent.elements);
      } else {
        // Try to use default content from component definition
        const slotDef = componentDef.slots?.find(s => s.slotName === slotName);
        if (slotDef?.defaultContent && slotDef.defaultContent.length > 0) {
          processedChildren.push(...slotDef.defaultContent);
        }
        // If no custom or default content, slot is empty (don't add anything)
      }
    } else {
      // Not a slot, keep as is
      processedChildren.push(child);
      // Recursively process this child's children
      injectSlotContent(child, componentDef, instanceData);
    }
  }
  
  element.children = processedChildren;
}

/**
 * Check if a component instance needs to sync with its base definition
 * Returns true if the component was updated after the instance's last sync
 */
export function needsSync(
  instanceData: ComponentInstanceData,
  componentDef: ComponentDefinitionV3
): boolean {
  if (!instanceData.lastSyncedAt || !componentDef.updatedAt) {
    return false;
  }
  
  const lastSync = new Date(instanceData.lastSyncedAt);
  const lastUpdate = new Date(componentDef.updatedAt);
  
  return lastUpdate > lastSync;
}

/**
 * Sync a component instance with the latest base definition
 * Preserves existing overrides while adopting new base structure
 * @returns Updated instanceData with refreshed sync timestamp
 */
export function syncInstance(
  instanceData: ComponentInstanceData,
  componentDef: ComponentDefinitionV3
): ComponentInstanceData {
  return {
    ...instanceData,
    lastSyncedAt: new Date().toISOString(),
  };
}

/**
 * Enhanced resolveComponentInstance that supports props, variants, and slots
 */
export function resolveComponentInstanceWithPropsAndVariants(
  instanceElement: BlockElementV3,
  components: ComponentDefinitionV3[]
): BlockElementV3 | null {
  if (!instanceElement.instanceData) {
    console.warn('resolveComponentInstance: element has no instanceData');
    return null;
  }

  const { componentId, overrides } = instanceElement.instanceData;
  
  // Find base component
  const baseComponent = components.find(c => c.id === componentId);
  if (!baseComponent) {
    console.warn(`resolveComponentInstance: component not found: ${componentId}`);
    return null;
  }

  // Step 1: Resolve variant (if any)
  const variantElement = resolveVariantElement(baseComponent, instanceElement.instanceData);
  
  // Step 2: Deep clone variant element
  const resolved = deepCloneElement(variantElement);
  
  // Step 3: Inject slot content (before props, so props can override slot content if needed)
  injectSlotContent(resolved, baseComponent, instanceElement.instanceData);
  
  // Step 4: Apply custom props
  applyPropsToElement(resolved, baseComponent, instanceElement.instanceData);
  
  // Step 5: Apply overrides recursively
  applyOverridesToTree(resolved, overrides);
  
  return resolved;
}
