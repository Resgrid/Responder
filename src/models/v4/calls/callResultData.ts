export class CallResultData {
  public CallId: string = '';
  public Priority: number = 0;
  public Name: string = '';
  public Nature: string = '';
  public Note: string = '';
  public Address: string = '';
  public DestinationPoiId?: number | null;
  public DestinationName?: string;
  public DestinationAddress?: string;
  public DestinationTypeName?: string;
  public DestinationPoiTypeId?: number | null;
  public DestinationLatitude?: number | null;
  public DestinationLongitude?: number | null;
  public Geolocation: string = '';
  public LoggedOn: string = '';
  public State: string = '';
  public Number: string = '';
  public NotesCount: number = 0;
  public AudioCount: number = 0;
  public ImgagesCount: number = 0;
  public FileCount: number = 0;
  public What3Words: string = '';
  public ContactName: string = '';
  public ContactInfo: string = '';
  public ReferenceId: string = '';
  public ExternalId: string = '';
  public IncidentId: string = '';
  public AudioFileId: string = '';
  public Type: string = 'No Type';
  public LoggedOnUtc: string = '';
  public DispatchedOn: string = '';
  public DispatchedOnUtc: string = '';
  public Latitude: string = '';
  public Longitude: string = '';
  public CheckInTimersEnabled: boolean = false;
  /**
   * Catalog field ids the server withheld from this response (ADP plan 7.2). Empty for a
   * department without the addon, and empty again once a grant reveals the record.
   *
   * Left undefined rather than defaulted to `[]`: a server that never sends the list must stay
   * distinguishable from one that sends an empty one, because isFieldRedacted() only falls back to
   * sentinel-sniffing for the former.
   */
  public RedactedFields?: string[];
}
