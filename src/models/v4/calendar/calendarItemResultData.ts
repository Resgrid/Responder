export class CalendarItemResultData {
  public CalendarItemId: string = '';
  public Title: string = '';
  public Start: string = '';
  public StartUtc: string = '';
  public End: string = '';
  public EndUtc: string = '';
  public StartTimezone: string = '';
  public EndTimezone: string = '';
  public Description: string = '';
  public RecurrenceId: string = '';
  public RecurrenceRule: string = '';
  public RecurrenceException: string = '';
  public ItemType: number = 0;
  public IsAllDay: boolean = false;
  public IsMultiDay?: boolean;
  public Location: string = '';
  public SignupType: number = 0;
  public Reminder: number = 0;
  public LockEditing: boolean = false;
  public Entities: string = '';
  public RequiredAttendes: string = '';
  public OptionalAttendes: string = '';
  public IsAdminOrCreator: boolean = false;
  public CreatorUserId: string = '';
  public Attending: boolean = false;
  public TypeName: string = '';
  public TypeColor: string = '';

  public Attendees: CalendarItemResultAttendeeData[] = [];
}

export class CalendarItemResultAttendeeData {
  public CalendarItemId: string = '';
  public UserId: string = '';
  public Name: string = '';
  public GroupName: string = '';
  public AttendeeType: number = 0;
  public Timestamp: string = '';
  public Note: string = '';
}

/**
 * Returns true when End falls on a later calendar day than Start.
 * Handles ISO 8601 strings by comparing the date portion directly,
 * which is timezone-agnostic and works for both UTC-suffixed and
 * offset-bearing strings.
 */
export function computeIsMultiDay(start: string, end: string): boolean {
  if (!start || !end) return false;
  const startDate = start.slice(0, 10);
  const endDate = end.slice(0, 10);
  return endDate > startDate;
}

/**
 * Ensures IsMultiDay is always set on an item returned from the API.
 * When the API omits the field (undefined/null) it is computed from
 * the Start and End date strings.  An explicit API-provided value
 * (true or false) is left unchanged.
 */
export function mapCalendarItemResultData(raw: CalendarItemResultData): CalendarItemResultData {
  if (raw.IsMultiDay !== undefined && raw.IsMultiDay !== null) {
    return raw;
  }
  return { ...raw, IsMultiDay: computeIsMultiDay(raw.Start, raw.End) };
}
