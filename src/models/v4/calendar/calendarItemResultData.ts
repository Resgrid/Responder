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
 * Subtracts one calendar day from a YYYY-MM-DD string.
 * Used to convert exclusive all-day end dates to inclusive ones.
 */
function dateMinusOneDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns true when End falls on a later calendar day than Start.
 * Handles ISO 8601 strings by comparing the date portion directly,
 * which is timezone-agnostic and works for both UTC-suffixed and
 * offset-bearing strings.
 *
 * When isAllDay is true the end date is treated as exclusive (i.e. the
 * calendar convention where the end is set to the day *after* the last
 * day), so one day is subtracted before comparing.
 */
export function computeIsMultiDay(start: string, end: string, isAllDay?: boolean): boolean {
  if (!start || !end) return false;
  const startDate = start.slice(0, 10);
  let endDate = end.slice(0, 10);
  if (isAllDay) {
    endDate = dateMinusOneDay(endDate);
  }
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
  return { ...raw, IsMultiDay: computeIsMultiDay(raw.Start, raw.End, raw.IsAllDay) };
}
