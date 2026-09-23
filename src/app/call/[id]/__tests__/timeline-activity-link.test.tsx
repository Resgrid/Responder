import { render, screen, within } from '@testing-library/react-native';
import React from 'react';

import CallDetail from '../index';

// The call detail Activity (timeline) tab flags statuses the sender did not attach to the call
// explicitly: "auto-linked" for DestinationSource 2/3/4, "inferred" for 5, nothing otherwise.

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
jest.mock('@/lib/navigation', () => ({ openMapsWithDirections: jest.fn() }));
jest.mock('@/utils/webview-html', () => ({ generateWebViewHtml: () => '', sanitizeHtmlContent: (value: string) => value }));

jest.mock('@/stores/app/location-store', () => ({ useLocationStore: { getState: () => ({ latitude: null, longitude: null }) } }));
jest.mock('@/stores/calls/active-call-store', () => ({ useActiveCallStore: { getState: () => ({ setActiveCall: jest.fn() }) } }));
jest.mock('@/stores/calls/check-in-store', () => ({
  useCheckInStore: (selector: (state: { timerStatuses: { Status: string }[] }) => unknown) => selector({ timerStatuses: [] }),
}));
jest.mock('@/stores/security/store', () => ({ useSecurityStore: () => ({ canUserCreateCalls: false }) }));
jest.mock('@/stores/toast/store', () => ({ useToastStore: (selector: (state: { showToast: jest.Mock }) => unknown) => selector({ showToast: jest.fn() }) }));

let mockDetailState: Record<string, unknown> = {};
jest.mock('@/stores/calls/detail-store', () => {
  const useCallDetailStore = (selector: (state: Record<string, unknown>) => unknown) => selector(mockDetailState);
  useCallDetailStore.getState = () => mockDetailState;
  return { useCallDetailStore };
});

const buildActivity = (DestinationSource?: number | null) => {
  const activity: Record<string, unknown> = {
    Id: 'a-1',
    Timestamp: '2026-09-23T10:00:00Z',
    Type: 'User',
    Name: 'Jane Smith',
    GroupId: '1',
    Group: 'Station 1',
    Note: '',
    StatusId: 2,
    Location: '',
    StatusText: 'Responding',
    StatusColor: '#00AA00',
  };
  if (DestinationSource !== undefined) {
    activity.DestinationSource = DestinationSource;
  }
  return activity;
};

const mountWithActivity = (activity: Record<string, unknown>[]) => {
  mockDetailState = {
    call: {
      CallId: '1',
      Name: 'Structure Fire',
      Number: '26-100',
      Nature: '',
      Note: '',
      Address: '123 Main St',
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
    },
    callExtraData: { CallFormData: '', Activity: activity, Dispatches: [], Protocols: [] },
    callPriority: { Name: 'High', Color: '#FF0000' },
    isLoading: false,
    error: null,
    fetchCallDetail: jest.fn(),
    reset: jest.fn(),
  };

  render(<CallDetail />);
};

describe('CallDetail timeline activity-link markers', () => {
  it.each([2, 3, 4])('shows the auto-linked marker next to a status with DestinationSource %s', (source) => {
    mountWithActivity([buildActivity(source)]);
    const timeline = within(screen.getByTestId('tab-timeline'));

    expect(timeline.getByText('Responding')).toBeTruthy();
    const marker = timeline.getByTestId('activity-link-marker-auto');
    expect(marker.props.accessibilityLabel).toBe('call_detail.activity_link.auto');
    expect(marker.props.accessibilityHint).toBe('call_detail.activity_link.auto_hint');
    expect(timeline.queryByTestId('activity-link-marker-inferred')).toBeNull();
  });

  it('shows the inferred marker next to a status with DestinationSource 5', () => {
    mountWithActivity([buildActivity(5)]);
    const timeline = within(screen.getByTestId('tab-timeline'));

    const marker = timeline.getByTestId('activity-link-marker-inferred');
    expect(marker.props.accessibilityLabel).toBe('call_detail.activity_link.inferred');
    expect(marker.props.accessibilityHint).toBe('call_detail.activity_link.inferred_hint');
    expect(timeline.queryByTestId('activity-link-marker-auto')).toBeNull();
  });

  it.each([
    ['explicit (1)', 1],
    ['null', null],
    ['absent', undefined],
  ])('shows no marker when DestinationSource is %s', (_label, source) => {
    mountWithActivity([buildActivity(source)]);
    const timeline = within(screen.getByTestId('tab-timeline'));

    expect(timeline.getByText('Responding')).toBeTruthy();
    expect(timeline.queryByTestId('activity-link-marker-auto')).toBeNull();
    expect(timeline.queryByTestId('activity-link-marker-inferred')).toBeNull();
  });

  it('marks only the entries that need it in a mixed timeline', () => {
    mountWithActivity([buildActivity(1), buildActivity(2), buildActivity(3), buildActivity(4), buildActivity(5), buildActivity(null), buildActivity(undefined)]);
    const timeline = within(screen.getByTestId('tab-timeline'));

    expect(timeline.getAllByText('Responding')).toHaveLength(7);
    expect(timeline.getAllByTestId('activity-link-marker-auto')).toHaveLength(3);
    expect(timeline.getAllByTestId('activity-link-marker-inferred')).toHaveLength(1);
  });
});
