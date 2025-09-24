import { PageModelV2, BlockSection, BlockRow, BlockColumn, BlockElement } from "@shared/schema";
import { useDroppable } from '@dnd-kit/core';
import { ElementBenefits } from './elements/ElementBenefits';
import { ElementReviews } from './elements/ElementReviews';
import { ElementSlider } from './elements/ElementSlider';
import { ElementHero } from './elements/ElementHero';
import { ElementFeatures } from './elements/ElementFeatures';
import { ElementTeam } from './elements/ElementTeam';
import { ElementContact } from './elements/ElementContact';

// Helper to build final styles from individual properties
function buildFinalStyles(styles: any = {}) {
  const finalStyles: any = { ...styles };
  
  // Build padding from individual sides or fallback to general padding
  if (styles.paddingTop || styles.paddingRight || styles.paddingBottom || styles.paddingLeft) {
    finalStyles.paddingTop = styles.paddingTop || '0';
    finalStyles.paddingRight = styles.paddingRight || '0';
    finalStyles.paddingBottom = styles.paddingBottom || '0';
    finalStyles.paddingLeft = styles.paddingLeft || '0';
    // Remove general padding to avoid conflicts
    delete finalStyles.padding;
  }
  
  // Build margin from individual sides or fallback to general margin
  if (styles.marginTop || styles.marginRight || styles.marginBottom || styles.marginLeft) {
    finalStyles.marginTop = styles.marginTop || '0';
    finalStyles.marginRight = styles.marginRight || '0';
    finalStyles.marginBottom = styles.marginBottom || '0';
    finalStyles.marginLeft = styles.marginLeft || '0';
    // Remove general margin to avoid conflicts
    delete finalStyles.margin;
  }
  
  // Build border-radius from individual corners or fallback to general border-radius
  if (styles.borderTopLeftRadius || styles.borderTopRightRadius || styles.borderBottomRightRadius || styles.borderBottomLeftRadius) {
    finalStyles.borderTopLeftRadius = styles.borderTopLeftRadius || '0';
    finalStyles.borderTopRightRadius = styles.borderTopRightRadius || '0';
    finalStyles.borderBottomRightRadius = styles.borderBottomRightRadius || '0';
    finalStyles.borderBottomLeftRadius = styles.borderBottomLeftRadius || '0';
    // Remove general border-radius to avoid conflicts
    delete finalStyles.borderRadius;
  }
  
  // Build borders from individual sides
  if (styles.borderTopWidth || styles.borderRightWidth || styles.borderBottomWidth || styles.borderLeftWidth) {
    const borderStyle = styles.borderStyle || 'solid';
    const borderColor = styles.borderColor || '#000000';
    
    finalStyles.borderTop = `${styles.borderTopWidth || '0'} ${borderStyle} ${styles.borderTopColor || borderColor}`;
    finalStyles.borderRight = `${styles.borderRightWidth || '0'} ${borderStyle} ${styles.borderRightColor || borderColor}`;
    finalStyles.borderBottom = `${styles.borderBottomWidth || '0'} ${borderStyle} ${styles.borderBottomColor || borderColor}`;
    finalStyles.borderLeft = `${styles.borderLeftWidth || '0'} ${borderStyle} ${styles.borderLeftColor || borderColor}`;
    
    // Remove general border properties to avoid conflicts
    delete finalStyles.border;
    delete finalStyles.borderWidth;
    delete finalStyles.borderStyle;
    delete finalStyles.borderColor;
    delete finalStyles.borderTopWidth;
    delete finalStyles.borderRightWidth;
    delete finalStyles.borderBottomWidth;
    delete finalStyles.borderLeftWidth;
    delete finalStyles.borderTopColor;
    delete finalStyles.borderRightColor;
    delete finalStyles.borderBottomColor;
    delete finalStyles.borderLeftColor;
  } else if (styles.borderWidth && styles.borderStyle) {
    // Use general border if individual sides are not specified
    const borderColor = styles.borderColor || '#000000';
    finalStyles.border = `${styles.borderWidth} ${styles.borderStyle} ${borderColor}`;
    delete finalStyles.borderWidth;
    delete finalStyles.borderStyle;
    delete finalStyles.borderColor;
  }
  
  return finalStyles;
}

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

  const finalStyles = buildFinalStyles(section.styles);
  
  return (
    <section
      className={`section-renderer ${containerClasses[section.settings.containerWidth || 'container']} ${verticalAlignClasses[section.settings.verticalAlign || 'top']}`}
      style={{
        ...finalStyles,
        // Apply fallbacks only if no specific values exist
        padding: finalStyles.padding || theme.spacing?.lg || '2rem',
        backgroundColor: finalStyles.backgroundColor || 'transparent',
        backgroundImage: finalStyles.backgroundImage ? `url(${finalStyles.backgroundImage})` : undefined,
        minHeight: finalStyles.minHeight || 'auto',
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
  const finalStyles = buildFinalStyles(row.styles);
  
  return (
    <div
      className="row-renderer flex flex-wrap w-full"
      style={{
        ...finalStyles,
        gap: finalStyles.gap || theme.spacing?.md || '1.5rem',
        padding: finalStyles.padding || '0',
        backgroundColor: finalStyles.backgroundColor || 'transparent',
        minHeight: finalStyles.minHeight || 'auto',
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

  const finalStyles = buildFinalStyles(column.styles);

  return (
    <div
      className={`column-renderer ${widthClasses[column.width as keyof typeof widthClasses] || 'w-full'} flex flex-col`}
      style={{
        ...finalStyles,
        padding: finalStyles.padding || theme.spacing?.sm || '1rem',
        backgroundColor: finalStyles.backgroundColor || 'transparent',
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
  isSelected?: boolean;
  onUpdate?: (updates: Partial<BlockElement>) => void;
  viewport?: 'desktop' | 'tablet' | 'mobile';
}

export function ElementRenderer({ element, theme, editorMode, isSelected, onUpdate, viewport }: ElementRendererProps) {
  const finalStyles = buildFinalStyles(element.styles);
  
  const baseStyles = {
    ...finalStyles,
    color: finalStyles.color || theme.colors?.text || '#1e293b',
    fontSize: finalStyles.fontSize || theme.typography?.fontSize?.base || '1rem',
    lineHeight: finalStyles.lineHeight || 'normal',
    letterSpacing: finalStyles.letterSpacing || 'normal',
    fontWeight: finalStyles.fontWeight || 'normal',
    fontStyle: finalStyles.fontStyle || 'normal',
    textAlign: finalStyles.textAlign || 'left',
    textTransform: finalStyles.textTransform || 'none',
    padding: finalStyles.padding || '0',
    backgroundColor: finalStyles.backgroundColor || 'transparent',
    borderRadius: finalStyles.borderRadius || theme.borderRadius?.sm || '0.25rem',
    border: finalStyles.border || 'none',
    width: finalStyles.width || 'auto',
    height: finalStyles.height || 'auto',
  };

  switch (element.type) {
    case 'heading':
      const headingTag = element.props.level || 'h2';
      const HeadingComponent = headingTag as keyof JSX.IntrinsicElements;
      
      return (
        <HeadingComponent
          style={{
            ...baseStyles,
            fontFamily: theme.typography?.headingFont || 'Inter, sans-serif',
            fontSize: getHeadingSize(element.props.level, theme) || element.styles.fontSize || '1.5rem',
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
            padding: element.styles.padding || `${theme.spacing?.sm || '1rem'} ${theme.spacing?.md || '1.5rem'}`,
            backgroundColor: element.styles.backgroundColor || theme.colors?.primary || '#3b82f6',
            color: element.styles.color || '#ffffff',
            borderRadius: element.styles.borderRadius || theme.borderRadius?.md || '0.5rem',
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
            backgroundColor: element.styles.backgroundColor || theme.colors?.muted || '#9ca3af',
            width: element.styles.width || '100%',
            margin: element.styles.margin || `${theme.spacing?.md || '1.5rem'} 0`,
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
              pointerEvents: editorMode ? 'none' : 'auto',
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
              padding: theme.spacing?.sm || '1rem',
              marginBottom: theme.spacing?.sm || '1rem',
              border: `1px solid ${theme.colors?.muted || '#9ca3af'}`,
              borderRadius: theme.borderRadius?.sm || '0.25rem',
              fontSize: theme.typography.fontSize.base,
            }}
          />
          <button
            type="submit"
            style={{
              padding: `${theme.spacing?.sm || '1rem'} ${theme.spacing?.md || '1.5rem'}`,
              backgroundColor: theme.colors?.primary || '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: theme.borderRadius?.sm || '0.25rem',
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

    case 'container':
      return editorMode ? (
        <DroppableContainer element={element} theme={theme} editorMode={editorMode} />
      ) : (
        <div
          style={{
            ...baseStyles,
            display: element.styles.display || 'block',
            padding: element.styles.padding || theme.spacing?.md || '1.5rem',
            backgroundColor: element.styles.backgroundColor || 'transparent',
          }}
          data-testid={`element-${element.id}`}
          data-element-type="container"
        >
          {element.children && element.children.length > 0 ? (
            element.children.map((childElement) => (
              <ElementRenderer
                key={childElement.id}
                element={childElement}
                theme={theme}
                editorMode={editorMode}
              />
            ))
          ) : null}
        </div>
      );

    case 'block':
      return editorMode ? (
        <DroppableBlock element={element} theme={theme} editorMode={editorMode} />
      ) : (
        <BlockElementView element={element} theme={theme} baseStyles={baseStyles} editorMode={editorMode} />
      );

    case 'benefits':
      return (
        <ElementBenefits
          element={element}
          theme={theme}
          editorMode={editorMode}
          isSelected={isSelected}
          onUpdate={onUpdate}
        />
      );

    case 'reviews':
      return (
        <ElementReviews
          element={element}
          theme={theme}
          editorMode={editorMode}
          isSelected={isSelected}
          onUpdate={onUpdate}
        />
      );

    case 'slider':
      return (
        <ElementSlider
          element={element}
          theme={theme}
          editorMode={editorMode}
          isSelected={isSelected}
          onUpdate={onUpdate}
          viewport={viewport}
        />
      );

    case 'hero':
      return (
        <ElementHero
          element={element}
          theme={theme}
          editorMode={editorMode}
          isSelected={isSelected}
          onUpdate={onUpdate}
        />
      );

    case 'features':
      return (
        <ElementFeatures
          element={element}
          theme={theme}
          editorMode={editorMode}
          isSelected={isSelected}
          onUpdate={onUpdate}
        />
      );

    case 'team':
      return (
        <ElementTeam
          element={element}
          theme={theme}
          editorMode={editorMode}
          isSelected={isSelected}
          onUpdate={onUpdate}
        />
      );

    case 'contact':
      return (
        <ElementContact
          element={element}
          theme={theme}
          editorMode={editorMode}
          isSelected={isSelected}
          onUpdate={onUpdate}
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
    h1: theme.typography?.fontSize?.['4xl'] || '2.25rem',
    h2: theme.typography?.fontSize?.['3xl'] || '1.875rem',
    h3: theme.typography?.fontSize?.['2xl'] || '1.5rem',
    h4: theme.typography?.fontSize?.xl || '1.25rem',
    h5: theme.typography?.fontSize?.lg || '1.125rem',
    h6: theme.typography.fontSize.base,
  };
  
  return sizes[level as keyof typeof sizes] || theme.typography?.fontSize?.['2xl'] || '1.5rem';
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

// Droppable Container Component for Editor Mode
interface DroppableContainerProps {
  element: BlockElement;
  theme: PageModelV2['theme'];
  editorMode: boolean;
}

function DroppableContainer({ element, theme, editorMode }: DroppableContainerProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: element.id,
    data: {
      type: 'container',
      containerId: element.id,
    },
  });

  // If container has content, render it normally without any wrapper decoration
  if (element.children && element.children.length > 0) {
    return (
      <div
        ref={setNodeRef}
        style={{
          display: element.styles?.display || 'block',
          padding: element.styles?.padding || theme.spacing?.md || '1.5rem',
          backgroundColor: element.styles?.backgroundColor || 'transparent',
        }}
        data-testid={`element-${element.id}`}
        data-element-type="container"
      >
        {element.children.map((childElement) => (
          <ElementRenderer
            key={childElement.id}
            element={childElement}
            theme={theme}
            editorMode={editorMode}
          />
        ))}
      </div>
    );
  }

  // If container is empty, return null (no visual representation)
  return null;
}

// Droppable Block Component for Editor Mode
interface DroppableBlockProps {
  element: BlockElement;
  theme: PageModelV2['theme'];
  editorMode: boolean;
}

function DroppableBlock({ element, theme, editorMode }: DroppableBlockProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: element.id,
    data: {
      type: 'container',
      containerId: element.id,
    },
  });

  const columns = element.config?.columns || 1;
  const columnDistribution = element.config?.columnDistribution || 'equal';
  const columnWidths = element.config?.columnWidths || [];

  // Generate column widths for equal distribution
  const getColumnWidth = (index: number) => {
    if (columnDistribution === 'custom' && columnWidths[index]) {
      return columnWidths[index];
    }
    return `${100 / columns}%`;
  };

  // Split children into columns
  const childrenPerColumn = Math.ceil((element.children?.length || 0) / columns);
  const columnElements: BlockElement[][] = [];
  
  for (let i = 0; i < columns; i++) {
    const startIndex = i * childrenPerColumn;
    const endIndex = startIndex + childrenPerColumn;
    columnElements[i] = element.children?.slice(startIndex, endIndex) || [];
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex',
        flexDirection: element.styles?.flexDirection || 'row',
        justifyContent: element.styles?.justifyContent || 'flex-start',
        alignItems: element.styles?.alignItems || 'flex-start',
        gap: element.styles?.gap || theme.spacing?.md || '1.5rem',
        padding: element.styles?.padding || theme.spacing?.md || '1.5rem',
        backgroundColor: element.styles?.backgroundColor || 'transparent',
        border: isOver ? '2px solid #3b82f6' : '2px dashed #d1d5db',
        borderRadius: theme.borderRadius?.md || '0.5rem',
        minHeight: '60px',
        transition: 'border-color 0.2s ease',
      }}
      data-testid={`element-${element.id}`}
      data-element-type="block"
    >
      {Array.from({ length: columns }).map((_, columnIndex) => (
        <div
          key={columnIndex}
          style={{
            width: getColumnWidth(columnIndex),
            flex: columnDistribution === 'equal' ? 1 : 'none',
            border: '1px dashed #d1d5db',
            borderRadius: theme.borderRadius?.sm || '0.25rem',
            minHeight: '60px',
            padding: theme.spacing?.sm || '1rem',
          }}
          data-testid={`block-column-${columnIndex}`}
        >
          {columnElements[columnIndex] && columnElements[columnIndex].length > 0 ? (
            columnElements[columnIndex].map((childElement) => (
              <ElementRenderer
                key={childElement.id}
                element={childElement}
                theme={theme}
                editorMode={editorMode}
              />
            ))
          ) : (
            <div
              style={{
                padding: theme.spacing?.md || '1.5rem',
                textAlign: 'center',
                color: isOver ? '#3b82f6' : '#9ca3af',
                backgroundColor: isOver ? '#eff6ff' : '#f9fafb',
                minHeight: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: isOver ? '500' : '400',
                transition: 'all 0.2s ease',
              }}
            >
              {isOver ? `Solte na Coluna ${columnIndex + 1}` : `Coluna ${columnIndex + 1}`}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Block Element View for Non-Editor Mode
interface BlockElementViewProps {
  element: BlockElement;
  theme: PageModelV2['theme'];
  baseStyles: any;
  editorMode: boolean;
}

function BlockElementView({ element, theme, baseStyles, editorMode }: BlockElementViewProps) {
  const columns = element.config?.columns || 1;
  const columnDistribution = element.config?.columnDistribution || 'equal';
  const columnWidths = element.config?.columnWidths || [];
  
  // Generate column widths for equal distribution
  const getColumnWidth = (index: number) => {
    if (columnDistribution === 'custom' && columnWidths[index]) {
      return columnWidths[index];
    }
    return `${100 / columns}%`;
  };

  // Split children into columns
  const childrenPerColumn = Math.ceil((element.children?.length || 0) / columns);
  const columnElements: BlockElement[][] = [];
  
  for (let i = 0; i < columns; i++) {
    const startIndex = i * childrenPerColumn;
    const endIndex = startIndex + childrenPerColumn;
    columnElements[i] = element.children?.slice(startIndex, endIndex) || [];
  }

  return (
    <div
      style={{
        ...baseStyles,
        display: 'flex',
        flexDirection: element.styles?.flexDirection || 'row',
        justifyContent: element.styles?.justifyContent || 'flex-start',
        alignItems: element.styles?.alignItems || 'flex-start',
        gap: element.styles?.gap || theme.spacing?.md || '1.5rem',
        padding: element.styles?.padding || theme.spacing?.md || '1.5rem',
        backgroundColor: element.styles?.backgroundColor || 'transparent',
      }}
      data-testid={`element-${element.id}`}
      data-element-type="block"
    >
      {Array.from({ length: columns }).map((_, columnIndex) => (
        <div
          key={columnIndex}
          style={{
            width: getColumnWidth(columnIndex),
            flex: columnDistribution === 'equal' ? 1 : 'none',
          }}
          data-testid={`block-column-${columnIndex}`}
        >
          {columnElements[columnIndex] && columnElements[columnIndex].length > 0 && (
            columnElements[columnIndex].map((childElement) => (
              <ElementRenderer
                key={childElement.id}
                element={childElement}
                theme={theme}
                editorMode={editorMode}
              />
            ))
          )}
        </div>
      ))}
    </div>
  );
}