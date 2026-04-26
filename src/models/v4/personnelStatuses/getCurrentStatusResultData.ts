export class GetCurrentStatusResultData {
  public UserId: string = '';
  public DepartmentId: string = '';
  public StatusType: number = 0;
  public TimestampUtc: string = '';
  public Timestamp: string = '';
  public Note: string = '';
  public DestinationId: number | string | null = null;
  public DestinationType: number | string | null = null;
  public DestinationName?: string;
  public DestinationAddress?: string;
  public DestinationTypeName?: string;
  public GeoLocationData: string = '';
}
