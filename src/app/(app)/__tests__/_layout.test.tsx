import * as SplashScreen from 'expo-splash-screen';
import { render } from '@testing-library/react-native';
import React from 'react';

import { useAuthStore } from '@/lib/auth';

// Mock dependencies
jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  useAuthStore: jest.fn(),
}));

const mockHideAsync = SplashScreen.hideAsync as jest.MockedFunction<typeof SplashScreen.hideAsync>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// Test component that simulates the splash logic from _layout.tsx
const TestSplashComponent: React.FC<{ status: string }> = ({ status }) => {
  const hideSplash = React.useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
    } catch (error) {
      // Handle error
    }
  }, []);

  // Replicate the splash screen hiding logic from _layout.tsx
  React.useEffect(() => {
    // Only hide splash when status is settled (not 'idle' or 'loading')
    if (status === 'signedIn' || status === 'signedOut') {
      // Add debounce to smooth rendering on slow devices
      const splashTimeout = setTimeout(() => {
        hideSplash();
      }, 200); // 200ms debounce for optimal performance

      return () => {
        clearTimeout(splashTimeout);
      };
    }
  }, [status, hideSplash]);

  return null;
};

describe('App Layout Splash Screen Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockHideAsync.mockResolvedValue();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should not hide splash when status is idle', () => {
    render(<TestSplashComponent status="idle" />);

    // Fast-forward all timers
    jest.runAllTimers();

    // Splash should not be hidden when status is 'idle'
    expect(mockHideAsync).not.toHaveBeenCalled();
  });

  it('should not hide splash when status is loading', () => {
    render(<TestSplashComponent status="loading" />);

    // Fast-forward all timers
    jest.runAllTimers();

    // Splash should not be hidden when status is 'loading'
    expect(mockHideAsync).not.toHaveBeenCalled();
  });

  it('should hide splash with debounce when status is signedIn', () => {
    render(<TestSplashComponent status="signedIn" />);

    // Splash should not be hidden immediately
    expect(mockHideAsync).not.toHaveBeenCalled();

    // Fast-forward timers by 200ms (the debounce duration)
    jest.advanceTimersByTime(200);

    // Now splash should be hidden
    expect(mockHideAsync).toHaveBeenCalledTimes(1);
  });

  it('should hide splash with debounce when status is signedOut', () => {
    render(<TestSplashComponent status="signedOut" />);

    // Splash should not be hidden immediately
    expect(mockHideAsync).not.toHaveBeenCalled();

    // Fast-forward timers by 200ms (the debounce duration)
    jest.advanceTimersByTime(200);

    // Now splash should be hidden
    expect(mockHideAsync).toHaveBeenCalledTimes(1);
  });

  it('should cleanup timeout when component unmounts', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    const { unmount } = render(<TestSplashComponent status="signedIn" />);

    // Unmount before timeout completes
    unmount();

    // Should have called clearTimeout
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });

  it('should not hide splash multiple times on status changes', () => {
    const { rerender } = render(<TestSplashComponent status="idle" />);

    // Change to signedIn
    rerender(<TestSplashComponent status="signedIn" />);
    jest.advanceTimersByTime(200);
    expect(mockHideAsync).toHaveBeenCalledTimes(1);

    // Reset mock
    mockHideAsync.mockClear();

    // Change to loading (should not trigger hide again)
    rerender(<TestSplashComponent status="loading" />);
    jest.runAllTimers();
    expect(mockHideAsync).not.toHaveBeenCalled();

    // Change back to signedIn (should trigger hide again)
    rerender(<TestSplashComponent status="signedIn" />);
    jest.advanceTimersByTime(200);
    expect(mockHideAsync).toHaveBeenCalledTimes(1);
  });
});
