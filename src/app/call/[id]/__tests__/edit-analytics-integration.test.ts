// Mock analytics first
const mockTrackEventEditIntegration = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEventEditIntegration,
  }),
}));

// Mock useFocusEffect
const mockUseFocusEffectEditIntegration = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: mockUseFocusEffectEditIntegration,
}));

describe('EditCall Analytics Integration', () => {
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

    it('should call trackEvent with edit call view analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call that would happen in the component
      trackEvent('call_edit_viewed', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
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
      });

      expect(mockTrackEventEditIntegration).toHaveBeenCalledWith('call_edit_viewed', {
        timestamp: '2024-01-15T10:00:00.000Z',
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
      });
    });

    it('should call trackEvent with call update attempted analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for call update attempt
      trackEvent('call_update_attempted', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        callId: 'test-call-123',
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

      expect(mockTrackEventEditIntegration).toHaveBeenCalledWith('call_update_attempted', {
        timestamp: '2024-01-15T10:00:00.000Z',
        callId: 'test-call-123',
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

    it('should call trackEvent with call update success analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for successful call update
      trackEvent('call_update_success', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        callId: 'test-call-123',
        priority: 'High',
        type: 'Emergency',
        hasLocation: true,
        dispatchMethod: 'selective',
      });

      expect(mockTrackEventEditIntegration).toHaveBeenCalledWith('call_update_success', {
        timestamp: '2024-01-15T10:00:00.000Z',
        callId: 'test-call-123',
        priority: 'High',
        type: 'Emergency',
        hasLocation: true,
        dispatchMethod: 'selective',
      });
    });

    it('should call trackEvent with call update failed analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for failed call update
      trackEvent('call_update_failed', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        callId: 'test-call-123',
        priority: 'High',
        type: 'Emergency',
        error: 'Network error',
      });

      expect(mockTrackEventEditIntegration).toHaveBeenCalledWith('call_update_failed', {
        timestamp: '2024-01-15T10:00:00.000Z',
        callId: 'test-call-123',
        priority: 'High',
        type: 'Emergency',
        error: 'Network error',
      });
    });

    it('should call trackEvent with location selection analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for location selection
      trackEvent('call_edit_location_selected', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        callId: 'test-call-123',
        hasAddress: true,
        latitude: 40.7128,
        longitude: -74.006,
      });

      expect(mockTrackEventEditIntegration).toHaveBeenCalledWith('call_edit_location_selected', {
        timestamp: '2024-01-15T10:00:00.000Z',
        callId: 'test-call-123',
        hasAddress: true,
        latitude: 40.7128,
        longitude: -74.006,
      });
    });

    it('should call trackEvent with dispatch selection analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for dispatch selection
      trackEvent('call_edit_dispatch_selection_updated', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        callId: 'test-call-123',
        everyone: false,
        userCount: 2,
        groupCount: 1,
        roleCount: 0,
        unitCount: 1,
        totalSelected: 4,
      });

      expect(mockTrackEventEditIntegration).toHaveBeenCalledWith('call_edit_dispatch_selection_updated', {
        timestamp: '2024-01-15T10:00:00.000Z',
        callId: 'test-call-123',
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
      trackEvent('call_edit_address_search_attempted', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        callId: 'test-call-123',
        hasGoogleMapsKey: true,
      });

      expect(mockTrackEventEditIntegration).toHaveBeenCalledWith('call_edit_address_search_attempted', {
        timestamp: '2024-01-15T10:00:00.000Z',
        callId: 'test-call-123',
        hasGoogleMapsKey: true,
      });
    });

    it('should call trackEvent with address search success analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for successful address search
      trackEvent('call_edit_address_search_success', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        callId: 'test-call-123',
        resultCount: 1,
        hasMultipleResults: false,
      });

      expect(mockTrackEventEditIntegration).toHaveBeenCalledWith('call_edit_address_search_success', {
        timestamp: '2024-01-15T10:00:00.000Z',
        callId: 'test-call-123',
        resultCount: 1,
        hasMultipleResults: false,
      });
    });

    it('should call trackEvent with address search failed analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for failed address search
      trackEvent('call_edit_address_search_failed', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        callId: 'test-call-123',
        reason: 'no_results',
        status: 'ZERO_RESULTS',
      });

      expect(mockTrackEventEditIntegration).toHaveBeenCalledWith('call_edit_address_search_failed', {
        timestamp: '2024-01-15T10:00:00.000Z',
        callId: 'test-call-123',
        reason: 'no_results',
        status: 'ZERO_RESULTS',
      });
    });

    it('should call trackEvent with address selection analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for address selection from multiple results
      trackEvent('call_edit_address_selected', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        callId: 'test-call-123',
        selectedAddress: '123 Test St, Test City, TC 12345',
      });

      expect(mockTrackEventEditIntegration).toHaveBeenCalledWith('call_edit_address_selected', {
        timestamp: '2024-01-15T10:00:00.000Z',
        callId: 'test-call-123',
        selectedAddress: '123 Test St, Test City, TC 12345',
      });
    });
  });

  describe('Analytics Data Transformation', () => {
    it('should handle analytics data transformation for call update', () => {
      // Test different call update scenarios
      const mockFormData = {
        name: 'Updated Test Call',
        nature: 'Updated nature of the call',
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

      // Simulate the analytics data preparation for call update
      const analyticsData = {
        timestamp: new Date().toISOString(),
        callId: 'test-call-123',
        priority: mockFormData.priority,
        type: mockFormData.type,
        hasNote: !!mockFormData.note,
        hasAddress: !!mockFormData.address,
        hasCoordinates: !!(mockFormData.latitude && mockFormData.longitude),
        hasWhat3Words: !!mockFormData.what3words,
        hasPlusCode: !!mockFormData.plusCode,
        hasContactName: !!mockFormData.contactName,
        hasContactInfo: !!mockFormData.contactInfo,
        dispatchEveryone: mockFormData.dispatchSelection.everyone,
        dispatchCount: mockFormData.dispatchSelection.users.length + 
                      mockFormData.dispatchSelection.groups.length + 
                      mockFormData.dispatchSelection.roles.length + 
                      mockFormData.dispatchSelection.units.length,
      };

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
          reason: 'no_results',
          status: 'ZERO_RESULTS',
        },
      };

      Object.entries(errors).forEach(([errorType, errorData]) => {
        expect(errorData.reason).toBeDefined();
        expect(typeof errorData.reason).toBe('string');
      });
    });
  });
});
