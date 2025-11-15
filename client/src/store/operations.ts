import { create } from 'zustand';

interface OperationStore {
  selectedOperation: string | null;
  setSelectedOperation: (operationId: string | null) => void;
}

export const useOperationStore = create<OperationStore>((set) => ({
  selectedOperation: null,
  setSelectedOperation: (operationId) => set({ selectedOperation: operationId }),
}));