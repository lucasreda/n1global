import { BlockElement } from "@shared/schema";
import { 
  Type, 
  AlignLeft, 
  MousePointer, 
  Image, 
  Space, 
  Minus, 
  Video, 
  FileText, 
  Code,
  Heading1,
  Heading2,
  Heading3,
  Box,
  Grid3X3
} from "lucide-react";

export function createDefaultElement(type: BlockElement['type']): BlockElement {
  const baseElement = {
    id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    props: {},
    styles: {
      padding: '1rem',
      margin: '0',
      textAlign: 'left' as const,
    },
    content: {},
  };

  switch (type) {
    case 'heading':
      return {
        ...baseElement,
        props: { level: 'h2' },
        styles: {
          ...baseElement.styles,
          fontSize: '1.5rem',
          fontWeight: '600',
          color: '#1e293b',
        },
        content: { text: 'Título Principal' },
      };

    case 'text':
      return {
        ...baseElement,
        content: { 
          text: 'Adicione seu texto aqui. Você pode clicar para editar diretamente.',
          html: '<p>Adicione seu texto aqui. Você pode clicar para editar diretamente.</p>',
        },
      };

    case 'button':
      return {
        ...baseElement,
        styles: {
          ...baseElement.styles,
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem',
          border: 'none',
          fontWeight: '500',
          textAlign: 'center' as const,
          cursor: 'pointer',
        },
        content: { 
          text: 'Clique Aqui',
          href: '#',
        },
      };

    case 'image':
      return {
        ...baseElement,
        styles: {
          ...baseElement.styles,
          width: '100%',
          height: 'auto',
          borderRadius: '0.5rem',
        },
        content: { 
          src: 'https://via.placeholder.com/400x200?text=Imagem',
          alt: 'Imagem de exemplo',
        },
      };

    case 'spacer':
      return {
        ...baseElement,
        styles: {
          ...baseElement.styles,
          height: '40px',
          width: '100%',
        },
      };

    case 'divider':
      return {
        ...baseElement,
        styles: {
          ...baseElement.styles,
          height: '1px',
          backgroundColor: '#e2e8f0',
          width: '100%',
          margin: '1rem 0',
        },
      };

    case 'video':
      return {
        ...baseElement,
        styles: {
          ...baseElement.styles,
          width: '100%',
          borderRadius: '0.5rem',
        },
        content: { 
          src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          alt: 'Vídeo',
        },
      };

    case 'form':
      return {
        ...baseElement,
        styles: {
          ...baseElement.styles,
          backgroundColor: '#f8fafc',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
        },
        content: { 
          placeholder: 'Digite seu email...',
          text: 'Cadastrar',
        },
      };

    case 'embed':
      return {
        ...baseElement,
        content: { 
          html: '<div style="background: #f3f4f6; padding: 2rem; text-align: center; border-radius: 0.5rem;">Código embed aqui</div>',
        },
      };

    case 'container':
      return {
        ...baseElement,
        styles: {
          ...baseElement.styles,
          padding: '1rem',
          backgroundColor: 'transparent',
          display: 'block',
        },
        config: {
          allowNesting: true,
        },
        children: [],
      };

    case 'block':
      return {
        ...baseElement,
        styles: {
          ...baseElement.styles,
          padding: '1rem',
          backgroundColor: 'transparent',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          gap: '1rem',
        },
        config: {
          columns: 2,
          allowNesting: true,
          columnDistribution: 'equal',
          columnWidths: ['50%', '50%'],
        },
        children: [],
      };

    default:
      return baseElement;
  }
}

export function getElementIcon(type: BlockElement['type']) {
  const icons = {
    heading: Heading2,
    text: Type,
    button: MousePointer,
    image: Image,
    spacer: Space,
    divider: Minus,
    video: Video,
    form: FileText,
    embed: Code,
    container: Box,
    block: Grid3X3,
  };

  return icons[type] || Type;
}

export function getElementLabel(type: BlockElement['type']): string {
  const labels = {
    heading: 'Título',
    text: 'Texto',
    button: 'Botão',
    image: 'Imagem',
    spacer: 'Espaçador',
    divider: 'Divisor',
    video: 'Vídeo',
    form: 'Formulário',
    embed: 'Código Embed',
    container: 'Container',
    block: 'Bloco',
  };

  return labels[type] || 'Elemento';
}

export function getElementCategory(type: BlockElement['type']): 'basic' | 'media' | 'form' | 'layout' {
  const categories = {
    heading: 'basic' as const,
    text: 'basic' as const,
    button: 'basic' as const,
    image: 'media' as const,
    video: 'media' as const,
    spacer: 'layout' as const,
    divider: 'layout' as const,
    form: 'form' as const,
    embed: 'media' as const,
    container: 'layout' as const,
    block: 'layout' as const,
  };

  return categories[type] || 'basic';
}