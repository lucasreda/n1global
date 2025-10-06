import type { PageModelV2 } from '@shared/schema';

export interface Command {
  execute(): PageModelV2;
  undo(): PageModelV2;
  redo(): PageModelV2;
  description: string;
}

export class UpdateModelCommand implements Command {
  description: string;
  private previousModel: PageModelV2;
  private newModel: PageModelV2;

  constructor(
    previousModel: PageModelV2,
    newModel: PageModelV2,
    description: string = 'Update model'
  ) {
    this.previousModel = JSON.parse(JSON.stringify(previousModel));
    this.newModel = JSON.parse(JSON.stringify(newModel));
    this.description = description;
  }

  execute(): PageModelV2 {
    return this.newModel;
  }

  undo(): PageModelV2 {
    return this.previousModel;
  }

  redo(): PageModelV2 {
    return this.newModel;
  }
}

export type HistoryState = {
  commands: Command[];
  currentIndex: number;
};

export const MAX_HISTORY_SIZE = 100;
