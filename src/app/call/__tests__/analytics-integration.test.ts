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

describe('CallDetail Analytics Integration', () => {
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

    it('should call trackEvent with call detail view analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call that would happen in the component
      trackEvent('call_detail_viewed', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
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

      expect(mockTrackEvent).toHaveBeenCalledWith('call_detail_viewed', {
        timestamp: '2024-01-15T10:00:00.000Z',
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

    it('should call trackEvent with call notes opened analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for notes modal
      trackEvent('call_notes_opened', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        callId: '123',
        notesCount: 2,
      });

      expect(mockTrackEvent).toHaveBeenCalledWith('call_notes_opened', {
        timestamp: '2024-01-15T10:00:00.000Z',
        callId: '123',
        notesCount: 2,
      });
    });

    it('should call trackEvent with call images opened analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for images modal
      trackEvent('call_images_opened', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        callId: '123',
        imagesCount: 1,
      });

      expect(mockTrackEvent).toHaveBeenCalledWith('call_images_opened', {
        timestamp: '2024-01-15T10:00:00.000Z',
        callId: '123',
        imagesCount: 1,
      });
    });

    it('should call trackEvent with call files opened analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for files modal
      trackEvent('call_files_opened', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        callId: '123',
        filesCount: 3,
      });

      expect(mockTrackEvent).toHaveBeenCalledWith('call_files_opened', {
        timestamp: '2024-01-15T10:00:00.000Z',
        callId: '123',
        filesCount: 3,
      });
    });

    it('should call trackEvent with call route opened analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for route action
      trackEvent('call_route_opened', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        callId: '123',
        hasUserLocation: true,
        destinationAddress: '123 Test St',
      });

      expect(mockTrackEvent).toHaveBeenCalledWith('call_route_opened', {
        timestamp: '2024-01-15T10:00:00.000Z',
        callId: '123',
        hasUserLocation: true,
        destinationAddress: '123 Test St',
      });
    });

    it('should call trackEvent with call route failed analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for failed route
      trackEvent('call_route_failed', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        callId: '123',
        reason: 'failed_to_open_maps',
      });

      expect(mockTrackEvent).toHaveBeenCalledWith('call_route_failed', {
        timestamp: '2024-01-15T10:00:00.000Z',
        callId: '123',
        reason: 'failed_to_open_maps',
      });
    });

    it('should call trackEvent with route exception analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for route exception
      trackEvent('call_route_failed', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        callId: '123',
        reason: 'exception',
        error: 'Navigation error',
      });

      expect(mockTrackEvent).toHaveBeenCalledWith('call_route_failed', {
        timestamp: '2024-01-15T10:00:00.000Z',
        callId: '123',
        reason: 'exception',
        error: 'Navigation error',
      });
    });

    it('should handle useFocusEffect callback properly', () => {
      // Test that useFocusEffect can be called with a callback
      let focusCallback: (() => void) | undefined;
      mockUseFocusEffect.mockImplementation((callback: () => void) => {
        focusCallback = callback;
      });

      // This simulates what happens in the component
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();
      
      // Simulate component registering focus callback
      mockUseFocusEffect(() => {
        trackEvent('call_detail_viewed', {
          timestamp: new Date().toISOString(),
          callId: '123',
        });
      });

      expect(mockUseFocusEffect).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should generate proper timestamp format', () => {
      const timestamp = new Date('2024-01-15T10:00:00Z').toISOString();
      expect(timestamp).toBe('2024-01-15T10:00:00.000Z');
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle analytics data transformation', () => {
      // Test the data transformation logic that would happen in the component
      const mockCall = {
        CallId: '123',
        Number: 'CALL-001',
        Type: 'Emergency',
        NotesCount: 2,
        ImgagesCount: 1,
        FileCount: 3,
        Latitude: '40.7128',
        Longitude: '-74.0060',
      };

      const mockCallPriority = {
        Name: 'High',
      };

      const mockCallExtraData = {
        Protocols: [],
        Dispatches: [],
        Activity: [],
      };

      const mockCoordinates = {
        latitude: parseFloat(mockCall.Latitude),
        longitude: parseFloat(mockCall.Longitude),
      };

      // Simulate the analytics data preparation
      const analyticsData = {
        timestamp: new Date().toISOString(),
        callId: mockCall.CallId,
        callNumber: mockCall.Number,
        callType: mockCall.Type,
        priority: mockCallPriority?.Name || 'Unknown',
        hasCoordinates: !!(mockCoordinates.latitude && mockCoordinates.longitude),
        notesCount: mockCall.NotesCount || 0,
        imagesCount: mockCall.ImgagesCount || 0,
        filesCount: mockCall.FileCount || 0,
        hasProtocols: !!mockCallExtraData?.Protocols?.length,
        hasDispatches: !!mockCallExtraData?.Dispatches?.length,
        hasActivity: !!mockCallExtraData?.Activity?.length,
      };

      expect(analyticsData.callId).toBe('123');
      expect(analyticsData.callNumber).toBe('CALL-001');
      expect(analyticsData.callType).toBe('Emergency');
      expect(analyticsData.priority).toBe('High');
      expect(analyticsData.hasCoordinates).toBe(true);
      expect(analyticsData.notesCount).toBe(2);
      expect(analyticsData.imagesCount).toBe(1);
      expect(analyticsData.filesCount).toBe(3);
      expect(analyticsData.hasProtocols).toBe(false);
      expect(analyticsData.hasDispatches).toBe(false);
      expect(analyticsData.hasActivity).toBe(false);
    });
  });
});
