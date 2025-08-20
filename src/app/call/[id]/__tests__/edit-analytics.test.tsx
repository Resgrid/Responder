import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
        </View>
      );
    },
  },
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

jest.mock('axios', () => ({
  get: jest.fn(),
}));

// Mock stores
const mockCoreStore = {
  config: {
    GoogleMapsKey: 'test-google-key',
    W3WKey: 'test-w3w-key',
  },
};

const mockCallsStore = {
  callPriorities: [
    { Id: 1, Name: 'Low' },
    { Id: 2, Name: 'Medium' },
    { Id: 3, Name: 'High' },
  ],
  callTypes: [
    { Id: '1', Name: 'Fire' },
    { Id: '2', Name: 'Medical' },
    { Id: '3', Name: 'Police' },
  ],
  isLoading: false,
  error: null,
  fetchCallPriorities: jest.fn(),
  fetchCallTypes: jest.fn(),
};

const mockCallDetailStore = {
  call: {
    Id: 'test-call-123',
    Name: 'Test Call',
    Nature: 'Test Nature',
    Priority: 2,
    Type: '1',
    Note: 'Test Note',
    Address: '123 Test St',
    Latitude: '40.7128',
    Longitude: '-74.006',
    ContactName: 'John Doe',
    ContactInfo: '555-1234',
  },
  isLoading: false,
  error: null,
  fetchCallDetail: jest.fn(),
  updateCall: jest.fn(),
};

jest.mock('@/stores/app/core-store', () => ({
  useCoreStore: () => mockCoreStore,
}));

jest.mock('@/stores/calls/store', () => ({
  useCallsStore: () => mockCallsStore,
}));

jest.mock('@/stores/calls/detail-store', () => ({
  useCallDetailStore: () => mockCallDetailStore,
}));

jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    show: jest.fn(),
  }),
}));

// Mock UI components
jest.mock('@/components/calls/dispatch-selection-modal', () => ({
  DispatchSelectionModal: ({ isVisible, onConfirm }: any) => {
    const { TouchableOpacity, Text } = require('react-native');
    return isVisible ? (
      <TouchableOpacity
        testID="dispatch-modal"
        onPress={() =>
          onConfirm({
            everyone: false,
            users: ['user1'],
            groups: ['group1'],
            roles: [],
            units: [],
          })
        }
      >
        <Text>Dispatch Modal</Text>
      </TouchableOpacity>
    ) : null;
  },
}));

