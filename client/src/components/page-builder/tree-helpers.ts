import { PageNodeV4 } from '@shared/schema';

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

export function canAcceptChild(node: PageNodeV4): boolean {
  const containerTypes = ['container', 'section', 'header', 'footer', 'nav', 'main', 'aside', 'article'];
  return containerTypes.includes(node.type) || 
         ['div', 'section', 'header', 'footer', 'nav', 'main', 'aside', 'article', 'ul', 'ol'].includes(node.tag);
}
