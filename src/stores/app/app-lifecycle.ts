import { AppState, type AppStateStatus } from 'react-native';
import { create } from 'zustand';

interface AppLifecycleState {
  appState: AppStateStatus;
  isActive: boolean;
  isBackground: boolean;
  lastActiveTimestamp: number | null;
}

interface AppLifecycleStore extends AppLifecycleState {
  setAppState: (state: AppStateStatus) => void;
  updateLastActiveTimestamp: () => void;
}

const useAppLifecycleStore = create<AppLifecycleStore>((set) => ({
  appState: AppState.currentState,
  isActive: AppState.currentState === 'active',
  isBackground: AppState.currentState === 'background',
  lastActiveTimestamp: null,
  setAppState: (state: AppStateStatus) =>
    set({
      appState: state,
      isActive: state === 'active',
      isBackground: state === 'background',
    }),
  updateLastActiveTimestamp: () => set({ lastActiveTimestamp: Date.now() }),
}));

export { useAppLifecycleStore };
