import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

import { useActiveCallStore } from '@/stores/calls/active-call-store';
import { ActiveCallTab } from '../active-call-tab';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
  cssInterop: jest.fn(),
}));

jest.mock('lucide-react-native', () => ({
  Timer: () => 'Timer',
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('@/stores/calls/check-in-store', () => ({
  useCheckInStore: () => ({
    timerStatuses: [],
    resolvedTimers: [],
    isCheckingIn: false,
    fetchTimerStatuses: jest.fn(),
    fetchResolvedTimers: jest.fn(),
    performCheckIn: jest.fn(),
    startPolling: jest.fn(),
    stopPolling: jest.fn(),
  }),
}));

jest.mock('@/stores/toast/store', () => ({
  useToastStore: () => jest.fn(),
}));

jest.mock('@/stores/dispatch/store', () => ({
  useDispatchStore: jest.fn((selector: (state: any) => any) => selector({ data: { units: [] }, fetchDispatchData: jest.fn() })),
}));

jest.mock('@/stores/home/home-store', () => ({
  useHomeStore: jest.fn((selector: (state: any) => any) => selector({ currentUser: null })),
}));

jest.mock('@/stores/roles/store', () => ({
  useRolesStore: jest.fn((selector: (state: any) => any) => selector({ users: [] })),
}));

jest.mock('@/stores/units/store', () => ({
  useUnitsStore: jest.fn((selector: (state: any) => any) => selector({ units: [], fetchUnits: jest.fn() })),
}));

jest.mock('@/lib/storage', () => ({
  zustandStorage: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const mockCall = {
  CallId: '123',
  Priority: 1,
  Name: 'Structure Fire',
  Nature: 'Fire',
  Note: '',
  Address: '123 Main St',
  Geolocation: '',
  LoggedOn: '2026-04-12T10:00:00',
  State: 'Active',
  Number: 'C-001',
  NotesCount: 0,
  AudioCount: 0,
  ImgagesCount: 0,
  FileCount: 0,
  What3Words: '',
  ContactName: '',
  ContactInfo: '',
  ReferenceId: '',
  ExternalId: '',
  IncidentId: '',
  AudioFileId: '',
  Type: 'Fire',
  LoggedOnUtc: '2026-04-12T10:00:00Z',
  DispatchedOn: '',
  DispatchedOnUtc: '',
  Latitude: '40.7128',
  Longitude: '-74.006',
  CheckInTimersEnabled: true,
};

describe('ActiveCallTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render no active call message when no call set', () => {
    useActiveCallStore.setState({ activeCall: null, activeCallId: null });

    const { getByText } = render(<ActiveCallTab />);
    expect(getByText('home.active_call.no_active_call')).toBeTruthy();
  });

  it('should render active call details when call is set', () => {
    useActiveCallStore.setState({ activeCall: mockCall as any, activeCallId: '123' });

    const { getByText } = render(<ActiveCallTab />);
    expect(getByText('Structure Fire (#C-001)')).toBeTruthy();
    expect(getByText('123 Main St')).toBeTruthy();
  });

  it('should show view details and clear buttons', () => {
    useActiveCallStore.setState({ activeCall: mockCall as any, activeCallId: '123' });

    const { getByTestId } = render(<ActiveCallTab />);
    expect(getByTestId('view-call-details-button')).toBeTruthy();
    expect(getByTestId('clear-active-call-button')).toBeTruthy();
  });
});
