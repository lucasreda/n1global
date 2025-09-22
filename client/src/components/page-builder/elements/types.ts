import { BlockElement, PageModelV2 } from "@shared/schema";

export interface ElementProps {
  element: BlockElement;
  theme: PageModelV2['theme'];
  editorMode?: boolean;
  onUpdate?: (updates: Partial<BlockElement>) => void;
  onSelect?: () => void;
  isSelected?: boolean;
  viewport?: 'desktop' | 'tablet' | 'mobile';
}

export interface ElementToolbarProps {
  element: BlockElement;
  onUpdate: (updates: Partial<BlockElement>) => void;
  onDelete: () => void;
  position: { x: number; y: number };
}

export interface ElementConfig {
  type: BlockElement['type'];
  label: string;
  icon: string;
  category: 'basic' | 'media' | 'form' | 'layout';
  defaultProps: Partial<BlockElement>;
  allowedIn: ('section' | 'column')[];
}