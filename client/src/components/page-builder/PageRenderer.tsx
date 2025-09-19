import { PageModelV2, BlockSection, BlockRow, BlockColumn, BlockElement } from "@shared/schema";

interface PageRendererProps {
  model: PageModelV2;
  className?: string;
  editorMode?: boolean; // Whether to render for editing or viewing
}

export function PageRenderer({ model, className = "", editorMode = false }: PageRendererProps) {
  return (
    <div 
      className={`page-renderer ${className}`}
      style={{
        backgroundColor: model.theme.colors.background,
        color: model.theme.colors.text,
        fontFamily: model.theme.typography.bodyFont,
        fontSize: model.theme.typography.fontSize.base,
      }}
      data-testid="page-renderer"
    >
      {model.sections.map((section) => (
        <SectionRenderer 
          key={section.id} 
          section={section} 
          theme={model.theme}
          editorMode={editorMode}
        />
      ))}
    </div>
  );
}

interface SectionRendererProps {
  section: BlockSection;
  theme: PageModelV2['theme'];
  editorMode: boolean;
}

function SectionRenderer({ section, theme, editorMode }: SectionRendererProps) {
  const containerClasses = {
    full: 'w-full',
    container: 'max-w-6xl mx-auto px-4',
    narrow: 'max-w-4xl mx-auto px-4',
  };

  const verticalAlignClasses = {
    top: 'items-start',
    center: 'items-center',
    bottom: 'items-end',
  };

  return (
    <section
      className={`section-renderer ${containerClasses[section.settings.containerWidth || 'container']} ${verticalAlignClasses[section.settings.verticalAlign || 'top']}`}
      style={{
        ...section.styles,
        padding: section.styles.padding || theme.spacing.lg,
        backgroundColor: section.styles.backgroundColor || 'transparent',
        backgroundImage: section.styles.backgroundImage ? `url(${section.styles.backgroundImage})` : undefined,
        minHeight: section.styles.minHeight || 'auto',
      }}
      data-testid={`section-${section.id}`}
      data-section-type={section.type}
    >
      {section.rows.map((row) => (
        <RowRenderer 
          key={row.id} 
          row={row} 
          theme={theme}
          editorMode={editorMode}
        />
      ))}
    </section>
  );
}

interface RowRendererProps {
  row: BlockRow;
  theme: PageModelV2['theme'];
  editorMode: boolean;
}

function RowRenderer({ row, theme, editorMode }: RowRendererProps) {
  return (
    <div
      className="row-renderer flex flex-wrap w-full"
      style={{
        ...row.styles,
        gap: row.styles.gap || theme.spacing.md,
        padding: row.styles.padding || '0',
        margin: row.styles.margin || '0',
        backgroundColor: row.styles.backgroundColor || 'transparent',
        minHeight: row.styles.minHeight || 'auto',
      }}
      data-testid={`row-${row.id}`}
    >
      {row.columns.map((column) => (
        <ColumnRenderer 
          key={column.id} 
          column={column} 
          theme={theme}
          editorMode={editorMode}
        />
      ))}
    </div>
  );
}

interface ColumnRendererProps {
  column: BlockColumn;
  theme: PageModelV2['theme'];
  editorMode: boolean;
}

function ColumnRenderer({ column, theme, editorMode }: ColumnRendererProps) {
  const widthClasses = {
    'full': 'w-full',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
    '2/3': 'w-2/3',
    '1/4': 'w-1/4',
    '3/4': 'w-3/4',
    '1/5': 'w-1/5',
    '2/5': 'w-2/5',
    '3/5': 'w-3/5',
    '4/5': 'w-4/5',
  };

  return (
    <div
      className={`column-renderer ${widthClasses[column.width as keyof typeof widthClasses] || 'w-full'} flex flex-col`}
      style={{
        ...column.styles,
        padding: column.styles.padding || theme.spacing.sm,
        margin: column.styles.margin || '0',
        backgroundColor: column.styles.backgroundColor || 'transparent',
      }}
      data-testid={`column-${column.id}`}
    >
      {column.elements.map((element) => (
        <ElementRenderer 
          key={element.id} 
          element={element} 
          theme={theme}
          editorMode={editorMode}
        />
      ))}
    </div>
  );
}

interface ElementRendererProps {
  element: BlockElement;
  theme: PageModelV2['theme'];
  editorMode: boolean;
}

