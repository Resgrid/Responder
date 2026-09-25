export class PendingShiftSignupResultData {
  public ShiftSignupId: string = '';
  public UserId: string = '';
  public UserName: string = '';
  public ShiftId: string = '';
  public ShiftName: string = '';
  public ShiftDayId: string = '';
  public ShiftDay: string = '';
  public Start: string = '';
  public End: string = '';
  public GroupId: string = '';
  public GroupName: string = '';
  /** UTC ISO timestamp. */
  public SignupTimestamp: string = '';
  public Roles: string[] = [];
}
