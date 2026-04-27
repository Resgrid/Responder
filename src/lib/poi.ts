import { type PoiResultData } from '@/models/v4/mapping/poiResultData';
import { type PoiTypeResultData } from '@/models/v4/mapping/poiTypeResultData';

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
      imagePath: poi.ImagePath || poiType?.ImagePath || '',
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
