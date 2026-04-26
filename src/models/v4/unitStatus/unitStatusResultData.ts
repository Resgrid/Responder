export class UnitStatusResultData {
  public UnitId?: string;
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
}
