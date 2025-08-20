import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
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

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

jest.mock('axios', () => ({
  get: jest.fn(),
}));

// Mock stores
const mockCallsStore = {
  callPriorities: [
    { Id: 1, Name: 'High', Color: '#FF0000' },
    { Id: 2, Name: 'Medium', Color: '#FFFF00' },
    { Id: 3, Name: 'Low', Color: '#00FF00' },
  ],
  callTypes: [
    { Id: '1', Name: 'Emergency' },
    { Id: '2', Name: 'Medical' },
    { Id: '3', Name: 'Fire' },
  ],
  isLoading: false,
  error: null,
  fetchCallPriorities: jest.fn(),
  fetchCallTypes: jest.fn(),
};

const mockCoreStore = {
  config: {
    GoogleMapsKey: 'test-google-key',
    W3WKey: 'test-w3w-key',
    LoggingKey: '',
    MapUrl: '',
    MapAttribution: '',
    OpenWeatherApiKey: '',
    NovuBackendApiUrl: '',
    NovuSocketUrl: '',
    NovuApplicationId: '',
    EventingUrl: '',
    DirectionsMapKey: '',
    PersonnelLocationStaleSeconds: 300,
    UnitLocationStaleSeconds: 300,
    PersonnelLocationMinMeters: 50,
    UnitLocationMinMeters: 50,
    AnalyticsApiKey: '',
    AnalyticsHost: '',
  },
};

jest.mock('@/stores/calls/store', () => ({
  useCallsStore: () => mockCallsStore,
}));

jest.mock('@/stores/app/core-store', () => ({
  useCoreStore: () => mockCoreStore,
}));

// Mock createCall API
const mockCreateCall = jest.fn();
jest.mock('@/api/calls/calls', () => ({
  createCall: mockCreateCall,
}));

// Mock components
jest.mock('@/components/calls/dispatch-selection-modal', () => ({
  DispatchSelectionModal: ({ isVisible, onConfirm, onClose }: any) => {
    const { View, Text, Pressable } = require('react-native');
    return isVisible ? (
      <View testID="dispatch-modal">
        <Text>Dispatch Selection Modal</Text>
        <Pressable testID="dispatch-everyone-button" onPress={() => onConfirm({ everyone: true, users: [], groups: [], roles: [], units: [] })}>
          <Text>Everyone</Text>
        </Pressable>
        <Pressable testID="dispatch-selective-button" onPress={() => onConfirm({ everyone: false, users: ['user1'], groups: ['group1'], roles: [], units: [] })}>
          <Text>Selective</Text>
        </Pressable>
        <Pressable testID="dispatch-close-button" onPress={onClose}>
          <Text>Close</Text>
        </Pressable>
      </View>
    ) : null;
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

jest.mock('@/components/maps/location-picker', () => ({
  __esModule: true,
  default: ({ onLocationSelected }: any) => {
    const { View, Text, Pressable } = require('react-native');
    return (
      <View testID="location-picker">
        <Pressable
          testID="select-location-button"
          onPress={() => onLocationSelected({ latitude: 40.7128, longitude: -74.006, address: '123 Test St' })}
        >
          <Text>Select Location</Text>
        </Pressable>
      </View>
    );
  },
}));

jest.mock('@/components/maps/full-screen-location-picker', () => ({
  __esModule: true,
  default: ({ onLocationSelected, onClose }: any) => {
    const { View, Text, Pressable } = require('react-native');
    return (
      <View testID="full-screen-location-picker">
        <Pressable
          testID="full-screen-select-location"
          onPress={() => onLocationSelected({ latitude: 40.7128, longitude: -74.006, address: '123 Full Screen Test St' })}
        >
          <Text>Select Location Full Screen</Text>
        </Pressable>
        <Pressable testID="full-screen-close" onPress={onClose}>
          <Text>Close</Text>
        </Pressable>
      </View>
    );
  },
}));

// Mock UI components
jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    show: jest.fn(),
  }),
}));

// Import the component after mocks
import NewCall from '../index';

