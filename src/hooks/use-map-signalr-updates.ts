import { useEffect, useRef } from 'react';

import { getMapDataAndMarkers } from '@/api/mapping/mapping';
import { logger } from '@/lib/logging';
import { type MapMakerInfoData } from '@/models/v4/mapping/getMapDataAndMarkersData';
import { useSignalRStore } from '@/stores/signalr/signalr-store';

export const useMapSignalRUpdates = (onMarkersUpdate: (markers: MapMakerInfoData[]) => void) => {
  const lastProcessedTimestamp = useRef<number>(0);

  const lastUpdateTimestamp = useSignalRStore((state) => {
    //logger.info({
    //  message: 'Zustand selector called for lastUpdateTimestamp',
    //  context: { lastUpdateTimestamp: state.lastUpdateTimestamp },
    //});
    return state.lastUpdateTimestamp;
  });

  //logger.info({
  //  message: 'Setting up useMapSignalRUpdates',
  //  context: { lastUpdateTimestamp, lastProcessedTimestamp: lastProcessedTimestamp.current },
  //});

  useEffect(() => {
    //logger.info({
    //  message: 'useEffect triggered in useMapSignalRUpdates',
    //  context: { lastUpdateTimestamp, lastProcessedTimestamp: lastProcessedTimestamp.current },
    //});

    const fetchAndUpdateMarkers = async () => {
      try {
        const mapDataAndMarkers = await getMapDataAndMarkers();

        if (mapDataAndMarkers && mapDataAndMarkers.Data) {
          logger.info({
            message: 'Updating map markers from SignalR update',
            context: {
              markerCount: mapDataAndMarkers.Data.MapMakerInfos.length,
              timestamp: lastUpdateTimestamp,
            },
          });

          onMarkersUpdate(mapDataAndMarkers.Data.MapMakerInfos);
        }

        // Update the last processed timestamp after successful API call
        lastProcessedTimestamp.current = lastUpdateTimestamp;
      } catch (error) {
        logger.error({
          message: 'Failed to update map markers from SignalR update',
          context: { error },
        });
        // Don't update lastProcessedTimestamp on error so it can be retried
      }
    };

    if (lastUpdateTimestamp > 0 && lastUpdateTimestamp !== lastProcessedTimestamp.current) {
      fetchAndUpdateMarkers();
    }
  }, [lastUpdateTimestamp, onMarkersUpdate]);
};
