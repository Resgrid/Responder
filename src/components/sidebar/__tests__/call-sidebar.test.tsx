import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useColorScheme } from 'nativewind';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { SidebarCallCard } from '../call-sidebar';
import { useCoreStore } from '@/stores/app/core-store';
import { useCallsStore } from '@/stores/calls/store';
import { type CallResultData } from '@/models/v4/calls/callResultData';
import { type CallPriorityResultData } from '@/models/v4/callPriorities/callPriorityResultData';
import { openMapsWithDirections, openMapsWithAddress } from '@/lib/navigation';

// Mock dependencies
jest.mock('react-i18next');
jest.mock('@tanstack/react-query');
jest.mock('nativewind');
jest.mock('expo-router');
jest.mock('react-native/Libraries/Alert/Alert');
jest.mock('@/stores/app/core-store');
jest.mock('@/stores/calls/store');
jest.mock('@/lib/navigation');

// Mock UI components
jest.mock('@/components/ui/bottom-sheet', () => ({
  CustomBottomSheet: ({ children, isOpen, onClose, isLoading, testID }: any) => {
    const { View, Text } = require('react-native');
    return isOpen ? (
      <View testID={testID}>
        {isLoading ? <Text testID="loading-spinner">Loading...</Text> : children}
      </View>
    ) : null;
  },
}));

jest.mock('@/components/calls/call-card', () => ({
  CallCard: ({ call }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="call-card">
        <Text testID="call-name">{call.Name}</Text>
      </View>
    );
  },
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => {
    const { View } = require('react-native');
    return <View testID="card">{children}</View>;
  },
}));

jest.mock('@/components/ui/text', () => ({
  Text: ({ children, testID }: any) => {
    const { Text } = require('react-native');
    return <Text testID={testID}>{children}</Text>;
  },
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
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
  ButtonIcon: ({ as: Icon, testID }: any) => {
    const { View, Text } = require('react-native');
    // Create a testID based on the icon type
    let iconTestId = testID;
    if (Icon) {
      if (Icon === require('lucide-react-native').Eye) {
        iconTestId = 'eye-icon';
      } else if (Icon === require('lucide-react-native').MapPin) {
        iconTestId = 'map-pin-icon';
      } else if (Icon === require('lucide-react-native').CircleX) {
        iconTestId = 'circle-x-icon';
      } else if (Icon === require('lucide-react-native').Check) {
        iconTestId = 'check-icon';
      }
    }
    return (
      <View testID={iconTestId}>
        <Text>Icon</Text>
      </View>
    );
  },
}));

jest.mock('lucide-react-native', () => ({
  Check: (props: any) => {
    const { View, Text } = require('react-native');
    return <View testID="check-icon"><Text>Check</Text></View>;
  },
  CircleX: (props: any) => {
    const { View, Text } = require('react-native');
    return <View testID="circle-x-icon"><Text>CircleX</Text></View>;
  },
  Eye: (props: any) => {
    const { View, Text } = require('react-native');
    return <View testID="eye-icon"><Text>Eye</Text></View>;
  },
  MapPin: (props: any) => {
    const { View, Text } = require('react-native');
    return <View testID="map-pin-icon"><Text>MapPin</Text></View>;
  },
}));

const mockCall: CallResultData = {
  CallId: '123',
  Priority: 1,
  Name: 'Test Emergency Call',
  Nature: 'Emergency',
  Note: 'Test note',
  Address: '123 Test Street',
  Geolocation: '40.7128,-74.0060',
  LoggedOn: '2023-01-01T10:00:00Z',
  State: '1',
  Number: 'C001',
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
  Type: 'Emergency',
  LoggedOnUtc: '2023-01-01T10:00:00Z',
  DispatchedOn: '2023-01-01T10:05:00Z',
  DispatchedOnUtc: '2023-01-01T10:05:00Z',
  Latitude: '40.7128',
  Longitude: '-74.0060',
};

const mockPriority: CallPriorityResultData = {
  Id: 1,
  DepartmentId: 1,
  Name: 'High Priority',
  Color: '#FF0000',
  Sort: 1,
  IsDeleted: false,
  IsDefault: false,
  Tone: 0,
};

const mockCalls: CallResultData[] = [
  mockCall,
  {
    ...mockCall,
    CallId: '456',
    Number: 'C002',
    Name: 'Test Fire Call',
    Type: 'Fire',
    Address: '456 Fire Lane',
  },
];

