import { renderHook, waitFor } from '@testing-library/react-native';

import { getMapDataAndMarkers } from '@/api/mapping/mapping';
import { logger } from '@/lib/logging';
import { GetMapDataAndMarkersResult } from '@/models/v4/mapping/getMapDataAndMarkersResult';
import { type MapMakerInfoData, MapDataAndMarkersData } from '@/models/v4/mapping/getMapDataAndMarkersData';
import { useSignalRStore } from '@/stores/signalr/signalr-store';

import { useMapSignalRUpdates } from '../use-map-signalr-updates';

// Mock dependencies
jest.mock('@/api/mapping/mapping');
jest.mock('@/lib/logging');
jest.mock('@/stores/signalr/signalr-store');

const mockedGetMapDataAndMarkers = getMapDataAndMarkers as jest.MockedFunction<typeof getMapDataAndMarkers>;
const mockedLogger = logger as jest.Mocked<typeof logger>;
const mockedUseSignalRStore = useSignalRStore as jest.MockedFunction<typeof useSignalRStore>;

// Create mock data with proper structure
const createMockMapData = (): GetMapDataAndMarkersResult => {
  const mapMakers: MapMakerInfoData[] = [
    {
      Id: '1',
      Type: 1,
      Title: 'John Doe',
      Latitude: 40.7128,
      Longitude: -74.006,
      zIndex: '1',
      ImagePath: '/path/to/image1.png',
      InfoWindowContent: 'Personnel info',
      Color: '#FF0000',
    } as MapMakerInfoData,
    {
      Id: '2',
      Type: 2,
      Title: 'Unit 1',
      Latitude: 40.7589,
      Longitude: -73.9851,
      zIndex: '2',
      ImagePath: '/path/to/image2.png',
      InfoWindowContent: 'Unit info',
      Color: '#00FF00',
    } as MapMakerInfoData,
  ];

  const data = new MapDataAndMarkersData();
  data.MapMakerInfos = mapMakers;
  data.CenterLat = '40.7128';
  data.CenterLon = '-74.006';
  data.ZoomLevel = '10';

  const result = new GetMapDataAndMarkersResult();
  result.Data = data;
  result.PageSize = 100;
  result.Timestamp = new Date().toISOString();
  result.Version = '1.0';
  result.Node = 'test-node';
  result.RequestId = 'test-request-id';
  result.Status = 'Success';
  result.Environment = 'test';

  return result;
};

