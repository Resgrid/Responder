import { AppState, type AppStateStatus } from 'react-native';

import { useLogger } from '@/lib/logging';
import { useAppLifecycleStore } from '@/stores/app/app-lifecycle';

class AppLifecycleService {
  private static instance: AppLifecycleService;
  private subscription: { remove: () => void } | null = null;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): AppLifecycleService {
    if (!AppLifecycleService.instance) {
      AppLifecycleService.instance = new AppLifecycleService();
    }
    return AppLifecycleService.instance;
  }

  private initialize(): void {
    this.subscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    const currentState = useAppLifecycleStore.getState().appState;

    useLogger().info({
      message: 'App state changed',
      context: {
        from: currentState,
        to: nextAppState,
      },
    });

    useAppLifecycleStore.getState().setAppState(nextAppState);

    if (nextAppState === 'active') {
      useAppLifecycleStore.getState().updateLastActiveTimestamp();
    }
  };

  public getCurrentState(): AppStateStatus {
    return useAppLifecycleStore.getState().appState;
  }

  public isAppActive(): boolean {
    return useAppLifecycleStore.getState().isActive;
  }

  public isAppBackground(): boolean {
    return useAppLifecycleStore.getState().isBackground;
  }

  public getLastActiveTimestamp(): number | null {
    return useAppLifecycleStore.getState().lastActiveTimestamp;
  }

  public cleanup(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }
}

export const appLifecycleService = AppLifecycleService.getInstance();
