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
}
