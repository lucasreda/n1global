import { useRef, useEffect, useState, useCallback } from 'react';
import { PageModelV2 } from '@shared/schema';
import { HistoryManager } from './HistoryManager';

export function useHistoryManager(
  model: PageModelV2,
  onChange: (model: PageModelV2) => void
) {
  const historyManagerRef = useRef<HistoryManager>(new HistoryManager());
  const [historyState, setHistoryState] = useState(() => ({
    canUndo: false,
    canRedo: false,
    currentDescription: null as string | null,
    undoDescription: null as string | null,
    redoDescription: null as string | null,
  }));

  const updateHistoryState = useCallback(() => {
    const manager = historyManagerRef.current;
    setHistoryState({
      canUndo: manager.canUndo(),
      canRedo: manager.canRedo(),
      currentDescription: manager.getCurrentDescription(),
      undoDescription: manager.getUndoDescription(),
      redoDescription: manager.getRedoDescription(),
    });
  }, []);

  useEffect(() => {
    const unsubscribe = historyManagerRef.current.subscribe(updateHistoryState);
    return unsubscribe;
  }, [updateHistoryState]);

  const executeUpdate = useCallback(
    (newModel: PageModelV2, description: string = 'Update') => {
      const updatedModel = historyManagerRef.current.update(model, newModel, description);
      onChange(updatedModel);
    },
    [model, onChange]
  );

  const undo = useCallback(() => {
    const previousModel = historyManagerRef.current.undo();
    if (previousModel) {
      onChange(previousModel);
    }
  }, [onChange]);

  const redo = useCallback(() => {
    const nextModel = historyManagerRef.current.redo();
    if (nextModel) {
      onChange(nextModel);
    }
  }, [onChange]);

  const clearHistory = useCallback(() => {
    historyManagerRef.current.clear();
  }, []);

  const getHistory = useCallback(() => {
    return historyManagerRef.current.getHistory();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditable =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]') !== null;

      if (isEditable) {
        return;
      }

      const key = e.key.toLowerCase();

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && key === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'z') {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo]);

  return {
    executeUpdate,
    undo,
    redo,
    clearHistory,
    getHistory,
    ...historyState,
  };
}