describe('NewCall Analytics Integration', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    mockCreateCall.mockResolvedValue({ Id: 'test-call-id', Success: true });
  });

  describe('View Analytics', () => {
    it('should track call_new_viewed event when page becomes focused', () => {
      let focusCallback: (() => void) | undefined;
      mockUseFocusEffect.mockImplementation((callback: () => void) => {
        focusCallback = callback;
      });

      render(<NewCall />);

      // Manually trigger the focus callback
      focusCallback?.();

      expect(mockTrackEvent).toHaveBeenCalledWith('call_new_viewed', {
        timestamp: expect.any(String),
        priorityCount: 3,
        typeCount: 3,
        hasGoogleMapsKey: true,
        hasWhat3WordsKey: true,
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

      render(<NewCall />);
      focusCallback?.();

      expect(mockTrackEvent).toHaveBeenCalledWith('call_new_viewed', expect.objectContaining({
        hasGoogleMapsKey: false,
        hasWhat3WordsKey: false,
      }));

      // Restore keys for other tests
      mockCoreStore.config.GoogleMapsKey = 'test-google-key';
      mockCoreStore.config.W3WKey = 'test-w3w-key';
    });
  });

  describe('Form Submission Analytics', () => {
    const fillRequiredFields = async (component: any) => {
      const { getByDisplayValue, getByTestId } = component;

      // Fill name
      fireEvent.changeText(getByTestId('name-input'), 'Test Call');

      // Fill nature
      fireEvent.changeText(getByTestId('nature-input'), 'Test emergency');

      // Select priority (would need proper select mock for real implementation)
      // For now, just set the form data directly
    };

    it('should track call_create_attempted event on form submission', async () => {
      const { getByTestId } = render(<NewCall />);

      // Fill form fields through input field test IDs (mocked)
      // In real implementation, you would need to interact with form fields

      // Simulate form submission by clicking create button
      fireEvent.press(getByTestId('create-call-button'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_create_attempted', expect.objectContaining({
          timestamp: expect.any(String),
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

    it('should track call_create_success event on successful submission', async () => {
      mockCreateCall.mockResolvedValue({ Id: 'test-call-123', Success: true });

      const { getByTestId } = render(<NewCall />);

      fireEvent.press(getByTestId('create-call-button'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_create_success', expect.objectContaining({
          timestamp: expect.any(String),
          callId: 'test-call-123',
          hasLocation: expect.any(Boolean),
          dispatchMethod: expect.any(String),
        }));
      });
    });

    it('should track call_create_failed event on submission failure', async () => {
      mockCreateCall.mockRejectedValue(new Error('Network error'));

      const { getByTestId } = render(<NewCall />);

      fireEvent.press(getByTestId('create-call-button'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_create_failed', expect.objectContaining({
          timestamp: expect.any(String),
          error: 'Network error',
        }));
      });
    });
  });

  describe('Location Selection Analytics', () => {
    it('should track call_location_selected event when location is picked', () => {
      const { getByTestId } = render(<NewCall />);

      fireEvent.press(getByTestId('select-location-button'));

      expect(mockTrackEvent).toHaveBeenCalledWith('call_location_selected', {
        timestamp: expect.any(String),
        hasAddress: true,
        latitude: 40.7128,
        longitude: -74.006,
      });
    });

    it('should track location selection from full-screen picker', () => {
      const { getByTestId } = render(<NewCall />);

      // Open full-screen location picker
      fireEvent.press(getByTestId('open-location-picker-button'));

      // Select location in full-screen picker
      fireEvent.press(getByTestId('full-screen-select-location'));

      expect(mockTrackEvent).toHaveBeenCalledWith('call_location_selected', {
        timestamp: expect.any(String),
        hasAddress: true,
        latitude: 40.7128,
        longitude: -74.006,
      });
    });
  });

  describe('Dispatch Selection Analytics', () => {
    it('should track call_dispatch_selection_updated when dispatch selection changes', () => {
      const { getByTestId } = render(<NewCall />);

      // Open dispatch modal
      fireEvent.press(getByTestId('open-dispatch-modal-button'));

      // Select everyone option
      fireEvent.press(getByTestId('dispatch-everyone-button'));

      expect(mockTrackEvent).toHaveBeenCalledWith('call_dispatch_selection_updated', {
        timestamp: expect.any(String),
        everyone: true,
        userCount: 0,
        groupCount: 0,
        roleCount: 0,
        unitCount: 0,
        totalSelected: 0,
      });
    });

    it('should track selective dispatch selection', () => {
      const { getByTestId } = render(<NewCall />);

      fireEvent.press(getByTestId('open-dispatch-modal-button'));
      fireEvent.press(getByTestId('dispatch-selective-button'));

      expect(mockTrackEvent).toHaveBeenCalledWith('call_dispatch_selection_updated', {
        timestamp: expect.any(String),
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

    it('should track call_address_search_attempted event', async () => {
      const { getByTestId } = render(<NewCall />);

      // Enter address and search
      fireEvent.changeText(getByTestId('address-input'), '123 Test St');
      fireEvent.press(getByTestId('address-search-button'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_address_search_attempted', {
          timestamp: expect.any(String),
          hasGoogleMapsKey: true,
        });
      });
    });

    it('should track call_address_search_success event', async () => {
      const { getByTestId } = render(<NewCall />);

      fireEvent.changeText(getByTestId('address-input'), '123 Test St');
      fireEvent.press(getByTestId('address-search-button'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_address_search_success', {
          timestamp: expect.any(String),
          resultCount: 1,
          hasMultipleResults: false,
        });
      });
    });

    it('should track call_address_search_failed event for missing API key', async () => {
      mockCoreStore.config.GoogleMapsKey = '';

      const { getByTestId } = render(<NewCall />);

      fireEvent.changeText(getByTestId('address-input'), '123 Test St');
      fireEvent.press(getByTestId('address-search-button'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_address_search_failed', {
          timestamp: expect.any(String),
          reason: 'missing_api_key',
        });
      });

      // Restore for other tests
      mockCoreStore.config.GoogleMapsKey = 'test-google-key';
    });

    it('should track call_address_search_failed event for network error', async () => {
      const axios = require('axios');
      axios.get.mockRejectedValue(new Error('Network error'));

      const { getByTestId } = render(<NewCall />);

      fireEvent.changeText(getByTestId('address-input'), '123 Test St');
      fireEvent.press(getByTestId('address-search-button'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_address_search_failed', {
          timestamp: expect.any(String),
          reason: 'network_error',
          error: 'Network error',
        });
      });
    });

    it('should track address selection from multiple results', async () => {
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
              formatted_address: '123 Test St, Other City, OC 54321',
              geometry: { location: { lat: 41.7128, lng: -75.006 } },
              place_id: 'test-place-id-2',
            },
          ],
        },
      });

      const { getByTestId } = render(<NewCall />);

      fireEvent.changeText(getByTestId('address-input'), '123 Test St');
      fireEvent.press(getByTestId('address-search-button'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_address_search_success', expect.objectContaining({
          hasMultipleResults: true,
          resultCount: 2,
        }));
      });
    });
  });

  describe('Coordinates Search Analytics', () => {
    beforeEach(() => {
      const axios = require('axios');
      axios.get.mockResolvedValue({
        data: {
          status: 'OK',
          results: [
            {
              formatted_address: '123 Test St, Test City, TC 12345',
              geometry: { location: { lat: 40.7128, lng: -74.006 } },
              place_id: 'test-place-id',
            },
          ],
        },
      });
    });

    it('should track call_coordinates_search_attempted event', async () => {
      const { getByTestId } = render(<NewCall />);

      fireEvent.changeText(getByTestId('coordinates-input'), '40.7128, -74.006');
      fireEvent.press(getByTestId('coordinates-search-button'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_coordinates_search_attempted', {
          timestamp: expect.any(String),
          latitude: 40.7128,
          longitude: -74.006,
          hasGoogleMapsKey: true,
        });
      });
    });

    it('should track call_coordinates_search_success event with address', async () => {
      const { getByTestId } = render(<NewCall />);

      fireEvent.changeText(getByTestId('coordinates-input'), '40.7128, -74.006');
      fireEvent.press(getByTestId('coordinates-search-button'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_coordinates_search_success', {
          timestamp: expect.any(String),
          latitude: 40.7128,
          longitude: -74.006,
          hasAddress: true,
        });
      });
    });

    it('should track invalid format error', async () => {
      const { getByTestId } = render(<NewCall />);

      fireEvent.changeText(getByTestId('coordinates-input'), 'invalid coordinates');
      fireEvent.press(getByTestId('coordinates-search-button'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_coordinates_search_failed', {
          timestamp: expect.any(String),
          reason: 'invalid_format',
        });
      });
    });

    it('should track out of range error', async () => {
      const { getByTestId } = render(<NewCall />);

      fireEvent.changeText(getByTestId('coordinates-input'), '200, 200');
      fireEvent.press(getByTestId('coordinates-search-button'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_coordinates_search_failed', {
          timestamp: expect.any(String),
          reason: 'out_of_range',
          latitude: 200,
          longitude: 200,
        });
      });
    });
  });

  describe('What3Words Search Analytics', () => {
    beforeEach(() => {
      const axios = require('axios');
      axios.get.mockResolvedValue({
        data: {
          coordinates: { lat: 40.7128, lng: -74.006 },
          nearestPlace: 'Test City',
          words: 'filled.count.soap',
        },
      });
    });

    it('should track call_what3words_search_attempted event', async () => {
      const { getByTestId } = render(<NewCall />);

      fireEvent.changeText(getByTestId('what3words-input'), 'filled.count.soap');
      fireEvent.press(getByTestId('what3words-search-button'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_what3words_search_attempted', {
          timestamp: expect.any(String),
          hasWhat3WordsKey: true,
        });
      });
    });

    it('should track call_what3words_search_success event', async () => {
      const { getByTestId } = render(<NewCall />);

      fireEvent.changeText(getByTestId('what3words-input'), 'filled.count.soap');
      fireEvent.press(getByTestId('what3words-search-button'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_what3words_search_success', {
          timestamp: expect.any(String),
        });
      });
    });

    it('should track invalid format error', async () => {
      const { getByTestId } = render(<NewCall />);

      fireEvent.changeText(getByTestId('what3words-input'), 'invalid.format');
      fireEvent.press(getByTestId('what3words-search-button'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_what3words_search_failed', {
          timestamp: expect.any(String),
          reason: 'invalid_format',
        });
      });
    });
  });

  describe('Plus Code Search Analytics', () => {
    beforeEach(() => {
      const axios = require('axios');
      axios.get.mockResolvedValue({
        data: {
          status: 'OK',
          results: [
            {
              formatted_address: '123 Test St, Test City, TC 12345',
              geometry: { location: { lat: 40.7128, lng: -74.006 } },
              place_id: 'test-place-id',
            },
          ],
        },
      });
    });

    it('should track call_plus_code_search_attempted event', async () => {
      const { getByTestId } = render(<NewCall />);

      fireEvent.changeText(getByTestId('plus-code-input'), '8Q2V+P2 New York');
      fireEvent.press(getByTestId('plus-code-search-button'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_plus_code_search_attempted', {
          timestamp: expect.any(String),
          hasGoogleMapsKey: true,
        });
      });
    });

    it('should track call_plus_code_search_success event', async () => {
      const { getByTestId } = render(<NewCall />);

      fireEvent.changeText(getByTestId('plus-code-input'), '8Q2V+P2 New York');
      fireEvent.press(getByTestId('plus-code-search-button'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('call_plus_code_search_success', {
          timestamp: expect.any(String),
        });
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
        render(<NewCall />);
        focusCallback?.();
      }).not.toThrow();
    });
  });

  describe('Timestamp Format', () => {
    it('should generate proper timestamp format', () => {
      const { getByTestId } = render(<NewCall />);

      // Trigger any analytics event
      fireEvent.press(getByTestId('open-dispatch-modal-button'));
      fireEvent.press(getByTestId('dispatch-everyone-button'));

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        })
      );
    });
  });
});
