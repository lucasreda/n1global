import { useState, useCallback, useEffect } from 'react';
import { PageModelV4 } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Undo2, Redo2, History } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HistoryEntry {
  id: string;
  timestamp: number;
  description: string;
  pageModel: PageModelV4;
}

interface HistoryManagerV4Props {
  currentPageModel: PageModelV4;
  onRestore: (pageModel: PageModelV4) => void;
  maxHistorySize?: number;
}

export function useHistoryV4(initialState: PageModelV4, maxSize = 50) {
  const [history, setHistory] = useState<HistoryEntry[]>([
    {
      id: Date.now().toString(),
      timestamp: Date.now(),
      description: 'Initial state',
      pageModel: initialState,
    },
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const addToHistory = useCallback(
    (pageModel: PageModelV4, description = 'Edit') => {
      setHistory((prev) => {
        // Remove any history after current index (when undoing and then making new changes)
        const newHistory = prev.slice(0, currentIndex + 1);
        
        // Add new entry
        const newEntry: HistoryEntry = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          description,
          pageModel,
        };
        
        // Keep only last maxSize entries
        const updatedHistory = [...newHistory, newEntry].slice(-maxSize);
        
        return updatedHistory;
      });
      
      setCurrentIndex((prev) => Math.min(prev + 1, maxSize - 1));
    },
    [currentIndex, maxSize]
  );

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      return history[currentIndex - 1].pageModel;
    }
    return null;
  }, [currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return history[currentIndex + 1].pageModel;
    }
    return null;
  }, [currentIndex, history]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const jumpToEntry = useCallback(
    (index: number) => {
      if (index >= 0 && index < history.length) {
        setCurrentIndex(index);
        return history[index].pageModel;
      }
      return null;
    },
    [history]
  );

  return {
    history,
    currentIndex,
    addToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    jumpToEntry,
  };
}

export function HistoryManagerV4({ currentPageModel, onRestore, maxHistorySize = 50 }: HistoryManagerV4Props) {
  const {
    history,
    currentIndex,
    addToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    jumpToEntry,
  } = useHistoryV4(currentPageModel, maxHistorySize);

  const handleUndo = () => {
    const previousState = undo();
    if (previousState) {
      onRestore(previousState);
    }
  };

  const handleRedo = () => {
    const nextState = redo();
    if (nextState) {
      onRestore(nextState);
    }
  };

  const handleJumpTo = (index: number) => {
    const targetState = jumpToEntry(index);
    if (targetState) {
      onRestore(targetState);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, history, currentIndex]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title="Ver Histórico"
          data-testid="button-history-v4"
          className="h-8 px-2 text-foreground dark:text-gray-200"
        >
          <History className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" data-testid="popover-history-v4">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Histórico</h4>
          <p className="text-xs text-muted-foreground">
            {history.length} entradas • Atual: {currentIndex + 1}
          </p>
          
          <ScrollArea className="h-64">
            <div className="space-y-1">
              {history.map((entry, index) => (
                <button
                  key={entry.id}
                  onClick={() => handleJumpTo(index)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    index === currentIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                  data-testid={`history-entry-${index}`}
                >
                  <div className="font-medium">{entry.description}</div>
                  <div className="text-xs opacity-70">
                    {formatTimestamp(entry.timestamp)}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
