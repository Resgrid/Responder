export class UnitResultData {
  public UnitId: string = '';
  public DepartmentId: string = '';
  public Name: string = '';
  public Type: string = '';
  public TypeId: number = 0;
  public CustomStatusSetId: string = '';
  public GroupId: string = '';
  public GroupName: string = '';
  public Vin: string = '';
  public PlateNumber: string = '';
  public FourWheelDrive: boolean = false;
  public SpecialPermit: boolean = false;
  public CurrentDestinationId: string = '';
  public CurrentStatusId: string = '';
  public CurrentStatusTimestamp: string = '';
  public Latitude: string = '';
  public Longitude: string = '';
  public Note: string = '';
  /** Department-uploaded icon for the unit's type (absolute URL, 128x128 PNG, anonymous GET); null when none, undefined from older servers. */
  public TypeIconUrl?: string | null;
  /** Built-in icon the unit's type picked (lowercase `MAP_ICONS` key, e.g. "ambulance"); null when none, undefined from older servers. */
  public TypeMapIcon?: string | null;
}
