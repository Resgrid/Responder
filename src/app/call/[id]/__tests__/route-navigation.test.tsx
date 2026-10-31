import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import CallDetail from '../index';

// The Route button hands the call location to the navigation app chosen in Settings: the coordinates when
// they are usable, else the call address (the Belgian report: the address never reached Waze). A withheld
// address never leaves the app.

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({ id: 'call-1' }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

// Render every tab's content so the timeline can be inspected without driving the tab bar.
jest.mock('@/components/ui/shared-tabs', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    SharedTabs: ({ tabs }: { tabs: { key: string; content: React.ReactNode }[] }) =>
      ReactModule.createElement(
        View,
        null,
        tabs.map((tab) => ReactModule.createElement(View, { key: tab.key, testID: `tab-${tab.key}` }, tab.content))
      ),
  };
});

// The screen uses the WebView default import; the global mock has no __esModule flag.
jest.mock('react-native-webview', () => ({ __esModule: true, default: () => null }));

// expo-image's native view does not render under jest; stand in a View that keeps its props.
jest.mock('expo-image', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return { Image: (props: Record<string, unknown>) => ReactModule.createElement(View, { ...props, testID: 'expo-image' }) };
});

jest.mock('@/components/ui', () => {
  const { View } = require('react-native');
  return { FocusAwareStatusBar: () => null, SafeAreaView: View };
});

jest.mock('@/components/calls/call-detail-menu', () => ({
  CallDetailActionSheetPanel: () => null,
  HeaderRightMenuButton: () => null,
  useCallDetailMenu: () => ({ isMenuOpen: false, openMenu: jest.fn(), closeMenu: jest.fn(), canEdit: false }),
}));
jest.mock('@/components/calls/call-files-modal', () => () => null);
jest.mock('@/components/calls/call-images-modal', () => () => null);
jest.mock('@/components/calls/call-notes-modal', () => () => null);
jest.mock('@/components/calls/call-site-info-tab-panel', () => ({ CallSiteInfoTabPanel: () => null }));
jest.mock('@/components/calls/location-history-panel', () => ({ LocationHistoryPanel: () => null }));
jest.mock('@/components/calls/close-call-bottom-sheet', () => ({ CloseCallBottomSheet: () => null }));
jest.mock('@/components/check-in/check-in-tab-panel', () => ({ CheckInTabPanel: () => null }));
jest.mock('@/components/common/header-back-button', () => ({ HeaderBackButton: () => null }));
jest.mock('@/components/common/loading', () => ({ Loading: () => null }));
jest.mock('@/components/common/zero-state', () => () => null);
jest.mock('@/components/data-protection/protected-reveal-bar', () => ({ ProtectedRevealBar: () => null }));
jest.mock('@/components/data-protection/protected-text', () => ({ ProtectedText: () => null }));
jest.mock('@/components/incident-command/incident-command-tab-panel', () => ({ IncidentCommandTabPanel: () => null }));
jest.mock('@/components/maps/full-screen-map-modal', () => () => null);
jest.mock('@/components/maps/static-map', () => () => null);
jest.mock('@/components/records/records-quick-create', () => ({ RecordsQuickCreate: () => null }));
jest.mock('@/components/video-feeds/video-feed-tab-panel', () => ({ VideoFeedTabPanel: () => null }));

