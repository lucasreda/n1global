import { PageNodeV4 } from '@shared/schema';
import { canAcceptChildSemantic } from './semantic-rules';

export type NodePath = number[];

export function findNodePath(nodes: PageNodeV4[], targetId: string, currentPath: NodePath = []): NodePath | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const nodePath = [...currentPath, i];
    
    if (node.id === targetId) {
      return nodePath;
    }
    
    if (node.children && node.children.length > 0) {
      const childPath = findNodePath(node.children, targetId, nodePath);
      if (childPath) {
        return childPath;
      }
    }
  }
  
  return null;
}

export function getNodeByPath(nodes: PageNodeV4[], path: NodePath): PageNodeV4 | null {
  let current: PageNodeV4[] = nodes;
  let node: PageNodeV4 | null = null;
  
  for (const index of path) {
    if (index >= current.length) return null;
    node = current[index];
    current = node.children || [];
  }
  
  return node;
}

export function getParentNode(nodes: PageNodeV4[], targetId: string): PageNodeV4 | null {
  const path = findNodePath(nodes, targetId);
  console.log('🔍 getParentNode:', { targetId, path, hasPath: !!path, pathLength: path?.length });
  
  if (!path || path.length <= 1) {
    console.log('❌ No parent (root level or invalid path)');
    return null; // Root level has no parent
  }
  
  const parentPath = path.slice(0, -1);
  const parent = getNodeByPath(nodes, parentPath);
  console.log('✅ Found parent:', parent ? { id: parent.id, tag: parent.tag } : null);
  return parent;
}

export function removeNodeByPath(nodes: PageNodeV4[], path: NodePath): PageNodeV4[] {
  if (path.length === 0) return nodes;
  
  const newNodes = JSON.parse(JSON.stringify(nodes)) as PageNodeV4[];
  
  if (path.length === 1) {
    newNodes.splice(path[0], 1);
    return newNodes;
  }
  
  let current: PageNodeV4[] = newNodes;
  for (let i = 0; i < path.length - 1; i++) {
    const node = current[path[i]];
    current = node.children || [];
  }
  
  current.splice(path[path.length - 1], 1);
  return newNodes;
}

export function removeNodeByPathWithReturn(
  nodes: PageNodeV4[], 
  path: NodePath
): { updatedTree: PageNodeV4[], removedNode: PageNodeV4 | null } {
  if (path.length === 0) return { updatedTree: nodes, removedNode: null };
  
  // First, find and extract the original node WITHOUT cloning
  let removedNode: PageNodeV4 | null = null;
  
  if (path.length === 1) {
    // Direct child of root - extract original node
    const nodeToRemove = nodes[path[0]];
    removedNode = nodeToRemove;
  } else {
    // Nested node - traverse to find original
    let current: PageNodeV4[] = nodes;
    for (let i = 0; i < path.length - 1; i++) {
      const node = current[path[i]];
      current = node.children || [];
    }
    removedNode = current[path[path.length - 1]];
  }
  
  // Now clone the tree and remove the node from the clone
  const newNodes = JSON.parse(JSON.stringify(nodes)) as PageNodeV4[];
  
  if (path.length === 1) {
    newNodes.splice(path[0], 1);
  } else {
    let current: PageNodeV4[] = newNodes;
    for (let i = 0; i < path.length - 1; i++) {
      const node = current[path[i]];
      current = node.children || [];
    }
    current.splice(path[path.length - 1], 1);
  }
  
  // Return the cloned tree (without the node) and the ORIGINAL node
  return { updatedTree: newNodes, removedNode };
}

export function insertNodeAtPath(
  nodes: PageNodeV4[], 
  path: NodePath, 
  newNode: PageNodeV4,
  position: 'before' | 'after' | 'child' = 'after'
): PageNodeV4[] {
  const newNodes = JSON.parse(JSON.stringify(nodes)) as PageNodeV4[];
  
  if (path.length === 0) {
    if (position === 'child') {
      return [...newNodes, newNode];
    }
    return [newNode, ...newNodes];
  }
  
  if (path.length === 1 && position !== 'child') {
    const insertIndex = position === 'before' ? path[0] : path[0] + 1;
    newNodes.splice(insertIndex, 0, newNode);
    return newNodes;
  }
  
  let current: PageNodeV4[] = newNodes;
  let targetNode: PageNodeV4 | null = null;
  
  for (let i = 0; i < path.length - 1; i++) {
    targetNode = current[path[i]];
    current = targetNode.children || [];
  }
  
  if (position === 'child') {
    targetNode = current[path[path.length - 1]];
    if (!targetNode.children) {
      targetNode.children = [];
    }
    targetNode.children.push(newNode);
  } else {
    const insertIndex = position === 'before' ? path[path.length - 1] : path[path.length - 1] + 1;
    current.splice(insertIndex, 0, newNode);
  }
  
  return newNodes;
}

// Legacy function - kept for backward compatibility but using semantic rules internally
export function canAcceptChild(node: PageNodeV4): boolean {
  // Simple check: just verify if the node category generally accepts children
  // This is used by droppable disabled prop
  const dummyTextChild: PageNodeV4 = {
    id: 'dummy',
    tag: 'span',
    type: 'text',
    textContent: 'test',
    classNames: [],
    attributes: {},
  };
  
  return canAcceptChildSemantic(node, dummyTextChild);
}

// New semantic validation function with parent-child context
export function canAcceptChildWithContext(parentNode: PageNodeV4, childNode: PageNodeV4): boolean {
  return canAcceptChildSemantic(parentNode, childNode);
}
