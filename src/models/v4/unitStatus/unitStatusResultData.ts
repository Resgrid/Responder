export class UnitStatusResultData {
  public UnitId: string = '';
  public Name: string = '';
  public Type: string = '';
  public State: string = '';
  public StateCss: string = '';
  public StateStyle: string = '';
  public Timestamp: string = '';
  public TimestampUtc?: string;
  public DestinationId: number | string | null = null;
  public DestinationType?: number | string | null;
  public DestinationName?: string;
  public DestinationAddress?: string;
  public DestinationTypeName?: string;
  public Note: string = '';
  public Latitude?: number | null;
  public Longitude?: number | null;
  public GroupName: string = '';
  public GroupId: number | string = '';
  public Eta: string = '';
  /** Department-uploaded icon for the unit's type (absolute URL, 128x128 PNG, anonymous GET); null when none, undefined from older servers. */
  public TypeIconUrl?: string | null;
  /** Built-in icon the unit's type picked (lowercase `MAP_ICONS` key, e.g. "ambulance"); null when none, undefined from older servers. */
  public TypeMapIcon?: string | null;
}
