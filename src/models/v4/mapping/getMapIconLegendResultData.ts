/**
 * A status or priority style of the map icon legend. Status styles carry the department's unit and personnel status names
 * and the default unit/person pins; priority styles carry the department's priority names and the default call pin.
 */
export class MapLegendStyleData {
  /** Style key, as map markers carry it in `IconStyle` ("available", "responding", "low", "emergency", "unknown", ...). */
  public Key: string = '';
  /** The style's colour, "#RRGGBB". */
  public Color: string = '';
  /** The status meanings (ActionBaseTypes) the style groups; not shown. */
  public Meanings: number[] = [];
  /** Status styles: the department's own unit status names (every status set) that show in this style. */
  public UnitStatuses: string[] = [];
  /** Status styles: the department's own personnel status names that show in this style. */
  public PersonnelStatuses: string[] = [];
  /** Priority styles: the department's own priority names that show in this style. */
  public Priorities: string[] = [];
  /** Status styles: the default unit pin in this style (absolute URL of a 32 x 37 PNG, tip at the bottom). */
  public UnitPinIconUrl: string | null = null;
  /** Status styles: the default person pin in this style. */
  public PersonPinIconUrl: string | null = null;
  /** Priority styles: the default call pin in this style. */
  public CallPinIconUrl: string | null = null;
}

/** One priority (calls) or status (units, personnel) of a legend row, with the icon a marker of the row shows in it. */
export class MapLegendStateData {
  /** The stored priority id or status id. */
  public Id: number = 0;
  /** The department's own name for the priority or status. */
  public Name: string = '';
  /** The priority's or status's own hex colour, or null. */
  public Color: string | null = null;
  /** The style key of the priority or status ("unknown" when it has no meaning). */
  public IconStyle: string = '';
  /** Upload for this exact state, or the type's own upload with a badge; null when none. */
  public IconUrl: string | null = null;
  /** Styled built-in pin (absolute URL); the fallback when `IconUrl` is null or fails to load. */
  public PinIconUrl: string | null = null;
  /** Bundled fallback icon name. */
  public ImagePath: string = '';
  /** True when `IconUrl` was uploaded for this exact state rather than being the type's own icon. */
  public IsVariant: boolean = false;
}

/** A call type, unit type or role, or the "none" row (`Id` null), with its icon in each priority or status. */
export class MapLegendRowData {
  /** The call type, unit type or role id; null for the "none" row, which the app labels itself (ignoring `Name`). */
  public Id: number | null = null;
  /** The department's name for the call type, unit type or role. */
  public Name: string = '';
  /** Units: the name of the type's custom status set; null when it uses the built-in unit statuses. */
  public StatusSetName: string | null = null;
  /** The type's or role's own uploaded icon (no status), or null. */
  public IconUrl: string | null = null;
  /** Styled pin for the row itself; normally null. */
  public PinIconUrl: string | null = null;
  /** Bundled icon the type picked ("fire", "ambulance") or the default ("Call", "Engine_Responding", "Person_RespondingCall"). */
  public ImagePath: string = '';
  public States: MapLegendStateData[] = [];
}

/** A POI type and the icon its markers show (same fields and meaning as `PoiLayerData`). */
export class MapLegendPoiTypeData {
  public PoiTypeId: number = 0;
  public Name: string = '';
  public Color: string | null = null;
  public PoiImage: string | null = null;
  public ImagePath: string | null = null;
  public Marker: string | null = null;
  public IconUrl: string | null = null;
}

/** GET /Mapping/GetMapIconLegend: every icon the department's map can show, named with the department's own names. */
export class GetMapIconLegendResultData {
  /** The status styles in legend order, then "unknown". */
  public StatusStyles: MapLegendStyleData[] = [];
  /** The priority styles, least to most urgent, then "unknown". */
  public PriorityStyles: MapLegendStyleData[] = [];
  /** Calls with no type first (`Id` null), then each call type by name. */
  public Calls: MapLegendRowData[] = [];
  /** Units with no type first (`Id` null), then each unit type by name. */
  public Units: MapLegendRowData[] = [];
  /** Members with no role icon first (`Id` null), then each role with an uploaded icon, in role order. */
  public Personnel: MapLegendRowData[] = [];
  /** The department's POI types by name. */
  public PoiTypes: MapLegendPoiTypeData[] = [];
}
