import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2 } from 'lucide-react';
import { PageModelV2 } from '@shared/schema';

interface AIGenerationDialogProps {
  onGenerate: (prompt: string) => Promise<void>;
  isGenerating: boolean;
  generationProgress?: string;
}

export function AIGenerationDialog({ onGenerate, isGenerating, generationProgress }: AIGenerationDialogProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    try {
      await onGenerate(prompt);
      setPrompt('');
      setOpen(false);
    } catch (error) {
      console.error('AI generation failed:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="gap-2"
          data-testid="button-open-ai-generation"
        >
          <Sparkles className="w-4 h-4" />
          Generate with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]" data-testid="dialog-ai-generation">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Generate Landing Page with AI
          </DialogTitle>
          <DialogDescription>
            Describe the landing page you want to create. Be specific about the content, layout, and style.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ai-prompt" data-testid="label-ai-prompt">
              Page Description
            </Label>
            <Textarea
              id="ai-prompt"
              placeholder="Example: Create a modern hero section for a SaaS product called 'TaskFlow' with a heading 'Manage Your Tasks Effortlessly', a description about productivity features, and a primary CTA button 'Start Free Trial'. Use a gradient background from blue to purple."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[150px] resize-none"
              disabled={isGenerating}
              data-testid="input-ai-prompt"
            />
            <p className="text-xs text-muted-foreground">
              Tip: Include details about colors, layout, headings, buttons, and any specific content you want.
            </p>
          </div>

          {isGenerating && generationProgress && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-medium" data-testid="text-generation-progress">
                    {generationProgress}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This may take a few moments...
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isGenerating}
            data-testid="button-cancel-ai-generation"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="gap-2"
            data-testid="button-generate-ai"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Page
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
