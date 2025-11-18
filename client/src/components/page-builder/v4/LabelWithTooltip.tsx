import { Label } from '@/components/ui/label';
import { ContextualTooltip, getTooltipContent } from './ContextualTooltip';

interface LabelWithTooltipProps {
  htmlFor?: string;
  className?: string;
  tooltipKey?: string;
  tooltipContent?: string;
  children: React.ReactNode;
}

export function LabelWithTooltip({ 
  htmlFor, 
  className, 
  tooltipKey, 
  tooltipContent,
  children 
}: LabelWithTooltipProps) {
  const content = tooltipContent || (tooltipKey ? getTooltipContent(tooltipKey) : '');
  
  return (
    <div className="flex items-center gap-1">
      <Label htmlFor={htmlFor} className={className}>
        {children}
      </Label>
      {content && (
        <ContextualTooltip content={content} />
      )}
    </div>
  );
}




