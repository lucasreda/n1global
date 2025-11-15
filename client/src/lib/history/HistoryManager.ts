import { PageModelV2 } from '@shared/schema';
import { Command, UpdateModelCommand, MAX_HISTORY_SIZE } from './Command';

export class HistoryManager {
  private commands: Command[] = [];
  private currentIndex: number = -1;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.commands = [];
    this.currentIndex = -1;
  }

  executeCommand(command: Command): PageModelV2 {
    const result = command.execute();

    if (this.currentIndex < this.commands.length - 1) {
      this.commands = this.commands.slice(0, this.currentIndex + 1);
    }

    this.commands.push(command);
    this.currentIndex++;

    if (this.commands.length > MAX_HISTORY_SIZE) {
      this.commands.shift();
      this.currentIndex--;
    }

    this.notifyListeners();
    return result;
  }

  update(previousModel: PageModelV2, newModel: PageModelV2, description: string = 'Update'): PageModelV2 {
    const command = new UpdateModelCommand(previousModel, newModel, description);
    return this.executeCommand(command);
  }

  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.commands.length - 1;
  }

  undo(): PageModelV2 | null {
    if (!this.canUndo()) return null;

    const command = this.commands[this.currentIndex];
    const result = command.undo();
    this.currentIndex--;
    this.notifyListeners();
    return result;
  }

  redo(): PageModelV2 | null {
    if (!this.canRedo()) return null;

    this.currentIndex++;
    const command = this.commands[this.currentIndex];
    const result = command.redo();
    this.notifyListeners();
    return result;
  }

  getHistory(): { commands: Command[]; currentIndex: number } {
    return {
      commands: [...this.commands],
      currentIndex: this.currentIndex,
    };
  }

  clear(): void {
    this.commands = [];
    this.currentIndex = -1;
    this.notifyListeners();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  getCurrentDescription(): string | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.commands.length) {
      return this.commands[this.currentIndex].description;
    }
    return null;
  }

  getUndoDescription(): string | null {
    if (this.canUndo() && this.currentIndex >= 0) {
      return this.commands[this.currentIndex].description;
    }
    return null;
  }

  getRedoDescription(): string | null {
    if (this.canRedo() && this.currentIndex + 1 < this.commands.length) {
      return this.commands[this.currentIndex + 1].description;
    }
    return null;
  }
}