jest.mock('@/hooks/use-analytics', () => ({ useAnalytics: () => ({ trackEvent: jest.fn() }) }));
jest.mock('@/lib/logging', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
const mockOpenMapsWithDirections = jest.fn((..._args: unknown[]) => Promise.resolve(true));
jest.mock('@/lib/navigation', () => ({ openMapsWithDirections: (...args: unknown[]) => mockOpenMapsWithDirections(...args) }));
jest.mock('@/utils/webview-html', () => ({ generateWebViewHtml: () => '', sanitizeHtmlContent: (value: string) => value }));

jest.mock('@/stores/app/location-store', () => ({ useLocationStore: { getState: () => ({ latitude: 50.8503, longitude: 4.3517 }) } }));
jest.mock('@/stores/calls/active-call-store', () => ({ useActiveCallStore: { getState: () => ({ setActiveCall: jest.fn() }) } }));
jest.mock('@/stores/calls/check-in-store', () => ({
  useCheckInStore: (selector: (state: { timerStatuses: { Status: string }[] }) => unknown) => selector({ timerStatuses: [] }),
}));
jest.mock('@/stores/security/store', () => ({ useSecurityStore: () => ({ canUserCreateCalls: false }) }));
const mockShowToast = jest.fn();
jest.mock('@/stores/toast/store', () => ({ useToastStore: (selector: (state: { showToast: jest.Mock }) => unknown) => selector({ showToast: mockShowToast }) }));

let mockDetailState: Record<string, unknown> = {};
jest.mock('@/stores/calls/detail-store', () => {
  const useCallDetailStore = (selector: (state: Record<string, unknown>) => unknown) => selector(mockDetailState);
  useCallDetailStore.getState = () => mockDetailState;
  return { useCallDetailStore };
});

const mountWithCall = (callOverrides: Record<string, unknown>) => {
  mockDetailState = {
    call: {
      CallId: '1',
      Name: 'Structure Fire',
      Number: '26-100',
      Nature: '',
      Note: '',
      Address: '',
      Type: 'Fire',
      LoggedOn: '2026-09-23T09:55:00Z',
      Latitude: '',
      Longitude: '',
      Geolocation: '',
      ReferenceId: '',
      ExternalId: '',
      ContactName: '',
      ContactInfo: '',
      RedactedFields: [],
      CheckInTimersEnabled: false,
      ...callOverrides,
    },
    callExtraData: { CallFormData: '', Activity: [], Dispatches: [], Protocols: [] },
    callPriority: { Name: 'High', Color: '#FF0000' },
    isLoading: false,
    error: null,
    fetchCallDetail: jest.fn(),
    reset: jest.fn(),
  };

  render(<CallDetail />);
};

const pressRoute = () => {
  fireEvent.press(screen.getByText('common.route'));
};

describe('CallDetail route to the call location', () => {
  beforeEach(() => {
    mockOpenMapsWithDirections.mockClear();
    mockShowToast.mockClear();
  });

  it('routes to the call coordinates with the address as label and fallback', async () => {
    mountWithCall({ Address: 'Grand-Place 1, 1000 Bruxelles', Latitude: '50.8467', Longitude: '4.3525' });

    pressRoute();

    await waitFor(() => {
      expect(mockOpenMapsWithDirections).toHaveBeenCalledWith(50.8467, 4.3525, 'Grand-Place 1, 1000 Bruxelles', 50.8503, 4.3517, 'Grand-Place 1, 1000 Bruxelles');
    });
  });

  it('routes by address when the call has no coordinates', async () => {
    mountWithCall({ Address: 'Grand-Place 1, 1000 Bruxelles' });

    pressRoute();

    await waitFor(() => {
      expect(mockOpenMapsWithDirections).toHaveBeenCalledWith(undefined, undefined, 'Grand-Place 1, 1000 Bruxelles', 50.8503, 4.3517, 'Grand-Place 1, 1000 Bruxelles');
    });
    expect(mockShowToast).not.toHaveBeenCalledWith('error', 'call_detail.no_location_for_routing');
  });

  it('routes by address when the coordinates are the (0,0) sentinel', async () => {
    mountWithCall({ Address: 'Grand-Place 1, 1000 Bruxelles', Latitude: '0', Longitude: '0' });

    pressRoute();

    await waitFor(() => {
      expect(mockOpenMapsWithDirections).toHaveBeenCalledWith(0, 0, 'Grand-Place 1, 1000 Bruxelles', 50.8503, 4.3517, 'Grand-Place 1, 1000 Bruxelles');
    });
  });

  it('keeps a withheld address out of the navigation hand-off', async () => {
    mountWithCall({ Address: 'REDACTED', RedactedFields: ['calls.address'], Latitude: '50.8467', Longitude: '4.3525' });

    pressRoute();

    await waitFor(() => {
      expect(mockOpenMapsWithDirections).toHaveBeenCalledWith(50.8467, 4.3525, 'call_detail.call_location', 50.8503, 4.3517, '');
    });
  });

  it('reports no location when there are neither coordinates nor a usable address', async () => {
    mountWithCall({ Address: 'REDACTED', RedactedFields: ['calls.address'] });

    pressRoute();

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('error', 'call_detail.no_location_for_routing');
    });
    expect(mockOpenMapsWithDirections).not.toHaveBeenCalled();
  });

  it('shows an error when no navigation app could be opened', async () => {
    mockOpenMapsWithDirections.mockResolvedValueOnce(false);
    mountWithCall({ Address: 'Grand-Place 1, 1000 Bruxelles', Latitude: '50.8467', Longitude: '4.3525' });

    pressRoute();

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('error', 'call_detail.failed_to_open_maps');
    });
  });
});
