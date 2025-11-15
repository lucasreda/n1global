import { PageNodeV4 } from '@shared/schema';

export interface ControlGroup {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  shouldShow: (node: PageNodeV4) => boolean;
  priority: number; // Lower number = higher priority
}

// Text elements that support textContent
const TEXT_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'label', 'button', 'text'];

// Image elements
const IMAGE_TAGS = ['img'];

// Container elements that support children
const CONTAINER_TAGS = ['div', 'section', 'article', 'main', 'header', 'footer', 'nav', 'aside'];

// Form elements
const FORM_TAGS = ['input', 'textarea', 'select', 'button', 'form'];

// Check if node has text content
function hasTextContent(node: PageNodeV4): boolean {
  return TEXT_TAGS.includes(node.tag) && node.textContent !== undefined;
}

// Check if node is an image
function isImage(node: PageNodeV4): boolean {
  return IMAGE_TAGS.includes(node.tag);
}

// Check if node is a container
function isContainer(node: PageNodeV4): boolean {
  return CONTAINER_TAGS.includes(node.tag) || (node.children && node.children.length > 0);
}

// Check if node has custom attributes
function hasCustomAttributes(node: PageNodeV4): boolean {
  return node.attributes && Object.keys(node.attributes).length > 0;
}

// Check if node has CSS classes
function hasCSSClasses(node: PageNodeV4): boolean {
  return node.classNames && node.classNames.length > 0;
}

// Check if node has responsive styles
function hasResponsiveStyles(node: PageNodeV4): boolean {
  if (!node.styles) return false;
  return !!(node.styles.desktop || node.styles.tablet || node.styles.mobile);
}

// Check if node has inline styles
function hasInlineStyles(node: PageNodeV4): boolean {
  return node.inlineStyles && Object.keys(node.inlineStyles).length > 0;
}

// Check if node supports pseudo-classes
function supportsPseudoClasses(node: PageNodeV4): boolean {
  return node.states !== undefined || node.tag === 'button' || node.tag === 'a' || TEXT_TAGS.includes(node.tag);
}

// Control groups with intelligent detection
export const CONTROL_GROUPS: ControlGroup[] = [
  {
    id: 'content',
    label: 'Content',
    shouldShow: (node) => {
      // Show for images (has ImageControls)
      if (isImage(node)) return true;
      // Show for text elements (has textContent)
      if (hasTextContent(node)) return true;
      // Show if has custom attributes
      if (hasCustomAttributes(node)) return true;
      // Show if has CSS classes
      if (hasCSSClasses(node)) return true;
      return false;
    },
    priority: 1,
  },
  {
    id: 'layout',
    label: 'Layout',
    shouldShow: () => true, // All elements can have layout
    priority: 2,
  },
  {
    id: 'styles',
    label: 'Styles',
    shouldShow: (node) => {
      // Show if has responsive styles or inline styles
      return hasResponsiveStyles(node) || hasInlineStyles(node) || true; // Most elements can be styled
    },
    priority: 3,
  },
  {
    id: 'typography',
    label: 'Typography',
    shouldShow: (node) => {
      // Show for text elements
      if (TEXT_TAGS.includes(node.tag)) return true;
      // Show if has font-related styles
      if (hasResponsiveStyles(node)) {
        const desktop = node.styles?.desktop;
        if (desktop && (
          desktop.fontSize ||
          desktop.fontWeight ||
          desktop.fontFamily ||
          desktop.lineHeight ||
          desktop.textAlign
        )) {
          return true;
        }
      }
      return false;
    },
    priority: 4,
  },
  {
    id: 'states',
    label: 'States',
    shouldShow: (node) => {
      // Show for interactive elements or if has states defined
      return supportsPseudoClasses(node);
    },
    priority: 5,
  },
  {
    id: 'advanced',
    label: 'Advanced',
    shouldShow: () => true, // Always show advanced
    priority: 6,
  },
];

// Get visible control groups for a node
export function getVisibleControlGroups(node: PageNodeV4 | null): ControlGroup[] {
  if (!node) return [];
  
  return CONTROL_GROUPS
    .filter(group => group.shouldShow(node))
    .sort((a, b) => a.priority - b.priority);
}

// Get default active tab for a node
export function getDefaultActiveTab(node: PageNodeV4 | null): string {
  if (!node) return 'content';
  
  const visibleGroups = getVisibleControlGroups(node);
  if (visibleGroups.length === 0) return 'content';
  
  // Priority: content for images/text, layout for containers
  if (isImage(node)) return 'content';
  if (hasTextContent(node)) return 'content';
  if (isContainer(node)) return 'layout';
  
  return visibleGroups[0].id;
}



