import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import { useAnalytics } from '@/hooks/use-analytics';
import { useCoreStore } from '@/stores/app/core-store';
import { useCallsStore } from '@/stores/calls/store';
import { usePersonnelStatusBottomSheetStore } from '@/stores/status/personnel-status-store';
import { PersonnelStatusBottomSheet } from '../personnel-status-bottom-sheet';

// Mock offline-queue-processor to avoid syntax errors
jest.mock('@/services/offline-queue-processor', () => ({
  offlineQueueProcessor: { processQueue: jest.fn(), addPersonnelStatusToQueue: jest.fn(), cleanup: jest.fn(), startProcessing: jest.fn(), startBackgroundProcessing: jest.fn() },
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(),
    addEventListener: jest.fn(),
    useNetInfo: jest.fn()
  }
}));

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      if (params) {
        return key.replace(/\{\{(\w+)\}\}/g, (match, param) => params[param] || match);
      }
      return key;
    },
  }),
}));

// Mock the analytics hook
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: jest.fn(),
}));

// Mock nativewind useColorScheme hook
jest.mock('nativewind', () => ({
  useColorScheme: () => ({
    colorScheme: 'light',
    setColorScheme: jest.fn(),
  }),
}));

// Mock the stores
jest.mock('@/stores/app/core-store');
jest.mock('@/stores/calls/store');
jest.mock('@/stores/status/personnel-status-store');

// Mock Lucide icons
jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => {
    const { View } = require('react-native');
    return <View testID="arrow-left-icon" />;
  },
  ArrowRight: () => {
    const { View } = require('react-native');
    return <View testID="arrow-right-icon" />;
  },
  Check: () => {
    const { View } = require('react-native');
    return <View testID="check-icon" />;
  },
  X: () => {
    const { View } = require('react-native');
    return <View testID="x-icon" />;
  },
}));

// Mock UI components with proper test IDs
jest.mock('@/components/ui/actionsheet', () => ({
  Actionsheet: ({ isOpen, children, onClose }: any) => {
    const { View } = require('react-native');
    return isOpen ? <View testID="personnel-status-bottom-sheet">{children}</View> : null;
  },
  ActionsheetBackdrop: ({ children }: any) => {
    const { View } = require('react-native');
    return <View testID="actionsheet-backdrop">{children}</View>;
  },
  ActionsheetContent: ({ children }: any) => {
    const { View } = require('react-native');
    return <View testID="actionsheet-content">{children}</View>;
  },
  ActionsheetDragIndicator: () => {
    const { View } = require('react-native');
    return <View testID="actionsheet-drag-indicator" />;
  },
  ActionsheetDragIndicatorWrapper: ({ children }: any) => {
    const { View } = require('react-native');
    return <View testID="actionsheet-drag-indicator-wrapper">{children}</View>;
  },
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onPress, isDisabled, testID, ...props }: any) => {
    const { TouchableOpacity } = require('react-native');
    return <TouchableOpacity testID={testID || 'button'} onPress={onPress} disabled={isDisabled} {...props}>{children}</TouchableOpacity>;
  },
  ButtonText: ({ children, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text {...props}>{children}</Text>;
  },
}));

