import { PageNodeV4 } from '@shared/schema';

export enum ElementCategory {
  Container = 'container',
  List = 'list',
  ListItem = 'list-item',
  Table = 'table',
  TableSection = 'table-section',
  TableRow = 'table-row',
  TableCell = 'table-cell',
  Form = 'form',
  FormField = 'form-field',
  TextBlock = 'text-block',
  TextInline = 'text-inline',
  Media = 'media',
  Input = 'input',
  Button = 'button',
  Link = 'link',
  Unknown = 'unknown',
}

export function getElementCategory(node: PageNodeV4): ElementCategory {
  const tag = node.tag.toLowerCase();
  const type = node.type?.toLowerCase();
  
  // DEBUG: Log para entender classificação
  if (tag.startsWith('h') || type === 'text' || type === 'heading') {
    console.log('🔍 getElementCategory DEBUG:', {
      tag,
      type,
      id: node.id
    });
  }

  // Container elements
  if (['div', 'section', 'article', 'main', 'aside', 'header', 'footer', 'nav'].includes(tag)) {
    return ElementCategory.Container;
  }
  if (type === 'container' || type === 'section' || type === 'column' || type === 'row' || type === 'block') {
    return ElementCategory.Container;
  }

  // List elements
  if (tag === 'ul' || tag === 'ol') {
    return ElementCategory.List;
  }
  if (tag === 'li') {
    return ElementCategory.ListItem;
  }

  // Table elements
  if (tag === 'table') {
    return ElementCategory.Table;
  }
  if (tag === 'thead' || tag === 'tbody' || tag === 'tfoot') {
    return ElementCategory.TableSection;
  }
  if (tag === 'tr') {
    return ElementCategory.TableRow;
  }
  if (tag === 'td' || tag === 'th') {
    return ElementCategory.TableCell;
  }

  // Form elements
  if (tag === 'form') {
    return ElementCategory.Form;
  }
  if (tag === 'fieldset' || tag === 'label') {
    return ElementCategory.FormField;
  }

  // Text block elements
  if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre'].includes(tag)) {
    return ElementCategory.TextBlock;
  }

  // Text inline elements
  if (['span', 'strong', 'em', 'i', 'b', 'u', 'small', 'mark', 'code'].includes(tag)) {
    return ElementCategory.TextInline;
  }
  if (tag === 'text' || type === 'text') {
    return ElementCategory.TextInline;
  }

  // Media elements
  if (['img', 'video', 'audio', 'picture', 'iframe'].includes(tag)) {
    return ElementCategory.Media;
  }
  if (type === 'image' || type === 'video') {
    return ElementCategory.Media;
  }

  // Input elements
  if (['input', 'textarea', 'select'].includes(tag)) {
    return ElementCategory.Input;
  }

  // Button
  if (tag === 'button' || type === 'button') {
    return ElementCategory.Button;
  }

  // Link
  if (tag === 'a' || type === 'link') {
    return ElementCategory.Link;
  }

  return ElementCategory.Unknown;
}

const acceptanceRules: Record<ElementCategory, ElementCategory[]> = {
  // Containers aceitam apenas elementos estruturais (não inline direto)
  [ElementCategory.Container]: [
    ElementCategory.Container,
    ElementCategory.List,
    ElementCategory.Table,
    ElementCategory.Form,
    ElementCategory.TextBlock,
    ElementCategory.Media,
    ElementCategory.Button,
    ElementCategory.Input,
    ElementCategory.FormField,
  ],
  
  // Listas aceitam apenas list items
  [ElementCategory.List]: [
    ElementCategory.ListItem,
  ],
  
  // List items aceitam conteúdo variado
  [ElementCategory.ListItem]: [
    ElementCategory.Container,
    ElementCategory.List,
    ElementCategory.TextBlock,
    ElementCategory.TextInline,
    ElementCategory.Media,
    ElementCategory.Button,
    ElementCategory.Link,
  ],
  
  // Table só aceita thead/tbody/tfoot
  [ElementCategory.Table]: [
    ElementCategory.TableSection,
  ],
  
  // Table section só aceita tr
  [ElementCategory.TableSection]: [
    ElementCategory.TableRow,
  ],
  
  // Table row só aceita td/th
  [ElementCategory.TableRow]: [
    ElementCategory.TableCell,
  ],
  
  // Table cell aceita conteúdo variado
  [ElementCategory.TableCell]: [
    ElementCategory.Container,
    ElementCategory.TextBlock,
    ElementCategory.TextInline,
    ElementCategory.Media,
    ElementCategory.Button,
    ElementCategory.Link,
  ],
  
  // Form aceita campos e containers
  [ElementCategory.Form]: [
    ElementCategory.Container,
    ElementCategory.FormField,
    ElementCategory.Input,
    ElementCategory.Button,
    ElementCategory.TextBlock,
  ],
  
  // Form field aceita inputs e labels
  [ElementCategory.FormField]: [
    ElementCategory.Input,
    ElementCategory.TextBlock,
    ElementCategory.TextInline,
  ],
  
  // Text blocks aceitam APENAS inline (CRÍTICO)
  [ElementCategory.TextBlock]: [
    ElementCategory.TextInline,
    ElementCategory.Link,
  ],
  
  // Text inline aceita outros inline
  [ElementCategory.TextInline]: [
    ElementCategory.TextInline,
  ],
  
  // Media não aceita filhos
  [ElementCategory.Media]: [],
  
  // Input não aceita filhos
  [ElementCategory.Input]: [],
  
  // Button aceita APENAS inline e media (CRÍTICO)
  [ElementCategory.Button]: [
    ElementCategory.TextInline,
    ElementCategory.Media,
  ],
  
  // Link aceita inline e media
  [ElementCategory.Link]: [
    ElementCategory.TextInline,
    ElementCategory.Media,
  ],
  
  // Unknown aceita estruturais básicos
  [ElementCategory.Unknown]: [
    ElementCategory.Container,
    ElementCategory.TextBlock,
    ElementCategory.Media,
  ],
};

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
}

