/** Active (not denied) sign-up on a shift day. Kept for back-compat; prefer `Roster`. */
export class ShiftDaySignupResultData {
  public UserId: string = '';
  public Name: string = '';
  public Roles: number[] = [];
  public GroupId: string = '';
  public ShiftSignupId: string = '';
  public ApprovalPending: boolean = false;
}

export class ShiftDayGroupRoleNeedsResultData {
  public RoleId: string = '';
  public RoleName: string = '';
  /** Still open for this role; never below zero. */
  public Needed: number = 0;
}

export class ShiftDayGroupNeedsResultData {
  public GroupId: string = '';
  public GroupName: string = '';
  public GroupNeeds: ShiftDayGroupRoleNeedsResultData[] = [];
  /** The caller may supervise this group. */
  public CanManage: boolean = false;
}

export class ShiftDayRosterResultData {
  public UserId: string = '';
  public Name: string = '';
  /** '' when the entry is not tied to a group. */
  public GroupId: string = '';
  public GroupName: string = '';
  public RoleIds: number[] = [];
  public Roles: string[] = [];
  /** `ShiftRosterSource` */
  public Source: number = 0;
  /** '' for standing-roster entries. */
  public ShiftSignupId: string = '';
  /** Pending entries are listed but are not on duty and do not fill a need. */
  public ApprovalPending: boolean = false;
  public TradedFromUserId: string = '';
  public TradedFromName: string = '';
}

/**
 * One day of a shift. `GetShiftDay` / `GetTodaysShifts` return it in full; the date-range and
 * my-shifts endpoints return a light copy whose `Signups`, `Needs` and `Roster` are empty.
 * `ShiftDay`, `Start` and `End` are department-local wall-clock times without an offset.
 */
export class ShiftDayResultData {
  public ShiftId: string = '';
  public ShiftName: string = '';
  public ShiftDayId: string = '';
  public ShiftDay: string = '';
  public Start: string = '';
  public End: string = '';
  public SignedUp: boolean = false;
  /** `ShiftAssignmentType` */
  public ShiftType: number = 0;
  public Color: string = '';
  public RequireApproval: boolean = false;
  public Filled: boolean = false;
  public OpenSlots: number = 0;
  public IsActive: boolean = false;
  public CanManage: boolean = false;
  public CanSignup: boolean = false;
  /** `ShiftDayMyStatus` */
  public MyStatus: number = 0;
  public MySignupId: string = '';
  public MyGroupId: string = '';
  public MyTradeId: string = '';

  public Signups: ShiftDaySignupResultData[] = [];
  public Needs: ShiftDayGroupNeedsResultData[] = [];
  public Roster: ShiftDayRosterResultData[] = [];
}
