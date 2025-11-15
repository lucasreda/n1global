import { ComponentDefinitionV3, BlockElementV3 } from '@shared/schema';

export interface ExportedComponentLibrary {
  version: '1.0';
  exportedAt: string;
  components: ComponentDefinitionV3[];
}

export function exportComponents(components: ComponentDefinitionV3[]): string {
  const exportData: ExportedComponentLibrary = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    components,
  };
  
  return JSON.stringify(exportData, null, 2);
}

export function downloadComponentsAsJSON(components: ComponentDefinitionV3[], filename: string = 'components.json') {
  const json = exportComponents(components);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Update component ID references throughout the component tree
function updateComponentReferences(element: BlockElementV3, idMapping: Map<string, string>): BlockElementV3 {
  const updated = { ...element };
  
  // Update componentId if it's in the mapping
  if (updated.componentId && idMapping.has(updated.componentId)) {
    updated.componentId = idMapping.get(updated.componentId)!;
  }
  
  // Update instance data references
  if (updated.instanceData?.componentId && idMapping.has(updated.instanceData.componentId)) {
    updated.instanceData = {
      ...updated.instanceData,
      componentId: idMapping.get(updated.instanceData.componentId)!,
    };
  }
  
  // Recursively update children
  if (updated.children && updated.children.length > 0) {
    updated.children = updated.children.map(child => 
      updateComponentReferences(child, idMapping)
    );
  }
  
  return updated;
}

// Deduplicate component IDs with occurrence-aware remapping
export function deduplicateComponentIds(
  components: ComponentDefinitionV3[],
  existingIds: Set<string>
): ComponentDefinitionV3[] {
  const usedIds = new Set(existingIds);
  
  // Count occurrences in import
  const importedIdCounts = new Map<string, number>();
  for (const comp of components) {
    importedIdCounts.set(comp.id, (importedIdCounts.get(comp.id) || 0) + 1);
  }
  
  // Strategy: When duplicates exist, rename ALL occurrences deterministically
  // This eliminates ambiguity and ensures consistent cross-references
  
  const processedCount = new Map<string, number>();
  const globalMapping = new Map<string, string>();
  
  const deduplicated = components.map((comp, index) => {
    const originalId = comp.id;
    const occurrenceIndex = (processedCount.get(originalId) || 0) + 1;
    processedCount.set(originalId, occurrenceIndex);
    
    const conflictsWithExisting = usedIds.has(originalId);
    const hasDuplicatesInImport = importedIdCounts.get(originalId)! > 1;
    
    // Rename if conflicts OR if duplicates exist (rename ALL to avoid ambiguity)
    if (conflictsWithExisting || hasDuplicatesInImport) {
      const newId = `${originalId}_imported_${Date.now()}_${index}`;
      usedIds.add(newId);
      
      // For the first occurrence of duplicates, map originalId -> newId
      // This ensures cross-references are updated to the first renamed instance
      if (occurrenceIndex === 1) {
        globalMapping.set(originalId, newId);
      }
      
      return {
        ...comp,
        id: newId,
        name: `${comp.name} (Imported)`,
      };
    } else {
      // Unique, no conflict - keep original
      usedIds.add(originalId);
      return comp;
    }
  });
  
  // Apply global mapping to ALL components
  // This updates cross-references to renamed components
  return deduplicated.map(comp => {
    if (globalMapping.size === 0) {
      return comp;
    }
    
    const updatedElement = updateComponentReferences(comp.element, globalMapping);
    return {
      ...comp,
      element: updatedElement,
    };
  });
}

// Validate component structure recursively
function validateElement(element: any, path: string): { valid: boolean; error?: string } {
  if (!element || typeof element !== 'object') {
    return { valid: false, error: `${path}: element must be an object` };
  }
  
  if (!element.id || typeof element.id !== 'string') {
    return { valid: false, error: `${path}: missing or invalid id` };
  }
  
  if (!element.type || typeof element.type !== 'string') {
    return { valid: false, error: `${path}: missing or invalid type` };
  }
  
  // Validate children recursively
  if (element.children) {
    if (!Array.isArray(element.children)) {
      return { valid: false, error: `${path}: children must be an array` };
    }
    
    for (let i = 0; i < element.children.length; i++) {
      const childResult = validateElement(element.children[i], `${path}.children[${i}]`);
      if (!childResult.valid) {
        return childResult;
      }
    }
  }
  
  return { valid: true };
}

export function validateImportData(data: any): { valid: boolean; error?: string; components?: ComponentDefinitionV3[] } {
  try {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Invalid JSON format' };
    }
    
    if (data.version !== '1.0') {
      return { valid: false, error: 'Unsupported export version' };
    }
    
    if (!Array.isArray(data.components)) {
      return { valid: false, error: 'No components found in export data' };
    }
    
    if (data.components.length === 0) {
      return { valid: false, error: 'Export file contains no components' };
    }
    
    // Validate each component structure
    for (let i = 0; i < data.components.length; i++) {
      const comp = data.components[i];
      
      if (!comp.id || typeof comp.id !== 'string') {
        return { valid: false, error: `Component ${i + 1}: missing or invalid id` };
      }
      
      if (!comp.name || typeof comp.name !== 'string') {
        return { valid: false, error: `Component ${i + 1}: missing or invalid name` };
      }
      
      if (!comp.element || typeof comp.element !== 'object') {
        return { valid: false, error: `Component ${i + 1}: missing or invalid element` };
      }
      
      // Validate element structure recursively
      const elementResult = validateElement(comp.element, `Component ${i + 1}.element`);
      if (!elementResult.valid) {
        return elementResult;
      }
    }
    
    return { valid: true, components: data.components as ComponentDefinitionV3[] };
  } catch (error) {
    return { valid: false, error: 'Failed to parse import data' };
  }
}

export function importComponentsFromJSON(jsonString: string): { valid: boolean; error?: string; components?: ComponentDefinitionV3[] } {
  try {
    const data = JSON.parse(jsonString);
    return validateImportData(data);
  } catch (error) {
    return { valid: false, error: 'Invalid JSON file' };
  }
}
