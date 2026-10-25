import { type PoiLayerData } from './poiLayerData';

export class MapDataAndMarkersData {
  public CenterLat: string = '';
  public CenterLon: string = '';
  public ZoomLevel: string = '';
  public MapMakerInfos: MapMakerInfoData[] = [];
  public PoiLayers: PoiLayerData[] = [];
}

export class MapMakerInfoData {
  public Id: string = '';
  public Longitude: number = 0;
  public Latitude: number = 0;
  public Title: string = '';
  public zIndex: number | string = '';
  public ImagePath: string = '';
  public InfoWindowContent: string = '';
  public Color: string = '';
  public Type: number = 0;
  public PoiImage?: string;
  public Marker?: string;
  public PoiTypeId?: number | null;
  public PoiTypeName?: string;
  public Address?: string;
  public Note?: string;
  public LayerId?: string;
  public LayerName?: string;
  /**
   * Department-uploaded icon for call (0), unit (1) and POI (4) pins (the type's icon) and personnel (3) pins (the icon of
   * the person's first role, in role order, that has one); null/undefined when none or from older servers.
   */
  public IconUrl?: string | null;
  /**
   * Built-in pin recoloured to the call's priority or the unit's/person's status (absolute URL of a 32 x 37 PNG with the
   * bundled pin's shape and tip), drawn in place of the bundled `ImagePath` pin when there is no `IconUrl`; null when the
   * priority/status has no meaning, always null for stations, POIs and hydrants, and undefined from older servers.
   */
  public PinIconUrl?: string | null;
  /** The style key behind `PinIconUrl` ("available", "responding", "high", ...); null/undefined as for `PinIconUrl`. */
  public IconStyle?: string | null;
}
