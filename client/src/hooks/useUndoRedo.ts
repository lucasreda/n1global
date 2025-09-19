import { useState, useCallback, useRef } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

interface UseUndoRedoOptions {
  maxHistorySize?: number;
}

export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions = {}
) {
  const { maxHistorySize = 50 } = options;
  
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const push = useCallback((newState: T) => {
    setHistory((currentHistory) => {
      const { past, present } = currentHistory;
      
      // Don't add to history if state hasn't changed
      if (JSON.stringify(present) === JSON.stringify(newState)) {
        return currentHistory;
      }

      const newPast = [...past, present];
      
      // Limit history size
      if (newPast.length > maxHistorySize) {
        newPast.shift();
      }

      return {
        past: newPast,
        present: newState,
        future: [],
      };
    });
  }, [maxHistorySize]);

  const undo = useCallback(() => {
    setHistory((currentHistory) => {
      const { past, present, future } = currentHistory;
      
      if (past.length === 0) {
        return currentHistory;
      }

      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: [present, ...future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((currentHistory) => {
      const { past, present, future } = currentHistory;
      
      if (future.length === 0) {
        return currentHistory;
      }

      const next = future[0];
      const newFuture = future.slice(1);

      return {
        past: [...past, present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const reset = useCallback((newInitialState?: T) => {
    setHistory({
      past: [],
      present: newInitialState || initialState,
      future: [],
    });
  }, [initialState]);

  const clear = useCallback(() => {
    setHistory((currentHistory) => ({
      past: [],
      present: currentHistory.present,
      future: [],
    }));
  }, []);

  return {
    state: history.present,
    canUndo,
    canRedo,
    undo,
    redo,
    push,
    reset,
    clear,
    historySize: history.past.length + history.future.length + 1,
  };
}

// Hook specifically for page model history
export function usePageModelHistory(initialModel: any) {
  const undoRedo = useUndoRedo(initialModel, { maxHistorySize: 100 });

  const saveSnapshot = useCallback((model: any, description?: string) => {
    // Add metadata to the snapshot
    const snapshot = {
      ...model,
      _timestamp: Date.now(),
      _description: description,
    };
    undoRedo.push(snapshot);
  }, [undoRedo]);

  return {
    ...undoRedo,
    saveSnapshot,
  };
}

// Keyboard shortcuts hook
export function useUndoRedoShortcuts(undo: () => void, redo: () => void) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key === 'z') {
      event.preventDefault();
      undo();
    } else if (
      ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'z') ||
      ((event.metaKey || event.ctrlKey) && event.key === 'y')
    ) {
      event.preventDefault();
      redo();
    }
  }, [undo, redo]);

  return { handleKeyDown };
}