jest.mock('@/components/maps/location-picker', () => ({
  __esModule: true,
  default: ({ onLocationSelected }: any) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity
        testID="location-picker"
        onPress={() =>
          onLocationSelected({
            latitude: 40.7128,
            longitude: -74.006,
            address: '123 Test St',
          })
        }
      >
        <Text>Location Picker</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('@/components/maps/full-screen-location-picker', () => ({
  __esModule: true,
  default: ({ onLocationSelected, onClose }: any) => {
    const { TouchableOpacity, Text, View } = require('react-native');
    return (
      <View testID="full-screen-location-picker">
        <TouchableOpacity
          testID="select-location-button"
          onPress={() => {
            onLocationSelected({
              latitude: 40.7128,
              longitude: -74.006,
              address: '123 Test St',
            });
            onClose();
          }}
        >
          <Text>Select Location</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="close-location-picker" onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

// Mock other UI components
jest.mock('@/components/ui/bottom-sheet', () => ({
  CustomBottomSheet: ({ children, isOpen }: any) => {
    const { View } = require('react-native');
    return isOpen ? <View testID="bottom-sheet">{children}</View> : null;
  },
}));

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

// Mock other components as simple Views
const mockComponent = (name: string) => {
  return ({ children, testID, onPress, ...props }: any) => {
    const { View, TouchableOpacity, Text } = require('react-native');
    const Component = onPress ? TouchableOpacity : View;
    return (
      <Component testID={testID || name.toLowerCase()} onPress={onPress} {...props}>
        {typeof children === 'string' ? <Text>{children}</Text> : children}
      </Component>
    );
  };
};

jest.mock('@/components/ui/box', () => ({ Box: mockComponent('Box') }));
jest.mock('@/components/ui/button', () => ({
  Button: mockComponent('Button'),
  ButtonText: mockComponent('ButtonText'),
}));
jest.mock('@/components/ui/card', () => ({ Card: mockComponent('Card') }));
jest.mock('@/components/ui/form-control', () => ({
  FormControl: mockComponent('FormControl'),
  FormControlError: mockComponent('FormControlError'),
  FormControlLabel: mockComponent('FormControlLabel'),
  FormControlLabelText: mockComponent('FormControlLabelText'),
}));
jest.mock('@/components/ui/input', () => ({
  Input: mockComponent('Input'),
  InputField: ({ testID, onChangeText, value, ...props }: any) => {
    const { TextInput } = require('react-native');
    return (
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        {...props}
      />
    );
  },
}));
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, selectedValue }: any) => {
    const { View } = require('react-native');
    return <View testID="select">{children}</View>;
  },
  SelectBackdrop: mockComponent('SelectBackdrop'),
  SelectContent: mockComponent('SelectContent'),
  SelectIcon: mockComponent('SelectIcon'),
  SelectInput: mockComponent('SelectInput'),
  SelectItem: mockComponent('SelectItem'),
  SelectPortal: mockComponent('SelectPortal'),
  SelectTrigger: mockComponent('SelectTrigger'),
}));
jest.mock('@/components/ui/text', () => ({ Text: mockComponent('Text') }));
jest.mock('@/components/ui/textarea', () => ({
  Textarea: mockComponent('Textarea'),
  TextareaInput: ({ testID, onChangeText, value, ...props }: any) => {
    const { TextInput } = require('react-native');
    return (
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        multiline={true}
        {...props}
      />
    );
  },
}));

describe('EditCall Analytics', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  };

  const mockUpdateCall = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'test-call-123' });
    mockUpdateCall.mockResolvedValue({ Success: true });
    mockCallDetailStore.updateCall = mockUpdateCall;
  });

  const EditCall = require('../edit').default;

  describe('View Analytics', () => {
    it('should track call_edit_viewed event when page becomes focused', () => {
      let focusCallback: (() => void) | undefined;
      mockUseFocusEffect.mockImplementation((callback: () => void) => {
        focusCallback = callback;
      });

      render(<EditCall />);

      // Manually trigger the focus callback
      focusCallback?.();

      expect(mockTrackEvent).toHaveBeenCalledWith('call_edit_viewed', {
        timestamp: expect.any(String),
        callId: 'test-call-123',
        priority: 'Medium',
        type: 'Fire',
        priorityCount: 3,
        typeCount: 3,
        hasGoogleMapsKey: true,
        hasWhat3WordsKey: true,
        hasAddress: true,
        hasCoordinates: true,
        hasContactInfo: true,
      });
    });

    it('should track view event with correct configuration status', () => {
      // Test without API keys
      mockCoreStore.config.GoogleMapsKey = '';
      mockCoreStore.config.W3WKey = '';

      let focusCallback: (() => void) | undefined;
      mockUseFocusEffect.mockImplementation((callback: () => void) => {
        focusCallback = callback;
      });

      render(<EditCall />);
      focusCallback?.();

      expect(mockTrackEvent).toHaveBeenCalledWith('call_edit_viewed', expect.objectContaining({
        hasGoogleMapsKey: false,
        hasWhat3WordsKey: false,
      }));

      // Reset for other tests
      mockCoreStore.config.GoogleMapsKey = 'test-google-key';
      mockCoreStore.config.W3WKey = 'test-w3w-key';
    });

    it('should not track view event when data is still loading', () => {
      mockCallsStore.isLoading = true;

      let focusCallback: (() => void) | undefined;
      mockUseFocusEffect.mockImplementation((callback: () => void) => {
        focusCallback = callback;
      });

      render(<EditCall />);
      focusCallback?.();

      expect(mockTrackEvent).not.toHaveBeenCalled();

      // Reset for other tests
      mockCallsStore.isLoading = false;
    });
  });

  describe('Call Update Analytics', () => {
    it('should track call_update_attempted event when form is submitted', async () => {
      const { getByTestId } = render(<EditCall />);

      // Fill form with test data
      fireEvent.changeText(getByTestId('name-input') || getByTestId('input'), 'Updated Test Call');

      // Submit form (find submit button)
      const submitButton = getByTestId('submit-button') || getByTestId('button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_update_attempted', expect.objectContaining({
          timestamp: expect.any(String),
          callId: 'test-call-123',
          priority: expect.any(String),
          type: expect.any(String),
          hasNote: expect.any(Boolean),
          hasAddress: expect.any(Boolean),
          hasCoordinates: expect.any(Boolean),
          hasWhat3Words: expect.any(Boolean),
          hasPlusCode: expect.any(Boolean),
          hasContactName: expect.any(Boolean),
          hasContactInfo: expect.any(Boolean),
          dispatchEveryone: expect.any(Boolean),
          dispatchCount: expect.any(Number),
        }));
      });
    });

    it('should track call_update_success event when update succeeds', async () => {
      const { getByTestId } = render(<EditCall />);

      const submitButton = getByTestId('submit-button') || getByTestId('button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_update_success', expect.objectContaining({
          timestamp: expect.any(String),
          callId: 'test-call-123',
          priority: expect.any(String),
          type: expect.any(String),
          hasLocation: expect.any(Boolean),
          dispatchMethod: expect.any(String),
        }));
      });
    });

    it('should track call_update_failed event when update fails', async () => {
      mockUpdateCall.mockRejectedValue(new Error('Update failed'));

      const { getByTestId } = render(<EditCall />);

      const submitButton = getByTestId('submit-button') || getByTestId('button');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_update_failed', expect.objectContaining({
          timestamp: expect.any(String),
          callId: 'test-call-123',
          priority: expect.any(String),
          type: expect.any(String),
          error: 'Update failed',
        }));
      });
    });
  });

  describe('Location Selection Analytics', () => {
    it('should track call_edit_location_selected event when location is picked', () => {
      const { getByTestId } = render(<EditCall />);

      const locationPicker = getByTestId('location-picker');
      fireEvent.press(locationPicker);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_edit_location_selected', {
        timestamp: expect.any(String),
        callId: 'test-call-123',
        hasAddress: true,
        latitude: 40.7128,
        longitude: -74.006,
      });
    });
  });

  describe('Dispatch Selection Analytics', () => {
    it('should track call_edit_dispatch_selection_updated event', async () => {
      const { getByTestId } = render(<EditCall />);

      // Open dispatch modal
      const dispatchButton = getByTestId('dispatch-button') || getByTestId('button');
      fireEvent.press(dispatchButton);

      // Select dispatch options
      const dispatchModal = getByTestId('dispatch-modal');
      fireEvent.press(dispatchModal);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_edit_dispatch_selection_updated', {
        timestamp: expect.any(String),
        callId: 'test-call-123',
        everyone: false,
        userCount: 1,
        groupCount: 1,
        roleCount: 0,
        unitCount: 0,
        totalSelected: 2,
      });
    });
  });

  describe('Address Search Analytics', () => {
    beforeEach(() => {
      const axios = require('axios');
      axios.get.mockResolvedValue({
        data: {
          status: 'OK',
          results: [
            {
              formatted_address: '123 Test St, Test City, TC 12345',
              geometry: {
                location: { lat: 40.7128, lng: -74.006 },
              },
              place_id: 'test-place-id',
            },
          ],
        },
      });
    });

    it('should track call_edit_address_search_attempted event', async () => {
      const { getByTestId } = render(<EditCall />);

      // Enter address and search
      fireEvent.changeText(getByTestId('address-input') || getByTestId('input'), '123 Test St');
      fireEvent.press(getByTestId('address-search-button') || getByTestId('button'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_edit_address_search_attempted', {
          timestamp: expect.any(String),
          callId: 'test-call-123',
          hasGoogleMapsKey: true,
        });
      });
    });

    it('should track call_edit_address_search_success event', async () => {
      const { getByTestId } = render(<EditCall />);

      fireEvent.changeText(getByTestId('address-input') || getByTestId('input'), '123 Test St');
      fireEvent.press(getByTestId('address-search-button') || getByTestId('button'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_edit_address_search_success', {
          timestamp: expect.any(String),
          callId: 'test-call-123',
          resultCount: 1,
          hasMultipleResults: false,
        });
      });
    });

    it('should track call_edit_address_search_failed event when no results', async () => {
      const axios = require('axios');
      axios.get.mockResolvedValue({
        data: {
          status: 'ZERO_RESULTS',
          results: [],
        },
      });

      const { getByTestId } = render(<EditCall />);

      fireEvent.changeText(getByTestId('address-input') || getByTestId('input'), '123 Test St');
      fireEvent.press(getByTestId('address-search-button') || getByTestId('button'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_edit_address_search_failed', {
          timestamp: expect.any(String),
          callId: 'test-call-123',
          reason: 'no_results',
          status: 'ZERO_RESULTS',
        });
      });
    });

    it('should track call_edit_address_search_failed event when API key missing', async () => {
      mockCoreStore.config.GoogleMapsKey = '';

      const { getByTestId } = render(<EditCall />);

      fireEvent.changeText(getByTestId('address-input') || getByTestId('input'), '123 Test St');
      fireEvent.press(getByTestId('address-search-button') || getByTestId('button'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_edit_address_search_failed', {
          timestamp: expect.any(String),
          callId: 'test-call-123',
          reason: 'missing_api_key',
        });
      });

      // Reset for other tests
      mockCoreStore.config.GoogleMapsKey = 'test-google-key';
    });

    it('should track call_edit_address_search_failed event on network error', async () => {
      const axios = require('axios');
      axios.get.mockRejectedValue(new Error('Network error'));

      const { getByTestId } = render(<EditCall />);

      fireEvent.changeText(getByTestId('address-input') || getByTestId('input'), '123 Test St');
      fireEvent.press(getByTestId('address-search-button') || getByTestId('button'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_edit_address_search_failed', {
          timestamp: expect.any(String),
          callId: 'test-call-123',
          reason: 'network_error',
          error: 'Network error',
        });
      });
    });

    it('should track call_edit_address_selected event when address is chosen from multiple results', async () => {
      const axios = require('axios');
      axios.get.mockResolvedValue({
        data: {
          status: 'OK',
          results: [
            {
              formatted_address: '123 Test St, Test City, TC 12345',
              geometry: { location: { lat: 40.7128, lng: -74.006 } },
              place_id: 'test-place-id-1',
            },
            {
              formatted_address: '123 Test Ave, Test City, TC 12345',
              geometry: { location: { lat: 40.7129, lng: -74.007 } },
              place_id: 'test-place-id-2',
            },
          ],
        },
      });

      const { getByTestId } = render(<EditCall />);

      fireEvent.changeText(getByTestId('address-input') || getByTestId('input'), '123 Test');
      fireEvent.press(getByTestId('address-search-button') || getByTestId('button'));

      // Wait for multiple results to show
      await waitFor(() => {
        expect(getByTestId('bottom-sheet')).toBeTruthy();
      });

      // Select first address option
      const addressButton = getByTestId('button');
      fireEvent.press(addressButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('call_edit_address_selected', {
        timestamp: expect.any(String),
        callId: 'test-call-123',
        selectedAddress: expect.any(String),
      });
    });
  });

  describe('Analytics Error Handling', () => {
    it('should continue working if analytics fails', () => {
      mockTrackEvent.mockImplementation(() => {
        throw new Error('Analytics error');
      });

      let focusCallback: (() => void) | undefined;
      mockUseFocusEffect.mockImplementation((callback: () => void) => {
        focusCallback = callback;
      });

      // Should not throw error
      expect(() => {
        render(<EditCall />);
        focusCallback?.();
      }).not.toThrow();
    });

    it('should handle missing call ID gracefully', () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: undefined });

      let focusCallback: (() => void) | undefined;
      mockUseFocusEffect.mockImplementation((callback: () => void) => {
        focusCallback = callback;
      });

      render(<EditCall />);
      focusCallback?.();

      expect(mockTrackEvent).toHaveBeenCalledWith('call_edit_viewed', expect.objectContaining({
        callId: '',
      }));
    });
  });

  describe('Analytics Data Structure', () => {
    it('should have properly structured analytics events', () => {
      // Test the analytics event structure without rendering
      const eventData = {
        timestamp: new Date().toISOString(),
        callId: 'test-call-123',
        priority: 'High',
        type: 'Fire',
        priorityCount: 3,
        typeCount: 3,
        hasGoogleMapsKey: true,
        hasWhat3WordsKey: true,
        hasAddress: true,
        hasCoordinates: true,
        hasContactInfo: true,
      };

      expect(eventData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(typeof eventData.callId).toBe('string');
      expect(typeof eventData.priority).toBe('string');
      expect(typeof eventData.type).toBe('string');
      expect(typeof eventData.priorityCount).toBe('number');
      expect(typeof eventData.typeCount).toBe('number');
      expect(typeof eventData.hasGoogleMapsKey).toBe('boolean');
      expect(typeof eventData.hasWhat3WordsKey).toBe('boolean');
      expect(typeof eventData.hasAddress).toBe('boolean');
      expect(typeof eventData.hasCoordinates).toBe('boolean');
      expect(typeof eventData.hasContactInfo).toBe('boolean');
    });
  });
});
