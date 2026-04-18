import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { CallCard } from '../call-card';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('react-native-webview', () => ({
  __esModule: true,
  default: ({ source }: { source: { html: string } }) => {
    const { Text } = require('react-native');
    return <Text testID="call-card-webview">{source.html}</Text>;
  },
}));

jest.mock('@/components/ui/box', () => ({
  Box: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('@/components/ui/icon', () => ({
  Icon: ({ as: Component, ...props }: any) => {
    if (Component) {
      return <Component {...props} />;
    }

    const { View } = require('react-native');
    return <View {...props} />;
  },
}));

jest.mock('@/components/ui/text', () => ({
  Text: ({ children, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text {...props}>{children}</Text>;
  },
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('lucide-react-native', () => ({
  AlertTriangle: (props: any) => {
    const { View } = require('react-native');
    return <View testID="alert-triangle-icon" {...props} />;
  },
  MapPin: (props: any) => {
    const { View } = require('react-native');
    return <View testID="map-pin-icon" {...props} />;
  },
  Phone: (props: any) => {
    const { View } = require('react-native');
    return <View testID="phone-icon" {...props} />;
  },
  Timer: (props: any) => {
    const { View } = require('react-native');
    return <View testID="timer-icon" {...props} />;
  },
}));

jest.mock('@/lib/utils', () => ({
  getTimeAgoUtc: jest.fn(() => '5m ago'),
  invertColor: jest.fn(() => '#FFFFFF'),
}));

jest.mock('@/stores/home/home-store', () => ({
  useHomeStore: jest.fn((selector?: (state: { currentUser: null }) => unknown) => {
    const state = { currentUser: null };
    return selector ? selector(state) : state;
  }),
}));

jest.mock('@/stores/roles/store', () => ({
  useRolesStore: jest.fn((selector?: (state: { roles: unknown[] }) => unknown) => {
    const state = { roles: [] as unknown[] };
    return selector ? selector(state) : state;
  }),
}));

jest.mock('@/stores/app/core-store', () => ({
  useCoreStore: jest.fn((selector?: (state: { activeUnitId: null }) => unknown) => {
    const state = { activeUnitId: null };
    return selector ? selector(state) : state;
  }),
}));

const mockFetchCallExtraData = jest.fn();

jest.mock('@/stores/calls/store', () => ({
  useCallsStore: jest.fn((selector?: (state: { fetchCallExtraData: typeof mockFetchCallExtraData; callExtrasById: Record<string, unknown> }) => unknown) => {
    const state = {
      fetchCallExtraData: mockFetchCallExtraData,
      callExtrasById: {},
    };

    return selector ? selector(state) : state;
  }),
}));

describe('CallCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a compact dispatch ticker and repeats pills for marquee scrolling', () => {
    render(
      <CallCard
        call={
          {
            CallId: 'call-1',
            Number: '42',
            Name: 'Structure Fire',
            Address: '123 Main St',
            LoggedOnUtc: '2024-01-01T00:00:00Z',
            CheckInTimersEnabled: true,
            Nature: '',
            Priority: 1,
          } as any
        }
        priority={{ Color: '#FF0000' } as any}
        callExtraData={
          {
            Dispatches: [
              { Id: 'unit-1', Type: 'Unit', Name: 'Engine 1' },
              { Id: 'user-1', Type: 'Personnel', Name: 'Alex Morgan' },
              { Id: 'role-1', Type: 'Role', Name: 'Command' },
            ],
          } as any
        }
      />
    );

    const ticker = screen.getByTestId('dispatch-ticker');
    fireEvent(ticker, 'layout', { nativeEvent: { layout: { width: 120 } } });

    const primarySet = screen.getByTestId('dispatch-ticker-set-primary');
    fireEvent(primarySet, 'layout', { nativeEvent: { layout: { width: 260 } } });

    expect(screen.getAllByText('Engine 1').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Alex Morgan').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Command').length).toBeGreaterThan(1);
    expect(screen.getByTestId('dispatch-ticker-copy-1')).toBeTruthy();
  });

  it('shows assigned badge for current user dispatches', () => {
    const { useHomeStore } = require('@/stores/home/home-store');
    useHomeStore.mockImplementation((selector?: (state: { currentUser: { UserId: string; GroupId: string; Roles: string[] } }) => unknown) => {
      const state = {
        currentUser: {
          UserId: 'user-1',
          GroupId: '',
          Roles: [],
        },
      };

      return selector ? selector(state) : state;
    });

    render(
      <CallCard
        call={
          {
            CallId: 'call-2',
            Number: '99',
            Name: 'Medical Call',
            Address: '456 Oak Ave',
            LoggedOnUtc: '2024-01-01T00:00:00Z',
            CheckInTimersEnabled: false,
            Nature: '',
            Priority: 1,
          } as any
        }
        priority={{ Color: '#00AA00' } as any}
        callExtraData={
          {
            Dispatches: [{ Id: 'user-1', Type: 'Personnel', Name: 'Me' }],
          } as any
        }
      />
    );

    expect(screen.getByText('calls.assigned_to_me')).toBeTruthy();
  });
});