describe('useMapSignalRUpdates', () => {
  let mockOnMarkersUpdate: jest.MockedFunction<(markers: MapMakerInfoData[]) => void>;
  let mockMapData: GetMapDataAndMarkersResult;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockOnMarkersUpdate = jest.fn();
    mockMapData = createMockMapData();

    // Default store state
    mockedUseSignalRStore.mockReturnValue(0);

    // Default API response
    mockedGetMapDataAndMarkers.mockResolvedValue(mockMapData);

    // Silence logger by default
    mockedLogger.info.mockImplementation(() => {});
    mockedLogger.debug.mockImplementation(() => {});
    mockedLogger.error.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Basic functionality', () => {
    it('should not call API when timestamp is 0', () => {
      mockedUseSignalRStore.mockReturnValue(0);

      renderHook(() => useMapSignalRUpdates(mockOnMarkersUpdate));

      jest.runAllTimers();

      expect(mockedGetMapDataAndMarkers).not.toHaveBeenCalled();
      expect(mockOnMarkersUpdate).not.toHaveBeenCalled();
    });

    it('should call API when timestamp changes', async () => {
      let timestamp = 0;
      mockedUseSignalRStore.mockImplementation(() => timestamp);

      const { rerender } = renderHook(() => useMapSignalRUpdates(mockOnMarkersUpdate));

      // Update timestamp
      timestamp = 1000;
      mockedUseSignalRStore.mockReturnValue(timestamp);
      rerender({});

      // Fast-forward debounce timer
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(mockedGetMapDataAndMarkers).toHaveBeenCalledTimes(1);
      });

      expect(mockOnMarkersUpdate).toHaveBeenCalledWith(mockMapData.Data.MapMakerInfos);
    });

    it('should not call API again for same timestamp', async () => {
      mockedUseSignalRStore.mockReturnValue(1000);

      const { rerender } = renderHook(() => useMapSignalRUpdates(mockOnMarkersUpdate));

      // Fast-forward debounce timer
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(mockedGetMapDataAndMarkers).toHaveBeenCalledTimes(1);
      });

      // Rerender with same timestamp
      rerender({});

      jest.advanceTimersByTime(1000);

      // Should not call API again
      expect(mockedGetMapDataAndMarkers).toHaveBeenCalledTimes(1);
    });
  });

  describe('Debouncing', () => {
    it('should debounce rapid successive updates', async () => {
      let timestamp = 0;
      mockedUseSignalRStore.mockImplementation(() => timestamp);

      const { rerender } = renderHook(() => useMapSignalRUpdates(mockOnMarkersUpdate));

      // Rapid successive updates
      timestamp = 1000;
      mockedUseSignalRStore.mockReturnValue(timestamp);
      rerender({});

      timestamp = 2000;
      mockedUseSignalRStore.mockReturnValue(timestamp);
      rerender({});

      timestamp = 3000;
      mockedUseSignalRStore.mockReturnValue(timestamp);
      rerender({});

      // Fast-forward only part of debounce delay
      jest.advanceTimersByTime(500);

      // Should not have called API yet
      expect(mockedGetMapDataAndMarkers).not.toHaveBeenCalled();

      // Fast-forward rest of debounce delay
      jest.advanceTimersByTime(500);

      await waitFor(() => {
        expect(mockedGetMapDataAndMarkers).toHaveBeenCalledTimes(1);
      });
    });

    it('should reset debounce timer on new updates', async () => {
      let timestamp = 0;
      mockedUseSignalRStore.mockImplementation(() => timestamp);

      const { rerender } = renderHook(() => useMapSignalRUpdates(mockOnMarkersUpdate));

      // First update
      timestamp = 1000;
      mockedUseSignalRStore.mockReturnValue(timestamp);
      rerender({});

      // Wait 800ms (less than debounce delay)
      jest.advanceTimersByTime(800);

      // Second update - should reset timer
      timestamp = 2000;
      mockedUseSignalRStore.mockReturnValue(timestamp);
      rerender({});

      // Wait another 800ms (still less than debounce delay from second update)
      jest.advanceTimersByTime(800);

      // Should not have called API yet
      expect(mockedGetMapDataAndMarkers).not.toHaveBeenCalled();

      // Wait remaining 200ms to complete debounce
      jest.advanceTimersByTime(200);

      await waitFor(() => {
        expect(mockedGetMapDataAndMarkers).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Concurrency prevention', () => {
    it('should prevent multiple concurrent API calls', async () => {
      let timestamp = 0;
      mockedUseSignalRStore.mockImplementation(() => timestamp);

      // Make API call slow to test concurrency
      let resolveFirstCall: () => void;
      const firstCallPromise = new Promise<GetMapDataAndMarkersResult>((resolve) => {
        resolveFirstCall = () => resolve(mockMapData);
      });

      mockedGetMapDataAndMarkers.mockImplementationOnce(() => firstCallPromise);

      const { rerender } = renderHook(() => useMapSignalRUpdates(mockOnMarkersUpdate));

      // First update
      timestamp = 1000;
      mockedUseSignalRStore.mockReturnValue(timestamp);
      rerender({});

      jest.advanceTimersByTime(1000);

      // Second update while first is still pending
      timestamp = 2000;
      mockedUseSignalRStore.mockReturnValue(timestamp);
      rerender({});

      jest.advanceTimersByTime(1000);

      // Should only have made one API call
      expect(mockedGetMapDataAndMarkers).toHaveBeenCalledTimes(1);

      // Resolve first call
      resolveFirstCall!();
      await waitFor(() => {
        expect(mockOnMarkersUpdate).toHaveBeenCalledTimes(1);
      });
    });

    it('should allow new API call after previous one completes', async () => {
      let timestamp = 0;
      mockedUseSignalRStore.mockImplementation(() => timestamp);

      const { rerender } = renderHook(() => useMapSignalRUpdates(mockOnMarkersUpdate));

      // First update
      timestamp = 1000;
      mockedUseSignalRStore.mockReturnValue(timestamp);
      rerender({});

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(mockedGetMapDataAndMarkers).toHaveBeenCalledTimes(1);
      });

      // Second update after first completes
      timestamp = 2000;
      mockedUseSignalRStore.mockReturnValue(timestamp);
      rerender({});

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(mockedGetMapDataAndMarkers).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle API errors gracefully', async () => {
      let timestamp = 0;
      mockedUseSignalRStore.mockImplementation(() => timestamp);

      const apiError = new Error('API Error');
      mockedGetMapDataAndMarkers.mockRejectedValue(apiError);

      const { rerender } = renderHook(() => useMapSignalRUpdates(mockOnMarkersUpdate));

      timestamp = 1000;
      mockedUseSignalRStore.mockReturnValue(timestamp);
      rerender({});

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(mockedLogger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Failed to update map markers from SignalR update',
            context: expect.objectContaining({
              error: apiError,
            }),
          })
        );
      });

      expect(mockOnMarkersUpdate).not.toHaveBeenCalled();
    });

    it('should call API when error handling works correctly', async () => {
      let timestamp = 0;
      mockedUseSignalRStore.mockImplementation(() => timestamp);

      const { rerender } = renderHook(() => useMapSignalRUpdates(mockOnMarkersUpdate));

      // First update
      timestamp = 1000;
      mockedUseSignalRStore.mockReturnValue(timestamp);
      rerender({});

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(mockedGetMapDataAndMarkers).toHaveBeenCalledTimes(1);
      });

      expect(mockOnMarkersUpdate).toHaveBeenCalledWith(mockMapData.Data.MapMakerInfos);
    });
  });

  describe('Logging', () => {
    it('should log debug message when scheduling debounced update', () => {
      let timestamp = 0;
      mockedUseSignalRStore.mockImplementation(() => timestamp);

      const { rerender } = renderHook(() => useMapSignalRUpdates(mockOnMarkersUpdate));

      timestamp = 1000;
      mockedUseSignalRStore.mockReturnValue(timestamp);
      rerender({});

      expect(mockedLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Debouncing map markers update',
          context: expect.objectContaining({
            lastUpdateTimestamp: 1000,
            lastProcessed: 0,
            delay: 1000,
          }),
        })
      );
    });

    it('should log info message when fetching map data', async () => {
      let timestamp = 0;
      mockedUseSignalRStore.mockImplementation(() => timestamp);

      const { rerender } = renderHook(() => useMapSignalRUpdates(mockOnMarkersUpdate));

      timestamp = 1000;
      mockedUseSignalRStore.mockReturnValue(timestamp);
      rerender({});

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(mockedLogger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Updating map markers from SignalR update',
            context: expect.objectContaining({
              markerCount: 2,
              timestamp: 1000,
            }),
          })
        );
      });
    });

    it('should log debug message when queuing concurrent request', async () => {
      let timestamp = 0;
      mockedUseSignalRStore.mockImplementation(() => timestamp);

      // Make API call slow
      mockedGetMapDataAndMarkers.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockMapData), 100))
      );

      const { rerender } = renderHook(() => useMapSignalRUpdates(mockOnMarkersUpdate));

      // First update
      timestamp = 1000;
      mockedUseSignalRStore.mockReturnValue(timestamp);
      rerender({});

      jest.advanceTimersByTime(1000);

      // Second update while first is pending
      timestamp = 2000;
      mockedUseSignalRStore.mockReturnValue(timestamp);
      rerender({});

      jest.advanceTimersByTime(1000);

      expect(mockedLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Map markers update already in progress, queuing timestamp',
          context: expect.objectContaining({
            timestamp: 2000,
            pendingTimestamp: 2000,
          }),
        })
      );
    });
  });
});
