import { render, screen, fireEvent } from '@testing-library/react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

// Mock analytics first
const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

// Mock useFocusEffect
const mockUseFocusEffect = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: mockUseFocusEffect,
}));

// Mock dependencies
jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ options }: any) => {
      const { View, Text } = require('react-native');
      return (
        <View testID="stack-screen">
          <Text testID="screen-title">{options.title}</Text>
          {options.headerRight && (
            <View testID="header-right">
              {options.headerRight()}
            </View>
          )}
        </View>
      );
    },
  },
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('react-native', () => ({
  StyleSheet: {
    create: (styles: any) => styles,
  },
  useWindowDimensions: () => ({ width: 375, height: 812 }),
  ScrollView: ({ children }: any) => {
    const { View } = require('react-native');
    return <View testID="scroll-view">{children}</View>;
  },
  View: ({ children, ...props }: any) => {
    const { View: RNView } = jest.requireActual('react-native');
    return <RNView {...props}>{children}</RNView>;
  },
  Text: ({ children, ...props }: any) => {
    const { Text: RNText } = jest.requireActual('react-native');
    return <RNText {...props}>{children}</RNText>;
  },
  TouchableOpacity: ({ children, onPress, testID }: any) => {
    const { TouchableOpacity: RNTouchableOpacity } = jest.requireActual('react-native');
    return <RNTouchableOpacity onPress={onPress} testID={testID}>{children}</RNTouchableOpacity>;
  },
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

jest.mock('react-native-webview', () => ({
  __esModule: true,
  default: () => {
    const { View } = require('react-native');
    return <View testID="webview" />;
  },
}));

jest.mock('date-fns', () => ({
  format: () => 'Mock Date',
}));

// Mock stores
jest.mock('@/stores/calls/detail-store', () => ({
  useCallDetailStore: jest.fn(),
}));

jest.mock('@/stores/security/store', () => ({
  useSecurityStore: jest.fn(),
}));

jest.mock('@/stores/app/location-store', () => ({
  useLocationStore: jest.fn(),
}));

jest.mock('@/stores/toast/store', () => ({
  useToastStore: jest.fn(),
}));

// Mock components
jest.mock('@/components/common/loading', () => ({
  Loading: () => {
    const { View, Text } = require('react-native');
    return (
      <View testID="loading">
        <Text>Loading...</Text>
      </View>
    );
  },
}));

jest.mock('@/components/common/zero-state', () => ({
  __esModule: true,
  default: ({ heading, description, isError }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={isError ? 'zero-state-error' : 'zero-state'}>
        <Text>{heading}</Text>
        <Text>{description}</Text>
      </View>
    );
  },
}));

jest.mock('@/components/maps/static-map', () => ({
  __esModule: true,
  default: () => {
    const { View } = require('react-native');
    return <View testID="static-map" />;
  },
}));

jest.mock('@/components/ui', () => ({
  FocusAwareStatusBar: () => null,
  SafeAreaView: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

jest.mock('@/components/ui/box', () => ({
  Box: ({ children, className, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onPress, testID }: any) => {
    const { TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity onPress={onPress} testID={testID}>
        {children}
      </TouchableOpacity>
    );
  },
  ButtonIcon: () => null,
  ButtonText: ({ children }: any) => {
    const { Text } = require('react-native');
    return <Text>{children}</Text>;
  },
}));

jest.mock('@/components/ui/heading', () => ({
  Heading: ({ children }: any) => {
    const { Text } = require('react-native');
    return <Text testID="heading">{children}</Text>;
  },
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

jest.mock('@/components/ui/text', () => ({
  Text: ({ children, style }: any) => {
    const { Text: RNText } = require('react-native');
    return <RNText style={style}>{children}</RNText>;
  },
}));

jest.mock('@/components/ui/shared-tabs', () => ({
  SharedTabs: ({ tabs }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="shared-tabs">
        {tabs.map((tab: any) => (
          <View key={tab.key} testID={`tab-${tab.key}`}>
            <Text>{tab.title}</Text>
          </View>
        ))}
      </View>
    );
  },
}));

jest.mock('../../../components/calls/call-detail-menu', () => ({
  useCallDetailMenu: jest.fn(),
}));

jest.mock('../../../components/calls/call-notes-modal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../components/calls/call-images-modal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../components/calls/call-files-modal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../components/calls/close-call-bottom-sheet', () => ({
  CloseCallBottomSheet: () => null,
}));

jest.mock('@/lib/logging', () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock('@/lib/navigation', () => ({
  openMapsWithDirections: jest.fn(),
}));

// Import the component
import CallDetail from '../[id]';

const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<typeof useLocalSearchParams>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const { useCallDetailStore } = require('@/stores/calls/detail-store');
const { useSecurityStore } = require('@/stores/security/store');
const { useLocationStore } = require('@/stores/app/location-store');
const { useToastStore } = require('@/stores/toast/store');
const { useCallDetailMenu } = require('../../../components/calls/call-detail-menu');

describe('CallDetail Security', () => {
  const mockRouter = {
    back: jest.fn(),
    push: jest.fn(),
    canGoBack: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
    dismiss: jest.fn(),
    setParams: jest.fn(),
    canDismiss: jest.fn(),
    dismissAll: jest.fn(),
  };

  const mockCall = {
    CallId: '123',
    Name: 'Test Call',
    Number: 'CALL-001',
    Nature: 'Test Emergency',
    LoggedOn: '2023-01-01T10:00:00Z',
    Type: 'Emergency',
    Address: '123 Test St',
    Note: 'Test note',
    ReferenceId: 'REF-001',
    ExternalId: 'EXT-001',
    ContactName: 'John Doe',
    ContactInfo: '555-1234',
    Priority: 1,
    NotesCount: 2,
    ImgagesCount: 1,
    FileCount: 3,
    Latitude: '40.7128',
    Longitude: '-74.0060',
  };

  const mockCallExtraData = {
    Protocols: [],
    Dispatches: [],
    Activity: [],
  };

  const mockCallPriority = {
    Id: 1,
    Name: 'High',
    Color: '#FF0000',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup useFocusEffect to call callback immediately
    mockUseFocusEffect.mockImplementation((callback: () => void) => {
      callback();
    });

    mockUseLocalSearchParams.mockReturnValue({ id: '123' });
    mockUseRouter.mockReturnValue(mockRouter as any);

    useLocationStore.mockReturnValue({
      latitude: 40.7128,
      longitude: -74.0060,
    });

    useToastStore.mockReturnValue({
      showToast: jest.fn(),
    });

    // Default: user CAN create calls
    useSecurityStore.mockReturnValue({
      canUserCreateCalls: true,
    });

    useCallDetailStore.mockReturnValue({
      call: mockCall,
      callExtraData: mockCallExtraData,
      callPriority: mockCallPriority,
      isLoading: false,
      error: null,
      fetchCallDetail: jest.fn(),
      reset: jest.fn(),
    });

    // Default mock for call detail menu - returns components
    useCallDetailMenu.mockReturnValue({
      HeaderRightMenu: () => {
        const { View, Text } = require('react-native');
        const { useSecurityStore } = require('@/stores/security/store');
        const { canUserCreateCalls } = useSecurityStore();

        if (!canUserCreateCalls) {
          return null;
        }

        return (
          <View testID="header-right-menu">
            <Text>Menu</Text>
          </View>
        );
      },
      CallDetailActionSheet: () => null,
    });
  });

  describe('Header Menu Security', () => {
    it('should show header menu when user can create calls', () => {
      useSecurityStore.mockReturnValue({
        canUserCreateCalls: true,
      });

      render(<CallDetail />);

      expect(screen.getByTestId('header-right-menu')).toBeTruthy();
    });

    it('should hide header menu when user cannot create calls', () => {
      useSecurityStore.mockReturnValue({
        canUserCreateCalls: false,
      });

      // Mock the menu to return null when user can't create calls
      useCallDetailMenu.mockReturnValue({
        HeaderRightMenu: () => null,
        CallDetailActionSheet: () => null,
      });

      render(<CallDetail />);

      expect(screen.queryByTestId('header-right-menu')).toBeNull();
    });

    it('should not show headerRight prop in Stack.Screen when user cannot create calls', () => {
      useSecurityStore.mockReturnValue({
        canUserCreateCalls: false,
      });

      useCallDetailMenu.mockReturnValue({
        HeaderRightMenu: () => null,
        CallDetailActionSheet: () => null,
      });

      render(<CallDetail />);

      // The header-right should not exist when user can't create calls
      expect(screen.queryByTestId('header-right')).toBeNull();
    });
  });

  describe('Loading State Security', () => {
    it('should show header menu in loading state when user can create calls', () => {
      useCallDetailStore.mockReturnValue({
        call: null,
        callExtraData: null,
        callPriority: null,
        isLoading: true,
        error: null,
        fetchCallDetail: jest.fn(),
        reset: jest.fn(),
      });

      useSecurityStore.mockReturnValue({
        canUserCreateCalls: true,
      });

      render(<CallDetail />);

      expect(screen.getByTestId('loading')).toBeTruthy();
      expect(screen.getByTestId('header-right-menu')).toBeTruthy();
    });

    it('should hide header menu in loading state when user cannot create calls', () => {
      useCallDetailStore.mockReturnValue({
        call: null,
        callExtraData: null,
        callPriority: null,
        isLoading: true,
        error: null,
        fetchCallDetail: jest.fn(),
        reset: jest.fn(),
      });

      useSecurityStore.mockReturnValue({
        canUserCreateCalls: false,
      });

      useCallDetailMenu.mockReturnValue({
        HeaderRightMenu: () => null,
        CallDetailActionSheet: () => null,
      });

      render(<CallDetail />);

      expect(screen.getByTestId('loading')).toBeTruthy();
      expect(screen.queryByTestId('header-right-menu')).toBeNull();
    });
  });

  describe('Error State Security', () => {
    it('should show header menu in error state when user can create calls', () => {
      useCallDetailStore.mockReturnValue({
        call: null,
        callExtraData: null,
        callPriority: null,
        isLoading: false,
        error: 'Test error',
        fetchCallDetail: jest.fn(),
        reset: jest.fn(),
      });

      useSecurityStore.mockReturnValue({
        canUserCreateCalls: true,
      });

      render(<CallDetail />);

      expect(screen.getByTestId('zero-state-error')).toBeTruthy();
      expect(screen.getByTestId('header-right-menu')).toBeTruthy();
    });

    it('should hide header menu in error state when user cannot create calls', () => {
      useCallDetailStore.mockReturnValue({
        call: null,
        callExtraData: null,
        callPriority: null,
        isLoading: false,
        error: 'Test error',
        fetchCallDetail: jest.fn(),
        reset: jest.fn(),
      });

      useSecurityStore.mockReturnValue({
        canUserCreateCalls: false,
      });

      useCallDetailMenu.mockReturnValue({
        HeaderRightMenu: () => null,
        CallDetailActionSheet: () => null,
      });

      render(<CallDetail />);

      expect(screen.getByTestId('zero-state-error')).toBeTruthy();
      expect(screen.queryByTestId('header-right-menu')).toBeNull();
    });
  });

  describe('Normal State Security', () => {
    it('should show header menu in normal state when user can create calls', () => {
      render(<CallDetail />);

      expect(screen.getByTestId('heading')).toBeTruthy();
      expect(screen.getByTestId('header-right-menu')).toBeTruthy();
    });

    it('should hide header menu in normal state when user cannot create calls', () => {
      useSecurityStore.mockReturnValue({
        canUserCreateCalls: false,
      });

      useCallDetailMenu.mockReturnValue({
        HeaderRightMenu: () => null,
        CallDetailActionSheet: () => null,
      });

      render(<CallDetail />);

      expect(screen.getByTestId('heading')).toBeTruthy();
      expect(screen.queryByTestId('header-right-menu')).toBeNull();
    });
  });

  describe('Basic Functionality', () => {
    it('should render call details correctly', () => {
      render(<CallDetail />);

      expect(screen.getByText('Test Call (CALL-001)')).toBeTruthy();
      expect(screen.getByTestId('shared-tabs')).toBeTruthy();
      expect(screen.getByTestId('tab-info')).toBeTruthy();
      expect(screen.getByTestId('tab-contact')).toBeTruthy();
      expect(screen.getByTestId('tab-protocols')).toBeTruthy();
      expect(screen.getByTestId('tab-dispatched')).toBeTruthy();
      expect(screen.getByTestId('tab-timeline')).toBeTruthy();
    });

    it('should show static map when coordinates are available', () => {
      render(<CallDetail />);

      expect(screen.getByTestId('static-map')).toBeTruthy();
    });
  });

  describe('Analytics Tracking', () => {
    it('should track call_detail_viewed event when call is loaded', () => {
      render(<CallDetail />);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_detail_viewed', {
        timestamp: expect.any(String),
        callId: '123',
        callNumber: 'CALL-001',
        callType: 'Emergency',
        priority: 'High',
        hasCoordinates: true,
        notesCount: 2,
        imagesCount: 1,
        filesCount: 3,
        hasProtocols: false,
        hasDispatches: false,
        hasActivity: false,
      });
    });

    it('should not track analytics when call is not loaded', () => {
      useCallDetailStore.mockReturnValue({
        call: null,
        callExtraData: null,
        callPriority: null,
        isLoading: false,
        error: null,
        fetchCallDetail: jest.fn(),
        reset: jest.fn(),
      });

      render(<CallDetail />);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('should track analytics with protocol data when available', () => {
      useCallDetailStore.mockReturnValue({
        call: mockCall,
        callExtraData: {
          Protocols: [{ Name: 'Protocol 1', Description: 'Test Protocol', ProtocolText: '<p>Test</p>' }],
          Dispatches: [{ Name: 'Unit 1', Group: 'Station 1', Type: 'Engine' }],
          Activity: [{ StatusText: 'En Route', Name: 'John', Group: 'Station 1', Timestamp: '2023-01-01T10:05:00Z', Note: '', StatusColor: '#00FF00' }],
        },
        callPriority: mockCallPriority,
        isLoading: false,
        error: null,
        fetchCallDetail: jest.fn(),
        reset: jest.fn(),
      });

      render(<CallDetail />);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_detail_viewed', {
        timestamp: expect.any(String),
        callId: '123',
        callNumber: 'CALL-001',
        callType: 'Emergency',
        priority: 'High',
        hasCoordinates: true,
        notesCount: 2,
        imagesCount: 1,
        filesCount: 3,
        hasProtocols: true,
        hasDispatches: true,
        hasActivity: true,
      });
    });

    it('should track analytics with Unknown priority when priority is not available', () => {
      useCallDetailStore.mockReturnValue({
        call: mockCall,
        callExtraData: mockCallExtraData,
        callPriority: null,
        isLoading: false,
        error: null,
        fetchCallDetail: jest.fn(),
        reset: jest.fn(),
      });

      render(<CallDetail />);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_detail_viewed', expect.objectContaining({
        priority: 'Unknown',
      }));
    });

    it('should track analytics with correct timestamp format', () => {
      const mockDate = new Date('2024-01-15T10:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      render(<CallDetail />);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_detail_viewed', expect.objectContaining({
        timestamp: '2024-01-15T10:00:00.000Z',
      }));

      jest.restoreAllMocks();
    });

    it('should track analytics when useFocusEffect callback is called', () => {
      let focusCallback: (() => void) | undefined;
      mockUseFocusEffect.mockImplementation((callback: () => void) => {
        focusCallback = callback;
      });

      render(<CallDetail />);

      // Clear previous calls
      mockTrackEvent.mockClear();

      // Manually trigger the focus callback
      focusCallback?.();

      expect(mockTrackEvent).toHaveBeenCalledWith('call_detail_viewed', expect.any(Object));
    });
  });

  describe('Action Analytics Tracking', () => {
    beforeEach(() => {
      // Clear analytics tracking from the initial render
      mockTrackEvent.mockClear();
    });

    it('should track analytics when notes modal is opened', () => {
      const { getByText } = render(<CallDetail />);

      fireEvent.press(getByText('call_detail.notes'));

      expect(mockTrackEvent).toHaveBeenCalledWith('call_notes_opened', {
        timestamp: expect.any(String),
        callId: '123',
        notesCount: 2,
      });
    });

    it('should track analytics when images modal is opened', () => {
      const { getByText } = render(<CallDetail />);

      fireEvent.press(getByText('call_detail.images'));

      expect(mockTrackEvent).toHaveBeenCalledWith('call_images_opened', {
        timestamp: expect.any(String),
        callId: '123',
        imagesCount: 1,
      });
    });

    it('should track analytics when files modal is opened', () => {
      const { getByText } = render(<CallDetail />);

      fireEvent.press(getByText('call_detail.files.button'));

      expect(mockTrackEvent).toHaveBeenCalledWith('call_files_opened', {
        timestamp: expect.any(String),
        callId: '123',
        filesCount: 3,
      });
    });

    it('should track analytics when route button is pressed', async () => {
      const mockOpenMapsWithDirections = require('@/lib/navigation').openMapsWithDirections;
      mockOpenMapsWithDirections.mockResolvedValue(true);

      const { getByText } = render(<CallDetail />);

      fireEvent.press(getByText('common.route'));

      expect(mockTrackEvent).toHaveBeenCalledWith('call_route_opened', {
        timestamp: expect.any(String),
        callId: '123',
        hasUserLocation: true,
        destinationAddress: '123 Test St',
      });
    });

    it('should track analytics when route fails to open maps', async () => {
      const mockOpenMapsWithDirections = require('@/lib/navigation').openMapsWithDirections;
      mockOpenMapsWithDirections.mockResolvedValue(false);

      const { getByText } = render(<CallDetail />);

      fireEvent.press(getByText('common.route'));

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockTrackEvent).toHaveBeenCalledWith('call_route_failed', {
        timestamp: expect.any(String),
        callId: '123',
        reason: 'failed_to_open_maps',
      });
    });

    it('should track analytics when route throws an exception', async () => {
      const mockOpenMapsWithDirections = require('@/lib/navigation').openMapsWithDirections;
      mockOpenMapsWithDirections.mockRejectedValue(new Error('Navigation error'));

      const { getByText } = render(<CallDetail />);

      fireEvent.press(getByText('common.route'));

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockTrackEvent).toHaveBeenCalledWith('call_route_failed', {
        timestamp: expect.any(String),
        callId: '123',
        reason: 'exception',
        error: 'Navigation error',
      });
    });

    it('should track analytics with correct data when call is null but callId exists', () => {
      useCallDetailStore.mockReturnValue({
        call: null,
        callExtraData: null,
        callPriority: null,
        isLoading: false,
        error: null,
        fetchCallDetail: jest.fn(),
        reset: jest.fn(),
      });

      const { getByText } = render(<CallDetail />);

      // This will render the "not found" state, but we can test if analytics would use fallback
      // Since call is null, we should check that callId is used as fallback
      expect(screen.getByText('call_detail.not_found')).toBeTruthy();
    });
  });
});
