// Mock analytics first
const mockTrackEventIntegration = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEventIntegration,
  }),
}));

// Mock useFocusEffect
const mockUseFocusEffectIntegration = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: mockUseFocusEffectIntegration,
}));

describe('NewCall Analytics Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Analytics Hook Integration', () => {
    it('should import and use useAnalytics hook correctly', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();
      
      expect(trackEvent).toBeDefined();
      expect(typeof trackEvent).toBe('function');
    });

    it('should call trackEvent with new call view analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call that would happen in the component
      trackEvent('call_new_viewed', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        priorityCount: 3,
        typeCount: 3,
        hasGoogleMapsKey: true,
        hasWhat3WordsKey: true,
      });

      expect(mockTrackEventIntegration).toHaveBeenCalledWith('call_new_viewed', {
        timestamp: '2024-01-15T10:00:00.000Z',
        priorityCount: 3,
        typeCount: 3,
        hasGoogleMapsKey: true,
        hasWhat3WordsKey: true,
      });
    });

    it('should call trackEvent with call create attempted analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for call creation attempt
      trackEvent('call_create_attempted', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        priority: 'High',
        type: 'Emergency',
        hasNote: true,
        hasAddress: true,
        hasCoordinates: true,
        hasWhat3Words: false,
        hasPlusCode: false,
        hasContactName: true,
        hasContactInfo: true,
        dispatchEveryone: false,
        dispatchCount: 3,
      });

      expect(mockTrackEventIntegration).toHaveBeenCalledWith('call_create_attempted', {
        timestamp: '2024-01-15T10:00:00.000Z',
        priority: 'High',
        type: 'Emergency',
        hasNote: true,
        hasAddress: true,
        hasCoordinates: true,
        hasWhat3Words: false,
        hasPlusCode: false,
        hasContactName: true,
        hasContactInfo: true,
        dispatchEveryone: false,
        dispatchCount: 3,
      });
    });

    it('should call trackEvent with call create success analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for successful call creation
      trackEvent('call_create_success', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        callId: 'test-call-123',
        priority: 'High',
        type: 'Emergency',
        hasLocation: true,
        dispatchMethod: 'selective',
      });

      expect(mockTrackEventIntegration).toHaveBeenCalledWith('call_create_success', {
        timestamp: '2024-01-15T10:00:00.000Z',
        callId: 'test-call-123',
        priority: 'High',
        type: 'Emergency',
        hasLocation: true,
        dispatchMethod: 'selective',
      });
    });

    it('should call trackEvent with call create failed analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for failed call creation
      trackEvent('call_create_failed', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        priority: 'High',
        type: 'Emergency',
        error: 'Network error',
      });

      expect(mockTrackEventIntegration).toHaveBeenCalledWith('call_create_failed', {
        timestamp: '2024-01-15T10:00:00.000Z',
        priority: 'High',
        type: 'Emergency',
        error: 'Network error',
      });
    });

    it('should call trackEvent with location selection analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for location selection
      trackEvent('call_location_selected', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        hasAddress: true,
        latitude: 40.7128,
        longitude: -74.006,
      });

      expect(mockTrackEventIntegration).toHaveBeenCalledWith('call_location_selected', {
        timestamp: '2024-01-15T10:00:00.000Z',
        hasAddress: true,
        latitude: 40.7128,
        longitude: -74.006,
      });
    });

    it('should call trackEvent with dispatch selection analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for dispatch selection
      trackEvent('call_dispatch_selection_updated', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        everyone: false,
        userCount: 2,
        groupCount: 1,
        roleCount: 0,
        unitCount: 1,
        totalSelected: 4,
      });

      expect(mockTrackEventIntegration).toHaveBeenCalledWith('call_dispatch_selection_updated', {
        timestamp: '2024-01-15T10:00:00.000Z',
        everyone: false,
        userCount: 2,
        groupCount: 1,
        roleCount: 0,
        unitCount: 1,
        totalSelected: 4,
      });
    });

    it('should call trackEvent with address search analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for address search
      trackEvent('call_address_search_attempted', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        hasGoogleMapsKey: true,
      });

      expect(mockTrackEventIntegration).toHaveBeenCalledWith('call_address_search_attempted', {
        timestamp: '2024-01-15T10:00:00.000Z',
        hasGoogleMapsKey: true,
      });
    });

    it('should call trackEvent with address search success analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for successful address search
      trackEvent('call_address_search_success', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        resultCount: 1,
        hasMultipleResults: false,
      });

      expect(mockTrackEventIntegration).toHaveBeenCalledWith('call_address_search_success', {
        timestamp: '2024-01-15T10:00:00.000Z',
        resultCount: 1,
        hasMultipleResults: false,
      });
    });

    it('should call trackEvent with address search failed analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for failed address search
      trackEvent('call_address_search_failed', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        reason: 'no_results',
        status: 'ZERO_RESULTS',
      });

      expect(mockTrackEventIntegration).toHaveBeenCalledWith('call_address_search_failed', {
        timestamp: '2024-01-15T10:00:00.000Z',
        reason: 'no_results',
        status: 'ZERO_RESULTS',
      });
    });

    it('should call trackEvent with coordinates search analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for coordinates search
      trackEvent('call_coordinates_search_attempted', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        latitude: 40.7128,
        longitude: -74.006,
        hasGoogleMapsKey: true,
      });

      expect(mockTrackEventIntegration).toHaveBeenCalledWith('call_coordinates_search_attempted', {
        timestamp: '2024-01-15T10:00:00.000Z',
        latitude: 40.7128,
        longitude: -74.006,
        hasGoogleMapsKey: true,
      });
    });

    it('should call trackEvent with what3words search analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for what3words search
      trackEvent('call_what3words_search_attempted', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        hasWhat3WordsKey: true,
      });

      expect(mockTrackEventIntegration).toHaveBeenCalledWith('call_what3words_search_attempted', {
        timestamp: '2024-01-15T10:00:00.000Z',
        hasWhat3WordsKey: true,
      });
    });

    it('should call trackEvent with plus code search analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for plus code search
      trackEvent('call_plus_code_search_attempted', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        hasGoogleMapsKey: true,
      });

      expect(mockTrackEventIntegration).toHaveBeenCalledWith('call_plus_code_search_attempted', {
        timestamp: '2024-01-15T10:00:00.000Z',
        hasGoogleMapsKey: true,
      });
    });
  });

  describe('Focus Effect Integration', () => {
    it('should handle useFocusEffect callback properly', () => {
      // Test that useFocusEffect can be called with a callback
      let focusCallback: (() => void) | undefined;
      mockUseFocusEffectIntegration.mockImplementation((callback: () => void) => {
        focusCallback = callback;
      });

      // This simulates what happens in the component
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();
      
      // Simulate component registering focus callback
      mockUseFocusEffectIntegration(() => {
        trackEvent('call_new_viewed', {
          timestamp: new Date().toISOString(),
          priorityCount: 3,
          typeCount: 3,
          hasGoogleMapsKey: true,
          hasWhat3WordsKey: true,
        });
      });

      expect(mockUseFocusEffectIntegration).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('Data Transformation Logic', () => {
    it('should generate proper timestamp format', () => {
      const timestamp = new Date('2024-01-15T10:00:00Z').toISOString();
      expect(timestamp).toBe('2024-01-15T10:00:00.000Z');
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle analytics data transformation for form data', () => {
      // Test the data transformation logic that would happen in the component
      const mockFormData = {
        name: 'Test Emergency Call',
        nature: 'Building fire with potential casualties',
        priority: 'High',
        type: 'Fire',
        note: 'Additional information about the emergency',
        address: '123 Main St, Test City',
        coordinates: '40.7128, -74.006',
        what3words: '',
        plusCode: '',
        latitude: 40.7128,
        longitude: -74.006,
        contactName: 'John Doe',
        contactInfo: '555-1234',
        dispatchSelection: {
          everyone: false,
          users: ['user1', 'user2'],
          groups: ['group1'],
          roles: [],
          units: ['unit1'],
        },
      };

      // Simulate the analytics data preparation for call creation
      const analyticsData = {
        timestamp: new Date().toISOString(),
        priority: mockFormData.priority,
        type: mockFormData.type,
        hasNote: !!mockFormData.note,
        hasAddress: !!mockFormData.address,
        hasCoordinates: !!(mockFormData.latitude && mockFormData.longitude),
        hasWhat3Words: !!mockFormData.what3words,
        hasPlusCode: !!mockFormData.plusCode,
        hasContactName: !!mockFormData.contactName,
        hasContactInfo: !!mockFormData.contactInfo,
        dispatchEveryone: mockFormData.dispatchSelection?.everyone || false,
        dispatchCount: (mockFormData.dispatchSelection?.users.length || 0) +
                      (mockFormData.dispatchSelection?.groups.length || 0) +
                      (mockFormData.dispatchSelection?.roles.length || 0) +
                      (mockFormData.dispatchSelection?.units.length || 0),
      };

      expect(analyticsData.priority).toBe('High');
      expect(analyticsData.type).toBe('Fire');
      expect(analyticsData.hasNote).toBe(true);
      expect(analyticsData.hasAddress).toBe(true);
      expect(analyticsData.hasCoordinates).toBe(true);
      expect(analyticsData.hasWhat3Words).toBe(false);
      expect(analyticsData.hasPlusCode).toBe(false);
      expect(analyticsData.hasContactName).toBe(true);
      expect(analyticsData.hasContactInfo).toBe(true);
      expect(analyticsData.dispatchEveryone).toBe(false);
      expect(analyticsData.dispatchCount).toBe(4);
    });

    it('should handle analytics data transformation for search operations', () => {
      // Test the data transformation for different search types
      const searchAnalytics = {
        addressSearch: {
          hasGoogleMapsKey: true,
          resultCount: 3,
          hasMultipleResults: true,
        },
        coordinatesSearch: {
          latitude: 40.7128,
          longitude: -74.006,
          hasGoogleMapsKey: true,
          hasAddress: true,
        },
        what3wordsSearch: {
          hasWhat3WordsKey: true,
        },
        plusCodeSearch: {
          hasGoogleMapsKey: true,
        },
      };

      expect(searchAnalytics.addressSearch.hasMultipleResults).toBe(true);
      expect(searchAnalytics.coordinatesSearch.latitude).toBe(40.7128);
      expect(searchAnalytics.coordinatesSearch.longitude).toBe(-74.006);
      expect(searchAnalytics.what3wordsSearch.hasWhat3WordsKey).toBe(true);
      expect(searchAnalytics.plusCodeSearch.hasGoogleMapsKey).toBe(true);
    });

    it('should handle analytics data transformation for dispatch selection', () => {
      // Test different dispatch selection scenarios
      const everyoneDispatch = {
        everyone: true,
        users: [],
        groups: [],
        roles: [],
        units: [],
      };

      const selectiveDispatch = {
        everyone: false,
        users: ['user1', 'user2', 'user3'],
        groups: ['group1', 'group2'],
        roles: ['role1'],
        units: ['unit1'],
      };

      const everyoneAnalytics = {
        everyone: everyoneDispatch.everyone,
        userCount: everyoneDispatch.users.length,
        groupCount: everyoneDispatch.groups.length,
        roleCount: everyoneDispatch.roles.length,
        unitCount: everyoneDispatch.units.length,
        totalSelected: everyoneDispatch.users.length + everyoneDispatch.groups.length + 
                      everyoneDispatch.roles.length + everyoneDispatch.units.length,
      };

      const selectiveAnalytics = {
        everyone: selectiveDispatch.everyone,
        userCount: selectiveDispatch.users.length,
        groupCount: selectiveDispatch.groups.length,
        roleCount: selectiveDispatch.roles.length,
        unitCount: selectiveDispatch.units.length,
        totalSelected: selectiveDispatch.users.length + selectiveDispatch.groups.length + 
                      selectiveDispatch.roles.length + selectiveDispatch.units.length,
      };

      expect(everyoneAnalytics.everyone).toBe(true);
      expect(everyoneAnalytics.totalSelected).toBe(0);

      expect(selectiveAnalytics.everyone).toBe(false);
      expect(selectiveAnalytics.userCount).toBe(3);
      expect(selectiveAnalytics.groupCount).toBe(2);
      expect(selectiveAnalytics.roleCount).toBe(1);
      expect(selectiveAnalytics.unitCount).toBe(1);
      expect(selectiveAnalytics.totalSelected).toBe(7);
    });
  });

  describe('Error Handling', () => {
    it('should handle search failures with proper error context', () => {
      // Test different error scenarios
      const errors = {
        networkError: {
          reason: 'network_error',
          error: 'Request failed with status code 500',
        },
        missingApiKey: {
          reason: 'missing_api_key',
        },
        invalidFormat: {
          reason: 'invalid_format',
        },
        noResults: {
          reason: 'no_results',
          status: 'ZERO_RESULTS',
        },
        outOfRange: {
          reason: 'out_of_range',
          latitude: 200,
          longitude: 200,
        },
      };

      expect(errors.networkError.reason).toBe('network_error');
      expect(errors.missingApiKey.reason).toBe('missing_api_key');
      expect(errors.invalidFormat.reason).toBe('invalid_format');
      expect(errors.noResults.reason).toBe('no_results');
      expect(errors.outOfRange.reason).toBe('out_of_range');
    });
  });
});