function ElementRenderer({ element, theme, editorMode }: ElementRendererProps) {
  const baseStyles = {
    ...element.styles,
    color: element.styles.color || theme.colors.text,
    fontSize: element.styles.fontSize || theme.typography.fontSize.base,
    fontWeight: element.styles.fontWeight || 'normal',
    textAlign: element.styles.textAlign || 'left',
    padding: element.styles.padding || '0',
    margin: element.styles.margin || '0',
    backgroundColor: element.styles.backgroundColor || 'transparent',
    borderRadius: element.styles.borderRadius || theme.borderRadius.sm,
    border: element.styles.border || 'none',
    width: element.styles.width || 'auto',
    height: element.styles.height || 'auto',
  };

  switch (element.type) {
    case 'heading':
      const headingTag = element.props.level || 'h2';
      const HeadingComponent = headingTag as keyof JSX.IntrinsicElements;
      
      return (
        <HeadingComponent
          style={{
            ...baseStyles,
            fontFamily: theme.typography.headingFont,
            fontSize: getHeadingSize(element.props.level, theme),
            fontWeight: element.styles.fontWeight || '600',
          }}
          data-testid={`element-${element.id}`}
          data-element-type="heading"
        >
          {element.content?.text || 'Título'}
        </HeadingComponent>
      );

    case 'text':
      return (
        <div
          style={baseStyles}
          data-testid={`element-${element.id}`}
          data-element-type="text"
          dangerouslySetInnerHTML={{ 
            __html: element.content?.html || element.content?.text || 'Texto aqui...' 
          }}
        />
      );

    case 'button':
      return (
        <button
          style={{
            ...baseStyles,
            display: 'inline-block',
            padding: element.styles.padding || `${theme.spacing.sm} ${theme.spacing.md}`,
            backgroundColor: element.styles.backgroundColor || theme.colors.primary,
            color: element.styles.color || '#ffffff',
            borderRadius: element.styles.borderRadius || theme.borderRadius.md,
            border: element.styles.border || 'none',
            cursor: 'pointer',
            fontWeight: element.styles.fontWeight || '500',
            textDecoration: 'none',
          }}
          onClick={() => {
            if (element.content?.href && !editorMode) {
              window.open(element.content.href, '_blank');
            }
          }}
          data-testid={`element-${element.id}`}
          data-element-type="button"
        >
          {element.content?.text || 'Botão'}
        </button>
      );

    case 'image':
      return (
        <img
          src={element.content?.src || 'https://via.placeholder.com/400x200'}
          alt={element.content?.alt || 'Imagem'}
          style={{
            ...baseStyles,
            maxWidth: '100%',
            height: 'auto',
          }}
          data-testid={`element-${element.id}`}
          data-element-type="image"
        />
      );

    case 'spacer':
      return (
        <div
          style={{
            height: element.styles.height || '40px',
            width: element.styles.width || '100%',
          }}
          data-testid={`element-${element.id}`}
          data-element-type="spacer"
        />
      );

    case 'divider':
      return (
        <hr
          style={{
            ...baseStyles,
            border: 'none',
            height: '1px',
            backgroundColor: element.styles.backgroundColor || theme.colors.muted,
            width: element.styles.width || '100%',
            margin: element.styles.margin || `${theme.spacing.md} 0`,
          }}
          data-testid={`element-${element.id}`}
          data-element-type="divider"
        />
      );

    case 'video':
      return (
        <div
          style={{
            ...baseStyles,
            position: 'relative',
            paddingBottom: '56.25%', // 16:9 aspect ratio
            height: 0,
            overflow: 'hidden',
          }}
          data-testid={`element-${element.id}`}
          data-element-type="video"
        >
          <iframe
            src={element.content?.src || ''}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            allowFullScreen
            title={element.content?.alt || 'Vídeo'}
          />
        </div>
      );

    case 'form':
      return (
        <form
          style={baseStyles}
          data-testid={`element-${element.id}`}
          data-element-type="form"
          onSubmit={(e) => {
            if (editorMode) {
              e.preventDefault();
            }
          }}
        >
          <input
            type="email"
            placeholder={element.content?.placeholder || 'Digite seu email...'}
            style={{
              width: '100%',
              padding: theme.spacing.sm,
              marginBottom: theme.spacing.sm,
              border: `1px solid ${theme.colors.muted}`,
              borderRadius: theme.borderRadius.sm,
              fontSize: theme.typography.fontSize.base,
            }}
          />
          <button
            type="submit"
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              backgroundColor: theme.colors.primary,
              color: '#ffffff',
              border: 'none',
              borderRadius: theme.borderRadius.sm,
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            {element.content?.text || 'Enviar'}
          </button>
        </form>
      );

    case 'embed':
      return (
        <div
          style={baseStyles}
          data-testid={`element-${element.id}`}
          data-element-type="embed"
          dangerouslySetInnerHTML={{ 
            __html: element.content?.html || '<p>Código embed aqui...</p>' 
          }}
        />
      );

    default:
      return (
        <div
          style={baseStyles}
          data-testid={`element-${element.id}`}
          data-element-type="unknown"
        >
          Elemento desconhecido: {element.type}
        </div>
      );
  }
}

// Helper function to get heading sizes based on level
function getHeadingSize(level: string, theme: PageModelV2['theme']): string {
  const sizes = {
    h1: theme.typography.fontSize['4xl'],
    h2: theme.typography.fontSize['3xl'],
    h3: theme.typography.fontSize['2xl'],
    h4: theme.typography.fontSize.xl,
    h5: theme.typography.fontSize.lg,
    h6: theme.typography.fontSize.base,
  };
  
  return sizes[level as keyof typeof sizes] || theme.typography.fontSize['2xl'];
}

// Helper function to create a default theme
export function createDefaultTheme(): PageModelV2['theme'] {
  return {
    colors: {
      primary: '#3b82f6',
      secondary: '#64748b',
      accent: '#f59e0b',
      background: '#ffffff',
      text: '#1e293b',
      muted: '#e2e8f0',
    },
    typography: {
      headingFont: 'Inter, system-ui, sans-serif',
      bodyFont: 'Inter, system-ui, sans-serif',
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
      },
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
    },
    borderRadius: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
    },
  };
}