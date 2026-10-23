import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { CallCard } from '../call-card';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Image: (props: any) => React.createElement(View, { ...props, testID: 'expo-image' }),
  };
});

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
  readableColors: jest.requireActual('@/lib/utils').readableColors,
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

  it('shows the unit type icon on unit dispatch badges only', () => {
    // The type icon is decorative (hidden from accessibility), so queries must opt in to hidden elements.
    const HIDDEN = { includeHiddenElements: true };

    render(
      <CallCard
        call={{ CallId: 'call-3', Number: '7', Name: 'Cardiac Arrest', Address: '1 Elm St', LoggedOnUtc: '2024-01-01T00:00:00Z', CheckInTimersEnabled: false, Nature: '', Priority: 1 } as any}
        priority={{ Color: '#FF0000' } as any}
        callExtraData={
          {
            Dispatches: [
              { Id: 'unit-1', Type: 'Unit', Name: 'Medic 1', TypeIconUrl: null, TypeMapIcon: 'ambulance' },
              { Id: 'unit-2', Type: 'Unit', Name: 'Engine 2' },
              { Id: 'user-1', Type: 'Personnel', Name: 'Alex Morgan', TypeMapIcon: 'ambulance' },
            ],
          } as any
        }
      />
    );

    expect(screen.getByTestId('dispatch-badge-type-icon-unit-1-dispatch-ticker-set-primary', HIDDEN)).toBeTruthy();
    expect(screen.queryByTestId('dispatch-badge-type-icon-unit-2-dispatch-ticker-set-primary', HIDDEN)).toBeNull();
    expect(screen.queryByTestId('dispatch-badge-type-icon-user-1-dispatch-ticker-set-primary', HIDDEN)).toBeNull();
    expect(screen.getByText('Medic 1')).toBeTruthy();
  });

  describe('call type icon', () => {
    // The type icon is decorative (hidden from accessibility), so queries must opt in to hidden elements.
    const HIDDEN = { includeHiddenElements: true };
    const baseCall = { CallId: 'call-4', Number: '8', Name: 'House Fire', Address: '2 Elm St', LoggedOnUtc: '2024-01-01T00:00:00Z', CheckInTimersEnabled: false, Nature: '', Priority: 1 };

    it("replaces the header warning icon with the call type's uploaded icon", () => {
      const url = 'https://api.resgrid.dev/api/v4/TypeIcons/fire';
      render(<CallCard call={{ ...baseCall, TypeIconUrl: url, TypeMapIcon: 'fire' } as any} priority={{ Color: '#FF0000' } as any} callExtraData={{ Dispatches: [] } as any} />);

      expect(screen.getByTestId('call-type-icon-call-4', HIDDEN)).toBeTruthy();
      expect(screen.getByTestId('expo-image', HIDDEN).props.source).toEqual({ uri: url });
      expect(screen.queryByTestId('alert-triangle-icon', HIDDEN)).toBeNull();
    });

    it('shows the built-in call type icon when there is no upload', () => {
      render(<CallCard call={{ ...baseCall, TypeIconUrl: null, TypeMapIcon: 'fire' } as any} priority={{ Color: '#FF0000' } as any} callExtraData={{ Dispatches: [] } as any} />);

      expect(screen.getByTestId('call-type-icon-call-4', HIDDEN)).toBeTruthy();
      expect(screen.queryByTestId('alert-triangle-icon', HIDDEN)).toBeNull();
    });

    it('keeps the warning icon when the server sends no type icon (older servers)', () => {
      render(<CallCard call={baseCall as any} priority={{ Color: '#FF0000' } as any} callExtraData={{ Dispatches: [] } as any} />);

      expect(screen.queryByTestId('call-type-icon-call-4', HIDDEN)).toBeNull();
      expect(screen.getByTestId('alert-triangle-icon', HIDDEN)).toBeTruthy();
    });
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

  it('shows assigned badge when the user is riding on a dispatched unit', () => {
    const { useHomeStore } = require('@/stores/home/home-store');
    const { useRolesStore } = require('@/stores/roles/store');
    useHomeStore.mockImplementation((selector?: (state: { currentUser: { UserId: string; GroupId: string; Roles: string[] } }) => unknown) => {
      const state = { currentUser: { UserId: 'user-1', GroupId: '', Roles: [] } };
      return selector ? selector(state) : state;
    });
    useRolesStore.mockImplementation((selector?: (state: { roles: unknown[] }) => unknown) => {
      const state = { roles: [{ UnitId: 'unit-1', UnitRoleId: 'seat-1', Name: 'Driver', UserId: 'user-1' }] };
      return selector ? selector(state) : state;
    });

    render(
      <CallCard
        call={
          {
            CallId: 'call-4',
            Number: '100',
            Name: 'Structure Fire',
            Address: '789 Pine St',
            LoggedOnUtc: '2024-01-01T00:00:00Z',
            CheckInTimersEnabled: false,
            Nature: '',
            Priority: 1,
          } as any
        }
        priority={{ Color: '#00AA00' } as any}
        callExtraData={
          {
            Dispatches: [{ Id: 'unit-1', Type: 'Unit', Name: 'Engine 1' }],
          } as any
        }
      />
    );

    expect(screen.getByText('calls.assigned_to_me')).toBeTruthy();
  });

  describe('priority text colour', () => {
    const baseCall = {
      CallId: 'call-3',
      Number: '2024-042',
      Name: 'Structure Fire',
      Address: '123 Main St',
      LoggedOnUtc: '2024-01-01T00:00:00Z',
      CheckInTimersEnabled: false,
      Nature: '',
      Priority: 1,
    } as any;

    it('picks the higher-contrast text colour for the priority background', () => {
      const red = render(<CallCard call={baseCall} priority={{ Color: '#FF0000' } as any} callExtraData={{ Dispatches: [] } as any} />);
      expect(red.getByText('#2024-042').props.style).toEqual(expect.objectContaining({ color: '#000000' }));
      red.unmount();

      const navy = render(<CallCard call={baseCall} priority={{ Color: '#1e3a8a' } as any} callExtraData={{ Dispatches: [] } as any} />);
      expect(navy.getByText('#2024-042').props.style).toEqual(expect.objectContaining({ color: '#FFFFFF' }));
      navy.unmount();
    });

    it('picks the text colour for an rgb() priority colour', () => {
      const { getByText, root, unmount } = render(<CallCard call={baseCall} priority={{ Color: 'rgb(200, 0, 0)' } as any} callExtraData={{ Dispatches: [] } as any} />);

      expect(root).toHaveStyle({ backgroundColor: 'rgb(200, 0, 0)' });
      expect(getByText('#2024-042').props.style).toEqual(expect.objectContaining({ color: '#FFFFFF' }));
      expect(screen.getByTestId('alert-triangle-icon').props.color).toBe('#FFFFFF');

      unmount();
    });

    it('draws the default grey behind the text when the priority colour cannot be read', () => {
      const { getByText, root, unmount } = render(<CallCard call={baseCall} priority={{ Color: 'hsl(0, 100%, 25%)' } as any} callExtraData={{ Dispatches: [] } as any} />);

      expect(root).toHaveStyle({ backgroundColor: '#808080' });
      expect(getByText('#2024-042').props.style).toEqual(expect.objectContaining({ color: '#000000' }));

      unmount();
    });
  });
});
