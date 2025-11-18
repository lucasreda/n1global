import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface ContextualTooltipProps {
  content: string;
  children?: React.ReactNode;
  className?: string;
}

// Helper component for contextual tooltips
export function ContextualTooltip({ content, children, className }: ContextualTooltipProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children || (
            <span className={`inline-flex items-center ml-1 text-muted-foreground hover:text-foreground transition-colors ${className || ''}`}>
              <Info className="h-3 w-3" />
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <p className="text-xs">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Tooltip information database
export const TOOLTIP_INFO: Record<string, string> = {
  // Layout
  display: 'Define o tipo de display do elemento. Block cria uma linha completa, flex permite layout flexível, grid permite layout em grade.',
  position: 'Define o posicionamento do elemento. Static é o padrão, relative permite posicionamento relativo, absolute/fixed posicionam o elemento em relação ao container/viewport.',
  flexDirection: 'Define a direção dos itens flex. Row (linha horizontal), column (coluna vertical), row-reverse/column-reverse invertem a ordem.',
  justifyContent: 'Alinha os itens flex ao longo do eixo principal. Space-between distribui com espaços iguais, center centraliza, etc.',
  alignItems: 'Alinha os itens flex ao longo do eixo cruzado. Stretch estica, center centraliza, baseline alinha pela linha base.',
  gap: 'Define o espaçamento entre os itens flex/grid. Usa unidades CSS (px, rem, em, etc.).',
  
  // Spacing
  margin: 'Espaçamento externo ao redor do elemento. Pode definir valores individuais para top, right, bottom, left.',
  padding: 'Espaçamento interno dentro do elemento. Pode definir valores individuais para top, right, bottom, left.',
  
  // Sizing
  width: 'Largura do elemento. Pode usar valores fixos (px), relativos (%, rem, em) ou automático (auto).',
  height: 'Altura do elemento. Pode usar valores fixos (px), relativos (%, rem, em) ou automático (auto).',
  minWidth: 'Largura mínima do elemento. Útil para garantir tamanho mínimo em layouts responsivos.',
  maxWidth: 'Largura máxima do elemento. Útil para limitar crescimento em layouts responsivos.',
  minHeight: 'Altura mínima do elemento. Útil para garantir altura mínima.',
  maxHeight: 'Altura máxima do elemento. Útil para limitar altura.',
  
  // Typography
  fontSize: 'Tamanho da fonte. Pode usar px, rem, em, ou palavras-chave (small, large, etc.).',
  fontWeight: 'Peso da fonte. 400 é normal, 700 é bold. Valores: 100-900 ou normal/bold.',
  lineHeight: 'Altura da linha. Pode ser número (múltiplo do font-size), valor fixo (px) ou normal.',
  textAlign: 'Alinhamento do texto. Left, center, right, justify.',
  color: 'Cor do texto. Pode usar valores hex (#fff), rgb, rgba, ou nomes de cores.',
  
  // Background
  backgroundColor: 'Cor de fundo do elemento. Pode usar valores hex (#fff), rgb, rgba, ou nomes de cores.',
  backgroundImage: 'Imagem de fundo. Use url("...") para especificar a URL da imagem.',
  backgroundSize: 'Tamanho da imagem de fundo. Cover cobre todo o elemento, contain mantém proporção, auto usa tamanho original.',
  backgroundPosition: 'Posição da imagem de fundo. Valores como center, top, left, ou coordenadas (50% 50%).',
  backgroundRepeat: 'Como a imagem de fundo se repete. No-repeat mostra uma vez, repeat preenche, repeat-x/repeat-y apenas horizontal/vertical.',
  
  // Border
  borderWidth: 'Largura da borda. Pode definir valores individuais para top, right, bottom, left.',
  borderStyle: 'Estilo da borda. Solid (sólida), dashed (tracejada), dotted (pontilhada), none (sem borda).',
  borderColor: 'Cor da borda. Pode usar valores hex, rgb, rgba, ou nomes de cores.',
  borderRadius: 'Arredondamento das bordas. Pode definir valores individuais para cada canto ou valor único.',
  
  // Effects
  opacity: 'Transparência do elemento. Valores de 0 (transparente) a 1 (opaco).',
  boxShadow: 'Sombra do elemento. Formato: offset-x offset-y blur-radius spread-radius color.',
  
  // Grid
  gridTemplateColumns: 'Define as colunas do grid. Valores como "1fr 1fr" (2 colunas iguais), "repeat(3, 1fr)" (3 colunas), "200px 1fr" (fixa + flexível).',
  gridTemplateRows: 'Define as linhas do grid. Similar ao gridTemplateColumns.',
  gridGap: 'Espaçamento entre células do grid. Pode ser valor único ou gridRowGap gridColumnGap.',
};

// Helper function to get tooltip content
export function getTooltipContent(key: string): string {
  return TOOLTIP_INFO[key] || `Informação sobre ${key}`;
}




