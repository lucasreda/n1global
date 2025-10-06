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
  [ElementCategory.Container]: [
    ElementCategory.Container,
    ElementCategory.List,
    ElementCategory.Table,
    ElementCategory.Form,
    ElementCategory.TextBlock,
    ElementCategory.TextInline,
    ElementCategory.Media,
    ElementCategory.Button,
    ElementCategory.Link,
    ElementCategory.Input,
    ElementCategory.FormField,
  ],
  
  [ElementCategory.List]: [
    ElementCategory.ListItem,
  ],
  
  [ElementCategory.ListItem]: [
    ElementCategory.Container,
    ElementCategory.List,
    ElementCategory.TextBlock,
    ElementCategory.TextInline,
    ElementCategory.Media,
    ElementCategory.Button,
    ElementCategory.Link,
  ],
  
  [ElementCategory.Table]: [
    ElementCategory.TableSection,
  ],
  
  [ElementCategory.TableSection]: [
    ElementCategory.TableRow,
  ],
  
  [ElementCategory.TableRow]: [
    ElementCategory.TableCell,
  ],
  
  [ElementCategory.TableCell]: [
    ElementCategory.Container,
    ElementCategory.TextBlock,
    ElementCategory.TextInline,
    ElementCategory.Media,
    ElementCategory.Button,
    ElementCategory.Link,
  ],
  
  [ElementCategory.Form]: [
    ElementCategory.Container,
    ElementCategory.FormField,
    ElementCategory.Input,
    ElementCategory.Button,
    ElementCategory.TextBlock,
  ],
  
  [ElementCategory.FormField]: [
    ElementCategory.Input,
    ElementCategory.TextBlock,
    ElementCategory.TextInline,
  ],
  
  [ElementCategory.TextBlock]: [
    ElementCategory.TextInline,
    ElementCategory.Link,
  ],
  
  [ElementCategory.TextInline]: [
    ElementCategory.TextInline,
  ],
  
  [ElementCategory.Media]: [],
  
  [ElementCategory.Input]: [],
  
  [ElementCategory.Button]: [
    ElementCategory.TextInline,
    ElementCategory.Media,
  ],
  
  [ElementCategory.Link]: [
    ElementCategory.TextInline,
    ElementCategory.Media,
  ],
  
  [ElementCategory.Unknown]: [
    ElementCategory.Container,
    ElementCategory.TextBlock,
    ElementCategory.TextInline,
    ElementCategory.Media,
  ],
};

export function canAcceptChildSemantic(parentNode: PageNodeV4, childNode: PageNodeV4): boolean {
  const parentCategory = getElementCategory(parentNode);
  const childCategory = getElementCategory(childNode);
  
  console.log('🔍 canAcceptChildSemantic:', {
    parentTag: parentNode.tag,
    parentCategory,
    childTag: childNode.tag,
    childCategory,
  });
  
  const allowedChildren = acceptanceRules[parentCategory] || [];
  const isAllowed = allowedChildren.includes(childCategory);
  
  console.log(isAllowed ? '✅ ALLOWED' : '❌ BLOCKED', {
    allowedChildren,
    isAllowed
  });
  
  return isAllowed;
}

export function getDropErrorMessage(parentNode: PageNodeV4, childNode: PageNodeV4): string {
  const parentCategory = getElementCategory(parentNode);
  const childCategory = getElementCategory(childNode);
  
  const messages: Record<string, string> = {
    [`${ElementCategory.TextBlock}-${ElementCategory.TextBlock}`]: 'Elementos de texto (p, h1-h6) não podem conter outros elementos de texto',
    [`${ElementCategory.TextBlock}-${ElementCategory.Container}`]: 'Parágrafos e títulos só podem conter texto e links',
    [`${ElementCategory.TextInline}-${ElementCategory.TextBlock}`]: 'Texto inline não pode conter elementos block',
    [`${ElementCategory.List}-${ElementCategory.Container}`]: 'Listas (ul/ol) só podem conter itens de lista (li)',
    [`${ElementCategory.List}-${ElementCategory.TextBlock}`]: 'Listas (ul/ol) só podem conter itens de lista (li)',
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
