import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Undo2, Redo2, RotateCcw } from 'lucide-react';
import type { Command } from '@/lib/history';

interface HistoryPanelProps {
  commands: Command[];
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  undoDescription: string | null;
  redoDescription: string | null;
}

export function HistoryPanel({
  commands,
  currentIndex,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  undoDescription,
  redoDescription,
}: HistoryPanelProps) {
  return (
    <div className="flex flex-col h-full bg-background border-l" data-testid="history-panel">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">History</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={commands.length === 0}
            className="h-7 px-2"
            data-testid="button-clear-history"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>

        {/* Undo/Redo Controls */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            className="flex-1 h-8"
            title={undoDescription ? `Undo: ${undoDescription}` : 'Undo (Ctrl+Z)'}
            data-testid="button-undo"
          >
            <Undo2 className="h-3 w-3 mr-1.5" />
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRedo}
            disabled={!canRedo}
            className="flex-1 h-8"
            title={redoDescription ? `Redo: ${redoDescription}` : 'Redo (Ctrl+Shift+Z)'}
            data-testid="button-redo"
          >
            <Redo2 className="h-3 w-3 mr-1.5" />
            Redo
          </Button>
        </div>
      </div>

      {/* History List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {commands.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-8">
              No actions yet
            </div>
          ) : (
            commands.map((command, index) => {
              const isCurrentOrExecuted = index <= currentIndex;
              const isCurrent = index === currentIndex;

              return (
                <div
                  key={index}
                  className={`
                    px-2 py-1.5 rounded text-xs transition-colors
                    ${isCurrent 
                      ? 'bg-primary text-primary-foreground font-medium' 
                      : isCurrentOrExecuted
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground opacity-50'
                    }
                  `}
                  data-testid={`history-item-${index}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-[10px] opacity-70 mt-0.5">
                      #{index + 1}
                    </span>
                    <span className="flex-1 leading-tight">
                      {command.description}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold opacity-80">
                        CURRENT
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Footer Info */}
      <Separator />
      <div className="p-2 text-[10px] text-muted-foreground text-center">
        {commands.length > 0 ? (
          <>
            {currentIndex + 1} of {commands.length} actions
            {commands.length >= 100 && ' (max reached)'}
          </>
        ) : (
          'Ctrl+Z to undo, Ctrl+Shift+Z to redo'
        )}
      </div>
    </div>
  );
}
