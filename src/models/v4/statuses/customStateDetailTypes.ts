export enum CustomStateDetailTypes {
  None = 0,
  Station = 1,
  Call = 2,
  CallsAndStations = 3,
  Pois = 4,
  CallsAndPois = 5,
  StationsAndPois = 6,
  CallsStationsAndPois = 7,
}

export const CALL_DESTINATION_DETAIL_TYPES: CustomStateDetailTypes[] = [
  CustomStateDetailTypes.Call,
  CustomStateDetailTypes.CallsAndStations,
  CustomStateDetailTypes.CallsAndPois,
  CustomStateDetailTypes.CallsStationsAndPois,
];

export const STATION_DESTINATION_DETAIL_TYPES: CustomStateDetailTypes[] = [
  CustomStateDetailTypes.Station,
  CustomStateDetailTypes.CallsAndStations,
  CustomStateDetailTypes.StationsAndPois,
  CustomStateDetailTypes.CallsStationsAndPois,
];

export const POI_DESTINATION_DETAIL_TYPES: CustomStateDetailTypes[] = [
  CustomStateDetailTypes.Pois,
  CustomStateDetailTypes.CallsAndPois,
  CustomStateDetailTypes.StationsAndPois,
  CustomStateDetailTypes.CallsStationsAndPois,
];