export function canAcceptChild(parentNode: PageNodeV4, childNode: PageNodeV4): ValidationResult {
  const parentCategory = getElementCategory(parentNode);
  const childCategory = getElementCategory(childNode);
  
  console.log('🔍 canAcceptChild:', {
    parent: { tag: parentNode.tag, type: parentNode.type, category: parentCategory },
    child: { tag: childNode.tag, type: childNode.type, category: childCategory }
  });
  
  const allowedChildren = acceptanceRules[parentCategory] || [];
  const allowed = allowedChildren.includes(childCategory);
  
  if (!allowed) {
    return {
      allowed: false,
      reason: getDropErrorMessage(parentNode, childNode),
    };
  }
  
  return { allowed: true };
}

export function canAcceptSiblingPlacement(
  parentNode: PageNodeV4,
  newSiblingNode: PageNodeV4
): ValidationResult {
  return canAcceptChild(parentNode, newSiblingNode);
}

export function canNestWithinParent(
  childNode: PageNodeV4,
  parentNode: PageNodeV4
): ValidationResult {
  return canAcceptChild(parentNode, childNode);
}

export function canAcceptChildSemantic(parentNode: PageNodeV4, childNode: PageNodeV4): boolean {
  return canAcceptChild(parentNode, childNode).allowed;
}

export function getDropErrorMessage(parentNode: PageNodeV4, childNode: PageNodeV4): string {
  const parentCategory = getElementCategory(parentNode);
  const childCategory = getElementCategory(childNode);
  
  const messages: Record<string, string> = {
    [`${ElementCategory.Container}-${ElementCategory.TextInline}`]: 'Texto inline (span, strong, etc) deve estar dentro de um elemento de texto (p, h1-h6)',
    [`${ElementCategory.Container}-${ElementCategory.Link}`]: 'Links devem estar dentro de um elemento de texto ou botão',
    [`${ElementCategory.TextBlock}-${ElementCategory.TextBlock}`]: 'Elementos de texto (p, h1-h6) não podem conter outros elementos de texto',
    [`${ElementCategory.TextBlock}-${ElementCategory.Container}`]: 'Parágrafos e títulos só podem conter texto inline e links',
    [`${ElementCategory.TextBlock}-${ElementCategory.Button}`]: 'Botões não podem estar dentro de texto - coloque ao lado',
    [`${ElementCategory.TextBlock}-${ElementCategory.Media}`]: 'Imagens devem estar fora do texto - use um container',
    [`${ElementCategory.TextInline}-${ElementCategory.TextBlock}`]: 'Texto inline não pode conter elementos de bloco',
    [`${ElementCategory.TextInline}-${ElementCategory.Container}`]: 'Texto inline não pode conter containers',
    [`${ElementCategory.TextInline}-${ElementCategory.Button}`]: 'Texto inline não pode conter botões',
    [`${ElementCategory.Button}-${ElementCategory.TextBlock}`]: 'Botões só podem conter texto inline (span, strong) ou ícones',
    [`${ElementCategory.Button}-${ElementCategory.Container}`]: 'Botões só podem conter texto inline (span, strong) ou ícones',
    [`${ElementCategory.Button}-${ElementCategory.Button}`]: 'Botões não podem conter outros botões',
    [`${ElementCategory.Link}-${ElementCategory.TextBlock}`]: 'Links só podem conter texto inline ou ícones',
    [`${ElementCategory.Link}-${ElementCategory.Container}`]: 'Links só podem conter texto inline ou ícones',
    [`${ElementCategory.List}-${ElementCategory.Container}`]: 'Listas (ul/ol) só podem conter itens de lista (li)',
    [`${ElementCategory.List}-${ElementCategory.TextBlock}`]: 'Listas (ul/ol) só podem conter itens de lista (li)',
    [`${ElementCategory.List}-${ElementCategory.Button}`]: 'Listas (ul/ol) só podem conter itens de lista (li)',
    [`${ElementCategory.Table}-${ElementCategory.Container}`]: 'Tabelas só podem conter thead, tbody ou tfoot',
    [`${ElementCategory.TableSection}-${ElementCategory.Container}`]: 'thead/tbody só podem conter linhas (tr)',
    [`${ElementCategory.TableRow}-${ElementCategory.Container}`]: 'Linhas de tabela (tr) só podem conter células (td/th)',
    [`${ElementCategory.Media}-*`]: 'Imagens e vídeos não podem conter outros elementos',
    [`${ElementCategory.Input}-*`]: 'Inputs não podem conter outros elementos',
  };
  
  const key = `${parentCategory}-${childCategory}`;
  const wildcardKey = `${parentCategory}-*`;
  
  return messages[key] || messages[wildcardKey] || `Não é permitido colocar ${childNode.tag} dentro de ${parentNode.tag}`;
}
