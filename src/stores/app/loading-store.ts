import { useMemo } from 'react';
import { create } from 'zustand';

interface LoadingState {
  /**
   * Map of loading states by key
   */
  loadingStates: Record<string, boolean>;

  /**
   * Set loading state for a specific key
   */
  setLoading: (key: string, isLoading: boolean) => void;

  /**
   * Check if a specific key is loading
   */
  isLoading: (key: string) => boolean;

  /**
   * Reset all loading states
   */
  resetLoading: () => void;
}

export const useLoadingStore = create<LoadingState>((set, get) => ({
  loadingStates: {},

  setLoading: (key, isLoading) =>
    set((state) => ({
      loadingStates: {
        ...state.loadingStates,
        [key]: isLoading,
      },
    })),

  isLoading: (key) => get().loadingStates[key] || false,

  resetLoading: () => set({ loadingStates: {} }),
}));

/**
 * Hook to manage loading state for a specific key.
 *
 * Selects only this key's flag, so an unrelated key flipping no longer re-renders the caller,
 * and memoizes the returned handle so its identity is stable between renders.
 */
export const useLoading = (key: string) => {
  const setLoading = useLoadingStore((state) => state.setLoading);
  const isLoading = useLoadingStore((state) => state.loadingStates[key] ?? false);

  return useMemo(
    () => ({
      isLoading,
      startLoading: () => setLoading(key, true),
      stopLoading: () => setLoading(key, false),
      toggleLoading: () => setLoading(key, !isLoading),
    }),
    [isLoading, key, setLoading]
  );
};