jest.mock('@/components/ui/heading', () => ({
  Heading: ({ children, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text {...props}>{children}</Text>;
  },
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('@/components/ui/text', () => ({
  Text: ({ children, ...props }: any) => {
    const { Text: RNText } = require('react-native');
    return <RNText {...props}>{children}</RNText>;
  },
}));

jest.mock('@/components/ui/spinner', () => ({
  Spinner: ({ size, ...props }: any) => {
    const { View } = require('react-native');
    return <View testID="loading-spinner" {...props} />;
  },
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
  InputField: ({ placeholder, value, onChangeText, ...props }: any) => {
    const { TextInput } = require('react-native');
    return <TextInput placeholder={placeholder} value={value} onChangeText={onChangeText} {...props} />;
  },
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
  TextareaInput: ({ placeholder, value, onChangeText, ...props }: any) => {
    const { TextInput } = require('react-native');
    return <TextInput placeholder={placeholder} value={value} onChangeText={onChangeText} {...props} />;
  },
}));

const mockUseCoreStore = useCoreStore as jest.MockedFunction<typeof useCoreStore>;
const mockUseCallsStore = useCallsStore as jest.MockedFunction<typeof useCallsStore>;
const mockUsePersonnelStatusBottomSheetStore = usePersonnelStatusBottomSheetStore as jest.MockedFunction<typeof usePersonnelStatusBottomSheetStore>;
const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;

describe('PersonnelStatusBottomSheet Integration Tests', () => {
  const mockTrackEvent = jest.fn();
  const mockNextStep = jest.fn();
  const mockSetSelectedCall = jest.fn();
  const mockSetResponseType = jest.fn();

  const mockStore = {
    isOpen: true,
    currentStep: 'select-responding-to' as const,
    selectedCall: null,
    selectedGroup: null,
    selectedStatus: {
      Id: 1,
      Text: 'Available',
      BColor: '#00FF00',
      Detail: 0, // No destination required
    },
    responseType: 'none' as const,
    selectedTab: 'calls' as const,
    note: '',
    respondingTo: '',
    isLoading: false,
    groups: [],
    isLoadingGroups: false,
    setIsOpen: jest.fn(),
    setCurrentStep: jest.fn(),
    setSelectedCall: mockSetSelectedCall,
    setSelectedGroup: jest.fn(),
    setResponseType: mockSetResponseType,
    setSelectedTab: jest.fn(),
    setNote: jest.fn(),
    setRespondingTo: jest.fn(),
    setIsLoading: jest.fn(),
    fetchGroups: jest.fn(),
    nextStep: mockNextStep,
    previousStep: jest.fn(),
    submitStatus: jest.fn(),
    reset: jest.fn(),
    isDestinationRequired: jest.fn(() => false),
    areCallsAllowed: jest.fn(() => true),
    areStationsAllowed: jest.fn(() => true),
    getRequiredGpsAccuracy: jest.fn(() => false),
    goToNextStep: jest.fn(),
  };

  const mockCallsStore = {
    calls: [
      {
        CallId: '1',
        Number: 'CALL-001',
        Name: 'Test Call 1',
        Address: '123 Test St',
      },
    ],
    isLoading: false,
    fetchCalls: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });

    mockUseCoreStore.mockReturnValue({
      activeCall: null,
    });

    mockUseCallsStore.mockReturnValue(mockCallsStore);
  });

  describe('Next button functionality', () => {
    it('should enable Next button when destination is not required', () => {
      mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
        ...mockStore,
        selectedStatus: {
          Id: 1,
          Text: 'Available',
          BColor: '#00FF00',
          Detail: 0, // No destination required
        },
      });

      render(<PersonnelStatusBottomSheet />);

      const nextButton = screen.getByText('common.next');
      expect(nextButton).toBeTruthy();

      // The button should be enabled since no destination is required
      fireEvent.press(nextButton);
      expect(mockNextStep).toHaveBeenCalled();
    });

    it('should enable Next button when destination requirement exists but user selects "No Destination"', () => {
      mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
        ...mockStore,
        selectedStatus: {
          Id: 1,
          Text: 'Responding',
          BColor: '#FF0000',
          Detail: 2, // Call required, but "No Destination" should still be valid
        },
        responseType: 'none',
        selectedCall: null,
      });

      render(<PersonnelStatusBottomSheet />);

      const nextButton = screen.getByText('common.next');
      expect(nextButton).toBeTruthy();

      // The button should be enabled since "No Destination" is always valid
      fireEvent.press(nextButton);
      expect(mockNextStep).toHaveBeenCalled();
    });

    it('should enable Next button when destination is required and a call is selected', () => {
      mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
        ...mockStore,
        selectedStatus: {
          Id: 1,
          Text: 'Responding',
          BColor: '#FF0000',
          Detail: 2, // Call required
        },
        responseType: 'call',
        selectedCall: mockCallsStore.calls[0],
      });

      render(<PersonnelStatusBottomSheet />);

      const nextButton = screen.getByText('common.next');
      expect(nextButton).toBeTruthy();

      // The button should be enabled since a call is selected
      fireEvent.press(nextButton);
      expect(mockNextStep).toHaveBeenCalled();
    });

    it('should allow selection of call and enable Next button', () => {
      mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
        ...mockStore,
        selectedStatus: {
          Id: 1,
          Text: 'Responding',
          BColor: '#FF0000',
          Detail: 2, // Call required
        },
        responseType: 'none',
        selectedCall: null,
      });

      render(<PersonnelStatusBottomSheet />);

      // Find and click a call option
      const callOption = screen.getByText('CALL-001 - Test Call 1');
      fireEvent.press(callOption);

      // Verify the selection handlers are called
      expect(mockSetSelectedCall).toHaveBeenCalledWith(mockCallsStore.calls[0]);
    });

    it('should allow selection of no destination option', () => {
      mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
        ...mockStore,
        selectedStatus: {
          Id: 1,
          Text: 'Available',
          BColor: '#00FF00',
          Detail: 0, // No destination required
        },
      });

      render(<PersonnelStatusBottomSheet />);

      // Find and click the no destination option
      const noDestOption = screen.getByText('personnel.status.no_destination');
      fireEvent.press(noDestOption);

      // Verify the selection handler is called
      expect(mockSetResponseType).toHaveBeenCalledWith('none');
    });
  });

  describe('Outline styling', () => {
    it('should render calls with outline styling instead of radio buttons', () => {
      mockUsePersonnelStatusBottomSheetStore.mockReturnValue(mockStore);

      render(<PersonnelStatusBottomSheet />);

      // Verify the call is rendered and clickable
      const callOption = screen.getByText('CALL-001 - Test Call 1');
      expect(callOption).toBeTruthy();

      // Verify it's a TouchableOpacity (not a radio button)
      fireEvent.press(callOption);
      expect(mockSetSelectedCall).toHaveBeenCalled();
    });

    it('should show checkmark icon for selected items', () => {
      mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
        ...mockStore,
        responseType: 'none',
      });

      render(<PersonnelStatusBottomSheet />);

      // The check icon should be shown for the selected "no destination" option
      // This is handled by the Check component which is mocked
      const checkIcon = screen.queryAllByTestId('check-icon');
      expect(checkIcon.length).toBeGreaterThan(0);
    });
  });

  describe('Close button functionality', () => {
    it('should render close (X) button in the header', () => {
      mockUsePersonnelStatusBottomSheetStore.mockReturnValue(mockStore);

      render(<PersonnelStatusBottomSheet />);

      // Verify the X close button is rendered
      const closeButton = screen.getByTestId('x-icon');
      expect(closeButton).toBeTruthy();
    });

    it('should call handleClose when X button is pressed', () => {
      const mockReset = jest.fn();
      mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
        ...mockStore,
        reset: mockReset,
      });

      render(<PersonnelStatusBottomSheet />);

      // Find and click the close button
      const closeButton = screen.getByTestId('x-icon');
      fireEvent.press(closeButton.parent); // Press the TouchableOpacity parent

      // Verify reset is called
      expect(mockReset).toHaveBeenCalled();
    });
  });
});