// Mock function implementations
const mockUseTranslation = useTranslation as jest.MockedFunction<typeof useTranslation>;
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseColorScheme = useColorScheme as jest.MockedFunction<typeof useColorScheme>;
const mockRouter = router as jest.Mocked<typeof router>;
const mockAlert = Alert as jest.Mocked<typeof Alert>;
const mockUseCoreStore = useCoreStore as jest.MockedFunction<typeof useCoreStore>;
const mockUseCallsStore = useCallsStore as jest.MockedFunction<typeof useCallsStore>;
const mockOpenMapsWithDirections = openMapsWithDirections as jest.MockedFunction<typeof openMapsWithDirections>;
const mockOpenMapsWithAddress = openMapsWithAddress as jest.MockedFunction<typeof openMapsWithAddress>;

describe('SidebarCallCard', () => {
  const mockSetActiveCall = jest.fn();
  const mockFetchCalls = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTranslation.mockReturnValue({
      t: (key: string) => key,
      i18n: {} as any,
      ready: true,
    } as any);

    mockUseColorScheme.mockReturnValue({
      colorScheme: 'light',
      setColorScheme: jest.fn(),
      toggleColorScheme: jest.fn(),
    });

    mockUseCoreStore.mockReturnValue({
      activeCall: null,
      activePriority: null,
      setActiveCall: mockSetActiveCall,
    });

    mockUseCallsStore.mockReturnValue({
      calls: [],
      fetchCalls: mockFetchCalls,
    });

    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    mockAlert.alert = jest.fn();
    mockRouter.push = jest.fn();
    mockOpenMapsWithDirections.mockResolvedValue(true);
    mockOpenMapsWithAddress.mockResolvedValue(true);
  });

  describe('Basic Rendering', () => {
    it('should render with no active call', () => {
      render(<SidebarCallCard />);

      expect(screen.getByTestId('call-selection-trigger')).toBeTruthy();
      expect(screen.getByTestId('card')).toBeTruthy();
      expect(screen.getByText('calls.no_call_selected')).toBeTruthy();
      expect(screen.getByText('calls.no_call_selected_info')).toBeTruthy();
    });

    it('should render with active call', () => {
      mockUseCoreStore.mockReturnValue({
        activeCall: mockCall,
        activePriority: mockPriority,
        setActiveCall: mockSetActiveCall,
      });

      render(<SidebarCallCard />);

      expect(screen.getByTestId('call-selection-trigger')).toBeTruthy();
      expect(screen.getByTestId('call-card')).toBeTruthy();
      expect(screen.getByTestId('call-name')).toBeTruthy();
      expect(screen.getByText('Test Emergency Call')).toBeTruthy();
    });

    it('should show action buttons when active call exists with coordinates', () => {
      mockUseCoreStore.mockReturnValue({
        activeCall: mockCall,
        activePriority: mockPriority,
        setActiveCall: mockSetActiveCall,
      });

      render(<SidebarCallCard />);

      expect(screen.getByTestId('eye-icon')).toBeTruthy();
      expect(screen.getByTestId('map-pin-icon')).toBeTruthy();
      expect(screen.getByTestId('circle-x-icon')).toBeTruthy();
    });

    it('should show map button when active call has address only', () => {
      const callWithAddressOnly = {
        ...mockCall,
        Latitude: '',
        Longitude: '',
        Address: '123 Test Street',
      };

      mockUseCoreStore.mockReturnValue({
        activeCall: callWithAddressOnly,
        activePriority: mockPriority,
        setActiveCall: mockSetActiveCall,
      });

      render(<SidebarCallCard />);

      expect(screen.getByTestId('eye-icon')).toBeTruthy();
      expect(screen.getByTestId('map-pin-icon')).toBeTruthy();
      expect(screen.getByTestId('circle-x-icon')).toBeTruthy();
    });

    it('should not show map button when active call has no location data', () => {
      const callWithoutLocation = {
        ...mockCall,
        Latitude: '',
        Longitude: '',
        Address: '',
      };

      mockUseCoreStore.mockReturnValue({
        activeCall: callWithoutLocation,
        activePriority: mockPriority,
        setActiveCall: mockSetActiveCall,
      });

      render(<SidebarCallCard />);

      expect(screen.getByTestId('eye-icon')).toBeTruthy();
      expect(() => screen.getByTestId('map-pin-icon')).toThrow();
      expect(screen.getByTestId('circle-x-icon')).toBeTruthy();
    });

    it('should not show map button when active call has empty address', () => {
      const callWithEmptyAddress = {
        ...mockCall,
        Latitude: '',
        Longitude: '',
        Address: '   ',
      };

      mockUseCoreStore.mockReturnValue({
        activeCall: callWithEmptyAddress,
        activePriority: mockPriority,
        setActiveCall: mockSetActiveCall,
      });

      render(<SidebarCallCard />);

      expect(screen.getByTestId('eye-icon')).toBeTruthy();
      expect(() => screen.getByTestId('map-pin-icon')).toThrow();
      expect(screen.getByTestId('circle-x-icon')).toBeTruthy();
    });
  });

  describe('Bottom Sheet Behavior', () => {
    it('should open bottom sheet when trigger is pressed', () => {
      render(<SidebarCallCard />);

      fireEvent.press(screen.getByTestId('call-selection-trigger'));

      expect(screen.getByTestId('call-selection-bottom-sheet')).toBeTruthy();
    });

    it('should show loading state in bottom sheet', () => {
      mockUseQuery.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<SidebarCallCard />);

      fireEvent.press(screen.getByTestId('call-selection-trigger'));

      expect(screen.getByTestId('loading-spinner')).toBeTruthy();
    });

    it('should display calls list in bottom sheet', () => {
      mockUseQuery.mockReturnValue({
        data: mockCalls,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<SidebarCallCard />);

      fireEvent.press(screen.getByTestId('call-selection-trigger'));

      expect(screen.getByText('calls.select_active_call')).toBeTruthy();
      expect(screen.getByTestId('call-item-123')).toBeTruthy();
      expect(screen.getByTestId('call-item-456')).toBeTruthy();
    });

    it('should show no calls message when list is empty', () => {
      mockUseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<SidebarCallCard />);

      fireEvent.press(screen.getByTestId('call-selection-trigger'));

      expect(screen.getByTestId('no-calls-message')).toBeTruthy();
      expect(screen.getByText('calls.no_open_calls')).toBeTruthy();
    });
  });

  describe('Action Buttons', () => {
    beforeEach(() => {
      mockUseCoreStore.mockReturnValue({
        activeCall: mockCall,
        activePriority: mockPriority,
        setActiveCall: mockSetActiveCall,
      });
    });

    it('should navigate to call detail when eye button is pressed', () => {
      render(<SidebarCallCard />);

      fireEvent.press(screen.getByTestId('eye-icon'));

      expect(mockRouter.push).toHaveBeenCalledWith('/call/123');
    });

    it('should show deselect confirmation when deselect button is pressed', () => {
      render(<SidebarCallCard />);

      fireEvent.press(screen.getByTestId('circle-x-icon'));

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'calls.confirm_deselect_title',
        'calls.confirm_deselect_message',
        expect.arrayContaining([
          expect.objectContaining({ text: 'common.cancel' }),
          expect.objectContaining({ text: 'common.confirm' }),
        ]),
        { cancelable: true }
      );
    });

    it('should open maps with coordinates when map pin button is pressed with valid coordinates', async () => {
      render(<SidebarCallCard />);

      fireEvent.press(screen.getByTestId('map-pin-icon'));

      expect(mockOpenMapsWithDirections).toHaveBeenCalledWith(
        mockCall.Latitude,
        mockCall.Longitude,
        mockCall.Address
      );
      expect(mockOpenMapsWithAddress).not.toHaveBeenCalled();
    });

    it('should open maps with address when map pin button is pressed with address only', async () => {
      const callWithAddressOnly = {
        ...mockCall,
        Latitude: '',
        Longitude: '',
        Address: '123 Test Street',
      };

      mockUseCoreStore.mockReturnValue({
        activeCall: callWithAddressOnly,
        activePriority: mockPriority,
        setActiveCall: mockSetActiveCall,
      });

      render(<SidebarCallCard />);

      fireEvent.press(screen.getByTestId('map-pin-icon'));

      expect(mockOpenMapsWithAddress).toHaveBeenCalledWith('123 Test Street');
      expect(mockOpenMapsWithDirections).not.toHaveBeenCalled();
    });

    it('should show error alert when openMapsWithDirections fails', async () => {
      mockOpenMapsWithDirections.mockRejectedValue(new Error('Navigation failed'));

      render(<SidebarCallCard />);

      fireEvent.press(screen.getByTestId('map-pin-icon'));

      // Wait for the async operation to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'calls.no_location_title',
        'calls.no_location_message',
        [{ text: 'common.ok' }]
      );
    });

    it('should show error alert when openMapsWithAddress fails', async () => {
      const callWithAddressOnly = {
        ...mockCall,
        Latitude: '',
        Longitude: '',
        Address: '123 Test Street',
      };

      mockUseCoreStore.mockReturnValue({
        activeCall: callWithAddressOnly,
        activePriority: mockPriority,
        setActiveCall: mockSetActiveCall,
      });

      mockOpenMapsWithAddress.mockRejectedValue(new Error('Address navigation failed'));

      render(<SidebarCallCard />);

      fireEvent.press(screen.getByTestId('map-pin-icon'));

      // Wait for the async operation to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'calls.no_location_title',
        'calls.no_location_message',
        [{ text: 'common.ok' }]
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper testIDs for automation', () => {
      render(<SidebarCallCard />);

      expect(screen.getByTestId('call-selection-trigger')).toBeTruthy();
    });
  });
}); 