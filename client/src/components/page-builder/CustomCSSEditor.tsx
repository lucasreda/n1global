import { Code, Check, AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useState } from 'react';

interface CustomCSSEditorProps {
  css: string;
  onChange: (css: string) => void;
}

export function CustomCSSEditor({ css, onChange }: CustomCSSEditorProps) {
  const [hasError, setHasError] = useState(false);

  const validateCSS = (cssText: string): boolean => {
    if (!cssText.trim()) return true; // Empty is valid
    
    // Basic validation: check for balanced braces
    const openBraces = (cssText.match(/{/g) || []).length;
    const closeBraces = (cssText.match(/}/g) || []).length;
    
    return openBraces === closeBraces;
  };

  const handleChange = (value: string) => {
    const isValid = validateCSS(value);
    setHasError(!isValid);
    onChange(value);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4" />
          <Label className="text-sm font-semibold">Custom CSS</Label>
        </div>
        {css.trim() && (
          <div className="flex items-center gap-1 text-xs">
            {hasError ? (
              <>
                <AlertCircle className="w-3 h-3 text-destructive" />
                <span className="text-destructive">Invalid CSS</span>
              </>
            ) : (
              <>
                <Check className="w-3 h-3 text-green-500" />
                <span className="text-green-500">Valid</span>
              </>
            )}
          </div>
        )}
      </div>

      <Card className="p-0 overflow-hidden">
        <Textarea
          value={css}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={`/* Add custom CSS rules */
.custom-class {
  property: value;
}

/* Advanced selectors */
&:hover {
  property: value;
}`}
          className={`min-h-[200px] font-mono text-xs border-0 rounded-none resize-none ${
            hasError ? 'border-l-4 border-l-destructive' : ''
          }`}
          data-testid="textarea-custom-css"
        />
      </Card>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Use standard CSS syntax</p>
        <p>• The & symbol refers to the current element</p>
        <p>• Changes apply immediately to the element</p>
      </div>
    </div>
  );
}
