import { type MapMakerInfoData } from '@/models/v4/mapping/getMapDataAndMarkersData';
import { type PoiResultData } from '@/models/v4/mapping/poiResultData';
import { type PoiTypeResultData } from '@/models/v4/mapping/poiTypeResultData';

//region POI Marker Detection

export const POI_MARKER_TYPE = 4;

/**
 * Determines whether a map marker represents a Point of Interest (POI).
 *
 * Matches the web application's `isPoiMarker()` logic:
 *   1. marker.Type === 4 (explicit POI type)
 *   2. marker.PoiTypeId is a number greater than 0
 *   3. marker.LayerId starts with the string "poi-type-"
 *   4. marker.PoiImage (or ImagePath) starts with "map-icon-" (case-insensitive)
 *
 * @param marker - A map marker from the API response.
 * @returns true if the marker is a POI, false otherwise.
 */
export const isPoiMarker = (marker: Pick<MapMakerInfoData, 'Type' | 'PoiTypeId' | 'LayerId' | 'PoiImage' | 'ImagePath'>): boolean => {
  // 1. Explicit POI type
  if (marker.Type === POI_MARKER_TYPE) {
    return true;
  }

  // 2. Has a POI type ID greater than 0
  if (marker.PoiTypeId != null && marker.PoiTypeId > 0) {
    return true;
  }

  // 3. Layer ID starts with "poi-type-"
  if (marker.LayerId != null && marker.LayerId.toLowerCase().startsWith('poi-type-')) {
    return true;
  }

  // 4. PoiImage or ImagePath starts with "map-icon-" (case-insensitive)
  const iconField = marker.PoiImage ?? marker.ImagePath;
  if (iconField != null && iconField.toLowerCase().startsWith('map-icon-')) {
    return true;
  }

  return false;
};

//endregion

//region POI Display & Grouping

export interface PoiDisplayable {
  Name?: string | null;
  Address?: string | null;
  Note?: string | null;
  PoiTypeName?: string | null;
}

export interface GroupedPoisByType {
  poiTypeId: number;
  poiTypeName: string;
  isDestination: boolean;
  color: string;
  imagePath: string;
  marker: string;
  pois: PoiResultData[];
}

export interface PoiSelectOption {
  value: string;
  label: string;
  poiTypeName: string;
}

export const NO_DESTINATION_POI_VALUE = 'none';

const getDisplayValue = (value?: string | null) => value?.trim() ?? '';

export const getPoiDisplayName = (poi: PoiDisplayable) => {
  return getDisplayValue(poi.Name) || getDisplayValue(poi.Address) || getDisplayValue(poi.Note) || getDisplayValue(poi.PoiTypeName);
};

export const getPoiSelectionLabel = (poi: PoiDisplayable) => {
  const name = getDisplayValue(poi.Name);
  const address = getDisplayValue(poi.Address);

  if (name && address) {
    return `${name} - ${address}`;
  }

  return getPoiDisplayName(poi);
};

export const groupPoisByType = (pois: PoiResultData[], poiTypes: PoiTypeResultData[] = []) => {
  const poiTypesById = new Map(poiTypes.map((poiType) => [poiType.PoiTypeId, poiType]));
  const groupedPois = new Map<number, GroupedPoisByType>();

  for (const poi of pois) {
    const poiType = poiTypesById.get(poi.PoiTypeId);
    const existingGroup = groupedPois.get(poi.PoiTypeId);

    if (existingGroup) {
      existingGroup.pois.push(poi);
      continue;
    }

    groupedPois.set(poi.PoiTypeId, {
      poiTypeId: poi.PoiTypeId,
      poiTypeName: poi.PoiTypeName || poiType?.Name || '',
      isDestination: poi.IsDestination || poiType?.IsDestination || false,
      color: poi.Color || poiType?.Color || '',
      imagePath: poi.PoiImage || poi.ImagePath || poiType?.PoiImage || poiType?.ImagePath || '',
      marker: poi.Marker || poiType?.Marker || '',
      pois: [poi],
    });
  }

  return Array.from(groupedPois.values()).sort((left, right) => left.poiTypeName.localeCompare(right.poiTypeName));
};

export const getDestinationPoiSelectOptions = (pois: PoiResultData[], poiTypes: PoiTypeResultData[] = []): PoiSelectOption[] => {
  return groupPoisByType(pois, poiTypes).flatMap((group) =>
    [...group.pois]
      .sort((left, right) => getPoiSelectionLabel(left).localeCompare(getPoiSelectionLabel(right)))
      .map((poi) => ({
        value: poi.PoiId.toString(),
        label: `${group.poiTypeName} - ${getPoiSelectionLabel(poi)}`,
        poiTypeName: group.poiTypeName,
      }))
  );
};

export const getDestinationPoiIdFromValue = (value?: string | null) => {
  if (!value || value === NO_DESTINATION_POI_VALUE) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};
