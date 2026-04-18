import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';

import { useAnalytics } from '@/hooks/use-analytics';
import { useCoreStore } from '@/stores/app/core-store';
import { useCallsStore } from '@/stores/calls/store';
import { useHomeStore } from '@/stores/home/home-store';
import { useRolesStore } from '@/stores/roles/store';
import { useSecurityStore } from '@/stores/security/store';

import Calls from '../calls';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback: () => void) => {
    callback();
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/stores/calls/store');
jest.mock('@/stores/home/home-store');
jest.mock('@/stores/roles/store');
jest.mock('@/stores/app/core-store');
jest.mock('@/stores/security/store');

jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: jest.fn(),
}));

jest.mock('@/components/common/loading', () => ({
  Loading: ({ text }: { text: string }) => {
    const { Text, View } = require('react-native');
    return (
      <View testID="loading">
        <Text>{text}</Text>
      </View>
    );
  },
}));

jest.mock('@/components/common/zero-state', () => ({
  __esModule: true,
  default: ({ heading, description, isError }: { heading: string; description: string; isError?: boolean }) => {
    const { Text, View } = require('react-native');
    return (
      <View testID={isError ? 'zero-state-error' : 'zero-state'}>
        <Text>{heading}</Text>
        <Text>{description}</Text>
      </View>
    );
  },
}));

jest.mock('@/components/calls/call-card', () => ({
  CallCard: ({ call }: { call: { CallId: string; Nature: string } }) => {
    const { Text, View } = require('react-native');
    return (
      <View testID={`call-card-${call.CallId}`}>
        <Text>{call.Nature}</Text>
      </View>
    );
  },
}));

