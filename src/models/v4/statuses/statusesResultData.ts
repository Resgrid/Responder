export class StatusesResultData {
  public Id: number = 0; // Id of the Set
  public Type: number = 0; // Type of the Set
  public StateId: number = 0; // Custom state (set) id: 0 for a built-in option, > 0 for a department's own option
  public Text: string = ''; // Button Text
  public BColor: string = ''; // Button Color
  /** What the option means: ActionBaseTypes for statuses, StaffingBaseTypes for staffing; -1 none, undefined from older servers. */
  public BaseType?: number;
  public Color: string = ''; // Text Color
  public Gps: boolean = false; // Require GPS
  public Note: number = 0; // Note Type
  public Detail: number = 0; // Detail Type
  /** Ids of the statuses offered next while this one is current; empty = offer every status. */
  public NextIds?: number[] = [];
}
