import { createContext, useContext, ReactNode } from 'react';
import { useTour } from '@/hooks/use-tour';

interface TourContextType {
  isTourRunning: boolean;
  currentPage: 'dashboard' | 'integrations' | 'ads' | 'sync-orders';
  startTour: () => void;
  startSyncTour: () => void;
  stopTour: () => void;
  completeTour: () => void;
  skipTour: () => void;
  resetTour: () => void;
  navigateToPage: (page: 'dashboard' | 'integrations' | 'ads' | 'sync-orders') => void;
  isCompletingTour: boolean;
  isResettingTour: boolean;
  tourWasCompletedOrSkipped: boolean;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: ReactNode }) {
  const tourState = useTour();
  
  return (
    <TourContext.Provider value={tourState}>
      {children}
    </TourContext.Provider>
  );
}

export function useTourContext() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTourContext must be used within a TourProvider');
  }
  return context;
}
