/**
 * The SignalR update hub must come up during app initialization, not only when the app is resumed
 * from the background.
 *
 * `connectUpdateHub()` sat commented out in the layout from the second commit of this codebase
 * (c470e65, "Bug fixes working on getting statuses working"), which left `useSignalRLifecycle` as
 * the only caller -- and that hook connects on a background -> foreground transition only. A
 * responder who launched the app and kept it in the foreground therefore received no call,
 * personnel, unit or status traffic at all.
 *
 * These tests render the real layout with its dependency graph stubbed, so they fail if the connect
 * is removed again or moved after the point where the lifecycle hook is armed.
 */
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@rnmapbox/maps', () => ({
  __esModule: true,
  default: { setAccessToken: jest.fn() },
}));

jest.mock('@novu/react-native', () => ({
  NovuProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-router', () => {
  const MockReact = require('react');
  return {
    Slot: () => MockReact.createElement('Slot'),
    Redirect: () => MockReact.createElement('Redirect'),
    usePathname: () => '/home',
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

jest.mock('@/components/common/realtime-status-banner', () => ({ RealtimeStatusBanner: () => null }));
jest.mock('@/components/notifications/NotificationButton', () => ({ NotificationButton: () => null }));
jest.mock('@/components/notifications/NotificationInbox', () => ({ NotificationInbox: () => null }));
jest.mock('@/components/sidebar/side-menu-content', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ui', () => {
  const MockReact = require('react');
  return { View: ({ children }: { children?: React.ReactNode }) => MockReact.createElement('View', null, children) };
});
jest.mock('@/components/ui/drawer/index', () => ({
  Drawer: () => null,
  DrawerBackdrop: () => null,
  DrawerBody: () => null,
  DrawerContent: () => null,
  DrawerFooter: () => null,
}));

jest.mock('@/hooks/use-app-lifecycle', () => ({
  useAppLifecycle: () => ({ isActive: true, appState: 'active' }),
}));

// Records what the lifecycle hook was armed with, and how far initialization had got by then.
const lifecycleCalls: { hasInitialized: boolean; updateConnectsSoFar: number }[] = [];
jest.mock('@/hooks/use-signalr-lifecycle', () => ({
  useSignalRLifecycle: jest.fn(),
}));

jest.mock('@/hooks/use-app-init-retry', () => ({
  useAppInitRetry: () => ({ recordAttempt: () => 1, reset: jest.fn(), scheduleRetry: jest.fn() }),
}));

jest.mock('@/lib/env', () => ({ Env: { RESPOND_MAPBOX_PUBKEY: 'pk.test' } }));
jest.mock('@/lib/logging', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('@/lib/storage', () => ({ useIsFirstTime: () => [false, jest.fn()] }));

const mockLoadRealtimeGeolocationState = jest.fn<Promise<boolean>, []>();
jest.mock('@/lib/storage/realtime-geolocation', () => ({
  loadRealtimeGeolocationState: () => mockLoadRealtimeGeolocationState(),
}));

const mockAuthState = { status: 'signedIn' as string, userId: 'user-1' as string | null };
jest.mock('@/lib/auth', () => ({
  useAuthStore: <T,>(selector: (state: typeof mockAuthState) => T) => selector(mockAuthState),
}));

jest.mock('@/services/audio.service', () => ({ audioService: { initialize: jest.fn().mockResolvedValue(undefined) } }));
jest.mock('@/services/bluetooth-audio.service', () => ({ bluetoothAudioService: { initialize: jest.fn().mockResolvedValue(undefined) } }));
jest.mock('@/services/offline-event-manager.service', () => ({ offlineEventManager: { initialize: jest.fn() } }));
jest.mock('@/services/offline-queue.service', () => ({ offlineQueueService: { initialize: jest.fn().mockResolvedValue(undefined) } }));
jest.mock('@/services/push-notification', () => ({ usePushNotifications: jest.fn() }));
jest.mock('@/services/location', () => ({ locationService: { startLocationUpdates: jest.fn().mockResolvedValue(undefined), stopLocationUpdates: jest.fn().mockResolvedValue(undefined) } }));

const mockCoreState = { init: jest.fn().mockResolvedValue(undefined), fetchConfig: jest.fn().mockResolvedValue(undefined), config: null };
jest.mock('@/stores/app/core-store', () => ({
  useCoreStore: Object.assign(<T,>(selector: (state: typeof mockCoreState) => T) => selector(mockCoreState), { getState: () => mockCoreState }),
}));

jest.mock('@/stores/calendar/store', () => ({ useCalendarStore: { getState: () => ({ init: jest.fn() }) } }));
jest.mock('@/stores/calls/store', () => ({ useCallsStore: { getState: () => ({ init: jest.fn().mockResolvedValue(undefined), fetchCalls: jest.fn().mockResolvedValue(undefined) }) } }));
jest.mock('@/stores/personnel/store', () => ({ usePersonnelStore: { getState: () => ({ init: jest.fn() }) } }));
jest.mock('@/stores/roles/store', () => ({ useRolesStore: { getState: () => ({ fetchRoles: jest.fn().mockResolvedValue(undefined) }) } }));
jest.mock('@/stores/shifts/store', () => ({ useShiftsStore: { getState: () => ({ init: jest.fn() }) } }));
jest.mock('@/stores/weather-alerts/weather-alerts-store', () => ({
  useWeatherAlertsStore: { getState: () => ({ fetchSettings: jest.fn().mockResolvedValue(undefined), settings: null, fetchActiveAlerts: jest.fn() }) },
}));

const mockSecurityState = { getRights: jest.fn().mockResolvedValue(undefined), rights: null };
jest.mock('@/stores/security/store', () => ({
  securityStore: Object.assign(<T,>(selector: (state: typeof mockSecurityState) => T) => selector(mockSecurityState), { getState: () => mockSecurityState }),
}));

const mockIsChatEnabled = jest.fn<boolean, [string]>();
jest.mock('@/stores/feature-flags/store', () => ({
  FeatureFlagKeys: { ChatSystem: 'Chat.System' },
  featureFlagsStore: { getState: () => ({ fetchFlags: jest.fn().mockResolvedValue(undefined), isEnabled: mockIsChatEnabled }) },
}));

const mockConnectUpdateHub = jest.fn().mockResolvedValue(undefined);
const mockConnectGeolocationHub = jest.fn().mockResolvedValue(undefined);
const mockConnectChatHub = jest.fn().mockResolvedValue(undefined);
jest.mock('@/stores/signalr/signalr-store', () => ({
  useSignalRStore: {
    getState: () => ({ connectUpdateHub: mockConnectUpdateHub, connectGeolocationHub: mockConnectGeolocationHub, connectChatHub: mockConnectChatHub }),
  },
}));

import { useSignalRLifecycle } from '@/hooks/use-signalr-lifecycle';

import TabLayout from '../_layout';

const mockUseSignalRLifecycle = useSignalRLifecycle as jest.MockedFunction<typeof useSignalRLifecycle>;

describe('app initialization connects the SignalR update hub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lifecycleCalls.length = 0;
    mockAuthState.status = 'signedIn';
    mockIsChatEnabled.mockReturnValue(false);
    mockLoadRealtimeGeolocationState.mockResolvedValue(false);
    mockConnectUpdateHub.mockResolvedValue(undefined);
    mockConnectGeolocationHub.mockResolvedValue(undefined);
    mockConnectChatHub.mockResolvedValue(undefined);
    mockUseSignalRLifecycle.mockImplementation(({ hasInitialized }) => {
      lifecycleCalls.push({ hasInitialized, updateConnectsSoFar: mockConnectUpdateHub.mock.calls.length });
      return undefined as unknown as ReturnType<typeof useSignalRLifecycle>;
    });
  });

  it('connects the update hub on a cold start that never leaves the foreground', async () => {
    render(<TabLayout />);

    await waitFor(() => {
      expect(mockConnectUpdateHub).toHaveBeenCalledTimes(1);
    });
  });

  it('connects the update hub before arming useSignalRLifecycle, so the two cannot both connect', async () => {
    render(<TabLayout />);

    await waitFor(() => {
      expect(lifecycleCalls.some((call) => call.hasInitialized)).toBe(true);
    });

    // Every render that armed the lifecycle hook happened after the hub was already connected;
    // the hook's own connect path can then only early-return.
    const armed = lifecycleCalls.filter((call) => call.hasInitialized);
    armed.forEach((call) => {
      expect(call.updateConnectsSoFar).toBeGreaterThan(0);
    });
    // And the layout never issues a second connect of its own.
    expect(mockConnectUpdateHub).toHaveBeenCalledTimes(1);
  });

  it('leaves the geolocation hub alone when realtime geolocation is off', async () => {
    render(<TabLayout />);

    await waitFor(() => {
      expect(mockConnectUpdateHub).toHaveBeenCalled();
    });
    expect(mockConnectGeolocationHub).not.toHaveBeenCalled();
  });

  it('connects the geolocation hub when realtime geolocation is enabled', async () => {
    mockLoadRealtimeGeolocationState.mockResolvedValue(true);

    render(<TabLayout />);

    await waitFor(() => {
      expect(mockConnectGeolocationHub).toHaveBeenCalledTimes(1);
    });
  });

  it('still connects the update hub when the chat hub connect fails', async () => {
    mockIsChatEnabled.mockReturnValue(true);
    mockConnectChatHub.mockRejectedValue(new Error('chat hub down'));

    render(<TabLayout />);

    await waitFor(() => {
      expect(mockConnectUpdateHub).toHaveBeenCalledTimes(1);
    });
    expect(mockConnectChatHub).toHaveBeenCalledTimes(1);
  });

  it('does not connect any hub when the user is signed out', async () => {
    mockAuthState.status = 'signedOut';

    render(<TabLayout />);

    await waitFor(() => {
      expect(mockUseSignalRLifecycle).toHaveBeenCalled();
    });
    expect(mockConnectUpdateHub).not.toHaveBeenCalled();
    expect(mockConnectGeolocationHub).not.toHaveBeenCalled();
    expect(mockConnectChatHub).not.toHaveBeenCalled();
  });
});
