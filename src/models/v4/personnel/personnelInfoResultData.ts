export class PersonnelInfoResultData {
  public UserId: string = '';
  public IdentificationNumber: string = '';
  public DepartmentId: string = '';
  public FirstName: string = '';
  public LastName: string = '';
  public EmailAddress: string = '';
  public MobilePhone: string = '';
  public GroupId: string = '';
  public GroupName: string = '';
  public StatusId: string = '';
  public Status: string = '';
  public StatusColor: string = '';
  public StatusTimestamp: string = '';
  /** What the current status means (ActionBaseTypes); -1 none, undefined from older servers. See lib/base-types. */
  public StatusBaseType?: number;
  public StatusDestinationId: string = '';
  public StatusDestinationName: string = '';
  /** What StatusDestinationId names (DestinationEntityTypes: 1 station, 2 call, 3 POI), when the status recorded it. */
  public StatusDestinationType?: number | null;
  public StaffingId: string = '';
  public Staffing: string = '';
  public StaffingColor: string = '';
  public StaffingTimestamp: string = '';
  /** What the current staffing level means (StaffingBaseTypes); -1 none, undefined from older servers. */
  public StaffingBaseType?: number;
  public Roles: string[] = [];
}
