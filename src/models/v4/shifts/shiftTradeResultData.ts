export class ShiftTradeOfferedShiftResultData {
  public ShiftSignupId: string = '';
  public ShiftName: string = '';
  public ShiftDay: string = '';
}

export class ShiftTradeUserResultData {
  public UserId: string = '';
  public Name: string = '';
  public Declined: boolean = false;
  public Offered: boolean = false;
  public Reason: string = '';
  /** Days offered as a swap-back; empty means they offered to just take the shift. */
  public OfferedShifts: ShiftTradeOfferedShiftResultData[] = [];
  /** UTC ISO timestamp of the application or answer, when known. */
  public RespondedOn?: string | null = null;
  public GroupName?: string = '';
  public Roles?: string[] = [];
  // The rest is only filled by GetShiftTrade, for the requester and the people who decide.
  public IsEligible?: boolean;
  public IneligibleReason?: string = '';
  public Certifications?: string[] = [];
  /** Shift days they work in the 7 days either side of the traded day. */
  public NearbyShiftCount?: number = 0;
  public NearbyShiftHours?: number = 0;
  public HasConflict?: boolean = false;
  public ConflictName?: string = '';
}

export class ShiftTradeResultData {
  public ShiftSignupTradeId: string = '';
  /** `ShiftTradeDirection` */
  public Direction: number = 0;
  /** `ShiftTradeStatus` */
  public Status: number = 0;
  /** `ShiftTradeUserState`; meaningful for incoming trades. */
  public MyState: number = 0;
  public SourceShiftSignupId: string = '';
  public SourceUserId: string = '';
  public SourceUserName: string = '';
  public ShiftId: string = '';
  public ShiftName: string = '';
  public ShiftDayId: string = '';
  public ShiftDay: string = '';
  public Start: string = '';
  public End: string = '';
  public GroupId: string = '';
  public GroupName: string = '';
  /** The requester's note. */
  public Note: string = '';
  public Users: ShiftTradeUserResultData[] = [];
  public AcceptedUserId: string = '';
  public AcceptedUserName: string = '';
  /** '' for a straight give-away. */
  public TargetShiftSignupId: string = '';
  public TargetShiftDay: string = '';
  public ReviewNote: string = '';
  public ReviewedByName: string = '';
  public RequireApproval: boolean = false;
  /** The caller may approve or deny it, and it is pending. */
  public CanReview: boolean = false;
  /** Open to everyone eligible (who apply) rather than only the invited people. */
  public IsOpen?: boolean = false;
  /** `ShiftAssignmentType`, including 2 for a static shift (workshift) day. */
  public ShiftType?: number = 0;
  public WorkshiftId?: string = '';
  public WorkshiftDayId?: string = '';
  public UnitId?: string = '';
  public UnitName?: string = '';
  /** UTC ISO timestamp, when known. */
  public RequestedOn?: string | null = null;
  /** Offers made and not withdrawn. */
  public ApplicantCount?: number = 0;
  /** The caller can apply to take the slot now. */
  public CanApply?: boolean = false;
  /** The caller meets the slot's requirements (open requests only). */
  public IsEligible?: boolean = false;
  /** Why the caller cannot apply (`ShiftServerErrorCode`), when they cannot. */
  public IneligibleReason?: string = '';
  /** The caller can pick which applicant takes the slot. Missing on older servers (only the requester could). */
  public CanPick?: boolean;
  /** The caller's pick takes effect at once (they decide as an approver). */
  public PickIsApproval?: boolean = false;
  /** Missing on older servers (only the requester could). */
  public CanCancel?: boolean;
  /** The traded day has ended. */
  public IsOver?: boolean = false;
}