jest.mock('@/components/ui/box', () => ({
  Box: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('@/components/ui/fab', () => ({
  Fab: ({ children, onPress, testID }: any) => {
    const { TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity onPress={onPress} testID={testID}>
        {children}
      </TouchableOpacity>
    );
  },
  FabIcon: () => {
    const { View } = require('react-native');
    return <View testID="fab-icon" />;
  },
}));

jest.mock('@/components/ui/flat-list', () => ({
  FlatList: ({ data, renderItem, keyExtractor, ListEmptyComponent }: any) => {
    const { ScrollView, View } = require('react-native');
    return (
      <ScrollView testID="flat-list">
        {data && data.length > 0
          ? data.map((item: any) => (
              <View key={keyExtractor(item)} testID={`flat-list-item-${keyExtractor(item)}`}>
                {renderItem({ item })}
              </View>
            ))
          : ListEmptyComponent && <View testID="empty-component">{ListEmptyComponent}</View>}
      </ScrollView>
    );
  },
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
  InputField: ({ value, onChangeText, testID }: any) => {
    const { TextInput } = require('react-native');
    return <TextInput value={value} onChangeText={onChangeText} testID={testID || 'search-input'} />;
  },
  InputSlot: ({ children, onPress }: any) => {
    const { TouchableOpacity, View } = require('react-native');
    return onPress ? <TouchableOpacity onPress={onPress}>{children}</TouchableOpacity> : <View>{children}</View>;
  },
  InputIcon: () => {
    const { View } = require('react-native');
    return <View testID="input-icon" />;
  },
}));

jest.mock('@/components/ui/refresh-control', () => ({
  RefreshControl: () => null,
}));

jest.mock('@/components/ui/text', () => ({
  Text: ({ children }: any) => {
    const { Text } = require('react-native');
    return <Text>{children}</Text>;
  },
}));

jest.mock('lucide-react-native', () => ({
  PlusIcon: () => null,
  RefreshCcwDotIcon: () => null,
  Search: () => null,
  User: () => null,
  UserCheck: () => null,
  X: () => null,
}));

const mockUseCallsStore = useCallsStore as jest.MockedFunction<typeof useCallsStore>;
const mockUseHomeStore = useHomeStore as jest.MockedFunction<typeof useHomeStore>;
const mockUseRolesStore = useRolesStore as jest.MockedFunction<typeof useRolesStore>;
const mockUseCoreStore = useCoreStore as jest.MockedFunction<typeof useCoreStore>;
const mockUseSecurityStore = useSecurityStore as jest.MockedFunction<typeof useSecurityStore>;
const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;

describe('Calls Screen', () => {
  const mockFetchCalls = jest.fn();
  const mockFetchCallPriorities = jest.fn();
  const mockTrackEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });

    mockUseCallsStore.mockReturnValue({
      calls: [],
      isLoading: false,
      error: null,
      fetchCalls: mockFetchCalls,
      fetchCallPriorities: mockFetchCallPriorities,
      callPriorities: [],
      callExtrasById: {},
      prefetchCallExtras: jest.fn(),
    } as any);

    mockUseHomeStore.mockImplementation(((selector?: (state: { currentUser: null }) => unknown) => {
      const state = { currentUser: null };
      return selector ? selector(state) : state;
    }) as any);

    mockUseRolesStore.mockImplementation(((selector?: (state: { roles: any[] }) => unknown) => {
      const state = { roles: [] as any[] };
      return selector ? selector(state) : state;
    }) as any);

    mockUseCoreStore.mockImplementation(((selector?: (state: { activeUnitId: null }) => unknown) => {
      const state = { activeUnitId: null };
      return selector ? selector(state) : state;
    }) as any);

    mockUseSecurityStore.mockReturnValue({
      canUserCreateCalls: true,
    } as any);
  });

  it('renders loading state', () => {
    mockUseCallsStore.mockReturnValue({
      calls: [],
      isLoading: true,
      error: null,
      fetchCalls: mockFetchCalls,
      fetchCallPriorities: mockFetchCallPriorities,
      callPriorities: [],
      callExtrasById: {},
      prefetchCallExtras: jest.fn(),
    } as any);

    render(<Calls />);

    expect(screen.getByTestId('loading')).toBeTruthy();
  });

  it('renders error state', () => {
    mockUseCallsStore.mockReturnValue({
      calls: [],
      isLoading: false,
      error: 'Test error',
      fetchCalls: mockFetchCalls,
      fetchCallPriorities: mockFetchCallPriorities,
      callPriorities: [],
      callExtrasById: {},
      prefetchCallExtras: jest.fn(),
    } as any);

    render(<Calls />);

    expect(screen.getByTestId('zero-state-error')).toBeTruthy();
  });

  it('shows FAB when user can create calls', () => {
    render(<Calls />);

    expect(screen.getByTestId('new-call-fab')).toBeTruthy();
  });

  it('hides FAB when user cannot create calls', () => {
    mockUseSecurityStore.mockReturnValue({
      canUserCreateCalls: false,
    } as any);

    render(<Calls />);

    expect(screen.queryByTestId('new-call-fab')).toBeNull();
  });

  it('navigates to new call page when FAB is pressed', () => {
    render(<Calls />);

    fireEvent.press(screen.getByTestId('new-call-fab'));

    expect(router.push).toHaveBeenCalledWith('/call/new/');
  });

  it('fetches calls and priorities on focus', () => {
    render(<Calls />);

    expect(mockFetchCalls).toHaveBeenCalled();
    expect(mockFetchCallPriorities).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith('calls_viewed', {
      timestamp: expect.any(String),
    });
  });

  it('filters calls based on search query', () => {
    mockUseCallsStore.mockReturnValue({
      calls: [
        { CallId: '1', Name: 'Fire Call', Nature: 'Fire Emergency', Address: 'Main', Priority: 1 },
        { CallId: '2', Name: 'Medical Call', Nature: 'Medical Emergency', Address: 'Oak', Priority: 2 },
      ],
      isLoading: false,
      error: null,
      fetchCalls: mockFetchCalls,
      fetchCallPriorities: mockFetchCallPriorities,
      callPriorities: [],
      callExtrasById: {},
      prefetchCallExtras: jest.fn(),
    } as any);

    render(<Calls />);

    fireEvent.changeText(screen.getByTestId('search-input'), 'fire');

    expect(screen.getByTestId('call-card-1')).toBeTruthy();
    expect(screen.queryByTestId('call-card-2')).toBeNull();
  });

  it("filters to only calls I'm on", () => {
    mockUseCallsStore.mockReturnValue({
      calls: [
        { CallId: '1', Name: 'Fire Call', Nature: 'Fire Emergency', Address: 'Main', Priority: 1 },
        { CallId: '2', Name: 'Medical Call', Nature: 'Medical Emergency', Address: 'Oak', Priority: 2 },
      ],
      isLoading: false,
      error: null,
      fetchCalls: mockFetchCalls,
      fetchCallPriorities: mockFetchCallPriorities,
      callPriorities: [],
      callExtrasById: {
        '1': { Dispatches: [{ Id: 'user-1', Type: 'Personnel', Name: 'Me' }] },
        '2': { Dispatches: [{ Id: 'user-2', Type: 'Personnel', Name: 'Someone Else' }] },
      },
      prefetchCallExtras: jest.fn(),
    } as any);

    mockUseHomeStore.mockImplementation(((selector?: (state: { currentUser: { UserId: string; GroupId: string; Roles: string[] } }) => unknown) => {
      const state = {
        currentUser: { UserId: 'user-1', GroupId: '', Roles: [] },
      };
      return selector ? selector(state) : state;
    }) as any);

    render(<Calls />);

    fireEvent.press(screen.getByTestId('only-calls-im-on-toggle'));

    expect(screen.getByTestId('call-card-1')).toBeTruthy();
    expect(screen.queryByTestId('call-card-2')).toBeNull();
  });
});
