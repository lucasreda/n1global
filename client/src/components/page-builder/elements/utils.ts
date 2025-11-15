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
  Grid3X3,
  Star,
  MessageCircle,
  Images,
  Layout,
  Users,
  Mail
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

    case 'benefits':
      return {
        ...baseElement,
        styles: {
          ...baseElement.styles,
          padding: '2rem',
          backgroundColor: 'transparent',
        },
        content: {
          benefits: [
            {
              id: '1',
              title: 'Benefício 1',
              description: 'Descrição do primeiro benefício',
              icon: 'check'
            },
            {
              id: '2',
              title: 'Benefício 2',
              description: 'Descrição do segundo benefício',
              icon: 'star'
            },
            {
              id: '3',
              title: 'Benefício 3',
              description: 'Descrição do terceiro benefício',
              icon: 'zap'
            }
          ]
        },
      };

    case 'reviews':
      return {
        ...baseElement,
        styles: {
          ...baseElement.styles,
          padding: '2rem',
          backgroundColor: 'transparent',
        },
        content: {
          reviews: [
            {
              id: '1',
              name: 'Maria Silva',
              comment: 'Produto excelente! Superou minhas expectativas. Recomendo para todos.',
              rating: 5,
              role: 'Cliente Verificado'
            },
            {
              id: '2',
              name: 'João Santos',
              comment: 'Muito bom, entrega rápida e produto de qualidade. Já comprei novamente.',
              rating: 5,
              role: 'Cliente Verificado'
            },
            {
              id: '3',
              name: 'Ana Costa',
              comment: 'Adorei! Exatamente como descrito. Atendimento nota 10.',
              rating: 5,
              role: 'Cliente Verificado'
            }
          ]
        },
      };

    case 'slider':
      return {
        ...baseElement,
        styles: {
          ...baseElement.styles,
          padding: '1rem',
          backgroundColor: 'transparent',
        },
        content: {
          images: [], // Iniciar vazio - sem placeholders quebrados
          autoPlay: true,
          autoPlayInterval: 5000
        },
      };

    case 'hero':
      return {
        ...baseElement,
        styles: {
          ...baseElement.styles,
          padding: '4rem 2rem',
          textAlign: 'center',
          backgroundColor: '#1e293b',
          color: '#ffffff',
        },
        content: {
          title: 'Título Hero',
          subtitle: 'Subtítulo descritivo para engajar o visitante',
          ctaText: 'Call to Action'
        },
      };

    case 'features':
      return {
        ...baseElement,
        styles: {
          ...baseElement.styles,
          padding: '3rem 2rem',
          backgroundColor: 'transparent',
        },
        content: {
          features: [
            {
              id: '1',
              title: 'Funcionalidade 1',
              description: 'Descrição da primeira funcionalidade',
              icon: 'star'
            },
            {
              id: '2',
              title: 'Funcionalidade 2',
              description: 'Descrição da segunda funcionalidade',
              icon: 'zap'
            },
            {
              id: '3',
              title: 'Funcionalidade 3',
              description: 'Descrição da terceira funcionalidade',
              icon: 'trophy'
            },
            {
              id: '4',
              title: 'Funcionalidade 4',
              description: 'Descrição da quarta funcionalidade',
              icon: 'shield'
            }
          ]
        },
      };

    case 'team':
      return {
        ...baseElement,
        styles: {
          ...baseElement.styles,
          padding: '3rem 2rem',
          backgroundColor: 'transparent',
        },
        content: {
          members: [
            {
              id: '1',
              name: 'João Silva',
              position: 'CEO & Fundador',
              bio: 'Especialista em estratégia digital com mais de 10 anos de experiência',
              image: 'https://via.placeholder.com/200x200?text=João'
            },
            {
              id: '2',
              name: 'Maria Santos',
              position: 'CTO',
              bio: 'Desenvolvedora sênior apaixonada por tecnologias inovadoras',
              image: 'https://via.placeholder.com/200x200?text=Maria'
            },
            {
              id: '3',
              name: 'Pedro Costa',
              position: 'Designer',
              bio: 'Designer criativo focado em experiência do usuário e interfaces intuitivas',
              image: 'https://via.placeholder.com/200x200?text=Pedro'
            }
          ]
        },
      };

    case 'contact':
      return {
        ...baseElement,
        styles: {
          ...baseElement.styles,
          padding: '3rem 2rem',
          backgroundColor: '#f8fafc',
        },
        content: {
          contactInfo: {
            email: 'contato@empresa.com',
            phone: '+55 11 9999-9999',
            address: 'Rua das Empresas, 123 - São Paulo, SP',
            hours: 'Segunda à Sexta: 9h às 18h',
            title: 'Entre em Contato',
            description: 'Estamos aqui para ajudar você. Entre em contato conosco através dos canais abaixo.'
          }
        },
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
    benefits: Star,
    reviews: MessageCircle,
    slider: Images,
    hero: Layout,
    features: Star,
    team: Users,
    contact: Mail,
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
    benefits: 'Benefícios',
    reviews: 'Depoimentos',
    slider: 'Slider',
    hero: 'Hero Section',
    features: 'Funcionalidades',
    team: 'Nossa Equipe',
    contact: 'Contato',
  };

  return labels[type] || 'Elemento';
}

export function getElementCategory(type: BlockElement['type']): 'basic' | 'media' | 'form' | 'layout' | 'template' {
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
    benefits: 'template' as const,
    reviews: 'template' as const,
    slider: 'template' as const,
    hero: 'template' as const,
    features: 'template' as const,
    team: 'template' as const,
    contact: 'template' as const,
  };

  return categories[type] || 'basic';
}